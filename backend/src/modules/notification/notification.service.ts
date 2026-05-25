import { prisma } from "@/lib/database";
import { AppError } from "@/utils/AppError";
import { HttpStatus } from "@/types/api";
import type { Server } from "socket.io";

type NotificationType =
  | "TASK_ASSIGNED"
  | "TASK_COMMENT_MENTION"
  | "CHANNEL_MESSAGE_MENTION"
  | "DIRECT_MESSAGE";

type NotificationEntityType = "TASK" | "CHANNEL" | "DM";

type CreateNotificationInput = {
  userId: string;
  orgId?: string | null;
  actorUserId?: string | null;
  type: NotificationType;
  entityType: NotificationEntityType;
  entityId: string;
  title: string;
  body: string;
  metadata?: Record<string, unknown> | null;
};

type NotificationListOptions = {
  page?: number;
  limit?: number;
  unreadOnly?: boolean;
};

export class NotificationService {
  private static getHref(notification: {
    entity_type: NotificationEntityType;
    entity_id: string;
    org_id: string | null;
    metadata: any;
  }) {
    const metadata = notification.metadata ?? {};

    if (notification.entity_type === "TASK") {
      const channelId = metadata.channelId as string | undefined;
      if (notification.org_id && channelId) {
        return `/organizations/${notification.org_id}/channels/${channelId}?tab=tasks`;
      }
    }

    if (notification.entity_type === "CHANNEL") {
      const channelId = metadata.channelId as string | undefined;
      if (notification.org_id && channelId) {
        return `/organizations/${notification.org_id}/channels/${channelId}`;
      }
    }

    if (notification.entity_type === "DM") {
      const conversationId = metadata.conversationId as string | undefined;
      if (conversationId) {
        return notification.org_id
          ? `/messages/${conversationId}?orgId=${notification.org_id}`
          : `/messages/${conversationId}`;
      }
    }

    return "/notifications";
  }

  private static formatNotification(notification: any) {
    return {
      id: notification.id,
      type: notification.type,
      entityType: notification.entity_type,
      entityId: notification.entity_id,
      title: notification.title,
      body: notification.body,
      metadata: notification.metadata,
      isRead: notification.is_read,
      readAt: notification.read_at,
      createdAt: notification.created_at,
      href: this.getHref(notification),
      actor: notification.actor
        ? {
            id: notification.actor.id,
            name: notification.actor.name,
            email: notification.actor.email,
            avatar_url: notification.actor.avatar_url,
          }
        : null,
      organization: notification.organization
        ? {
            id: notification.organization.id,
            name: notification.organization.name,
          }
        : null,
    };
  }

  static async create(input: CreateNotificationInput, io?: Server) {
    if (input.userId === input.actorUserId) return null;

    const notification = await prisma.notification.create({
      data: {
        user_id: input.userId,
        org_id: input.orgId ?? null,
        actor_user_id: input.actorUserId ?? null,
        type: input.type,
        entity_type: input.entityType,
        entity_id: input.entityId,
        title: input.title,
        body: input.body,
        metadata: (input.metadata as any) ?? null,
      },
      include: {
        actor: { select: { id: true, name: true, email: true, avatar_url: true } },
        organization: { select: { id: true, name: true } },
      },
    });

    const payload = this.formatNotification(notification);
    if (io) {
      io.to(`user:${input.userId}`).emit("notification:created", payload);
    }

    return payload;
  }

  static async listForUser(userId: string, options: NotificationListOptions = {}) {
    const { page = 1, limit = 20, unreadOnly = false } = options;
    const skip = (page - 1) * limit;
    const where = {
      user_id: userId,
      ...(unreadOnly ? { is_read: false } : {}),
    };

    const [items, total, unreadCount] = await Promise.all([
      prisma.notification.findMany({
        where,
        orderBy: { created_at: "desc" },
        skip,
        take: limit,
        include: {
          actor: { select: { id: true, name: true, email: true, avatar_url: true } },
          organization: { select: { id: true, name: true } },
        },
      }),
      prisma.notification.count({ where }),
      prisma.notification.count({ where: { user_id: userId, is_read: false } }),
    ]);

    return {
      items: items.map((item) => this.formatNotification(item)),
      pagination: {
        total,
        page,
        limit,
        totalPages: Math.ceil(total / limit),
        hasMore: page < Math.ceil(total / limit),
      },
      unreadCount,
    };
  }

  static async listForOrganization(userId: string, orgId: string, options: NotificationListOptions = {}) {
    const membership = await prisma.organizationMember.findUnique({
      where: { organization_id_user_id: { organization_id: orgId, user_id: userId } },
    });
    if (!membership) throw new AppError("You are not a member of this organization", HttpStatus.FORBIDDEN);

    const { page = 1, limit = 20, unreadOnly = false } = options;
    const skip = (page - 1) * limit;
    const where = {
      user_id: userId,
      org_id: orgId,
      ...(unreadOnly ? { is_read: false } : {}),
    };

    const [items, total, unreadCount] = await Promise.all([
      prisma.notification.findMany({
        where,
        orderBy: { created_at: "desc" },
        skip,
        take: limit,
        include: {
          actor: { select: { id: true, name: true, email: true, avatar_url: true } },
          organization: { select: { id: true, name: true } },
        },
      }),
      prisma.notification.count({ where }),
      prisma.notification.count({ where: { user_id: userId, org_id: orgId, is_read: false } }),
    ]);

    return {
      items: items.map((item) => this.formatNotification(item)),
      pagination: {
        total,
        page,
        limit,
        totalPages: Math.ceil(total / limit),
        hasMore: page < Math.ceil(total / limit),
      },
      unreadCount,
    };
  }

  static async markRead(notificationId: string, userId: string, io?: Server) {
    const notification = await prisma.notification.findFirst({
      where: { id: notificationId, user_id: userId },
    });
    if (!notification) throw new AppError("Notification not found", HttpStatus.NOT_FOUND);

    if (notification.is_read) return { success: true };

    await prisma.notification.update({
      where: { id: notificationId },
      data: { is_read: true, read_at: new Date() },
    });

    if (io) {
      io.to(`user:${userId}`).emit("notification:read", { id: notificationId, orgId: notification.org_id });
    }

    return { success: true };
  }

  static async markAllRead(userId: string, io?: Server) {
    await prisma.notification.updateMany({
      where: { user_id: userId, is_read: false },
      data: { is_read: true, read_at: new Date() },
    });

    if (io) {
      io.to(`user:${userId}`).emit("notification:read_all", { orgId: null });
    }

    return { success: true };
  }

  static async markAllReadForOrganization(userId: string, orgId: string, io?: Server) {
    const membership = await prisma.organizationMember.findUnique({
      where: { organization_id_user_id: { organization_id: orgId, user_id: userId } },
    });
    if (!membership) throw new AppError("You are not a member of this organization", HttpStatus.FORBIDDEN);

    await prisma.notification.updateMany({
      where: { user_id: userId, org_id: orgId, is_read: false },
      data: { is_read: true, read_at: new Date() },
    });

    if (io) {
      io.to(`user:${userId}`).emit("notification:read_all", { orgId });
    }

    return { success: true };
  }

  static async getSummary(userId: string) {
    const [globalUnread, perOrg] = await Promise.all([
      prisma.notification.count({ where: { user_id: userId, is_read: false } }),
      prisma.notification.groupBy({
        by: ["org_id"],
        where: { user_id: userId, is_read: false, org_id: { not: null } },
        _count: { _all: true },
      }),
    ]);

    return {
      unreadCount: globalUnread,
      organizations: Object.fromEntries(
        perOrg
          .filter((item) => item.org_id)
          .map((item) => [item.org_id as string, item._count._all])
      ),
    };
  }

  static extractMentionedUserIds(content?: string | null) {
    if (!content) return [];

    const ids = new Set<string>();
    const patterns = [
      /data-mention-id=["']([^"']+)["']/gi,
      /@\[.*?\]\(([^)]+)\)/gi,
      /data-user-id=["']([^"']+)["']/gi,
    ];

    for (const pattern of patterns) {
      let match: RegExpExecArray | null;
      while ((match = pattern.exec(content)) !== null) {
        if (match[1]) {
          ids.add(match[1]);
        }
      }
    }

    return Array.from(ids);
  }
}
