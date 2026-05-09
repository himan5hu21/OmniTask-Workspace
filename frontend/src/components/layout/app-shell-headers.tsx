"use client";

import dynamic from "next/dynamic";
import { useRouter, useSearchParams } from "next/navigation";
import {
  CheckSquare,
  CircleHelp,
  MessageSquareText,
  Search,
  Settings,
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
    <header className="sticky top-0 z-40 flex h-16 shrink-0 items-center justify-between border-b border-border bg-background/80 px-6 backdrop-blur-md">
      <div className="flex items-center gap-4">
        {/* Mobile Sidebar Trigger */}
        <div className="flex items-center gap-2 md:hidden">
          <SidebarTrigger className="-ml-2 text-muted-foreground hover:text-foreground" />
          <span className="text-lg font-bold">OmniTask</span>
        </div>
        
        {/* Breadcrumb style for Desktop */}
        <div className="hidden md:flex items-center gap-3">
          <div className="flex h-9 w-9 items-center justify-center rounded-xl border border-primary/20 bg-primary/10 text-sm font-bold text-primary shadow-sm">
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

      <div className="flex items-center gap-2">
        <Button variant="ghost" size="icon" className="rounded-full text-muted-foreground hover:bg-muted hover:text-foreground transition-all">
          <Search className="h-5 w-5" />
        </Button>
        <Button variant="ghost" size="icon" className="rounded-full text-muted-foreground hover:bg-muted hover:text-foreground transition-all">
          <CircleHelp className="h-5 w-5" />
        </Button>
        {onSettingsClick && (
          <Button 
            variant="ghost" 
            size="icon" 
            className="rounded-full text-muted-foreground hover:bg-muted hover:text-foreground transition-all"
            onClick={onSettingsClick}
          >
            <Settings className="h-5 w-5" />
          </Button>
        )}
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
  const isMounted = useIsMounted();
  const initials = isMounted ? getInitials(channelName, "CH") : "CH";

  const setTab = (tab: "chat" | "tasks") => {
    const params = new URLSearchParams(searchParams.toString());
    params.set("tab", tab);
    router.replace(`/organizations/${organizationId}/channels/${channelId}?${params.toString()}`);
  };

  return (
    <header className="sticky top-0 z-40 flex h-16 shrink-0 items-center gap-4 border-b border-border bg-background/85 px-6 backdrop-blur-md">
      <div className="flex items-center gap-3 min-w-0">
        <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl border border-primary/20 bg-primary/10 text-base font-bold text-primary shadow-sm">
          {initials}
        </div>
        <div className="min-w-0">
          <div className="flex items-center gap-2">
            <h1 className="truncate text-base font-semibold text-foreground">{channelName || "Channel"}</h1>
          </div>
          <p className="text-[10px] font-medium uppercase tracking-wider text-muted-foreground">Collaborate & Manage Tasks</p>
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


        <ChannelSettingsModal
          channelId={channelId}
          orgId={organizationId}
          trigger={
            <Button variant="ghost" size="icon" className="rounded-full text-muted-foreground hover:text-foreground">
              <Settings className="h-5 w-5" />
            </Button>
          }
        />
      </div>
    </header>
  );
}


