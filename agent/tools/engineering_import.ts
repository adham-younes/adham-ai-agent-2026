import { defineTool } from 'eve/tools';
import { z } from 'zod';
import { engineeringOperation } from '../lib/project-context';
export default defineTool({
 description:'Import actual user-staged text attachments into the active project. Sources must be Eve attachment paths, max 10 files, 256 KiB each and 1 MiB total. Increments source revision.',
 inputSchema:z.object({files:z.array(z.object({source:z.string().startsWith('/workspace/attachments/').max(500),path:z.string().min(1).max(500)})).min(1).max(10)}),
 async execute({files},ctx){return engineeringOperation(ctx,{kind:'import',files});},
});
