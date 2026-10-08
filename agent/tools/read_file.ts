import { defineTool } from 'eve/tools';
import { z } from 'zod';
import { resolveProjectContext } from '../lib/project-context';
import { projectFilePath, validateTextFile } from '@/lib/engineering/runtime';
export default defineTool({
 description:'Read a bounded text file relative to the active project. Legacy conversations may read their session files for analysis.',
 inputSchema:z.object({path:z.string().min(1).max(500)}),
 async execute({path},ctx){
  const context=await resolveProjectContext(ctx);
  const sandbox=context?.sandbox ?? await ctx.getSandbox();
  const root=context?.project.workspaceRoot ?? '/workspace';
  const absolute=projectFilePath(root,path);
  const quoted=`'${absolute.replaceAll("'","'\\''")}'`;
  const result=await sandbox.run({command:`realpath -m -- ${quoted}`});
  if(result.exitCode!==0 || result.stdout.trim()!==absolute) throw Error('PROJECT_PATH_ESCAPES_ROOT');
  const size=await sandbox.run({command:`wc -c < ${quoted}`});
  if(size.exitCode!==0 || Number(size.stdout.trim())>256*1024) throw Error('FILE_NOT_READABLE_OR_TOO_LARGE');
  await validateTextFile(sandbox,absolute);
  return {path,content:await sandbox.readTextFile({path:absolute})};
 },
});
