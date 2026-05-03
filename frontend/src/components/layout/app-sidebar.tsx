"use client"

import { 
  Building2, MessageSquare, LayoutGrid, 
  ChevronsUpDown, LogOut,
  Hash, Plus, Bell, ClipboardList, Settings
} from "lucide-react"
import { OrbitalLoader } from "@/components/ui/orbital-loader"
import Link from "next/link"
import { usePathname, useRouter } from "next/navigation"
import { useAuthProfile, useLogoutMutation } from "@/api/auth"
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
  SidebarMenuAction,
} from "@/components/ui/sidebar"
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar"
import { Badge } from "@/components/ui/badge"
import { Logo } from "@/components/logo"
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu"

export interface AppSidebarProps {
  mode?: 'dashboard' | 'organization'
  organizationId?: string
  organizationName?: string
  channels?: Array<{ id: string; name: string }>
  isLoadingChannels?: boolean
  canAddChannels?: boolean
  onAddChannel?: () => void
  className?: string
}

// Dummy Data for Direct Messages
const dummyDMs = [
  { id: '1', name: 'Sarah Jenkins', avatar: 'https://api.dicebear.com/7.x/avataaars/svg?seed=Sarah', online: true },
  { id: '2', name: 'Mike Thompson', avatar: 'https://api.dicebear.com/7.x/avataaars/svg?seed=Mike', online: false },
  { id: '3', name: 'Alex Rivera', avatar: 'https://api.dicebear.com/7.x/avataaars/svg?seed=Alex', online: true },
];

export function AppSidebar({
  mode = 'dashboard',
  organizationId,
  organizationName,
  channels = [],
  isLoadingChannels,
  canAddChannels,
  onAddChannel,
  className
}: AppSidebarProps) {
  const pathname = usePathname();
  const router = useRouter();
  const { user } = useAuthProfile();
  
  const logoutMutation = useLogoutMutation({
    onSuccess: () => {
      router.push('/login');
    }
  });

  const userInitials = user?.name ? user.name.substring(0, 2).toUpperCase() : "U";

  return (
    <Sidebar className={className}>
      {/* HEADER: Brand Logo & Workspace Name */}
      <SidebarHeader className="py-6 px-4">
        <Logo href="/dashboard" className="px-2" />
      </SidebarHeader>

      <SidebarContent className="px-2">
        {/* MAIN NAVIGATION (Always Visible) */}
        <SidebarGroup>
          <SidebarGroupContent>
            <SidebarMenu className="space-y-1">
              <SidebarMenuItem>
                <SidebarMenuButton 
                  asChild 
                  isActive={pathname === '/dashboard'} 
                  className="h-10 data-[active=true]:border-l-[3px] data-[active=true]:border-primary data-[active=true]:bg-primary/5 data-[active=true]:text-primary transition-all"
                >
                  <Link href="/dashboard" className="flex items-center gap-3">
                    <LayoutGrid className="h-5 w-5" />
                    <span className="font-medium">Dashboard</span>
                  </Link>
                </SidebarMenuButton>
              </SidebarMenuItem>
              <SidebarMenuItem>
                <SidebarMenuButton 
                  asChild 
                  isActive={pathname === '/tasks'} 
                  className="h-10 data-[active=true]:border-l-[3px] data-[active=true]:border-primary data-[active=true]:bg-primary/5 data-[active=true]:text-primary transition-all"
                >
                  <Link href="/tasks" className="flex items-center gap-3">
                    <ClipboardList className="h-5 w-5" />
                    <span className="font-medium">My Tasks</span>
                  </Link>
                </SidebarMenuButton>
              </SidebarMenuItem>
              <SidebarMenuItem>
                <SidebarMenuButton 
                  asChild 
                  isActive={pathname === '/notifications'} 
                  className="h-10 justify-between data-[active=true]:border-l-[3px] data-[active=true]:border-primary data-[active=true]:bg-primary/5 data-[active=true]:text-primary transition-all"
                >
                  <Link href="/notifications" className="flex items-center gap-3 w-full">
                    <div className="flex items-center gap-3">
                      <Bell className="h-5 w-5" />
                      <span className="font-medium">Notifications</span>
                    </div>
                    <Badge className="text-[10px] font-bold px-1.5 pt-1 h-4 min-w-[16px] rounded-full border-none">
                      3
                    </Badge>
                  </Link>
                </SidebarMenuButton>
              </SidebarMenuItem>
            </SidebarMenu>
          </SidebarGroupContent>
        </SidebarGroup>

        {/* ORGANIZATION CONTEXT: Channels (Only visible when inside an org) */}
        {mode === 'organization' && (
          <SidebarGroup className="mt-4">
            <div className="flex items-center justify-between px-3 mb-2">
              <SidebarGroupLabel className="text-[11px] font-bold uppercase tracking-[0.08em] text-muted-foreground">
                Channels
              </SidebarGroupLabel>
              {canAddChannels && (
                <button 
                  onClick={onAddChannel}
                  className="text-muted-foreground hover:text-foreground transition-colors p-1 rounded-md hover:bg-accent"
                >
                  <Plus className="h-4 w-4" />
                </button>
              )}
            </div>
            <SidebarGroupContent>
              {isLoadingChannels ? (
                <div className="flex items-center justify-center py-4">
                  <OrbitalLoader size="sm" />
                </div>
              ) : channels.length > 0 ? (
                <SidebarMenu className="space-y-0.5">
                  {channels.map((channel) => (
                    <SidebarMenuItem key={channel.id}>
                      <SidebarMenuButton 
                        asChild 
                        isActive={pathname === `/organizations/${organizationId}/channels/${channel.id}`}
                        className="h-9 data-[active=true]:border-l-[3px] data-[active=true]:border-primary data-[active=true]:bg-primary/5 data-[active=true]:text-primary transition-all"
                      >
                        <Link href={`/organizations/${organizationId}/channels/${channel.id}`}>
                          <Hash className="h-4 w-4 text-muted-foreground" />
                          <span>{channel.name}</span>
                        </Link>
                      </SidebarMenuButton>
                    </SidebarMenuItem>
                  ))}
                </SidebarMenu>
              ) : (
                <div className="px-3 py-2 text-xs text-muted-foreground">
                  No channels found
                </div>
              )}
            </SidebarGroupContent>
          </SidebarGroup>
        )}

        {/* DIRECT MESSAGES (Dummy Data) */}
        <SidebarGroup className="mt-2">
          <SidebarGroupLabel className="text-[11px] font-bold uppercase tracking-[0.08em] text-muted-foreground px-3 mb-2">
            Direct Messages
          </SidebarGroupLabel>
          <SidebarGroupContent>
            <SidebarMenu className="space-y-0.5">
              {dummyDMs.map((dm) => (
                <SidebarMenuItem key={dm.id}>
                  <SidebarMenuButton 
                    asChild 
                    isActive={pathname === `/messages/${dm.id}`}
                    className="h-10 data-[active=true]:border-l-[3px] data-[active=true]:border-primary data-[active=true]:bg-primary/5 data-[active=true]:text-primary transition-all"
                  >
                    <Link href={`/messages/${dm.id}`} className="flex items-center gap-3">
                      <div className="relative">
                        <Avatar className="h-6 w-6 border border-border">
                          <AvatarImage src={dm.avatar} />
                          <AvatarFallback className="text-[10px]">{dm.name.charAt(0)}</AvatarFallback>
                        </Avatar>
                        {dm.online && (
                          <div className="absolute -bottom-0.5 -right-0.5 w-2.5 h-2.5 rounded-full bg-emerald-500 border-2 border-background"></div>
                        )}
                      </div>
                      <span className="truncate">{dm.name}</span>
                    </Link>
                  </SidebarMenuButton>
                </SidebarMenuItem>
              ))}
            </SidebarMenu>
          </SidebarGroupContent>
        </SidebarGroup>
      </SidebarContent>

      {/* FOOTER: User Profile & Actions */}
      <SidebarFooter className="p-4 mt-auto border-t border-border">
        <SidebarMenu>
          <SidebarMenuItem>
            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <SidebarMenuButton size="lg" className="w-full data-[state=open]:bg-sidebar-accent data-[state=open]:text-sidebar-accent-foreground border border-transparent hover:border-border transition-all rounded-md">
                  <Avatar className="h-8 w-8 rounded-md">
                    <AvatarFallback className="rounded-md bg-primary/10 text-primary font-semibold text-xs border border-primary/20">
                      {userInitials}
                    </AvatarFallback>
                  </Avatar>
                  <div className="grid flex-1 text-left text-sm leading-tight">
                    <span className="truncate font-semibold">{user?.name || "User"}</span>
                    <span className="truncate text-xs text-muted-foreground">{user?.email || "user@example.com"}</span>
                  </div>
                  <ChevronsUpDown className="ml-auto h-4 w-4 text-muted-foreground" />
                </SidebarMenuButton>
              </DropdownMenuTrigger>
              <DropdownMenuContent 
                side="top" 
                align="start" 
                sideOffset={12}
                className="w-[--radix-dropdown-menu-trigger-width] min-w-56 rounded-md border-border shadow-lg bg-card"
              >
                <DropdownMenuLabel className="p-0 font-normal">
                  <div className="flex items-center gap-2 px-1 py-1.5 text-left text-sm">
                    <Avatar className="h-8 w-8 rounded-md">
                      <AvatarFallback className="rounded-md bg-primary/10 text-primary font-semibold text-xs">
                        {userInitials}
                      </AvatarFallback>
                    </Avatar>
                    <div className="grid flex-1 text-left text-sm leading-tight">
                      <span className="truncate font-semibold">{user?.name || "User"}</span>
                      <span className="truncate text-xs text-muted-foreground">{user?.email || "user@example.com"}</span>
                    </div>
                  </div>
                </DropdownMenuLabel>
                <DropdownMenuSeparator />
                <DropdownMenuItem className="cursor-pointer">
                  <Settings className="mr-2 h-4 w-4" />
                  <span>Account Settings</span>
                </DropdownMenuItem>
                <DropdownMenuSeparator />
                <DropdownMenuItem 
                  onClick={() => logoutMutation.mutate()}
                  disabled={logoutMutation.isPending}
                  className="text-destructive focus:bg-destructive/10 focus:text-destructive cursor-pointer"
                >
                  {logoutMutation.isPending ? <OrbitalLoader size="sm" className="mr-2" /> : <LogOut className="mr-2 h-4 w-4" />}
                  <span>Log out securely</span>
                </DropdownMenuItem>
              </DropdownMenuContent>
            </DropdownMenu>
          </SidebarMenuItem>
        </SidebarMenu>
      </SidebarFooter>
    </Sidebar>
  )
}