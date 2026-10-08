import { defineTool } from 'eve/tools';
import { z } from 'zod';
import { engineeringOperation } from '../lib/project-context';
export default defineTool({
 description:'Run all owner-configured acceptance checks against one source revision. Records exact commands, cwd, exit codes and logs. Changed source invalidates results. Cannot replace configured commands.',
 inputSchema:z.object({}),
 async execute(_input,ctx){return engineeringOperation(ctx,{kind:'check'});},
});
