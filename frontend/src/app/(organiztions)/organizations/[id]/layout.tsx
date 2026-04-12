"use client";

import { useParams, useRouter, usePathname } from "next/navigation";
import { Hash, Plus, Loader2, Building2, Users, Settings } from "lucide-react";
import Link from "next/link";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import { Button } from "@/components/ui/button";
import { useAuthProfile } from "@/services/auth.service";
import { useOrganizations, useOrganization } from "@/hooks/useOrganizations";
import { useOrgChannelsQuery } from "@/services/channel.service";
import { useState } from "react";

export default function WorkspaceLayout({ children, modal }: { children: React.ReactNode; modal?: React.ReactNode }) {
  const params = useParams();
  const router = useRouter();
  const pathname = usePathname();
  const orgId = params.id as string;

  const { user, isLoading: isLoadingUser } = useAuthProfile();
  const { organizations = [] } = useOrganizations();
  const { data: channelsData, isLoading: isLoadingChannels } = useOrgChannelsQuery(orgId);
  const { organization: orgWithMembers } = useOrganization(orgId);
  
  const channels = channelsData?.success ? channelsData.data : [];
  const organization = organizations.find(org => org.id === orgId);

  // Get current user's role in the organization
  const currentUserMember = orgWithMembers?.members?.find((member) => member.user_id === user?.id);
  const userRole = currentUserMember?.role;

  // Check if user can add channels (ADMIN or OWNER)
  const canAddChannels = userRole === 'ADMIN' || userRole === 'OWNER';

  // States for collapsible sections (Open by default)
  const [isChannelsOpen, setIsChannelsOpen] = useState(true);
  const [isDmsOpen, setIsDmsOpen] = useState(true);

  if (isLoadingUser) {
    return (
      <div className="flex h-screen items-center justify-center bg-background">
        <Loader2 className="h-8 w-8 animate-spin text-primary" />
      </div>
    );
  }

  return (
    <div className="flex h-screen bg-background overflow-hidden font-sans text-foreground">
      
      {/* 🟢 Workspace Sidebar */}
      <aside className="w-64 border-r border-border bg-background shrink-0 hidden md:flex flex-col">
        
        {/* OmniTask Header & Organization Name */}
        <div className="h-14 shrink-0 border-b border-border flex items-center px-5">
          <div className="flex items-center gap-3 w-full overflow-hidden">
            <button
              onClick={() => router.push('/dashboard')}
              className="flex h-8 w-8 items-center justify-center rounded-lg bg-primary text-primary-foreground shadow-sm shrink-0 hover:opacity-80 transition-opacity cursor-pointer"
              title="Go to Dashboard"
            >
              <Building2 className="h-4 w-4" />
            </button>
            {/* Typography refined for a professional, compact look */}
            <div className="flex flex-col flex-1 min-w-0 justify-center">
              <span className="font-bold text-[15px] text-foreground tracking-tight leading-none mb-1 truncate">
                OmniTask
              </span>
              <span className="text-[11px] font-medium text-muted-foreground truncate leading-none">
                {organization?.name || 'Workspace'}
              </span>
            </div>
          </div>
        </div>

        {/* Sidebar Content */}
        <div className="flex-1 overflow-y-auto py-5 space-y-7">
          
          {/* CHANNELS Section */}
          <div>
            <div className="flex items-center justify-between px-5 mb-2">
              <button 
                onClick={() => setIsChannelsOpen(!isChannelsOpen)} 
                className="flex items-center hover:opacity-80 transition-opacity"
              >
                <h3 className="text-[11px] font-bold text-muted-foreground uppercase tracking-wider">
                  Channels
                </h3>
              </button>
              {canAddChannels && (
                <Button size="icon" variant="ghost" className="h-5 w-5 text-foreground hover:bg-muted rounded-md">
                  <Plus className="h-4 w-4" />
                </Button>
              )}
            </div>
            {isChannelsOpen && (
              <div className="px-3 space-y-0.5">
                {isLoadingChannels ? (
                  <div className="px-3 py-2 text-xs text-muted-foreground flex items-center gap-2">
                    <Loader2 className="h-3 w-3 animate-spin" /> Loading...
                  </div>
                ) : channels.map((channel) => {
                  const isActive = pathname === `/organizations/${orgId}/channels/${channel.id}`;
                  return (
                    <Link
                      key={channel.id}
                      href={`/organizations/${orgId}/channels/${channel.id}`}
                      className={`w-full flex items-center gap-3 px-3 py-2 rounded-xl transition-colors text-left ${
                        isActive 
                          ? 'bg-primary/10 text-primary font-medium' 
                          : 'hover:bg-muted text-foreground'
                      }`}
                    >
                      <Hash className={`h-4 w-4 shrink-0 ${isActive ? 'text-primary' : 'text-muted-foreground'}`} />
                      <span className="text-sm truncate">{channel.name}</span>
                    </Link>
                  );
                })}
              </div>
            )}
          </div>

          {/* DIRECT MESSAGES Section */}
          <div>
            <div className="flex items-center justify-between px-5 mb-2">
              <button 
                onClick={() => setIsDmsOpen(!isDmsOpen)} 
                className="flex items-center hover:opacity-80 transition-opacity"
              >
                <h3 className="text-[11px] font-bold text-muted-foreground uppercase tracking-wider">
                  Direct Messages
                </h3>
              </button>
            </div>
            {isDmsOpen && (
              <div className="px-3 space-y-0.5">
                <button className="w-full flex items-center gap-3 px-3 py-2 rounded-xl hover:bg-muted text-foreground transition-colors text-left">
                  <Users className="h-4 w-4 shrink-0 text-muted-foreground" />
                  <span className="text-sm truncate">New Message</span>
                </button>
              </div>
            )}
          </div>

        </div>

        {/* Footer (User Profile & Settings) */}
        <div className="p-4 border-t border-border mt-auto flex items-center justify-between bg-background">
          <div className="flex items-center gap-3 overflow-hidden">
            <Avatar className="h-10 w-10 border border-primary/10">
              <AvatarFallback className="bg-primary/10 text-primary font-bold text-sm">
                {user?.name?.charAt(0).toUpperCase() || 'U'}
              </AvatarFallback>
            </Avatar>
            <div className="flex flex-col min-w-0">
              <p className="text-sm font-semibold text-foreground truncate leading-tight">
                {user?.name || 'User'}
              </p>
              <p className="text-[11px] font-medium text-muted-foreground truncate">
                {user?.email || 'user@example.com'}
              </p>
            </div>
          </div>
          
          {/* Settings Button linking to Org Detail Page */}
          <Button
            variant="ghost"
            size="icon"
            className="h-8 w-8 text-muted-foreground hover:text-foreground shrink-0 rounded-full"
            onClick={() => router.push(`/organizations/${orgId}`)}
          >
            <Settings className="h-4 w-4" />
          </Button>
        </div>
      </aside>

      {/* 🟢 Main Content Area */}
      <main className="flex-1 flex flex-col min-w-0 bg-background relative">
        {children}
      </main>

      {modal}
    </div>
  );
}