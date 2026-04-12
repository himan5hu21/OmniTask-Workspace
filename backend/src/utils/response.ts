// src/utils/response.ts
import { FastifyReply } from 'fastify';
import { HttpStatus } from '@/types/api';

type ActionType = 'FETCH' | 'CREATE' | 'UPDATE' | 'DELETE';

export const sendSuccess = (reply: FastifyReply, data: any, action: ActionType = 'FETCH', message?: string) => {
  let statusCode: HttpStatus = HttpStatus.OK;

  switch (action) {
    case 'CREATE':
      statusCode = HttpStatus.CREATED;
      break;
    case 'DELETE':
      statusCode = data ? HttpStatus.OK : HttpStatus.NO_CONTENT;
      break;
    case 'UPDATE':
    case 'FETCH':
      statusCode = HttpStatus.OK;
      break;
  }

  return reply.code(statusCode).send({
    success: true,
    message: message || "Operation successful",
    data
  });
};