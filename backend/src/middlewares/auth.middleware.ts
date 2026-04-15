// src/middlewares/auth.middleware.ts
import { FastifyReply, FastifyRequest } from 'fastify';
import "@fastify/jwt";

export async function verifyToken(request: FastifyRequest, reply: FastifyReply) {
  try {
    if (request.routeOptions.config?.isPublic) {
      return; // Token check karya vagar aagal java do
    }
    // Aa function header mathi 'Bearer <token>' leshe ane verify karshe
    // Verify thaya pachi token no payload automatic `request.user` ma set thai jashe
    await request.jwtVerify();
  } catch (err) {
    // Jo token missing hoy, expire thai gayu hoy ke invalid hoy
    return reply.status(401).send({
      success: false,
      message: "You must be logged in to access this route",
      errors: {
        token: "UNAUTHORIZED"
      }
    });
  }
}