"use client";

import { useRouter, useSearchParams } from "next/navigation";
import {
  Bell,
  CheckSquare,
  Hash,
  MessageSquareText,
  MoreHorizontal,
  Search,
  Settings,
} from "lucide-react";

import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { SidebarTrigger } from "@/components/ui/sidebar";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { ChannelManagementSheet } from "@/components/organizations/channel-management-sheet";
import { cn } from "@/lib/utils";

export function DashboardHeader() {
  return (
    <header className="sticky top-0 z-40 flex h-16 shrink-0 items-center gap-4 border-b border-border bg-background/80 px-6 backdrop-blur-md">
      <div className="flex items-center gap-2 md:hidden">
        <SidebarTrigger className="-ml-2 text-muted-foreground hover:text-foreground" />
        <span className="text-lg font-bold">OmniTask</span>
      </div>

      <div className="hidden md:flex min-w-0 flex-1 items-center gap-4">
        <div>
          <p className="text-sm font-semibold text-foreground">Dashboard</p>
          <p className="text-xs text-muted-foreground">Your organizations and collaboration spaces</p>
        </div>
        <div className="relative ml-auto w-full max-w-md">
          <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
          <Input
            placeholder="Search workspaces..."
            className="h-11 rounded-full border-transparent bg-muted/50 pl-10 shadow-none transition-all hover:border-border focus-visible:ring-2 focus-visible:ring-primary/20"
          />
        </div>
      </div>

      <div className="ml-auto flex items-center gap-2">
        <Button variant="ghost" size="icon" className="rounded-full text-muted-foreground hover:text-foreground">
          <Bell className="h-5 w-5" />
        </Button>
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
  return (
    <header className="sticky top-0 z-40 flex h-16 shrink-0 items-center gap-4 border-b border-border bg-background/80 px-6 backdrop-blur-md">
      <div className="flex items-center gap-2 md:hidden">
        <SidebarTrigger className="-ml-2 text-muted-foreground hover:text-foreground" />
        <span className="text-lg font-bold">OmniTask</span>
      </div>

      <div className="hidden min-w-0 flex-1 items-center gap-4 md:flex">
        <div>
          <p className="text-sm font-semibold text-foreground">{organizationName || "Organization"}</p>
          <p className="text-xs text-muted-foreground">Workspace settings, members, and channel management</p>
        </div>
        <div className="relative ml-auto w-full max-w-md">
          <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
          <Input
            placeholder={`Search ${organizationName || "workspace"}...`}
            className="h-11 rounded-full border-transparent bg-muted/50 pl-10 shadow-none transition-all hover:border-border focus-visible:ring-2 focus-visible:ring-primary/20"
          />
        </div>
      </div>

      <div className="ml-auto flex items-center gap-2">
        {onSettingsClick ? (
          <Button variant="ghost" size="icon" className="rounded-full text-muted-foreground hover:text-foreground" onClick={onSettingsClick}>
            <Settings className="h-5 w-5" />
          </Button>
        ) : null}
        <Button variant="ghost" size="icon" className="rounded-full text-muted-foreground hover:text-foreground">
          <Bell className="h-5 w-5" />
        </Button>
      </div>
    </header>
  );
}

export function ChannelHeader({
  organizationId,
  channelId,
  channelName,
}: {
  organizationId: string;
  channelId: string;
  channelName?: string;
}) {
  const router = useRouter();
  const searchParams = useSearchParams();
  const activeTab = searchParams.get("tab") === "tasks" ? "tasks" : "chat";
  const initials = getChannelInitials(channelName);

  const setTab = (tab: "chat" | "tasks") => {
    const params = new URLSearchParams(searchParams.toString());
    params.set("tab", tab);
    router.replace(`/organizations/${organizationId}/channels/${channelId}?${params.toString()}`);
  };

  return (
    <header className="sticky top-0 z-40 flex h-20 shrink-0 items-center gap-4 border-b border-border bg-background/85 px-6 backdrop-blur-md">
      <div className="flex items-center gap-3 min-w-0">
        <div className="flex h-11 w-11 shrink-0 items-center justify-center rounded-full bg-primary/10 text-sm font-semibold text-primary">
          {initials}
        </div>
        <div className="min-w-0">
          <div className="flex items-center gap-2">
            <h1 className="truncate text-base font-semibold text-foreground">{channelName || "Channel"}</h1>
            <span className="rounded-full bg-muted px-2 py-0.5 text-[10px] font-semibold uppercase tracking-[0.14em] text-muted-foreground">
              Live
            </span>
          </div>
          <p className="text-xs text-muted-foreground">Chat, updates, and channel-scoped work in one place</p>
        </div>
      </div>

      <div className="ml-auto flex items-center gap-3">
        <div className="hidden items-center gap-1 rounded-full border border-border bg-muted/40 p-1 md:flex">
          <Button
            variant="ghost"
            size="sm"
            onClick={() => setTab("chat")}
            className={cn(
              "rounded-full px-4 text-xs font-semibold",
              activeTab === "chat" ? "bg-background text-foreground shadow-sm" : "text-muted-foreground"
            )}
          >
            <MessageSquareText className="mr-2 h-4 w-4" />
            Chat
          </Button>
          <Button
            variant="ghost"
            size="sm"
            onClick={() => setTab("tasks")}
            className={cn(
              "rounded-full px-4 text-xs font-semibold",
              activeTab === "tasks" ? "bg-background text-foreground shadow-sm" : "text-muted-foreground"
            )}
          >
            <CheckSquare className="mr-2 h-4 w-4" />
            Tasks
          </Button>
        </div>

        <Button variant="ghost" size="icon" className="rounded-full text-muted-foreground hover:text-foreground">
          <Hash className="h-5 w-5" />
        </Button>
        <Button variant="ghost" size="icon" className="rounded-full text-muted-foreground hover:text-foreground">
          <Search className="h-5 w-5" />
        </Button>
        <Button variant="ghost" size="icon" className="rounded-full text-muted-foreground hover:text-foreground">
          <Bell className="h-5 w-5" />
        </Button>
        <DropdownMenu>
          <DropdownMenuTrigger asChild>
            <Button variant="ghost" size="icon" className="rounded-full text-muted-foreground hover:text-foreground">
              <MoreHorizontal className="h-5 w-5" />
            </Button>
          </DropdownMenuTrigger>
          <DropdownMenuContent align="end" className="w-56 rounded-xl shadow-lg border-border">
            <ChannelManagementSheet
              channelId={channelId}
              orgId={organizationId}
              trigger={
                <DropdownMenuItem onSelect={(e) => e.preventDefault()} className="rounded-lg cursor-pointer">
                  <Settings className="mr-2 h-4 w-4" />
                  <span>Manage Channel</span>
                </DropdownMenuItem>
              }
            />
          </DropdownMenuContent>
        </DropdownMenu>
      </div>
    </header>
  );
}

function getChannelInitials(channelName?: string) {
  if (!channelName) return "CH";

  const words = channelName
    .trim()
    .split(/\s+/)
    .filter(Boolean);

  if (words.length >= 2) {
    return `${words[0][0]}${words[1][0]}`.toUpperCase();
  }

  const normalized = words[0] ?? channelName;
  return normalized.slice(0, 2).toUpperCase();
}

