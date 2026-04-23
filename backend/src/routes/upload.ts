import { FastifyInstance } from 'fastify';
import { uploadFiles } from '@/controllers/upload.controller';

export default async function uploadRoutes(app: FastifyInstance) {
  app.post('/upload', uploadFiles);
}
