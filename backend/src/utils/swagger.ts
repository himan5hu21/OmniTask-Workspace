import { z } from 'zod';

/**
 * Helper to wrap Zod schemas in the standard API response format:
 * { success: boolean, message: string, data: T }
 */
const wrapResponse = (dataSchema?: z.ZodTypeAny) => {
  return z.object({
    success: z.boolean().default(true),
    message: z.string().optional(),
    // If a data schema is provided, include it in the 'data' field
    ...(dataSchema ? { data: dataSchema } : {}),
  });
};

/**
 * Helper to create a consistent route schema for Swagger documentation
 * Automatically wraps responses in the standard API format.
 */
export const createSchema = (options: {
  description: string;
  tags: string[];
  body?: z.ZodSchema;
  params?: z.ZodSchema;
  querystring?: z.ZodSchema;
  headers?: z.ZodSchema;
  response?: Record<number, z.ZodTypeAny>;
}) => {
  // Build the base schema object dynamically
  const schemaObj: any = {
    description: options.description,
    tags: options.tags,
  };

  if (options.body) schemaObj.body = options.body;
  if (options.params) schemaObj.params = options.params;
  if (options.querystring) schemaObj.querystring = options.querystring;
  if (options.headers) schemaObj.headers = options.headers;

  // ONLY attach 'response' if it was explicitly provided
  if (options.response && Object.keys(options.response).length > 0) {
    const formattedResponses: Record<number, z.ZodSchema> = {};
    for (const [statusCode, schema] of Object.entries(options.response)) {
      formattedResponses[Number(statusCode)] = wrapResponse(schema);
    }
    schemaObj.response = formattedResponses;
  }

  return { schema: schemaObj };
};

/**
 * Common Zod schemas for reuse
 */
export const CommonSchemas = {
  MessageResponse: z.object({
    message: z.string(),
  }),
  ErrorResponse: z.object({
    message: z.string(),
    error: z.string().optional(),
    statusCode: z.number(),
  }),
};
