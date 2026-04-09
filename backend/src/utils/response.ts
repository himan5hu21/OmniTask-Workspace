// src/utils/response.ts
import { FastifyReply } from 'fastify';

type ActionType = 'FETCH' | 'CREATE' | 'UPDATE' | 'DELETE';

export const sendSuccess = (reply: FastifyReply, data: any, action: ActionType = 'FETCH', message?: string) => {
  let statusCode = 200;

  switch (action) {
    case 'CREATE':
      statusCode = 201;
      break;
    case 'DELETE':
      statusCode = data ? 200 : 204;
      break;
    case 'UPDATE':
    case 'FETCH':
      statusCode = 200;
      break;
  }

  return reply.code(statusCode).send({
    success: true,
    message: message || "Operation successful",
    data
  });
};