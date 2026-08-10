"use client";

import dynamic from "next/dynamic";
import { useRouter, useSearchParams } from "next/navigation";
import {
  CheckSquare,
  CircleHelp,
  MessageSquareText,
  Search,
  Settings,
  Calendar,
  LogOut,
  Building2,
  Folder,
  ChevronRight,
} from "lucide-react";

import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { SidebarTrigger } from "@/components/ui/sidebar";
const ChannelSettingsModal = dynamic(
  () => import("@/components/organizations/channel-management-sheet").then(mod => mod.ChannelSettingsModal),
  { ssr: false }
);
import { cn, getInitials } from "@/lib/utils";
import { useIsMounted } from "@/hooks/useIsMounted";
import { useAuthProfile, useLogoutMutation } from "@/api/auth";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { buildAuthenticatedFileUrl } from "@/lib/file-url";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
  DropdownMenuLabel,
} from "@/components/ui/dropdown-menu";
import { useUIStore } from "@/store/ui.store";
import { ButtonSpinner } from "@/components/ui/orbital-loader";

// Reusable user menu dropdown for all headers
function UserMenuDropdown() {
  const { user } = useAuthProfile();
  const logoutMutation = useLogoutMutation();
  const avatarUrl = user?.avatar_url ? buildAuthenticatedFileUrl(user.avatar_url) : undefined;
  const initials = user?.name ? getInitials(user.name) : "U";

  return (
    <DropdownMenu>
      <DropdownMenuTrigger asChild>
        <button className="relative h-9 w-9 rounded-full border border-primary/20 bg-primary/10 hover:opacity-90 transition-opacity focus:outline-hidden cursor-pointer select-none">
          <Avatar className="h-full w-full rounded-full">
            <AvatarImage src={avatarUrl} />
            <AvatarFallback className="bg-transparent text-primary font-bold text-sm shadow-sm">
              {initials}
            </AvatarFallback>
          </Avatar>
        </button>
      </DropdownMenuTrigger>
      <DropdownMenuContent align="end" className="w-56 bg-card border-border rounded-xl shadow-lg p-1.5 mt-1">
        <DropdownMenuLabel className="p-0 font-normal">
          <div className="flex items-center gap-3 px-2 py-2 text-left text-sm">
            <Avatar className="h-8 w-8 rounded-full border border-primary/20 bg-primary/10">
              <AvatarImage src={avatarUrl} />
              <AvatarFallback className="bg-transparent text-primary font-bold text-xs">
                {initials}
              </AvatarFallback>
            </Avatar>
            <div className="grid flex-1 text-left text-xs leading-tight">
              <span className="truncate font-semibold text-foreground">{user?.name || "User"}</span>
              <span className="truncate text-muted-foreground">
                {user?.email || "user@example.com"}
              </span>
            </div>
          </div>
        </DropdownMenuLabel>
        <DropdownMenuSeparator className="my-1.5" />
        <DropdownMenuItem 
          className="cursor-pointer rounded-lg py-2 text-sm font-medium focus:bg-accent focus:text-foreground"
          onClick={() => useUIStore.getState().openProfileSettings()}
        >
          <Settings className="mr-2 h-4 w-4 text-muted-foreground" />
          <span>Account Settings</span>
        </DropdownMenuItem>
        <DropdownMenuSeparator className="my-1.5" />
        <DropdownMenuItem
          onClick={() => logoutMutation.mutate()}
          disabled={logoutMutation.isPending}
          className="cursor-pointer rounded-lg py-2 text-sm font-medium text-destructive focus:bg-destructive/10 focus:text-destructive"
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
  );
}

export function DashboardHeader() {
  const { user } = useAuthProfile();
  const isMounted = useIsMounted();
  const greetingName = user?.name ? user.name.split(" ")[0] : "User";

  const getGreeting = () => {
    if (!isMounted) return "Good morning";
    const hour = new Date().getHours();
    if (hour < 12) return "Good morning";
    if (hour < 17) return "Good afternoon";
    return "Good evening";
  };
  const greeting = getGreeting();

  return (
    <header className="sticky top-0 z-40 flex h-16 shrink-0 items-center justify-between border-b border-border bg-background/80 px-8 backdrop-blur-md gap-4">
      {/* Mobile Sidebar Trigger */}
      <div className="flex items-center gap-2 md:hidden">
        <SidebarTrigger className="-ml-2 text-muted-foreground hover:text-foreground" />
        <span className="text-lg font-bold">OmniTask</span>
      </div>

      {/* Desktop Search bar */}
      <div className="hidden md:flex flex-1 max-w-sm relative">
        <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
        <Input 
          placeholder="Search OmniTask..." 
          className="w-full h-10 pl-10 text-sm rounded-full bg-muted/40 border-border hover:border-border/80 focus-visible:ring-2 focus-visible:ring-primary/20 transition-all shadow-none"
        />
      </div>

      {/* Right side Actions */}
      <div className="flex items-center gap-4 shrink-0">
        <div className="flex items-center gap-3">
          <span className="hidden sm:inline text-sm font-semibold text-muted-foreground">
            {greeting}, <span className="text-foreground">{greetingName}</span>
          </span>
          <UserMenuDropdown />
        </div>
      </div>
    </header>
  );
}

export function OrganizationHeader({
  organizationName,
  onSettingsClick,
}: {
  organizationName?: string;
  onSettingsClick?: () => void;
}) {
  const isMounted = useIsMounted();
  const initials = isMounted && organizationName
    ? organizationName.split(" ").map(n => n[0]).join("").toUpperCase().slice(0, 2)
    : "OT";

  return (
    <header className="sticky top-0 z-40 flex h-16 shrink-0 items-center justify-between border-b border-border bg-background/80 px-8 backdrop-blur-md">
      <div className="flex items-center gap-4">
        {/* Mobile Sidebar Trigger */}
        <div className="flex items-center gap-2 md:hidden">
          <SidebarTrigger className="-ml-2 text-muted-foreground hover:text-foreground" />
          <span className="text-lg font-bold">OmniTask</span>
        </div>
        
        {/* Breadcrumb style for Desktop */}
        <div className="hidden md:flex items-center gap-3">
          <div className="flex h-9 w-9 items-center justify-center rounded-lg border border-primary/20 bg-primary/10 text-sm font-bold text-primary shadow-sm">
            {initials}
          </div>
          <div className="flex flex-col">
            <h2 className="text-sm font-semibold tracking-tight text-foreground leading-tight">
              Home
            </h2>
            <p className="text-[10px] text-muted-foreground font-medium uppercase tracking-wider leading-tight">Overview</p>
          </div>
        </div>
      </div>

      <div className="flex items-center gap-3 shrink-0">
        {onSettingsClick && (
          <Button 
            variant="ghost" 
            size="icon" 
            className="rounded-full text-muted-foreground hover:bg-muted hover:text-foreground transition-all h-8 w-8 md:h-9 md:w-9"
            onClick={onSettingsClick}
          >
            <Settings className="h-4.5 w-4.5 md:h-5 md:w-5" />
          </Button>
        )}
        <UserMenuDropdown />
      </div>
    </header>
  );
}

export function ChannelHeader({
  organizationId,
  channelId,
  channelName,
  organizationName,
}: {
  organizationId: string;
  channelId: string;
  channelName?: string;
  organizationName?: string;
}) {
  const router = useRouter();
  const searchParams = useSearchParams();
  const activeTab = searchParams.get("tab") === "tasks" ? "tasks" : "chat";

  const setTab = (tab: "chat" | "tasks") => {
    const params = new URLSearchParams(searchParams.toString());
    params.set("tab", tab);
    router.replace(`/organizations/${organizationId}/channels/${channelId}?${params.toString()}`);
  };

  return (
    <header className="sticky top-0 z-40 flex h-16 shrink-0 items-center justify-between border-b border-border bg-background/80 px-8 backdrop-blur-md gap-4">
      <div className="flex items-center gap-4 min-w-0">
        {/* Mobile Sidebar Trigger */}
        <div className="flex items-center gap-2 md:hidden min-w-0">
          <SidebarTrigger className="-ml-2 text-muted-foreground hover:text-foreground" />
          <span className="text-base font-bold truncate max-w-30 xs:max-w-[180px] text-foreground">
            {channelName || "Channel"}
          </span>
        </div>

        {/* Breadcrumb style for Desktop */}
        <div className="hidden md:flex items-center gap-2 min-w-0 select-none">
          <div className="flex items-center gap-1.5 text-xs font-semibold text-muted-foreground">
            <Folder className="h-4 w-4 shrink-0 text-muted-foreground/80" />
            <span className="hover:text-foreground transition-colors cursor-pointer">{organizationName || "Workspace"}</span>
          </div>
          <ChevronRight className="h-3.5 w-3.5 text-muted-foreground/60 shrink-0" />
          <h2 className="text-sm font-bold tracking-tight text-foreground truncate">
            {channelName || "Channel"}
          </h2>
        </div>
      </div>

      <div className="flex items-center gap-3 shrink-0">
        {/* Tab Switcher (Visible & Responsive on all screens) */}
        <div className="flex items-center gap-0.5 rounded-full border border-border bg-muted/40 p-0.5 md:p-1">
          <Button
            variant="ghost"
            size="sm"
            onClick={() => setTab("chat")}
            className={cn(
              "rounded-full px-2.5 py-1 md:px-4 text-xs font-semibold h-7 md:h-8",
              activeTab === "chat" ? "bg-background text-foreground shadow-sm" : "text-muted-foreground"
            )}
          >
            <MessageSquareText className="h-3.5 w-3.5 md:mr-2 md:h-4 md:w-4" />
            <span className="hidden xs:inline">Chat</span>
          </Button>
          <Button
            variant="ghost"
            size="sm"
            onClick={() => setTab("tasks")}
            className={cn(
              "rounded-full px-2.5 py-1 md:px-4 text-xs font-semibold h-7 md:h-8",
              activeTab === "tasks" ? "bg-background text-foreground shadow-sm" : "text-muted-foreground"
            )}
          >
            <CheckSquare className="h-3.5 w-3.5 md:mr-2 md:h-4 md:w-4" />
            <span className="hidden xs:inline">Tasks</span>
          </Button>
        </div>

        {/* Channel Settings Trigger */}
        <ChannelSettingsModal
          channelId={channelId}
          orgId={organizationId}
          trigger={
            <Button
              variant="ghost"
              size="icon"
              className="rounded-full text-muted-foreground hover:bg-muted hover:text-foreground transition-all h-8 w-8 md:h-9 md:w-9"
            >
              <Settings className="h-4 w-4 md:h-5 md:w-5" />
            </Button>
          }
        />
        
        <UserMenuDropdown />
      </div>
    </header>
  );
}
