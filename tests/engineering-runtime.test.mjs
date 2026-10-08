import assert from 'node:assert/strict';
import { test } from 'node:test';
import { readFile } from 'node:fs/promises';
import ts from 'typescript';
const source = await readFile(new URL('../lib/engineering/runtime.ts', import.meta.url), 'utf8');
const js = ts.transpileModule(source, {compilerOptions:{module:ts.ModuleKind.ESNext,target:ts.ScriptTarget.ES2022}}).outputText;
const { executeEngineeringOperation, projectFilePath } = await import(`data:text/javascript;base64,${Buffer.from(js).toString('base64')}`);
function fixture(overrides = {}) {
  const events = [];
  const binding = { owner:'owner',sessionId:'root',project:{id:'project',workspaceRoot:'/workspace/projects/project'},task:{id:'task',kind:'implementation',requiredChecks:[{id:'test',command:'node test.js'}]} };
  const repository = {claimRun:async()=>({created:true,run:{id:'run',status:'running',workspaceVersion:2}}),recordMutation:async()=>{events.push('revision');return 2;},recordCheck:async(_,v)=>events.push(v),publishArtifact:async(_,v)=>v,completeRun:async()=>events.push('complete'), ...overrides};
  const sandbox = { run:async({command})=>{events.push('run');if(command.startsWith('mkdir'))return {exitCode:0,stdout:'',stderr:''};if(command.includes('os.walk'))return {exitCode:0,stdout:'a'.repeat(64),stderr:''};return {exitCode:1,stdout:'real output',stderr:'failure'};},readTextFile:async()=> 'actual file',writeTextFile:async()=>events.push('write') };
  return {repository,sandbox,binding,events};
}
test('check failure records actual exit/log/revision and cannot claim success',async()=>{
 const f=fixture();const result=await executeEngineeringOperation(f,{kind:'check',checkId:'test',callId:'c'});
 assert.equal(result.status,'failed');assert.equal(result.exitCode,1);assert.ok(!f.events.includes('revision'));
 const check=f.events.find(e=>e.checkId);assert.equal(check.workspaceVersion,2);assert.match(check.logs,/real output/);assert.equal(check.command,'node test.js');
});
test('replay and competing lease never rerun sandbox',async()=>{const f=fixture({claimRun:async()=>({created:false,run:{id:'existing',status:'failed'}})});const result=await executeEngineeringOperation(f,{kind:'bash',command:'echo hi',callId:'c'});assert.equal(result.replayed,true);assert.deepEqual(f.events,[]);});
test('storage failure prevents mutation',async()=>{const f=fixture({recordMutation:async()=>{throw Error('storage unavailable');}});await assert.rejects(executeEngineeringOperation(f,{kind:'write',path:'app.js',content:'text',callId:'c'}),/storage unavailable/);assert.ok(!f.events.includes('write'));});
test('model cannot substitute acceptance command',async()=>{const f=fixture();await assert.rejects(executeEngineeringOperation(f,{kind:'check',checkId:'foreign',callId:'c'}),/CHECK_NOT_CONFIGURED/);assert.deepEqual(f.events,[]);});
test('canonical file paths reject traversal, absolute and internal files',()=>{for(const path of ['../x','/etc/passwd','a/../../x','.git/config','node_modules/foo'])assert.throws(()=>projectFilePath('/workspace/projects/p',path));});
test('publication reads actual sandbox content and does not accept model text',async()=>{const f=fixture();f.sandbox.run=async({command})=>({exitCode:0,stdout:command.startsWith('wc')?'11':command.startsWith('realpath')?'/workspace/projects/project/app.js\n':'',stderr:''});const result=await executeEngineeringOperation(f,{kind:'publish',path:'app.js',callId:'c'});assert.equal(result.artifact.content,'actual file');});

test('source changes during checks invalidate recorded results',async()=>{
 const f=fixture();let hashes=0;
 f.sandbox.run=async({command})=>({exitCode:0,stdout:command.includes('os.walk')?(++hashes===1?'a':'b').repeat(64):'',stderr:''});
 const result=await executeEngineeringOperation(f,{kind:'check',callId:'check'});
 assert.equal(result.status,'failed');assert.equal(result.sourceChanged,true);assert.ok(f.events.includes('revision'));
});
test('actual foreground process captures exit/output and cleans background descendants',async()=>{
 const {execFile}=await import('node:child_process');const {promisify}=await import('node:util');const {mkdtemp,rm}=await import('node:fs/promises');const {tmpdir}=await import('node:os');
 const root=await mkdtemp(`${tmpdir()}/engineering-runtime-`);const execute=promisify(execFile);
 const sandbox={run:async({command})=>{try{const r=await execute('bash',['-lc',command],{maxBuffer:1_000_000});return {exitCode:0,...r};}catch(error){return {exitCode:error.code,...error};}}};
 const {runProjectCommand}=await import(`data:text/javascript;base64,${Buffer.from(js).toString('base64')}`);
 try { const result=await runProjectCommand(sandbox,root,"sleep 30 & echo $!; printf 'actual output'; exit 7");assert.equal(result.exitCode,7);assert.match(result.stdout,/actual output/);const pid=Number(result.stdout.split('\n')[0]);try{process.kill(pid,0);const {stdout}=await execute('ps',['-o','stat=','-p',String(pid)]);assert.match(stdout,/Z/);}catch(error){assert.ok(error.code==='ESRCH'||error.code===1);}}finally{await rm(root,{recursive:true,force:true});}
});
test('turn cancellation records cancelled check instead of passed evidence',async()=>{
 const f=fixture();const controller=new AbortController();
 f.sandbox.run=async({command})=>{if(command.includes("subprocess.Popen")&&!command.includes('os.walk')){controller.abort();throw Error('process aborted');}return {exitCode:0,stdout:command.includes('os.walk')?'a'.repeat(64):'',stderr:''};};
 await assert.rejects(executeEngineeringOperation({...f,abortSignal:controller.signal},{kind:'check',callId:'c'}),/process aborted/);
 assert.equal(f.events.find(e=>e.checkId)?.status,'cancelled');
});

test('real source fingerprints detect symlink and executable-mode changes',async()=>{
 const {execFile}=await import('node:child_process');const {promisify}=await import('node:util');const {mkdtemp,rm,writeFile}=await import('node:fs/promises');const {tmpdir}=await import('node:os');
 const root=await mkdtemp(`${tmpdir()}/engineering-fingerprint-`);const execute=promisify(execFile);
 try {
  for(const command of ['ln -s /tmp/other.js link.js','chmod +x app.js']) {
   const f=fixture();f.binding.project.workspaceRoot=root;f.binding.task.requiredChecks=[{id:'test',command}];await writeFile(`${root}/app.js`,'export const actual = 1;');
   f.sandbox.run=async({command})=>{try{const r=await execute('bash',['-lc',command],{maxBuffer:5_000_000});return {exitCode:0,...r};}catch(error){return {exitCode:error.code,stdout:error.stdout??'',stderr:error.stderr??''};}};
   const result=await executeEngineeringOperation(f,{kind:'check',callId:command});assert.equal(result.sourceChanged,true);assert.equal(result.status,'failed');
  }
 }finally{await rm(root,{recursive:true,force:true});}
});
test('real source archive contains file bytes and excludes dependencies',async()=>{
 const {execFile}=await import('node:child_process');const {promisify}=await import('node:util');const {mkdtemp,rm,writeFile,mkdir}=await import('node:fs/promises');const {tmpdir}=await import('node:os');
 const root=await mkdtemp(`${tmpdir()}/engineering-archive-`);const execute=promisify(execFile);
 try {
  await writeFile(`${root}/app.js`,'actual source');await mkdir(`${root}/node_modules`);await writeFile(`${root}/node_modules/ignored.js`,'dependency');
  const f=fixture();f.binding.project.workspaceRoot=root;
  f.sandbox.run=async({command})=>{try{const r=await execute('bash',['-lc',command],{maxBuffer:5_000_000});return {exitCode:0,...r};}catch(error){return {exitCode:error.code,stdout:error.stdout??'',stderr:error.stderr??''};}};
  const result=await executeEngineeringOperation(f,{kind:'archive',callId:'zip'});assert.equal(result.artifact.kind,'archive-base64');
  const archive=Buffer.from(result.artifact.content,'base64');await writeFile(`${root}/result.zip`,archive);
  const {stdout}=await execute('python3',['-c',"import zipfile,sys; z=zipfile.ZipFile(sys.argv[1]); assert z.namelist()==['app.js']; print(z.read('app.js').decode())",`${root}/result.zip`]);assert.equal(stdout.trim(),'actual source');
 }finally{await rm(root,{recursive:true,force:true});}
});

test('text publication validator rejects invalid UTF-8 and oversize bytes',async()=>{
 const {execFile}=await import('node:child_process');const {promisify}=await import('node:util');const {mkdtemp,rm,writeFile}=await import('node:fs/promises');const {tmpdir}=await import('node:os');
 const root=await mkdtemp(`${tmpdir()}/engineering-text-`);const execute=promisify(execFile);
 const sandbox={run:async({command})=>{try{const r=await execute('bash',['-lc',command]);return {exitCode:0,...r};}catch(error){return {exitCode:error.code,stdout:error.stdout??'',stderr:error.stderr??''};}}};
 const {validateTextFile}=await import(`data:text/javascript;base64,${Buffer.from(js).toString('base64')}`);
 try {
  const path=`${root}/app.txt`;await writeFile(path,Buffer.from([0xff,0xfe]));await assert.rejects(validateTextFile(sandbox,path),/TEXT_FILE_REQUIRED/);
  await writeFile(path,'x'.repeat(262145));await assert.rejects(validateTextFile(sandbox,path),/TEXT_FILE_REQUIRED/);
  await writeFile(path,'actual عربي');await validateTextFile(sandbox,path);
 }finally{await rm(root,{recursive:true,force:true});}
});
