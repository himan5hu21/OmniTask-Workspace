// src/middlewares/auth.middleware.ts
import { FastifyReply, FastifyRequest } from 'fastify';
import "@fastify/jwt";
import { HttpStatus } from '@/types/api';
import { prisma } from '@/lib/database';
import { sendError } from '@/utils/response';

declare module 'fastify' {
  interface FastifyRequest {
    orgMembership?: {
      role: string;
      role_updated_at: Date;
    } | null;
  }
}

declare module '@fastify/jwt' {
  interface FastifyJWT {
    user: {
      userId: string;
      email: string;
      name: string;
      tokenVersion: number;
      is_superadmin: boolean;
      iat: number;
    };
  }
}

const extractOrgId = (request: FastifyRequest) => {
  return (
    (request.params as any)?.org_id ||
    (request.body as any)?.org_id ||
    (request.query as any)?.org_id
  );
};

export async function verifyToken(request: FastifyRequest, reply: FastifyReply) {
  try {
    if (request.routeOptions.config?.isPublic) {
      return; // Token check karya vagar aagal java do
    }
    // Aa function header mathi 'Bearer <token>' leshe ane verify karshe
    // Verify thaya pachi token no payload automatic `request.user` ma set thai jashe
    await request.jwtVerify();

    const orgId = extractOrgId(request);

    // OPTIMIZATION: Parallel DB Hits (Using findUnique for User)
    const [user, membership] = await Promise.all([
      prisma.user.findUnique({
        where: { id: request.user.userId },
        select: { id: true, token_version: true, is_active: true, deleted_at: true }
      }),
      orgId 
        ? prisma.organizationMember.findUnique({
            where: { organization_id_user_id: { organization_id: orgId, user_id: request.user.userId } },
            select: { role: true, role_updated_at: true }
          })
        : Promise.resolve(null)
    ]);

    if (!user || user.deleted_at || !user.is_active) {
      return sendError(reply, HttpStatus.UNAUTHORIZED, "Account is inactive or has been deleted");
    }

    // 3. Check token version for immediate revocation
    if (request.user.tokenVersion !== user.token_version) {
      return sendError(reply, HttpStatus.UNAUTHORIZED, "Session has been revoked", { token: "REVOKED" });
    }

    // 4. Role Stale Check & Org Membership (Early Guard)
    if (orgId) {
      if (!membership) {
        return sendError(reply, HttpStatus.FORBIDDEN, "Not a member of this organization", { org: "NOT_MEMBER" });
      }

      // Attach to request for downstream use (authorization/can() layer)
      request.orgMembership = membership;

      // If JWT issued before role change -> invalidate
      if (new Date(request.user.iat * 1000) < membership.role_updated_at) {
        return sendError(reply, HttpStatus.UNAUTHORIZED, "Roles have changed. Please refresh session.", { token: "ROLES_STALE" });
      }
    }

  } catch (err) {
    return sendError(reply, HttpStatus.UNAUTHORIZED, "You must be logged in to access this route", { token: "UNAUTHORIZED" });
  }
}