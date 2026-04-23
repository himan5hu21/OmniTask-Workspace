import { FastifyRequest, FastifyReply } from 'fastify';
import { StorageService } from '@/services/storage.service';
import { AttachmentService } from '@/services/attachment.service';
import { sendSuccess } from '@/utils/response';
import { AppError } from '@/utils/AppError';
import { HttpStatus } from '@/types/api';

export const uploadFiles = async (request: FastifyRequest, reply: FastifyReply) => {
  const parts = request.files();
  const results = [];

  for await (const part of parts) {
    if (part.type !== 'file') continue;

    const buffer = await part.toBuffer();
    const saved = await StorageService.saveFile({
      filename: part.filename,
      buffer
    });

    results.push({
      ...saved,
      mime_type: part.mimetype,
      type: AttachmentService.getAttachmentType(part.mimetype)
    });
  }

  if (results.length === 0) {
    throw new AppError('No files uploaded', HttpStatus.BAD_REQUEST);
  }

  return sendSuccess(reply, { files: results }, 'CREATE', 'Files uploaded successfully');
};
