import { defineTool } from 'eve/tools';
import { z } from 'zod';
import { engineeringOperation } from '../lib/project-context';
export default defineTool({
 description:'Write a UTF-8 file relative to the active project root, under its execution lease. This increments the source revision; publish it separately when ready.',
 inputSchema:z.object({path:z.string().min(1).max(500),content:z.string().max(256*1024)}),
 async execute({path,content},ctx){return engineeringOperation(ctx,{kind:'write',path,content});},
});
