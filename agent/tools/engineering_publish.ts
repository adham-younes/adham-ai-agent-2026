import { defineTool } from 'eve/tools';
import { z } from 'zod';
import { engineeringOperation } from '../lib/project-context';
export default defineTool({
 description:'Publish an actual UTF-8 file from the active sandbox project, max 256 KiB. Reads the file itself and saves its content/revision under the project publication quota.',
 inputSchema:z.object({path:z.string().min(1).max(500)}),
 async execute({path},ctx){return engineeringOperation(ctx,{kind:'publish',path});},
});
