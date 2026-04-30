"use client"

import { 
  Building2, MessageSquare, CheckCircle2, LayoutGrid, 
  LifeBuoy, Send, ChevronsUpDown, LogOut, Loader2,
  Hash, Plus, Users
} from "lucide-react"
import Link from "next/link"
import { useRouter, usePathname } from "next/navigation"
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
} from "@/components/ui/sidebar"
import { Avatar, AvatarFallback } from "@/components/ui/avatar"
import { Button } from "@/components/ui/button"
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu"
import { useState } from "react"

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

export function AppSidebar({
  mode = 'dashboard',
  organizationId,
  organizationName,
  channels = [],
  isLoadingChannels = false,
  canAddChannels = false,
  onAddChannel,
  className
}: AppSidebarProps) {
  const router = useRouter()
  const pathname = usePathname()
  const { user } = useAuthProfile()
  
  const logoutMutation = useLogoutMutation({
    onSuccess: () => router.push("/login"),
  })

  const userInitials = user?.name ? user.name.charAt(0).toUpperCase() : "U"

  // Collapsible states for organization mode
  const [isChannelsOpen, setIsChannelsOpen] = useState(true)
  const [isDmsOpen, setIsDmsOpen] = useState(true)

  return (
    <Sidebar collapsible="offcanvas" variant="sidebar" className={className}>
      {/* 🟢 App Logo Header */}
      <SidebarHeader>
        <SidebarMenu>
          <SidebarMenuItem>
            <SidebarMenuButton size="lg" asChild>
              <Link href="/dashboard">
              <div className="flex aspect-square size-8 items-center justify-center rounded-lg bg-primary text-primary-foreground shadow-sm shadow-primary/20">
                <LayoutGrid className="size-4" />
              </div>
              <div className="flex flex-col gap-0.5 leading-none">
                <span className="font-semibold text-foreground">OmniTask</span>
                <span className="text-xs text-muted-foreground">{mode === 'organization' ? organizationName || 'Workspace' : 'Workspace'}</span>
              </div>
              </Link>
            </SidebarMenuButton>
          </SidebarMenuItem>
        </SidebarMenu>
      </SidebarHeader>

      {/* 🟢 Main Navigation */}
      <SidebarContent>
        {mode === 'dashboard' ? (
          <SidebarGroup>
            <SidebarGroupLabel>Main Menu</SidebarGroupLabel>
            <SidebarGroupContent>
              <SidebarMenu>
                <SidebarMenuItem>
                  <SidebarMenuButton isActive={pathname === '/dashboard'} asChild>
                    <Link href="/dashboard">
                    <Building2 />
                    <span>Workspaces</span>
                    </Link>
                  </SidebarMenuButton>
                </SidebarMenuItem>
                <SidebarMenuItem>
                  <SidebarMenuButton isActive={pathname === '/messages'} asChild>
                    <Link href="/messages">
                    <MessageSquare />
                    <span>Direct Messages</span>
                    </Link>
                  </SidebarMenuButton>
                </SidebarMenuItem>
                <SidebarMenuItem>
                  <SidebarMenuButton isActive={pathname === '/tasks'} asChild>
                    <Link href="/tasks">
                    <CheckCircle2 />
                    <span>My Tasks</span>
                    </Link>
                  </SidebarMenuButton>
                </SidebarMenuItem>
              </SidebarMenu>
            </SidebarGroupContent>
          </SidebarGroup>
        ) : (
          <>
            {/* CHANNELS Section */}
            <SidebarGroup>
              <div className="flex items-center justify-between px-2 mb-2">
                <button 
                  onClick={() => setIsChannelsOpen(!isChannelsOpen)} 
                  className="flex items-center hover:opacity-80 transition-opacity"
                >
                  <SidebarGroupLabel className="cursor-pointer">Channels</SidebarGroupLabel>
                </button>
                {canAddChannels && (
                  <Button size="icon" variant="ghost" className="h-5 w-5 text-foreground hover:bg-muted rounded-md" onClick={onAddChannel}>
                    <Plus className="h-4 w-4" />
                  </Button>
                )}
              </div>
              {isChannelsOpen && (
                <SidebarGroupContent>
                  <SidebarMenu>
                    {isLoadingChannels ? (
                      <div className="px-3 py-2 text-xs text-muted-foreground flex items-center gap-2">
                        <Loader2 className="h-3 w-3 animate-spin" /> Loading...
                      </div>
                    ) : channels.map((channel) => {
                      const isActive = pathname === `/organizations/${organizationId}/channels/${channel.id}`;
                      return (
                        <SidebarMenuItem key={channel.id}>
                          <SidebarMenuButton
                            asChild
                            className={isActive ? 'bg-primary/10 text-primary font-medium' : 'hover:bg-muted text-foreground'}
                          >
                            <Link href={`/organizations/${organizationId}/channels/${channel.id}`}>
                              <Hash className={`h-4 w-4 ${isActive ? 'text-primary' : 'text-muted-foreground'}`} />
                              <span>{channel.name}</span>
                            </Link>
                          </SidebarMenuButton>
                        </SidebarMenuItem>
                      );
                    })}
                  </SidebarMenu>
                </SidebarGroupContent>
              )}
            </SidebarGroup>

            {/* DIRECT MESSAGES Section */}
            <SidebarGroup>
              <div className="flex items-center justify-between px-2 mb-2">
                <button 
                  onClick={() => setIsDmsOpen(!isDmsOpen)} 
                  className="flex items-center hover:opacity-80 transition-opacity"
                >
                  <SidebarGroupLabel className="cursor-pointer">Direct Messages</SidebarGroupLabel>
                </button>
              </div>
              {isDmsOpen && (
                <SidebarGroupContent>
                  <SidebarMenu>
                    <SidebarMenuItem>
                      <SidebarMenuButton className="hover:bg-muted text-foreground">
                        <Users className="h-4 w-4 text-muted-foreground" />
                        <span>New Message</span>
                      </SidebarMenuButton>
                    </SidebarMenuItem>
                  </SidebarMenu>
                </SidebarGroupContent>
              )}
            </SidebarGroup>
          </>
        )}
        
        {/* Secondary Navigation pushed to bottom - only for dashboard mode */}
        {mode === 'dashboard' && (
          <SidebarGroup className="mt-auto">
            <SidebarGroupContent>
              <SidebarMenu>
                <SidebarMenuItem>
                  <SidebarMenuButton>
                    <LifeBuoy />
                    <span>Support</span>
                  </SidebarMenuButton>
                </SidebarMenuItem>
                <SidebarMenuItem>
                  <SidebarMenuButton>
                    <Send />
                    <span>Feedback</span>
                  </SidebarMenuButton>
                </SidebarMenuItem>
              </SidebarMenu>
            </SidebarGroupContent>
          </SidebarGroup>
        )}
      </SidebarContent>

      {/* 🟢 User Profile Footer */}
      <SidebarFooter>
        <SidebarMenu>
          <SidebarMenuItem>
            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <SidebarMenuButton
                  size="lg"
                  className="data-[state=open]:bg-sidebar-accent data-[state=open]:text-sidebar-accent-foreground"
                >
                  <Avatar className="h-8 w-8 rounded-lg">
                    <AvatarFallback className="rounded-lg bg-primary/10 text-primary font-semibold">
                      {userInitials}
                    </AvatarFallback>
                  </Avatar>
                  <div className="grid flex-1 text-left text-sm leading-tight">
                    <span className="truncate font-semibold">{user?.name || "User"}</span>
                    <span className="truncate text-xs text-muted-foreground">{user?.email || "user@example.com"}</span>
                  </div>
                  <ChevronsUpDown className="ml-auto size-4" />
                </SidebarMenuButton>
              </DropdownMenuTrigger>
              <DropdownMenuContent
                className="w-[--radix-dropdown-menu-trigger-width] min-w-56 rounded-lg"
                side="right"
                align="end"
                sideOffset={4}
              >
                <DropdownMenuLabel className="p-0 font-normal">
                  <div className="flex items-center gap-2 px-1 py-1.5 text-left text-sm">
                    <Avatar className="h-8 w-8 rounded-lg">
                      <AvatarFallback className="rounded-lg bg-primary/10 text-primary font-semibold">
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
                <DropdownMenuItem 
                  onClick={() => logoutMutation.mutate()}
                  disabled={logoutMutation.isPending}
                  className="text-destructive focus:bg-destructive/10 focus:text-destructive cursor-pointer"
                >
                  {logoutMutation.isPending ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : <LogOut className="mr-2 h-4 w-4" />}
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

