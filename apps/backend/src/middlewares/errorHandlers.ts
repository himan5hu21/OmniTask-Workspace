// src/middlewares/errorHandler.ts
import { Prisma } from '@/generated/prisma/client';
import { FastifyInstance, FastifyError, FastifyReply, FastifyRequest } from 'fastify';
import { AppError } from '@/utils/AppError';
import { ZodError } from 'zod'; // Zod ne ahiya import karo
import { HttpStatus, ApiError } from '@/types/api';

export function setupErrorHandler(app: FastifyInstance) {
  app.setErrorHandler((error: any, request: FastifyRequest, reply: FastifyReply) => {

    // 1. AppError (Custom Application Errors)
    // instanceof ni jagya e error.name check karvu vadhare safe chhe
    if (error.name === 'AppError' || error instanceof AppError) {
      const apiError = error.toApiResponse();
      return reply.status(error.statusCode || HttpStatus.BAD_REQUEST).send(apiError);
    }

    // 2. Zod Validation Errors (Globally Handled)
    // Have Zod ni koi pan error aakhi app ma aavse, to te ahiya j format thai jase
    if (error instanceof ZodError) {
      const formattedErrors = error.issues.reduce((acc: Record<string, string>, err) => {
        acc[err.path.join('.')] = err.message;
        return acc;
      }, {});
      const apiError: ApiError = {
        success: false,
        message: 'Validation failed',
        errors: formattedErrors
      };
      return reply.status(HttpStatus.BAD_REQUEST).send(apiError);
    }

    // 3. Prisma Unique Constraint Error
    if (error instanceof Prisma.PrismaClientKnownRequestError) {
      if (error.code === 'P2002') {
        const targets = error.meta?.target as string[];
        const field: string = (Array.isArray(targets) && targets[0]) ? String(targets[0]) : 'unknown_field';
        const apiError: ApiError = {
          success: false,
          message: 'Validation failed',
          errors: {
            [field]: "UNIQUE"
          }
        };
        return reply.status(HttpStatus.BAD_REQUEST).send(apiError);
      }
    }

    // 4. Schema Validation Errors (Je already chhe e)
    if (error.validation) {
      const formattedErrors: Record<string, string> = {};
      error.validation.forEach((err: any) => {
        let field = err.instancePath.replace('/', '');
        if (!field && err.params.missingProperty) field = err.params.missingProperty as string;
        formattedErrors[field] = "INVALID";
      });
      const apiError: ApiError = {
        success: false,
        message: 'Validation failed',
        errors: formattedErrors
      };
      return reply.status(HttpStatus.BAD_REQUEST).send(apiError);
    }

    // 5. Internal Server Errors
    const stackArray = error.stack?.split('\n') || [];

    // node_modules vagar no clean stack
    const cleanStackArray = stackArray.filter((line: string) => !line.includes('node_modules'));

    // Error exactly kya file ma thi aavi te extract karvu (Usually 2nd line par hoy chhe)
    // .trim() thi aagal ni extra spaces nikal jay chhe
    const exactLocation = cleanStackArray.length > 1 ? cleanStackArray[1].trim() : 'Unknown location';
    const cleanStackString = cleanStackArray.join('\n');

    // Terminal ma mast design mate template literal no use
    const formattedErrorLog = `
[ UNHANDLED SERVER ERROR ]
--------------------------------------------------
Route    : ${request.method} ${request.url}
Message  : ${error.message}
Location : ${exactLocation}
--------------------------------------------------
Stack Trace:
${cleanStackString}
`;

    request.log.error(formattedErrorLog);

    const apiError: ApiError = {
      success: false,
      message: "Internal Server Error"
    };
    return reply.status(HttpStatus.INTERNAL_SERVER_ERROR).send(apiError);
  });
}
