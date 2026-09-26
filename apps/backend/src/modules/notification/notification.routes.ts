import { FastifyPluginAsync } from "fastify";
import { ZodTypeProvider } from "fastify-type-provider-zod";
import { z } from "zod";
import { createSchema } from "@/utils/swagger";
import * as notificationController from "@/modules/notification/notification.controller";

const notificationRoutes: FastifyPluginAsync = async (fastify) => {
  const app = fastify.withTypeProvider<ZodTypeProvider>();

  app.get("/notifications", createSchema({
    description: "Get notifications for current user",
    tags: ["Notifications"],
    querystring: notificationController.notificationListQuerySchema,
  }), notificationController.getNotifications);

  app.get("/organizations/:orgId/notifications", createSchema({
    description: "Get notifications for current user within an organization",
    tags: ["Notifications"],
    params: z.object({ orgId: z.cuid() }),
    querystring: notificationController.notificationListQuerySchema,
  }), notificationController.getOrganizationNotifications);

  app.get("/notifications/summary", createSchema({
    description: "Get notification unread summary",
    tags: ["Notifications"],
  }), notificationController.getNotificationSummary);

  app.post("/notifications/:id/read", createSchema({
    description: "Mark one notification as read",
    tags: ["Notifications"],
    params: z.object({ id: z.cuid() }),
  }), notificationController.markNotificationRead);

  app.post("/notifications/read-all", createSchema({
    description: "Mark all notifications as read",
    tags: ["Notifications"],
  }), notificationController.markAllNotificationsRead);

  app.post("/organizations/:orgId/notifications/read-all", createSchema({
    description: "Mark all organization notifications as read",
    tags: ["Notifications"],
    params: z.object({ orgId: z.cuid() }),
  }), notificationController.markAllOrganizationNotificationsRead);
};

export default notificationRoutes;
