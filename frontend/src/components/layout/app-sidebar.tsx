"use client"

import dynamic from "next/dynamic"
import {
  Bell,
  ChevronsUpDown,
  CircleHelp,
  ClipboardList,
  Hash,
  House,
  LayoutGrid,
  LogOut,
  Plus,
  Settings,
  UserPlus,
  Building2,
} from "lucide-react"
import Link from "next/link"
import { usePathname, useRouter } from "next/navigation"

import { useMemo, useState, useEffect, useCallback, useRef } from "react";
import { useOrganizationMembers, type OrganizationMember } from "@/api/organizations";
import { useAuthProfile, useLogoutMutation } from "@/api/auth"
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar"
import { Badge } from "@/components/ui/badge"
import { ScrollArea } from "@/components/ui/scroll-area"
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu"
import { ButtonSpinner } from "@/components/ui/orbital-loader"
import Spinner from "@/components/Loading"
import { Logo } from "@/components/logo"
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
  isLoadingChannels,
  isLoadingDMs,
  className,
}: AppSidebarProps) {
  const pathname = usePathname()
  const router = useRouter()
  const { user } = useAuthProfile()

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

  const logoutMutation = useLogoutMutation({
    onSuccess: () => {
      router.push("/login")
    },
  })

  const userInitials = getInitials(user?.name, "U")
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

  const renderUserMenu = (collapsed = false) => (
    <DropdownMenu>
      <DropdownMenuTrigger asChild>
        <SidebarMenuButton
          size={collapsed ? "default" : "lg"}
          className={cn(
            "transition-all duration-200 group",
            collapsed 
              ? "h-10 w-10 justify-center p-0 rounded-[0.85rem] border-transparent hover:bg-transparent" 
              : "w-full rounded-xl border border-transparent px-3 hover:border-sidebar-border/70 data-[state=open]:bg-sidebar-accent/70 data-[state=open]:text-sidebar-accent-foreground"
          )}
        >
          <Avatar className={cn(
            "rounded-lg border border-sidebar-border/70 transition-all",
            collapsed ? "h-10 w-10" : "h-8 w-8",
            "group-hover:border-primary/30"
          )}>
            <AvatarImage src={user?.avatar_url ? buildAuthenticatedFileUrl(user.avatar_url) : undefined} className="object-cover" />
            <AvatarFallback className="rounded-lg bg-primary/10 text-primary font-semibold text-xs transition-colors group-hover:bg-primary/20">
              {userInitials}
            </AvatarFallback>
          </Avatar>
          {!collapsed && (
            <>
              <div className="grid flex-1 text-left text-sm leading-tight ml-2">
                <span className="truncate font-semibold">{user?.name || "User"}</span>
                <span className="truncate text-xs text-muted-foreground">
                  {user?.email || "user@example.com"}
                </span>
              </div>
              <ChevronsUpDown className="ml-auto h-4 w-4 text-muted-foreground" />
            </>
          )}
        </SidebarMenuButton>
      </DropdownMenuTrigger>
      <DropdownMenuContent
        side="right"
        align="end"
        sideOffset={12}
        className={cn("rounded-xl border-border bg-card shadow-lg p-1.5", collapsed ? "w-64" : "w-56")}
      >
        {collapsed && (
          <>
            <DropdownMenuLabel className="p-0 font-normal">
              <div className="flex items-center gap-3 px-2 py-2 text-left text-sm">
                <Avatar className="h-9 w-9 rounded-lg border border-sidebar-border/70">
                  <AvatarImage src={user?.avatar_url ? buildAuthenticatedFileUrl(user.avatar_url) : undefined} className="object-cover" />
                  <AvatarFallback className="rounded-lg bg-primary/10 text-primary font-semibold text-xs">
                    {userInitials}
                  </AvatarFallback>
                </Avatar>
                <div className="grid flex-1 text-left text-sm leading-tight">
                  <span className="truncate font-semibold">{user?.name || "User"}</span>
                  <span className="truncate text-xs text-muted-foreground">
                    {user?.email || "user@example.com"}
                  </span>
                </div>
              </div>
            </DropdownMenuLabel>
            <DropdownMenuSeparator className="my-1.5" />
          </>
        )}
        <DropdownMenuItem 
          className="cursor-pointer rounded-lg py-2"
          onClick={() => useUIStore.getState().openProfileSettings()}
        >
          <Settings className="mr-2 h-4 w-4" />
          <span>Account Settings</span>
        </DropdownMenuItem>
        {mode === "organization" && (
          <DropdownMenuItem 
            className="cursor-pointer rounded-lg py-2"
            onClick={() => useUIStore.getState().openOrgSettings()}
          >
            <Building2 className="mr-2 h-4 w-4" />
            <span>Workspace Settings</span>
          </DropdownMenuItem>
        )}
        <DropdownMenuSeparator className="my-1.5" />
        <DropdownMenuItem
          onClick={() => logoutMutation.mutate()}
          disabled={logoutMutation.isPending}
          className="cursor-pointer rounded-lg py-2 text-destructive focus:bg-destructive/10 focus:text-destructive"
        >
          {logoutMutation.isPending ? (
            <ButtonSpinner className="mr-2" />
          ) : (
            <LogOut className="mr-2 h-4 w-4" />
          )}
          <span>Log out securely</span>
        </DropdownMenuItem>
      </DropdownMenuContent>
    </DropdownMenu>
  )

  if (mode === "organization") {
    return (
      <Sidebar
        className={cn("bg-sidebar", className)}
      >
        <div className="flex h-full min-h-0 bg-sidebar">
          <div className="flex w-18 flex-col border-r border-sidebar-border/70 bg-sidebar/95">
            <div className="flex h-18 shrink-0 items-center justify-center border-b border-sidebar-border/70 mb-4">
              <Link
                href="/dashboard"
                className="transition-all"
                aria-label="OmniTask Dashboard"
              >
                <Logo showText={false} iconClassName="text-white" href={null} />
              </Link>
            </div>

            <div className="flex flex-1 flex-col items-center gap-1.5 px-1">
              {globalNavItems.map((item) => {
                const Icon = item.icon

                return (
                  <Link
                    key={item.href}
                    href={item.href}
                    aria-label={item.label}
                    className={cn(
                      "relative flex h-10 w-10 items-center justify-center rounded-[0.85rem] border transition-all duration-300",
                      item.active
                        ? "border-primary/20 bg-primary/10 text-primary shadow-[0_8px_16px_rgba(var(--primary),0.08)] ring-1 ring-primary/5"
                        : "border-transparent text-muted-foreground hover:border-sidebar-border/50 hover:bg-sidebar-accent/50 hover:text-foreground"
                    )}
                  >
                    <Icon className="h-5 w-5" />
                    {item.badge ? (
                      <span className="absolute right-0.5 top-0.5 flex h-4.5 min-w-4.5 items-center justify-center rounded-full border-2 border-sidebar bg-primary px-1 text-[9px] font-bold text-primary-foreground shadow-sm">
                        {item.badge}
                      </span>
                    ) : null}
                  </Link>
                )
              })}
            </div>

            <div className="flex flex-col items-center gap-1.5 px-2 py-3">
              {utilityNavItems.map((item) => {
                const Icon = item.icon
                const isSettings = item.label === "Settings"
                const openOrgSettings = useUIStore.getState().openOrgSettings

                if (isSettings && mode === "organization") {
                  return (
                    <button
                      key={item.href}
                      onClick={openOrgSettings}
                      aria-label={item.label}
                      className={cn(
                        "flex h-11 w-11 items-center justify-center rounded-[1rem] border transition-all",
                        "border-transparent text-muted-foreground hover:border-sidebar-border/50 hover:bg-sidebar-accent/50 hover:text-foreground"
                      )}
                    >
                      <Icon className="h-5 w-5" />
                    </button>
                  )
                }

                return (
                  <Link
                    key={item.href}
                    href={item.href}
                    aria-label={item.label}
                    className={cn(
                      "flex h-11 w-11 items-center justify-center rounded-[1rem] border transition-all",
                      item.active
                        ? "border-sidebar-border bg-sidebar-accent text-sidebar-accent-foreground"
                        : "border-transparent text-muted-foreground hover:border-sidebar-border/50 hover:bg-sidebar-accent/50 hover:text-foreground"
                    )}
                  >
                    <Icon className="h-5 w-5" />
                  </Link>
                )
              })}
            </div>
            <div className="mt-auto flex flex-col items-center gap-1.5 px-2 py-4 border-t border-sidebar-border/70">
              {renderUserMenu(true)}
            </div>
          </div>

          {/* Organization Content Pane */}
          <div className="flex min-h-0 flex-1 flex-col bg-sidebar">
            {showOrganizationPaneLoader ? (
              <div className="flex flex-1 items-center justify-center">
                <Spinner size="lg" className="bg-sidebar" />
              </div>
            ) : (
              <div className="flex flex-1 flex-col min-h-0">
                <SidebarHeader className="h-18 shrink-0 border-b border-sidebar-border/70 px-5 flex items-center">
                  <div className="flex items-center gap-3 w-full h-full">
                    <div className="flex h-11 w-11 shrink-0 items-center justify-center rounded-xl border border-primary/20 bg-primary/10 text-primary font-bold text-lg shadow-sm">
                      {organizationInitial}
                    </div>
                    <div className="min-w-0 flex-1">
                      {isLoadingOrg ? (
                        <div className="h-6 w-3/4 animate-pulse rounded-md bg-sidebar-accent/50" />
                      ) : (
                        <div className="truncate text-xl font-bold tracking-tight text-sidebar-foreground">
                          {organizationName || ""}
                        </div>
                      )}
                    </div>
                    <Link
                      href="/dashboard"
                      className="flex py-1 items-center justify-center rounded-lg border border-sidebar-border/70 bg-sidebar-accent/50 px-2.5 text-[10px] font-bold uppercase tracking-widest text-muted-foreground transition-all hover:bg-sidebar-accent hover:text-foreground active:scale-95 shadow-xs"
                    >
                      Exit
                    </Link>
                  </div>
                </SidebarHeader>

                <ScrollArea className="flex-1">
                  <SidebarContent className="px-5 py-3">
                    <Can I="invite" a="Member">
                      <div className="mb-5">
                        <InviteMemberDialog
                          orgId={organizationId || ""}
                          trigger={
                            <button
                              className="flex h-11 w-full items-center justify-center gap-2 rounded-xl border border-sidebar-border/70 bg-transparent px-4 text-sm font-semibold text-sidebar-foreground transition-colors hover:bg-sidebar-accent/60"
                            >
                              <UserPlus className="h-4 w-4" />
                              <span>Invite Members</span>
                            </button>
                          }
                        />
                      </div>
                    </Can>

                    <SidebarGroup className="p-0">
                      <div className="mb-2 px-2">
                        <SidebarGroupLabel className="h-auto px-0 text-[11px] font-semibold uppercase tracking-[0.18em] text-muted-foreground">
                          Channels
                        </SidebarGroupLabel>
                      </div>
                      <SidebarGroupContent>
                        {isLoadingChannels ? (
                          <div className="flex w-full items-center justify-center py-8">
                            <Spinner size="sm" className="bg-sidebar" />
                          </div>
                        ) : channels.length > 0 ? (
                          <>
                            <SidebarMenu className="gap-1">
                              {channels.map((channel) => {
                                const isActive = pathname === `/organizations/${organizationId}/channels/${channel.id}`
                                const chUnread = channelUnread[channel.id] ?? 0;

                                return (
                                  <SidebarMenuItem key={channel.id}>
                                    <SidebarMenuButton
                                      asChild
                                      isActive={isActive}
                                      className={cn(
                                        "h-9 rounded-lg border px-2 text-sm transition-all",
                                        isActive
                                          ? "border-primary/10 bg-primary/10! text-primary! shadow-xs font-semibold"
                                          : "border-transparent text-muted-foreground hover:bg-sidebar-accent/60 hover:text-foreground"
                                      )}
                                    >
                                      <Link
                                        href={`/organizations/${organizationId}/channels/${channel.id}`}
                                        className="flex items-center gap-3"
                                      >
                                        <Hash className={cn("h-4 w-4", isActive ? "text-primary" : "text-muted-foreground")} />
                                        <span className="flex-1 truncate font-medium">{channel.name}</span>
                                        {chUnread > 0 && !isActive && (
                                          <span className="flex h-4.5 min-w-[18px] items-center justify-center rounded-full bg-primary px-1 text-[9px] font-bold text-primary-foreground shadow-sm">
                                            {chUnread > 99 ? "99+" : chUnread}
                                          </span>
                                        )}
                                      </Link>
                                    </SidebarMenuButton>
                                  </SidebarMenuItem>
                                )
                              })}
                            </SidebarMenu>
                            <Can I="create" a="Channel">
                              <CreateChannelDialog
                                orgId={organizationId || ""}
                                trigger={
                                  <button
                                    type="button"
                                    className="group mt-4 flex w-full items-center justify-center gap-2 rounded-xl border border-solid border-sidebar-border/80 bg-sidebar-accent/20 px-4 py-2.5 text-xs font-semibold text-muted-foreground transition-all hover:border-primary/50 hover:border-dashed hover:bg-sidebar-accent/40 hover:text-foreground active:scale-[0.97]"
                                  >
                                    <Plus className="h-4 w-4 transition-transform group-hover:rotate-90" />
                                    <span>Create New Channel</span>
                                  </button>
                                }
                              />
                            </Can>
                          </>
                        ) : (
                          <div className="px-2 py-2 text-xs text-muted-foreground">No channels found</div>
                        )}
                      </SidebarGroupContent>
                    </SidebarGroup>

                    <SidebarGroup className="mt-6 p-0">
                      <div className="mb-2 px-2 flex items-center justify-between">
                        <SidebarGroupLabel className="h-auto px-0 text-[11px] font-semibold uppercase tracking-[0.18em] text-muted-foreground">
                          Direct Messages
                        </SidebarGroupLabel>
                        {organizationId && (
                          <NewDirectMessageDialog
                            orgId={organizationId}
                            trigger={
                              <button
                                type="button"
                                className="text-muted-foreground hover:text-foreground transition-colors p-0.5 rounded-md hover:bg-sidebar-accent flex items-center justify-center"
                                aria-label="New Direct Message"
                              >
                                <Plus className="h-3.5 w-3.5" />
                              </button>
                            }
                          />
                        )}
                      </div>
                      <SidebarGroupContent>
                        {actualLoadingDMs ? (
                          <div className="flex w-full items-center justify-center py-6">
                          <ButtonSpinner />
                          </div>
                        ) : filteredConversations.length > 0 ? (
                          <SidebarMenu className="gap-1">
                            {filteredConversations.map((conv) => {
                              const convUnread = dmUnread[conv.id] ?? 0;
                              const isActive = pathname === `/messages/${conv.id}`;
                              return (
                              <SidebarMenuItem key={conv.id}>
                                <SidebarMenuButton
                                  asChild
                                  isActive={isActive}
                                  className="h-9 rounded-lg border border-transparent px-2 text-sm text-muted-foreground transition-all hover:bg-sidebar-accent/60 hover:text-foreground data-[active=true]:bg-sidebar-accent data-[active=true]:text-sidebar-accent-foreground"
                                >
                                  <Link href={`/messages/${conv.id}${organizationId ? `?orgId=${organizationId}` : ""}`} className="flex items-center gap-2">
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
                                    <span className="flex-1 truncate font-medium text-xs">{conv.otherUser.name}</span>
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
                          <div className="px-2 py-2 text-xs text-muted-foreground">No conversations yet</div>
                        )}
                      </SidebarGroupContent>
                    </SidebarGroup>
                  </SidebarContent>
                </ScrollArea>
              </div>
            )}
          </div>
        </div>
      </Sidebar>
    )
  }

  return (
    <Sidebar className={cn("space-y-3", className)}>
      <SidebarHeader className="h-18 shrink-0 flex items-center px-4 border-b border-sidebar-border/70">
        <div className="flex items-center justify-between px-2 w-full h-full">
          <Logo href="/dashboard" />
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
                      className="h-10 transition-all data-[active=true]:border-l-[3px] data-[active=true]:border-primary data-[active=true]:bg-primary/5 data-[active=true]:text-primary"
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

      <SidebarFooter className="mt-auto border-t border-sidebar-border/70 p-4">
        <SidebarMenu>
          <SidebarMenuItem>{renderUserMenu(false)}</SidebarMenuItem>
        </SidebarMenu>
      </SidebarFooter>
    </Sidebar>
  )
}
