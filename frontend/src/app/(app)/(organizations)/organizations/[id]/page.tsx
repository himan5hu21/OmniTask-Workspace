"use client";

import dynamic from "next/dynamic";
import { useState } from "react";
import { useParams } from "next/navigation";
import { useIsMounted } from "@/hooks/useIsMounted";
import {
  Hash,
  Loader2,
  Plus,
  UserPlus,
} from "lucide-react";

import { Button } from "@/components/ui/button";
import {
  useOrganization,
} from "@/api/organizations";
import { Can } from "@/lib/casl";
import React from "react";

const CreateChannelDialog = dynamic(
  () => import("@/components/organizations/create-channel-dialog").then(mod => mod.CreateChannelDialog),
  { ssr: false }
);

const InviteMemberDialog = dynamic(
  () => import("@/components/organizations/invite-member-dialog").then(mod => mod.InviteMemberDialog),
  { ssr: false }
);

export default function OrganizationDetailPage() {
  const isMounted = useIsMounted();
  const params = useParams();
  const orgId = params.id as string;

  const [isInviteDialogOpen, setIsInviteDialogOpen] = useState(false);
  const [isCreateChannelOpen, setIsCreateChannelOpen] = useState(false);

  const { organization, isLoading: isLoadingOrganization } = useOrganization(orgId);

  if (!isMounted) return null;

  if (isLoadingOrganization) {
    return (
      <div className="flex min-h-[60vh] items-center justify-center">
        <Loader2 className="h-8 w-8 animate-spin text-primary" />
      </div>
    );
  }

  if (!organization) {
    return (
      <div className="flex min-h-[60vh] items-center justify-center rounded-3xl border border-dashed border-border bg-muted/15">
        <div className="text-center">
          <p className="text-lg font-semibold text-foreground">Workspace not found</p>
          <p className="mt-2 text-sm text-muted-foreground">It may have been removed or you may not have access.</p>
        </div>
      </div>
    );
  }

  return (
    <div className="flex h-full flex-1 items-center justify-center">
      <div className="flex max-w-[480px] flex-col items-center p-8 text-center">
        {/* Hero Icon */}
        <div className="mb-6 flex h-20 w-20 items-center justify-center rounded-full bg-muted/50 shadow-sm transition-all hover:scale-105">
          <Hash className="h-10 w-10 text-primary" />
        </div>
        
        {/* Welcome Text */}
        <h2 className="mb-3 text-3xl font-bold tracking-tight text-foreground sm:text-4xl">
          Welcome to {organization.name}
        </h2>
        
        {/* Helper Text */}
        <p className="mb-8 max-w-[400px] text-base leading-relaxed text-muted-foreground">
          Select a channel from the sidebar to start collaborating, or create a new one to get your team aligned.
        </p>
        
        {/* CTA Buttons */}
        <div className="flex flex-row gap-4">
          <Can I="create" a="Channel">
            <Button 
              className="h-12 gap-2 rounded-xl px-6 text-sm font-semibold shadow-md transition-all hover:-translate-y-px hover:shadow-lg active:-translate-y-px"
              onClick={() => setIsCreateChannelOpen(true)}
            >
              <Plus className="h-4 w-4" />
              Create Channel
            </Button>
          </Can>
          <Can I="invite" a="Member">
            <Button 
              variant="outline"
              className="h-12 gap-2 rounded-xl px-6 text-sm font-semibold transition-all hover:bg-muted/50 active:scale-[0.98]"
              onClick={() => setIsInviteDialogOpen(true)}
            >
              <UserPlus className="h-4 w-4" />
              Invite Members
            </Button>
          </Can>
        </div>
      </div>

      {/* Dialog Components */}
      <Can I="create" a="Channel">
        <CreateChannelDialog 
          orgId={orgId} 
          open={isCreateChannelOpen} 
          onOpenChange={setIsCreateChannelOpen} 
        />
      </Can>

      <Can I="invite" a="Member">
        <InviteMemberDialog 
          orgId={orgId} 
          open={isInviteDialogOpen} 
          onOpenChange={setIsInviteDialogOpen} 
        />
      </Can>
    </div>
  );
}
