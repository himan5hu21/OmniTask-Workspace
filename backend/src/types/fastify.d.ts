// src/types/fastify.d.ts
import 'fastify';

declare module 'fastify' {
  // FastifyRouteConfig ane FastifyContextConfig banne ma aapi daiye
  interface FastifyContextConfig {
    isPublic?: boolean;
  }
  
  interface FastifyRouteConfig {
    isPublic?: boolean;
  }
}