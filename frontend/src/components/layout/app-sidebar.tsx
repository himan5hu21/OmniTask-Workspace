"use client"

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
import { OrbitalLoader } from "@/components/ui/orbital-loader"
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
import { useIsMounted } from "@/hooks/useIsMounted"
import { cn } from "@/lib/utils"
import { useUIStore } from "@/store/ui.store"
import { InviteMemberDialog } from "@/components/organizations/invite-member-dialog"
import { CreateChannelDialog } from "@/components/organizations/create-channel-dialog"
import { Can } from "@/lib/casl"

export interface AppSidebarProps {
  mode?: "dashboard" | "organization"
  organizationId?: string
  organizationName?: string
  channels?: Array<{ id: string; name: string }>
  isLoadingOrg?: boolean
  isLoadingChannels?: boolean
  isLoadingDMs?: boolean
  canAddChannels?: boolean
  onAddChannel?: () => void
  className?: string
}

const dummyDMs = [
  { id: "1", name: "Sarah Jenkins", avatar: "https://api.dicebear.com/7.x/avataaars/svg?seed=Sarah", online: true },
  { id: "2", name: "Mike Thompson", avatar: "https://api.dicebear.com/7.x/avataaars/svg?seed=Mike", online: false },
  { id: "3", name: "Alex Rivera", avatar: "https://api.dicebear.com/7.x/avataaars/svg?seed=Alex", online: true },
]

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
  const isMounted = useIsMounted()

  const logoutMutation = useLogoutMutation({
    onSuccess: () => {
      router.push("/login")
    },
  })

  const userInitials = user?.name ? user.name.substring(0, 2).toUpperCase() : "U"
  const organizationInitial = organizationName?.charAt(0).toUpperCase() || "O"


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
            badge: "3",
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
            badge: "3",
          },
        ]

  const utilityNavItems = [
    {
      href: "/settings",
      label: "Settings",
      icon: Settings,
      active: pathname === "/settings",
    },
    {
      href: "/help",
      label: "Help",
      icon: CircleHelp,
      active: pathname === "/help",
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
        <DropdownMenuItem className="cursor-pointer rounded-lg py-2">
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
            <OrbitalLoader size="sm" variant="minimal" color="currentColor" className="mr-2" />
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
            {isLoadingOrg && isLoadingChannels && isLoadingDMs ? (
              <div className="flex flex-1 items-center justify-center">
                <OrbitalLoader size="lg" />
              </div>
            ) : (
              <div className="flex flex-1 flex-col min-h-0">
                <SidebarHeader className="h-18 shrink-0 border-b border-sidebar-border/70 px-5 flex items-center">
                  <div className="flex items-center gap-3 w-full h-full">
                    <div className="flex h-11 w-11 shrink-0 items-center justify-center rounded-xl border border-primary/20 bg-primary/10 text-primary font-bold text-lg">
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
                    {isMounted && (
                      <Link
                        href="/dashboard"
                        className="flex py-1 items-center justify-center rounded-lg border border-sidebar-border/70 bg-sidebar-accent/50 px-2.5 text-[10px] font-bold uppercase tracking-widest text-muted-foreground transition-all hover:bg-sidebar-accent hover:text-foreground active:scale-95 shadow-xs"
                      >
                        Exit
                      </Link>
                    )}
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
                            <OrbitalLoader size="sm" />
                          </div>
                        ) : channels.length > 0 ? (
                          <>
                            <SidebarMenu className="gap-1">
                              {channels.map((channel) => {
                                const isActive = pathname === `/organizations/${organizationId}/channels/${channel.id}`

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
                                        <span className="truncate font-medium">{channel.name}</span>
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
                      <SidebarGroupLabel className="mb-2 h-auto px-2 text-[11px] font-semibold uppercase tracking-[0.18em] text-muted-foreground">
                        Direct Messages
                      </SidebarGroupLabel>
                      <SidebarGroupContent>
                        {isLoadingDMs ? (
                          <div className="flex w-full items-center justify-center py-6">
                            <OrbitalLoader size="sm" variant="minimal" />
                          </div>
                        ) : (
                          <SidebarMenu className="gap-1">
                            {dummyDMs.map((dm) => (
                              <SidebarMenuItem key={dm.id}>
                                <SidebarMenuButton
                                  asChild
                                  isActive={pathname === `/messages/${dm.id}`}
                                  className="h-9 rounded-lg border border-transparent px-2 text-sm text-muted-foreground transition-all hover:bg-sidebar-accent/60 hover:text-foreground data-[active=true]:bg-sidebar-accent data-[active=true]:text-sidebar-accent-foreground"
                                >
                                  <Link href={`/messages/${dm.id}`} className="flex items-center gap-2">
                                    <div className="relative shrink-0">
                                      <Avatar className="h-6 w-6 rounded-full border border-sidebar-border/70">
                                        <AvatarImage src={dm.avatar} />
                                        <AvatarFallback className="text-[9px]">{dm.name.charAt(0)}</AvatarFallback>
                                      </Avatar>
                                      {dm.online ? (
                                        <div className="absolute -bottom-0.5 -right-0.5 h-2 w-2 rounded-full border-2 border-sidebar bg-emerald-500" />
                                      ) : null}
                                    </div>
                                    <span className="truncate font-medium text-xs">{dm.name}</span>
                                  </Link>
                                </SidebarMenuButton>
                              </SidebarMenuItem>
                            ))}
                          </SidebarMenu>
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
            <SidebarMenu className="space-y-1">
              {dummyDMs.map((dm) => (
                <SidebarMenuItem key={dm.id}>
                  <SidebarMenuButton
                    asChild
                    isActive={pathname === `/messages/${dm.id}`}
                    className="h-10 transition-all data-[active=true]:border-l-[3px] data-[active=true]:border-primary data-[active=true]:bg-primary/5 data-[active=true]:text-primary"
                  >
                    <Link href={`/messages/${dm.id}`} className="flex items-center gap-3">
                      <div className="relative shrink-0">
                        <Avatar className="h-6 w-6 rounded-lg border border-border">
                          <AvatarImage src={dm.avatar} />
                          <AvatarFallback className="rounded-lg text-[10px]">{dm.name.charAt(0)}</AvatarFallback>
                        </Avatar>
                        {dm.online ? (
                          <div className="absolute -bottom-0.5 -right-0.5 h-2.5 w-2.5 rounded-full border-2 border-sidebar bg-emerald-500 shadow-sm" />
                        ) : null}
                      </div>
                      <span className="truncate font-medium">{dm.name}</span>
                    </Link>
                  </SidebarMenuButton>
                </SidebarMenuItem>
              ))}
            </SidebarMenu>
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
