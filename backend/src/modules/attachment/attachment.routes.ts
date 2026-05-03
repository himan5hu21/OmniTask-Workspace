import { FastifyInstance } from 'fastify';
import { uploadFiles } from '@/modules/attachment/attachment.controller';
import { createSchema } from '@/utils/swagger';
import { ZodTypeProvider } from 'fastify-type-provider-zod';


export default async function attachmentRoutes(fastify: FastifyInstance) {

  const app = fastify.withTypeProvider<ZodTypeProvider>();

  app.post('/upload', {
    ...createSchema({
      description: 'Upload one or more files',
      tags: ['Attachments'],
    }),
    // Swagger doesn't automatically detect multipart schemas well without extra config, 
    // but at least it shows up in the UI.
  }, uploadFiles);
}

