// src/middlewares/auth.middleware.ts
import { FastifyReply, FastifyRequest } from 'fastify';
import "@fastify/jwt";
import { HttpStatus } from '@/types/api';
import { prisma } from '@/lib/database';

export async function verifyToken(request: FastifyRequest, reply: FastifyReply) {
  try {
    if (request.routeOptions.config?.isPublic) {
      return; // Token check karya vagar aagal java do
    }
    // Aa function header mathi 'Bearer <token>' leshe ane verify karshe
    // Verify thaya pachi token no payload automatic `request.user` ma set thai jashe
    await request.jwtVerify();

    // ADDED SECURITY CHECK: Ensure user is still alive/active in DB
    const user = await prisma.user.findFirst({
      where: { 
        id: (request.user as any).userId,
        deleted_at: null,
        is_active: true
      }
    });

    if (!user) {
      return reply.status(HttpStatus.UNAUTHORIZED).send({
        success: false,
        message: "Account is inactive or has been deleted",
      });
    }

  } catch (err) {
    // Jo token missing hoy, expire thai gayu hoy ke invalid hoy
    return reply.status(HttpStatus.UNAUTHORIZED).send({
      success: false,
      message: "You must be logged in to access this route",
      errors: { token: "UNAUTHORIZED" }
    });
  }
}