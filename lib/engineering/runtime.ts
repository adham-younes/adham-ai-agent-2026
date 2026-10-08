import type { Project, Task, EngineeringRun, Artifact, Check } from './types';

export interface EngineeringBinding { owner:string; sessionId:string; project:Project; task:Task }
export interface EngineeringSandbox {
 id?:string;
 run(input:{command:string}):PromiseLike<{exitCode:number;stdout:string;stderr:string}>;
 readTextFile(input:{path:string}):PromiseLike<string|null>;
 writeTextFile(input:{path:string;content:string}):PromiseLike<unknown>;
}
export interface RuntimeRepository {
 claimRun(owner:string,input:{projectId:string;taskId:string;sessionId:string;sandboxId?:string;parentCallId?:string;rootSessionId?:string;capability:string;idempotencyKey:string}):Promise<{created:boolean;run:EngineeringRun}>;
 recordMutation(owner:string,projectId:string,runId:string):Promise<number>;
 completeRun(owner:string,projectId:string,runId:string,status:'succeeded'|'failed'|'cancelled',error?:string,evidence?:{command:string;cwd:string;exitCode:number;logs:string}):PromiseLike<unknown>;
 recordCheck(owner:string,input:Omit<Check,'id'|'createdAt'>):PromiseLike<unknown>;
 publishArtifact(owner:string,input:Omit<Artifact,'id'|'createdAt'|'contentHash'>):Promise<Artifact>;
}
export type EngineeringOperation =
 | {kind:'bash';command:string;callId:string}
 | {kind:'write';path:string;content:string;callId:string}
 | {kind:'publish';path:string;callId:string}
 | {kind:'check';checkId?:string;callId:string}
 | {kind:'import';files:{source:string;path:string}[];callId:string}
 | {kind:'archive';callId:string};
const quote = (value:string) => `'${value.replaceAll("'", "'\\''")}'`;
const bounded = (value:string) => value.slice(-24_000);
export function projectFilePath(root:string,path:string) {
 if(!path || path.startsWith('/') || path.includes('\\') || path.includes('\0') || path.split('/').some(part=>!part || part==='.' || part==='..' || ['.git','node_modules','.next','dist','build','coverage','__pycache__','.cache'].includes(part))) throw Error('INVALID_PROJECT_PATH');
 return `${root}/${path}`;
}
async function safeFile(sandbox:EngineeringSandbox,root:string,path:string) {
 const absolute=projectFilePath(root,path);
 const canonical=await sandbox.run({command:`realpath -m -- ${quote(absolute)}`});
 if(canonical.exitCode!==0 || canonical.stdout.trim()!==absolute) throw Error('PROJECT_PATH_ESCAPES_ROOT');
 return absolute;
}
export async function validateTextFile(sandbox:EngineeringSandbox,path:string) {
 const script=`import sys\ndata=open(sys.argv[1],'rb').read(262145)\nassert len(data)<=262144,'Text file exceeds 256 KiB'\nassert b'\\x00' not in data,'Text files cannot contain NUL bytes'\ndata.decode('utf-8','strict')`;
 const result=await sandbox.run({command:`python3 -c ${quote(script)} ${quote(path)}`});
 if(result.exitCode!==0) throw Error('TEXT_FILE_REQUIRED_OR_TOO_LARGE');
}
const snapshotScript = `import os,hashlib,stat,struct
h=hashlib.sha256()
def field(value):
 data=value if isinstance(value,bytes) else str(value).encode()
 h.update(struct.pack('!Q',len(data)));h.update(data)
def entry(path):
 meta=os.lstat(path)
 field(path);field(stat.S_IFMT(meta.st_mode));field(stat.S_IMODE(meta.st_mode))
 if stat.S_ISLNK(meta.st_mode): field(os.readlink(path))
 elif stat.S_ISREG(meta.st_mode):
  field(meta.st_size)
  with open(path,'rb') as source:
   for chunk in iter(lambda:source.read(65536),b''): h.update(chunk)
for root,dirs,files in os.walk('.',followlinks=False):
 dirs[:]=sorted(d for d in dirs if d not in ['.git','node_modules','.next','dist','build','coverage','__pycache__','.cache'])
 for d in dirs: entry(os.path.join(root,d))
 for f in sorted(files): entry(os.path.join(root,f))
print(h.hexdigest())`;
// A foreground process owns its descendants. Kill any background children before releasing the lease.
export async function runProjectCommand(sandbox:EngineeringSandbox,root:string,command:string,timeoutSeconds=120) {
 const script=`import subprocess,os,signal,sys\np=subprocess.Popen(['bash','-lc',${JSON.stringify(command)}],cwd=${JSON.stringify(root)},start_new_session=True)\ndef stop(signum,frame):\n try: os.killpg(p.pid,signal.SIGKILL)\n except ProcessLookupError: pass\n sys.exit(130)\nsignal.signal(signal.SIGTERM,stop); signal.signal(signal.SIGINT,stop)\ntry:\n code=p.wait(timeout=${Math.max(1,Math.min(120,timeoutSeconds))})\nexcept subprocess.TimeoutExpired:\n code=124\nfinally:\n try: os.killpg(p.pid,signal.SIGKILL)\n except ProcessLookupError: pass\nsys.exit(code if code>=0 else 128-code)`;
 return sandbox.run({command:`python3 -c ${quote(script)}`});
}
async function snapshot(sandbox:EngineeringSandbox,root:string,timeoutSeconds=120) {
 const result=await runProjectCommand(sandbox,root,`python3 -c ${quote(snapshotScript)}`,timeoutSeconds);
 if(result.exitCode!==0 || !/^[a-f0-9]{64}\s*$/.test(result.stdout)) throw Error('SOURCE_SNAPSHOT_FAILED');
 return result.stdout.trim();
}
export async function executeEngineeringOperation(
 {repository,sandbox,binding,abortSignal,parentCallId,rootSessionId}:{repository:RuntimeRepository;sandbox:EngineeringSandbox;binding:EngineeringBinding;abortSignal?:AbortSignal;parentCallId?:string;rootSessionId?:string},
 operation:EngineeringOperation,
) {
 const {owner,sessionId,project,task}=binding;
 const deadline=Date.now()+240_000;
 const remainingSeconds=()=>{const seconds=Math.floor((deadline-Date.now())/1000);if(seconds<1)throw Error('EXECUTION_TIME_LIMIT');return Math.min(120,seconds);};
 const checks=operation.kind==='check' ? task.requiredChecks.filter(check=>!operation.checkId || check.id===operation.checkId) : [];
 if(operation.kind==='check' && (!checks.length || task.kind!=='implementation')) throw Error('CHECK_NOT_CONFIGURED');
 if(operation.kind==='write' || operation.kind==='publish') projectFilePath(project.workspaceRoot,operation.path);
 if(operation.kind==='write' && Buffer.byteLength(operation.content)>256*1024) throw Error('ARTIFACT_TOO_LARGE');
 if(!operation.callId) throw Error('CALL_ID_REQUIRED');
 const claim=await repository.claimRun(owner,{projectId:project.id,taskId:task.id,sessionId,sandboxId:sandbox.id,parentCallId,rootSessionId,capability:`engineering:${operation.kind}`,idempotencyKey:operation.callId});
 if(!claim.created) return {status:claim.run.status,run:claim.run,replayed:true};
 const run=claim.run;
 let version=run.workspaceVersion;
 try {
  if(abortSignal?.aborted) throw Error('EXECUTION_CANCELLED');
  // Invalidate old checks BEFORE any executable command or write touches files.
  if(operation.kind==='bash' || operation.kind==='write' || operation.kind==='import') version=await repository.recordMutation(owner,project.id,run.id);
  const init=await sandbox.run({command:`mkdir -p -- ${quote(project.workspaceRoot)}`});
  if(init.exitCode!==0) throw Error(`WORKSPACE_INITIALIZATION_FAILED: ${bounded(init.stderr)}`);
  if(operation.kind==='import') {
   if(operation.files.length<1 || operation.files.length>10) throw Error('ATTACHMENT_COUNT_LIMIT');
   const imported=[]; let bytes=0;
   // Validate every input before the first write; partial sandbox writes still remain a failed revision.
   for(const file of operation.files) {
    if(!file.source.startsWith('/workspace/attachments/')) throw Error('ATTACHMENT_SOURCE_REQUIRED');
    const source=await safeFile(sandbox,'/workspace/attachments',file.source.slice('/workspace/attachments/'.length));
    const path=await safeFile(sandbox,project.workspaceRoot,file.path);
    const size=await sandbox.run({command:`wc -c < ${quote(source)}`});
    if(size.exitCode!==0 || !/^\d+$/.test(size.stdout.trim()) || Number(size.stdout.trim())>256*1024) throw Error('ATTACHMENT_TOO_LARGE');
    await validateTextFile(sandbox,source);
    const content=await sandbox.readTextFile({path:source});
    if(content===null || content.includes('\0') || Buffer.byteLength(content)>256*1024) throw Error('TEXT_ATTACHMENT_REQUIRED');
    bytes+=Buffer.byteLength(content);if(bytes>1024*1024) throw Error('ATTACHMENT_TOTAL_LIMIT');
    imported.push({path,content});
   }
   for(const file of imported) {
    if(abortSignal?.aborted) throw Error('EXECUTION_CANCELLED');
    const result=await sandbox.run({command:`mkdir -p -- ${quote(file.path.slice(0,file.path.lastIndexOf('/')))}`});
    if(result.exitCode!==0) throw Error('DIRECTORY_CREATION_FAILED');
    await sandbox.writeTextFile(file);
   }
   await repository.completeRun(owner,project.id,run.id,'succeeded');
   return {status:'succeeded',runId:run.id,workspaceVersion:version,files:operation.files.map(file=>file.path)};
  }
  if(operation.kind==='archive') {
   const script=`import os,zipfile,io,base64,sys\nb=io.BytesIO()\nwith zipfile.ZipFile(b,'w',zipfile.ZIP_DEFLATED) as z:\n for root,dirs,files in os.walk('.'):\n  dirs[:]=sorted(d for d in dirs if d not in ['.git','node_modules','.next','dist','build','coverage','__pycache__','.cache'])\n  for name in sorted(files):\n   path=os.path.join(root,name)\n   if not os.path.islink(path): z.write(path,path[2:])\n   if b.tell()>3*1024*1024: sys.exit(65)\nif b.tell()>3*1024*1024: sys.exit(65)\nprint(base64.b64encode(b.getvalue()).decode())`;
   const result=await runProjectCommand(sandbox,project.workspaceRoot,`python3 -c ${quote(script)}`,remainingSeconds());
   if(result.exitCode!==0) throw Error('SOURCE_ARCHIVE_FAILED_OR_TOO_LARGE');
   const content=result.stdout.trim();
   if(Buffer.from(content,'base64').length>3*1024*1024) throw Error('SOURCE_ARCHIVE_TOO_LARGE');
   const artifact=await repository.publishArtifact(owner,{projectId:project.id,taskId:task.id,runId:run.id,path:'source.zip',kind:'archive-base64',content,workspaceVersion:version});
   await repository.completeRun(owner,project.id,run.id,'succeeded');
   return {status:'succeeded',runId:run.id,workspaceVersion:version,artifact};
  }
  if(operation.kind==='publish') {
   const path=await safeFile(sandbox,project.workspaceRoot,operation.path);
   const size=await sandbox.run({command:`wc -c < ${quote(path)}`});
   if(size.exitCode!==0 || !/^\d+\s*$/.test(size.stdout.trim())) throw Error('FILE_NOT_READABLE');
   if(Number(size.stdout.trim())>256*1024) throw Error('ARTIFACT_TOO_LARGE');
   await validateTextFile(sandbox,path);
   const content=await sandbox.readTextFile({path});
   if(content===null) throw Error('FILE_NOT_READABLE');
   if(Buffer.byteLength(content)>256*1024) throw Error('ARTIFACT_TOO_LARGE');
   const artifact=await repository.publishArtifact(owner,{projectId:project.id,taskId:task.id,runId:run.id,path:operation.path,kind:'text',content,workspaceVersion:version});
   await repository.completeRun(owner,project.id,run.id,'succeeded');
   return {status:'succeeded',runId:run.id,workspaceVersion:version,artifact};
  }
  if(operation.kind==='write') {
   const path=await safeFile(sandbox,project.workspaceRoot,operation.path);
   const parent=path.slice(0,path.lastIndexOf('/'));
   const result=await sandbox.run({command:`mkdir -p -- ${quote(parent)}`});
   if(result.exitCode!==0) throw Error('DIRECTORY_CREATION_FAILED');
   await sandbox.writeTextFile({path,content:operation.content});
   await repository.completeRun(owner,project.id,run.id,'succeeded');
   return {status:'succeeded',runId:run.id,workspaceVersion:version,path:operation.path};
  }
  if(operation.kind==='bash') {
   const result=await runProjectCommand(sandbox,project.workspaceRoot,operation.command,remainingSeconds());
   if(abortSignal?.aborted) throw Error('EXECUTION_CANCELLED');
   const status=result.exitCode===0?'succeeded':'failed';
   await repository.completeRun(owner,project.id,run.id,status,result.exitCode===0?undefined:`Command exited ${result.exitCode}`,{command:operation.command,cwd:project.workspaceRoot,exitCode:result.exitCode,logs:bounded(`${result.stdout}\n${result.stderr}`)});
   return {status,runId:run.id,workspaceVersion:version,cwd:project.workspaceRoot,command:operation.command,exitCode:result.exitCode,stdout:bounded(result.stdout),stderr:bounded(result.stderr)};
  }
  const before=await snapshot(sandbox,project.workspaceRoot,remainingSeconds());
  const outcomes=[];
  for(const check of checks) {
   if(abortSignal?.aborted) throw Error('EXECUTION_CANCELLED');
   let result:{exitCode:number;stdout:string;stderr:string};
   try { result=await runProjectCommand(sandbox,project.workspaceRoot,check.command,remainingSeconds()); }
   catch(error) {
    await repository.recordCheck(owner,{projectId:project.id,taskId:task.id,runId:run.id,checkId:check.id,command:check.command,workspaceVersion:version,exitCode:null,logs:bounded(`cwd: ${project.workspaceRoot}\n${error instanceof Error?error.message:String(error)}`),status:abortSignal?.aborted?'cancelled':'failed'});
    throw error;
   }
   const status=abortSignal?.aborted?'cancelled':result.exitCode===0?'passed':'failed';
   const evidence={projectId:project.id,taskId:task.id,runId:run.id,checkId:check.id,command:check.command,workspaceVersion:version,exitCode:result.exitCode,logs:bounded(`cwd: ${project.workspaceRoot}\n${result.stdout}\n${result.stderr}`),status} as const;
   await repository.recordCheck(owner,evidence);
   outcomes.push(evidence);
  }
  const changed=before!==await snapshot(sandbox,project.workspaceRoot,remainingSeconds());
  if(changed) await repository.recordMutation(owner,project.id,run.id);
  const status=abortSignal?.aborted?'cancelled':outcomes.every(check=>check.status==='passed')&&!changed?'succeeded':'failed';
  await repository.completeRun(owner,project.id,run.id,status,changed?'Checks changed source files; results are stale.':undefined);
  return {status,runId:run.id,workspaceVersion:version,checks:outcomes,exitCode:outcomes[0]?.exitCode,sourceChanged:changed};
 } catch(error) {
  // Persistence failures remain errors. Never turn an unconfirmed write into success.
  const message=error instanceof Error?error.message:String(error);
  if(operation.kind==='check') {
   try { await repository.recordMutation(owner,project.id,run.id); } catch { /* retain unconfirmed failure */ }
  }
  try { await repository.completeRun(owner,project.id,run.id,abortSignal?.aborted?'cancelled':'failed',bounded(message)); } catch { /* original failure is authoritative to caller */ }
  throw error;
 }
}
