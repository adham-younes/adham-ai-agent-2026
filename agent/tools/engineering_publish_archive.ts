import { defineTool } from 'eve/tools';
import { z } from 'zod';
import { engineeringOperation } from '../lib/project-context';
export default defineTool({
 description:'Publish a real ZIP source archive of the active project, excluding Git, dependencies and build/cache outputs; max 3 MiB. Persists downloadable base64 archive content and revision.',
 inputSchema:z.object({}),
 async execute(_input,ctx){return engineeringOperation(ctx,{kind:'archive'});},
});
