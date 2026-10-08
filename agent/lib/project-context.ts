import * as repository from '@/lib/engineering/repository';
import { executeEngineeringOperation, type EngineeringOperation, type EngineeringSandbox } from '@/lib/engineering/runtime';

export interface ProjectRuntimeContext {
 session:{id:string;auth:{current:{principalId:string;principalType?:string;attributes?:Record<string,unknown>}|null};parent?:{rootSessionId:string;sessionId:string;callId:string}|null};
 callId?:string; abortSignal?:AbortSignal;
 getSandbox():Promise<EngineeringSandbox & {stop():PromiseLike<void>}>;
}
/** IDs originate in Eve's authenticated session lineage, never model arguments. */
export async function resolveEngineeringBinding(ctx:ProjectRuntimeContext) {
 const principal=ctx.session.auth.current;
 if(!principal || principal.principalType==='runtime') return null;
 const sessionId=ctx.session.parent?.rootSessionId ?? ctx.session.id;
 let project=await repository.getProjectBySession(principal.principalId,sessionId);
 const requestedProject=principal.attributes?.engineeringProjectId;
 const requestedTask=principal.attributes?.engineeringTaskId;
 if(ctx.session.parent && (typeof requestedProject!=='string' || typeof requestedTask!=='string')) throw Error('PARENT_TASK_AUTHORITY_REQUIRED');
 // These attributes are emitted only by the channel after authenticated ownership checks.
 if(typeof requestedProject==='string' && typeof requestedTask==='string') {
  if(project && project.id!==requestedProject) throw Error('SESSION_PROJECT_CONFLICT');
  project=await repository.bindProjectSession(principal.principalId,requestedProject,sessionId);
  if(ctx.session.parent && project.activeTaskId && project.activeTaskId!==requestedTask) throw Error('PARENT_TASK_BINDING_CHANGED');
  if(project.activeTaskId!==requestedTask) {
   await repository.setActiveTask(principal.principalId,project.id,requestedTask);
   project={...project,activeTaskId:requestedTask};
  }
 }
 if(!project) return null;
 if(!project.activeTaskId) throw Error('ACTIVE_ENGINEERING_TASK_REQUIRED');
 const task=await repository.getTask(principal.principalId,project.id,project.activeTaskId);
 if(!task) throw Error('ENGINEERING_TASK_NOT_FOUND');
 return {owner:principal.principalId,sessionId,project,task};
}
export async function resolveProjectContext(ctx:ProjectRuntimeContext) {
 const binding=await resolveEngineeringBinding(ctx);
 if(!binding) return null;
 const sandbox=await ctx.getSandbox();
 if(ctx.session.parent && binding.project.sandboxId && binding.project.sandboxId!==sandbox.id) throw Error('SHARED_PARENT_SANDBOX_REQUIRED');
 return {...binding,sandbox};
}
export async function engineeringOperation(ctx:ProjectRuntimeContext,operation:EngineeringOperation extends infer O ? O extends EngineeringOperation ? Omit<O,'callId'> : never : never) {
 const context=await resolveProjectContext(ctx);
 if(!context) throw Error('PROJECT_BINDING_REQUIRED: Legacy conversations can analyze; bind a project task before executing changes.');
 return executeEngineeringOperation({repository,sandbox:context.sandbox,binding:context,abortSignal:ctx.abortSignal,parentCallId:ctx.session.parent?.callId,rootSessionId:ctx.session.parent?.rootSessionId ?? ctx.session.id},{...operation,callId:ctx.callId ?? ''} as EngineeringOperation);
}
