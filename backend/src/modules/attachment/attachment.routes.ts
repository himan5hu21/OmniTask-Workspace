import { FastifyInstance } from 'fastify';
import { uploadFiles } from '@/modules/attachment/attachment.controller';

export default async function attachmentRoutes(app: FastifyInstance) {
  app.post('/upload', uploadFiles);
}
