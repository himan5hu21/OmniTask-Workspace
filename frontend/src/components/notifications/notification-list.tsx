"use client";

import Link from "next/link";
import { Bell, BellRing, CheckCheck } from "lucide-react";
import { useMemo, useState } from "react";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";
import type { NotificationItem } from "@/api/notifications";

type NotificationListProps = {
  title: string;
  description: string;
  items: NotificationItem[];
  showOrganization?: boolean;
  isMarkingAll?: boolean;
  onMarkRead: (notification: NotificationItem) => void;
  onMarkAllRead: () => void;
};

export function NotificationList({
  title,
  description,
  items,
  showOrganization = false,
  isMarkingAll = false,
  onMarkRead,
  onMarkAllRead,
}: NotificationListProps) {
  const [optimisticReadIds, setOptimisticReadIds] = useState<Record<string, boolean>>({});

  const hydratedItems = useMemo(
    () =>
      items.map((item) => ({
        ...item,
        isRead: item.isRead || optimisticReadIds[item.id] === true,
      })),
    [items, optimisticReadIds]
  );

  return (
    <div className="flex h-full min-h-0 flex-col bg-background">
      <div className="border-b border-border bg-card px-6 py-5 lg:px-8">
        <div className="flex items-start justify-between gap-4">
          <div>
            <h1 className="text-2xl font-bold tracking-tight text-foreground">{title}</h1>
            <p className="mt-1 text-sm text-muted-foreground">{description}</p>
          </div>
          <Button
            type="button"
            variant="outline"
            onClick={onMarkAllRead}
            disabled={isMarkingAll || hydratedItems.every((item) => item.isRead)}
            className="shrink-0"
          >
            <CheckCheck className="mr-2 h-4 w-4" />
            Mark all as read
          </Button>
        </div>
      </div>

      <div className="flex-1 overflow-y-auto px-6 py-5 lg:px-8">
        {hydratedItems.length === 0 ? (
          <div className="flex min-h-[50vh] items-center justify-center">
            <div className="w-full max-w-2xl rounded-3xl border border-border bg-card/80 p-8 shadow-sm">
              <div className="mb-5 inline-flex rounded-full border border-primary/20 bg-primary/10 px-3 py-1 text-[11px] font-semibold uppercase tracking-[0.18em] text-primary">
                All caught up
              </div>
              <div className="flex items-start gap-4">
                <div className="flex h-14 w-14 shrink-0 items-center justify-center rounded-2xl border border-border bg-muted/40 text-primary">
                  <Bell className="h-6 w-6" />
                </div>
                <div className="space-y-2">
                  <h2 className="text-2xl font-bold tracking-tight text-foreground">No notifications yet</h2>
                  <p className="max-w-xl text-sm leading-6 text-muted-foreground">
                    New assignments and mentions will appear here.
                  </p>
                </div>
              </div>
            </div>
          </div>
        ) : (
          <div className="space-y-3">
            {hydratedItems.map((item) => (
              <Link
                key={item.id}
                href={item.href}
                onClick={() => {
                  if (!item.isRead) {
                    setOptimisticReadIds((prev) => ({ ...prev, [item.id]: true }));
                    onMarkRead(item);
                  }
                }}
                className={cn(
                  "block rounded-2xl border p-4 transition-all hover:border-primary/30 hover:bg-card",
                  item.isRead
                    ? "border-border bg-card/50"
                    : "border-primary/20 bg-primary/5 shadow-sm"
                )}
              >
                <div className="flex items-start gap-3">
                  <div className={cn(
                    "mt-0.5 flex h-10 w-10 shrink-0 items-center justify-center rounded-xl border",
                    item.isRead
                      ? "border-border bg-muted/50 text-muted-foreground"
                      : "border-primary/20 bg-primary/10 text-primary"
                  )}>
                    {item.isRead ? <Bell className="h-4 w-4" /> : <BellRing className="h-4 w-4" />}
                  </div>
                  <div className="min-w-0 flex-1">
                    <div className="flex items-start justify-between gap-3">
                      <div>
                        <p className="text-sm font-semibold text-foreground">{item.title}</p>
                        <p className="mt-1 text-sm text-muted-foreground">{item.body}</p>
                      </div>
                      <span className="shrink-0 text-xs text-muted-foreground">
                        {new Date(item.createdAt).toLocaleString()}
                      </span>
                    </div>
                    <div className="mt-3 flex flex-wrap items-center gap-2 text-xs text-muted-foreground">
                      {showOrganization && item.organization ? (
                        <span className="rounded-full border border-border bg-background px-2 py-1">
                          {item.organization.name}
                        </span>
                      ) : null}
                      {item.actor ? (
                        <span className="rounded-full border border-border bg-background px-2 py-1">
                          {item.actor.name}
                        </span>
                      ) : null}
                      {!item.isRead ? (
                        <span className="rounded-full border border-primary/20 bg-primary/10 px-2 py-1 text-primary">
                          Unread
                        </span>
                      ) : null}
                    </div>
                  </div>
                </div>
              </Link>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
