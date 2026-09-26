"use client";

import dynamic from "next/dynamic";
import { useState, useEffect } from "react";
import { useParams, useRouter } from "next/navigation";
import { useIsMounted } from "@/hooks/useIsMounted";
import {
  Hash,
  Plus,
  Mail,
} from "lucide-react";
import Spinner from "@/components/Loading";

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
  const router = useRouter();
  const orgId = params.id as string;

  const [isInviteDialogOpen, setIsInviteDialogOpen] = useState(false);
  const [isCreateChannelOpen, setIsCreateChannelOpen] = useState(false);

  const { organization, isLoading: isLoadingOrganization, isError, error } = useOrganization(orgId);

  // Redirect to dashboard if request fails with Forbidden (403) or Not Found (404)
  useEffect(() => {
    if (isError && error) {
      const status = (error as unknown as { status?: number })?.status;
      if (status === 403 || status === 404) {
        router.replace("/dashboard");
      }
    }
  }, [isError, error, router]);

  if (!isMounted) return null;

  if (isLoadingOrganization) {
    return (
      <div className="flex h-full flex-1 items-center justify-center">
        <Spinner size="md" />
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
        <div className="mb-8 flex h-20 w-20 items-center justify-center rounded-2xl bg-white border border-border/80 shadow-[0_8px_30px_rgb(0,0,0,0.04)] select-none">
          <Hash className="h-10 w-10 text-[#4F6EF7] stroke-[1.8]" />
        </div>
        
        {/* Welcome Text */}
        <h2 className="mb-3 text-3xl font-extrabold tracking-tight text-foreground sm:text-4xl">
          Welcome to {organization.name}
        </h2>
        
        {/* Helper Text */}
        <p className="mb-8 max-w-[420px] text-sm leading-relaxed text-muted-foreground font-semibold">
          This is your organization&apos;s digital headquarters. Select a channel from the sidebar to start collaborating, or create a new one to organize a specific topic.
        </p>
        
        {/* CTA Buttons */}
        <div className="flex flex-row gap-4">
          <Can I="create" a="Channel">
            <Button 
              className="h-11 gap-2 bg-[#4F6EF7] hover:bg-[#3b5bdb] text-white rounded-xl px-6 text-sm font-semibold shadow-xs transition-all hover:-translate-y-px hover:shadow-md active:-translate-y-px active:scale-[0.98]"
              onClick={() => setIsCreateChannelOpen(true)}
            >
              <Plus className="h-4 w-4" />
              Create Channel
            </Button>
          </Can>
          <Can I="invite" a="Member">
            <Button 
              variant="outline"
              className="h-11 gap-2 rounded-xl px-6 text-sm font-semibold border-border text-foreground transition-all hover:bg-muted/50 active:scale-[0.98]"
              onClick={() => setIsInviteDialogOpen(true)}
            >
              <Mail className="h-4 w-4 text-muted-foreground" />
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
