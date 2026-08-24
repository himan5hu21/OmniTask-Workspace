"use client"

import dynamic from "next/dynamic"
import {
  Bell,
  CircleHelp,
  ClipboardList,
  Hash,
  House,
  LayoutGrid,
  Plus,
  Settings,
  UserPlus,
  Zap,
  X,
} from "lucide-react"
import Link from "next/link"
import { usePathname } from "next/navigation"

import { useMemo, useState, useEffect, useCallback, useRef } from "react";
import { useOrganizationMembers, type OrganizationMember } from "@/api/organizations";
import { useAuthProfile } from "@/api/auth"
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar"
import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import { ScrollArea } from "@/components/ui/scroll-area"
import { ButtonSpinner } from "@/components/ui/orbital-loader"
import Spinner from "@/components/Loading"
import {
  Sidebar,
  SidebarContent,
  SidebarFooter,
  SidebarGroup,
  SidebarGroupContent,
  SidebarGroupLabel,
  SidebarHeader,
  SidebarMenu,
  SidebarMenuButton,
  SidebarMenuItem,
  useSidebar,
} from "@/components/ui/sidebar"
import { cn, getInitials } from "@/lib/utils"
import { buildAuthenticatedFileUrl } from "@/lib/file-url"
import { useUIStore } from "@/store/ui.store"
import { useUnreadStore } from "@/store/unread.store"
const InviteMemberDialog = dynamic(
  () => import("@/components/organizations/invite-member-dialog").then(mod => mod.InviteMemberDialog),
  { ssr: false }
);

const CreateChannelDialog = dynamic(
  () => import("@/components/organizations/create-channel-dialog").then(mod => mod.CreateChannelDialog),
  { ssr: false }
);
import { Can } from "@/lib/casl"
import { useConversations } from "@/api/messages"
import type { Channel } from "@/api/channels"

import { useNotificationSummary } from "@/api/notifications"
import { NewDirectMessageDialog } from "@/components/layout/new-dm-dialog"
import { getSocket } from "@/socket/socket"
import { useNotificationStore } from "@/store/notification.store"

export interface AppSidebarProps {
  mode?: "dashboard" | "organization"
  organizationId?: string
  organizationName?: string
  channels?: Channel[]
  isLoadingOrg?: boolean
  isLoadingChannels?: boolean
  isLoadingDMs?: boolean
  canAddChannels?: boolean
  onAddChannel?: () => void
  className?: string
}

// Remove dummyDMs



export function AppSidebar({
  mode = "dashboard",
  organizationId,
  organizationName,
  channels = [],
  isLoadingOrg,
  isLoadingDMs,
  className,
}: AppSidebarProps) {
  const pathname = usePathname()
  const { user } = useAuthProfile()
  const { isMobile, setOpenMobile } = useSidebar()



  const { data: conversationsData, isLoading: conversationsLoading } = useConversations();
  const conversations = useMemo(() => conversationsData?.data || [], [conversationsData]);
  const actualLoadingDMs = conversationsLoading || isLoadingDMs;
  const { unreadCount: notificationUnreadCount, organizations: notificationOrganizations } = useNotificationSummary();

  const [onlineUsers, setOnlineUsers] = useState<Set<string>>(new Set());

  const { initialize, incrementDm, incrementChannel, dmUnread, channelUnread } = useUnreadStore();
  const {
    totalUnread,
    orgUnread,
    initialize: initializeNotifications,
    increment: incrementNotification,
    markOneRead,
    markAllRead,
  } = useNotificationStore();

  // Keep a stable ref to user.id so socket handlers can check without causing effect re-runs
  const userIdRef = useRef<string | undefined>(undefined);
  useEffect(() => { userIdRef.current = user?.id; }, [user?.id]);

  useEffect(() => {
    initialize({
      dmUnread: Object.fromEntries(
        conversations
          .filter((conversation) => (conversation.unreadCount ?? 0) > 0)
          .map((conversation) => [conversation.id, conversation.unreadCount ?? 0])
      ),
      channelUnread: Object.fromEntries(
        channels
          .filter((channel) => (channel.unreadCount ?? 0) > 0)
          .map((channel) => [channel.id, channel.unreadCount ?? 0])
      ),
    });
  }, [channels, conversations, initialize]);

  useEffect(() => {
    initializeNotifications({
      totalUnread: notificationUnreadCount,
      orgUnread: notificationOrganizations,
    });
  }, [initializeNotifications, notificationOrganizations, notificationUnreadCount]);

  useEffect(() => {
    const socket = getSocket();
    if (!socket) return;

    const handleOnlineList = (userIds: string[]) => {
      setOnlineUsers(new Set(userIds));
    };

    const handleStatusChanged = ({ userId, status }: { userId: string; status: "online" | "offline" }) => {
      setOnlineUsers((prev) => {
        const next = new Set(prev);
        if (status === "online") {
          next.add(userId);
        } else {
          next.delete(userId);
        }
        return next;
      });
    };

    // Track DM unread: increment only for messages FROM the other person
    // and only when NOT already viewing that conversation
    const handleDmCreated = (data: { conversation_id: string; user_id: string }) => {
      // Skip messages sent by the current user themselves
      if (data.user_id === userIdRef.current) return;
      const currentPath = window.location.pathname;
      const isViewingConversation = currentPath === `/messages/${data.conversation_id}`;
      if (!isViewingConversation) {
        incrementDm(data.conversation_id);
      }
    };

    // Track channel unread: increment for messages from other users while not viewing that channel
    const handleChannelMessageCreated = (data: { channel_id: string; user_id: string }) => {
      // Skip messages sent by the current user themselves
      if (data.user_id === userIdRef.current) return;
      const currentPath = window.location.pathname;
      const isViewingChannel = currentPath.includes(`/channels/${data.channel_id}`);
      if (!isViewingChannel) {
        incrementChannel(data.channel_id);
      }
    };

    const handleNotificationCreated = (data: { organization?: { id: string } | null }) => {
      incrementNotification(data.organization?.id ?? null);
    };

    const handleNotificationRead = (data: { orgId?: string | null }) => {
      markOneRead(data.orgId ?? null);
    };

    const handleNotificationReadAll = (data: { orgId?: string | null }) => {
      markAllRead(data.orgId ?? null);
    };

    socket.on("user:online_list", handleOnlineList);
    socket.on("user:status_changed", handleStatusChanged);
    socket.on("dm:message_created", handleDmCreated);
    socket.on("channel:message_created", handleChannelMessageCreated);
    socket.on("notification:created", handleNotificationCreated);
    socket.on("notification:read", handleNotificationRead);
    socket.on("notification:read_all", handleNotificationReadAll);

    return () => {
      socket.off("user:online_list", handleOnlineList);
      socket.off("user:status_changed", handleStatusChanged);
      socket.off("dm:message_created", handleDmCreated);
      socket.off("channel:message_created", handleChannelMessageCreated);
      socket.off("notification:created", handleNotificationCreated);
      socket.off("notification:read", handleNotificationRead);
      socket.off("notification:read_all", handleNotificationReadAll);
    };
  }, [incrementDm, incrementChannel, incrementNotification, markAllRead, markOneRead]);

  const { members = [] } = useOrganizationMembers(organizationId || "", { page: 1, limit: 100 }, { enabled: mode === "organization" && !!organizationId });

  const memberUserIds = useMemo(() => {
    return new Set(members.map((m: OrganizationMember) => m.user_id));
  }, [members]);

  const filteredConversations = useMemo(() => {
    if (mode === "organization" && organizationId) {
      return conversations.filter((conv) => memberUserIds.has(conv.otherUser.id));
    }
    return conversations;
  }, [conversations, mode, organizationId, memberUserIds]);

  const organizationInitial = getInitials(organizationName, "O")
  const showOrganizationPaneLoader = !organizationName && !!isLoadingOrg


  const globalNavItems =
    mode === "organization" && organizationId
      ? [
          {
            href: `/organizations/${organizationId}`,
            label: "Home",
            icon: House,
            active:
              pathname === `/organizations/${organizationId}` ||
              pathname.startsWith(`/organizations/${organizationId}/channels/`),
          },
          {
            href: `/organizations/${organizationId}/tasks`,
            label: "My Tasks",
            icon: ClipboardList,
            active: pathname === `/organizations/${organizationId}/tasks`,
          },
          {
            href: `/organizations/${organizationId}/notifications`,
            label: "Notifications",
            icon: Bell,
            active: pathname === `/organizations/${organizationId}/notifications`,
            badge: (orgUnread[organizationId] ?? 0) > 0 ? String(orgUnread[organizationId] ?? 0) : undefined,
          },
        ]
      : [
          {
            href: "/dashboard",
            label: "Dashboard",
            icon: LayoutGrid,
            active: pathname === "/dashboard",
          },
          {
            href: "/tasks",
            label: "My Tasks",
            icon: ClipboardList,
            active: pathname === "/tasks",
          },
          {
            href: "/notifications",
            label: "Notifications",
            icon: Bell,
            active: pathname === "/notifications",
            badge: totalUnread > 0 ? String(totalUnread) : undefined,
          },
        ]

  const utilityNavItems = [
    {
      href: "/settings",
      label: "Settings",
      icon: Settings,
      active: pathname === "/settings",
    },
  ]



  if (mode === "organization") {
    const orgNavItems = [
      {
        href: `/organizations/${organizationId}`,
        label: "Home",
        icon: House,
        active: pathname === `/organizations/${organizationId}`,
      },
      {
        href: `/organizations/${organizationId}/tasks`,
        label: "Tasks",
        icon: ClipboardList,
        active: pathname === `/organizations/${organizationId}/tasks`,
      },
      {
        href: `/organizations/${organizationId}/notifications`,
        label: "Notifications",
        icon: Bell,
        active: pathname === `/organizations/${organizationId}/notifications`,
        badge: (orgUnread[organizationId || ""] ?? 0) > 0 ? String(orgUnread[organizationId || ""]) : undefined,
      },
    ];

    const openOrgSettings = () => useUIStore.getState().openOrgSettings();

    return (
      <Sidebar className={cn("space-y-3", className)}>
        {/* Workspace Clickable Header */}
        <SidebarHeader className="h-20 shrink-0 flex items-center px-4">
          <div className="flex items-center justify-between w-full">
            <Link href="/dashboard" className="flex items-center gap-3 min-w-0 flex-1 p-2 rounded-xl hover:bg-sidebar-accent/50 transition-colors cursor-pointer select-none">
              <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-lg bg-linear-to-br from-primary to-primary/80 text-primary-foreground font-bold text-sm shadow-sm uppercase">
                {organizationInitial}
              </div>
              <div className="flex flex-col min-w-0 flex-1">
                <span className="truncate text-md font-bold text-sidebar-foreground">{organizationName || "Workspace"}</span>
              </div>
            </Link>
            {isMobile && (
              <Button
                variant="ghost"
                size="icon"
                className="h-8 w-8 text-muted-foreground hover:text-foreground shrink-0 rounded-lg"
                onClick={() => setOpenMobile(false)}
              >
                <X className="size-5" />
              </Button>
            )}
          </div>
        </SidebarHeader>

        <ScrollArea className="flex-1">
          <SidebarContent className="px-2 py-0">
            {/* Navigation Section */}
            <SidebarGroup>
              <SidebarGroupContent>
                <SidebarMenu className="space-y-1">
                  {orgNavItems.map((item) => {
                    const Icon = item.icon;
                    return (
                      <SidebarMenuItem key={item.href}>
                        <SidebarMenuButton
                          asChild
                          isActive={item.active}
                          className="h-10 transition-all data-[active=true]:border-l-4 data-[active=true]:border-[#4F6EF7] data-[active=true]:bg-[#4F6EF7]/8 data-[active=true]:text-[#4F6EF7] dark:data-[active=true]:bg-[#4F6EF7]/15 dark:data-[active=true]:text-indigo-400"
                        >
                          <Link href={item.href} className="flex w-full items-center gap-3">
                            <div className="flex items-center gap-3">
                              <Icon className="h-5 w-5" />
                              <span className="font-medium">{item.label}</span>
                            </div>
                            {item.badge ? (
                              <span className="ml-auto flex h-4.5 min-w-4.5 items-center justify-center rounded-full bg-[#4F6EF7] px-1 text-[9px] font-bold text-primary-foreground shadow-sm animate-in zoom-in-75 duration-150">
                                {item.badge}
                              </span>
                            ) : null}
                          </Link>
                        </SidebarMenuButton>
                      </SidebarMenuItem>
                    );
                  })}
                </SidebarMenu>
              </SidebarGroupContent>
            </SidebarGroup>

            {/* Channels Section */}
            <SidebarGroup className="mt-2">
              <SidebarGroupLabel className="mb-2 px-3 text-[10px] font-bold uppercase tracking-widest text-muted-foreground/70">
                Channels
              </SidebarGroupLabel>
              <SidebarGroupContent>
                {showOrganizationPaneLoader ? (
                  <div className="flex w-full items-center justify-center py-4">
                    <Spinner size="sm" className="bg-transparent" />
                  </div>
                ) : (
                  <SidebarMenu className="space-y-1">
                    {channels.map((channel) => {
                      const isActive = pathname === `/organizations/${organizationId}/channels/${channel.id}`;
                      const chUnread = channelUnread[channel.id] ?? 0;
                      return (
                        <SidebarMenuItem key={channel.id}>
                          <SidebarMenuButton
                            asChild
                            isActive={isActive}
                            className="h-10 transition-all data-[active=true]:border-l-4 data-[active=true]:border-[#4F6EF7] data-[active=true]:bg-[#4F6EF7]/8 data-[active=true]:text-[#4F6EF7] dark:data-[active=true]:bg-[#4F6EF7]/15 dark:data-[active=true]:text-indigo-400"
                          >
                            <Link href={`/organizations/${organizationId}/channels/${channel.id}`} className="flex items-center gap-3">
                              <Hash className="h-4.5 w-4.5 shrink-0" />
                              <span className="flex-1 truncate font-medium">{channel.name}</span>
                              {chUnread > 0 && !isActive && (
                                <span className="flex h-4.5 min-w-[18px] items-center justify-center rounded-full bg-[#4F6EF7] px-1 text-[9px] font-bold text-primary-foreground shadow-sm">
                                  {chUnread}
                                </span>
                              )}
                            </Link>
                          </SidebarMenuButton>
                        </SidebarMenuItem>
                      );
                    })}
                    
                    {/* Add Channel Inline Action */}
                    <Can I="create" a="Channel">
                      <CreateChannelDialog
                        orgId={organizationId || ""}
                        trigger={
                          <SidebarMenuItem>
                            <button className="flex w-full h-10 items-center gap-3 px-3 text-sm text-muted-foreground hover:bg-sidebar-accent/50 hover:text-foreground rounded-lg transition-colors cursor-pointer text-left">
                              <Plus className="h-4.5 w-4.5 text-muted-foreground" />
                              <span className="font-semibold text-xs">Add channel</span>
                            </button>
                          </SidebarMenuItem>
                        }
                      />
                    </Can>
                  </SidebarMenu>
                )}
              </SidebarGroupContent>
            </SidebarGroup>

            {/* Direct Messages Section */}
            <SidebarGroup className="mt-2">
              <SidebarGroupLabel className="mb-2 px-3 text-[10px] font-bold uppercase tracking-widest text-muted-foreground/70">
                Direct Messages
              </SidebarGroupLabel>
              <SidebarGroupContent>
                {isLoadingDMs ? (
                  <div className="flex w-full items-center justify-center py-4">
                    <ButtonSpinner />
                  </div>
                ) : filteredConversations.length > 0 ? (
                  <SidebarMenu className="space-y-1">
                    {filteredConversations.map((conv) => {
                      const convUnread = dmUnread[conv.id] ?? 0;
                      const isActive = pathname === `/messages/${conv.id}`;
                      return (
                        <SidebarMenuItem key={conv.id}>
                          <SidebarMenuButton
                            asChild
                            isActive={isActive}
                            className="h-10 transition-all data-[active=true]:border-l-4 data-[active=true]:border-[#4F6EF7] data-[active=true]:bg-[#4F6EF7]/8 data-[active=true]:text-[#4F6EF7] dark:data-[active=true]:bg-[#4F6EF7]/15 dark:data-[active=true]:text-indigo-400"
                          >
                            <Link href={`/messages/${conv.id}${organizationId ? `?orgId=${organizationId}` : ""}`} className="flex items-center gap-3">
                              <div className="relative shrink-0">
                                <Avatar className="h-6 w-6 rounded-md border border-primary/20 bg-primary/10">
                                  <AvatarImage src={conv.otherUser.avatar_url ? buildAuthenticatedFileUrl(conv.otherUser.avatar_url) : undefined} />
                                  <AvatarFallback className="bg-transparent text-primary font-bold text-[9px] shadow-sm uppercase">
                                    {getInitials(conv.otherUser.name)}
                                  </AvatarFallback>
                                </Avatar>
                                {onlineUsers.has(conv.otherUser.id) && (
                                  <div className="absolute -bottom-0.5 -right-0.5 h-2 w-2 rounded-full border-2 border-sidebar bg-emerald-500 animate-in fade-in duration-200" />
                                )}
                              </div>
                              <span className="flex-1 truncate font-medium">{conv.otherUser.name}</span>
                              {convUnread > 0 && !isActive && (
                                <span className="flex h-4.5 min-w-[18px] items-center justify-center rounded-full bg-[#4F6EF7] px-1 text-[9px] font-bold text-primary-foreground shadow-sm">
                                  {convUnread}
                                </span>
                              )}
                            </Link>
                          </SidebarMenuButton>
                        </SidebarMenuItem>
                      );
                    })}
                  </SidebarMenu>
                ) : (
                  <div className="px-3 py-2 text-xs text-muted-foreground">No conversations yet</div>
                )}
              </SidebarGroupContent>
            </SidebarGroup>
          </SidebarContent>
        </ScrollArea>

        {/* Sidebar Footer: Invite Member and Settings Buttons */}
        <SidebarFooter className="mt-auto p-4 space-y-2 border-t border-sidebar-border/70">
          <Can I="invite" a="Member">
            <InviteMemberDialog
              orgId={organizationId || ""}
              trigger={
                <Button className="w-full h-10 bg-[#4F6EF7] hover:bg-[#3b5bdb] text-white font-semibold rounded-lg flex items-center justify-center gap-2 shadow-xs transition-all hover:scale-[1.02] active:scale-[0.98]">
                  <UserPlus className="h-4.5 w-4.5" />
                  <span>Invite Member</span>
                </Button>
              }
            />
          </Can>
          
          <Button
            variant="outline"
            className="w-full h-10 border-border text-foreground hover:bg-muted/50 font-semibold rounded-lg flex items-center justify-center gap-2 transition-all hover:scale-[1.02] active:scale-[0.98]"
            onClick={openOrgSettings}
          >
            <Settings className="h-4.5 w-4.5 text-muted-foreground" />
            <span>Workspace Settings</span>
          </Button>
        </SidebarFooter>
      </Sidebar>
    );
  }

  return (
    <Sidebar className={cn("space-y-3", className)}>
      <SidebarHeader className="h-20 shrink-0 flex items-center px-4">
        <div className="flex items-center justify-between px-2 w-full h-full">
          <div className="flex items-center gap-2.5">
            <div className="flex h-9 w-9 items-center justify-center rounded-xl bg-linear-to-br from-primary to-primary/80 text-primary-foreground shadow-sm">
              <Zap className="h-5 w-5 fill-current" />
            </div>
            <div className="flex flex-col">
              <span className="font-extrabold text-sm text-sidebar-foreground leading-none animate-in fade-in">OmniTask</span>
              <span className="text-[10px] text-muted-foreground font-semibold leading-none mt-1 select-none">Productivity Suite</span>
            </div>
          </div>
          {isMobile && (
            <Button
              variant="ghost"
              size="icon"
              className="h-8 w-8 text-muted-foreground hover:text-foreground shrink-0 rounded-lg"
              onClick={() => setOpenMobile(false)}
            >
              <X className="size-5" />
            </Button>
          )}
        </div>
      </SidebarHeader>

      <SidebarContent className="px-2 py-0">

        <SidebarGroup>
          <SidebarGroupLabel className="mb-2 px-3 text-[10px] font-bold uppercase tracking-widest text-muted-foreground/70">
            Navigation
          </SidebarGroupLabel>
          <SidebarGroupContent>
            <SidebarMenu className="space-y-1">
              {globalNavItems.map((item) => {
                const Icon = item.icon

                return (
                  <SidebarMenuItem key={item.href}>
                    <SidebarMenuButton
                      asChild
                      isActive={item.active}
                      className="h-10 transition-all data-[active=true]:border-l-4 data-[active=true]:border-[#4F6EF7] data-[active=true]:bg-[#4F6EF7]/8 data-[active=true]:text-[#4F6EF7] dark:data-[active=true]:bg-[#4F6EF7]/15 dark:data-[active=true]:text-indigo-400"
                    >
                      <Link href={item.href} className="flex w-full items-center gap-3">
                        <div className="flex items-center gap-3">
                          <Icon className="h-5 w-5" />
                          <span className="font-medium">{item.label}</span>
                        </div>
                        {item.badge ? (
                          <Badge className="ml-auto h-4 min-w-[16px] rounded-full border-none px-1.5 pt-1 text-[10px] font-bold">
                            {item.badge}
                          </Badge>
                        ) : null}
                      </Link>
                    </SidebarMenuButton>
                  </SidebarMenuItem>
                )
              })}
            </SidebarMenu>
          </SidebarGroupContent>
        </SidebarGroup>

        <SidebarGroup className="mt-2">
          <SidebarGroupLabel className="mb-2 px-3 text-[10px] font-bold uppercase tracking-widest text-muted-foreground/70">
            Direct Messages
          </SidebarGroupLabel>
          <SidebarGroupContent>
            {actualLoadingDMs ? (
              <div className="flex w-full items-center justify-center py-6">
              <ButtonSpinner />
              </div>
            ) : filteredConversations.length > 0 ? (
              <SidebarMenu className="space-y-1">
                {filteredConversations.map((conv) => {
                  const convUnread = dmUnread[conv.id] ?? 0;
                  const isActive = pathname === `/messages/${conv.id}`;
                  return (
                  <SidebarMenuItem key={conv.id}>
                    <SidebarMenuButton
                      asChild
                      isActive={isActive}
                      className="h-10 transition-all data-[active=true]:border-l-[3px] data-[active=true]:border-primary data-[active=true]:bg-primary/5 data-[active=true]:text-primary"
                    >
                      <Link href={`/messages/${conv.id}`} className="flex items-center gap-3">
                        <div className="relative shrink-0">
                          <Avatar className="h-6 w-6 rounded-md border border-primary/20 bg-primary/10">
                            <AvatarImage src={conv.otherUser.avatar_url ? buildAuthenticatedFileUrl(conv.otherUser.avatar_url) : undefined} />
                            <AvatarFallback className="bg-transparent text-primary font-bold text-[9px] shadow-sm uppercase">
                              {getInitials(conv.otherUser.name)}
                            </AvatarFallback>
                          </Avatar>
                          {onlineUsers.has(conv.otherUser.id) && (
                            <div className="absolute -bottom-0.5 -right-0.5 h-2.5 w-2.5 rounded-full border-2 border-sidebar bg-emerald-500 shadow-sm animate-in fade-in duration-200" />
                          )}
                        </div>
                        <span className="flex-1 truncate font-medium">{conv.otherUser.name}</span>
                        {convUnread > 0 && !isActive && (
                          <span className="flex h-4.5 min-w-[18px] items-center justify-center rounded-full bg-primary px-1 text-[9px] font-bold text-primary-foreground shadow-sm animate-in zoom-in-75 duration-150">
                            {convUnread > 99 ? "99+" : convUnread}
                          </span>
                        )}
                      </Link>
                    </SidebarMenuButton>
                  </SidebarMenuItem>
                )})}
              </SidebarMenu>
            ) : (
              <div className="px-3 py-2 text-xs text-muted-foreground">No conversations yet</div>
            )}
          </SidebarGroupContent>
        </SidebarGroup>
      </SidebarContent>


    </Sidebar>
  )
}
