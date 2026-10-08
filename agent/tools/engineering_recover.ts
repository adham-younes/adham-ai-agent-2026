import { defineTool } from 'eve/tools';
import { z } from 'zod';
import { resolveEngineeringBinding } from '../lib/project-context';
import { recoverExpiredRun } from '@/lib/engineering/repository';
export default defineTool({
 description:'Recover an expired project lease only after stopping its actual bound sandbox. Preserves workspace files and marks the old attempt failed. Root session only; retry with a fresh attempt afterward.',
 inputSchema:z.object({}),
 async execute(_input,ctx){
  if(ctx.session.parent) throw Error('ROOT_RECOVERY_REQUIRED');
  const binding=await resolveEngineeringBinding(ctx);
  if(!binding) throw Error('PROJECT_BINDING_REQUIRED');
  const {project,owner}=binding;
  if(!project.activeRunId || !project.leaseExpiresAt || new Date(project.leaseExpiresAt).getTime()>Date.now()) throw Error('NO_EXPIRED_PROJECT_LEASE');
  const sandbox=await ctx.getSandbox();
  if(project.sandboxId!==sandbox.id) throw Error('BOUND_SANDBOX_REQUIRED');
  await sandbox.stop();
  await recoverExpiredRun(owner,project.id,project.activeRunId);
  return {status:'recovered',oldRunId:project.activeRunId,message:'Sandbox stopped and old attempt marked failed. Start a new turn to retry.'};
 },
});
