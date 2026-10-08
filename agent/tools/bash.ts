import { defineTool } from 'eve/tools';
import { z } from 'zod';
import { engineeringOperation } from '../lib/project-context';
export default defineTool({
 description:'Execute Bash in the active bound project. Every command holds the project lease and invalidates old check evidence; use engineering_check for approved acceptance checks.',
 inputSchema:z.object({command:z.string().min(1).max(20_000)}),
 async execute({command},ctx){return engineeringOperation(ctx,{kind:'bash',command});},
});
