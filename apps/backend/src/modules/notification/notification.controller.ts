import { FastifyReply, FastifyRequest } from "fastify";
import { z } from "zod";
import { NotificationService } from "@/modules/notification/notification.service";
import { sendSuccess } from "@/utils/response";

export const notificationListQuerySchema = z.object({
  page: z.coerce.number().int().min(1).default(1),
  limit: z.coerce.number().int().min(1).max(100).default(20),
  unreadOnly: z.coerce.boolean().default(false),
});

export const getNotifications = async (request: FastifyRequest, reply: FastifyReply) => {
  const user = (request as any).user;
  const query = notificationListQuerySchema.parse(request.query ?? {});
  const data = await NotificationService.listForUser(user.userId, query);
  return sendSuccess(reply, data, "FETCH", "Notifications retrieved successfully");
};

export const getOrganizationNotifications = async (request: FastifyRequest, reply: FastifyReply) => {
  const user = (request as any).user;
  const { orgId } = request.params as { orgId: string };
  const query = notificationListQuerySchema.parse(request.query ?? {});
  const data = await NotificationService.listForOrganization(user.userId, orgId, query);
  return sendSuccess(reply, data, "FETCH", "Organization notifications retrieved successfully");
};

export const markNotificationRead = async (request: FastifyRequest, reply: FastifyReply) => {
  const user = (request as any).user;
  const { id } = request.params as { id: string };
  const data = await NotificationService.markRead(id, user.userId, request.server.io);
  return sendSuccess(reply, data, "UPDATE", "Notification marked as read");
};

export const markAllNotificationsRead = async (request: FastifyRequest, reply: FastifyReply) => {
  const user = (request as any).user;
  const data = await NotificationService.markAllRead(user.userId, request.server.io);
  return sendSuccess(reply, data, "UPDATE", "All notifications marked as read");
};

export const markAllOrganizationNotificationsRead = async (request: FastifyRequest, reply: FastifyReply) => {
  const user = (request as any).user;
  const { orgId } = request.params as { orgId: string };
  const data = await NotificationService.markAllReadForOrganization(user.userId, orgId, request.server.io);
  return sendSuccess(reply, data, "UPDATE", "Organization notifications marked as read");
};

export const getNotificationSummary = async (request: FastifyRequest, reply: FastifyReply) => {
  const user = (request as any).user;
  const data = await NotificationService.getSummary(user.userId);
  return sendSuccess(reply, data, "FETCH", "Notification summary retrieved successfully");
};
