"use client";

import React, { useState } from "react";
import { useRouter } from "next/navigation";
import { MessageSquare, Search, User } from "lucide-react";
import { toast } from "sonner";
import { ButtonSpinner } from "@/components/ui/orbital-loader";

import { Input } from "@/components/ui/input";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { ScrollArea } from "@/components/ui/scroll-area";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";

import { useOrganizationMembers } from "@/api/organizations";
import { useStartConversation } from "@/api/messages";
import { useAuthProfile } from "@/api/auth";
import { getInitials } from "@/lib/utils";
import { buildAuthenticatedFileUrl } from "@/lib/file-url";

interface NewDirectMessageDialogProps {
  orgId: string;
  trigger?: React.ReactNode;
  open?: boolean;
  onOpenChange?: (open: boolean) => void;
}

export function NewDirectMessageDialog({
  orgId,
  trigger,
  open: controlledOpen,
  onOpenChange: controlledOnOpenChange,
}: NewDirectMessageDialogProps) {
  const router = useRouter();
  const [internalOpen, setInternalOpen] = useState(false);
  const open = controlledOpen ?? internalOpen;
  const onOpenChange = controlledOnOpenChange ?? setInternalOpen;

  const [searchQuery, setSearchQuery] = useState("");

  const { user: currentUser } = useAuthProfile();
  const { members, isLoading: isLoadingMembers } = useOrganizationMembers(orgId, { page: 1, limit: 100 }, { enabled: open });
  const startConversationMutation = useStartConversation();

  const handleStartChat = (recipientId: string) => {
    startConversationMutation.mutate(recipientId, {
      onSuccess: (response) => {
        if (response.success) {
          toast.success("Conversation started!");
          onOpenChange(false);
          // Redirect to the new direct message page!
          router.push(`/messages/${response.data.id}${orgId ? `?orgId=${orgId}` : ""}`);
        }
      },
      onError: () => {
        toast.error("Failed to start direct conversation. Please try again.");
      },
    });
  };

  // Filter members based on search query, excluding the current logged-in user
  const filteredMembers = members.filter(
    (member) =>
      member.user_id !== currentUser?.id &&
      (member.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
        member.email.toLowerCase().includes(searchQuery.toLowerCase()))
  );

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      {trigger && <DialogTrigger asChild>{trigger}</DialogTrigger>}
      <DialogContent className="sm:max-w-md rounded-2xl border-border bg-card shadow-2xl p-0 overflow-hidden">
        <DialogHeader className="p-6 pb-0">
          <DialogTitle className="text-xl font-bold tracking-tight text-foreground flex items-center gap-2">
            <MessageSquare className="h-5 w-5 text-primary" />
            New Direct Message
          </DialogTitle>
          <DialogDescription className="text-sm text-muted-foreground mt-1.5">
            Select a team member from your workspace to start a private conversation.
          </DialogDescription>
        </DialogHeader>

        <div className="p-6 space-y-4">
          {/* Search bar */}
          <div className="relative group">
            <Search className="absolute left-3.5 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground group-focus-within:text-primary transition-colors" />
            <Input
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              placeholder="Search by name or email..."
              className="h-12 pl-10 rounded-xl bg-background border-border transition-all focus-visible:ring-4 focus-visible:ring-primary/10 focus-visible:border-primary focus-visible:ring-offset-0"
              autoFocus
            />
          </div>

          {/* Members list */}
          <ScrollArea className="h-64 rounded-xl border border-border bg-background/50 p-2">
            {isLoadingMembers ? (
              <div className="flex h-full flex-col items-center justify-center py-16">
                <ButtonSpinner className="h-6 w-6 text-primary" />
                <p className="text-xs text-muted-foreground mt-2">Loading team members...</p>
              </div>
            ) : filteredMembers.length > 0 ? (
              <div className="space-y-1">
                {filteredMembers.map((member) => (
                  <button
                    key={member.id}
                    onClick={() => handleStartChat(member.user_id)}
                    disabled={startConversationMutation.isPending}
                    className="flex w-full items-center gap-3 rounded-lg p-2.5 text-left text-sm hover:bg-sidebar-accent/60 transition-colors disabled:opacity-50"
                  >
                    <Avatar className="h-8 w-8 rounded-md border border-sidebar-border bg-primary/10">
                      <AvatarImage src={member.avatar_url ? buildAuthenticatedFileUrl(member.avatar_url) : undefined} />
                      <AvatarFallback className="bg-transparent text-primary font-bold text-xs uppercase">
                        {getInitials(member.name)}
                      </AvatarFallback>
                    </Avatar>
                    <div className="min-w-0 flex-1">
                      <p className="font-semibold text-foreground truncate text-sm">{member.name}</p>
                      <p className="text-xs text-muted-foreground truncate">{member.email}</p>
                    </div>
                  </button>
                ))}
              </div>
            ) : (
              <div className="flex h-full flex-col items-center justify-center py-16 text-center">
                <User className="h-8 w-8 text-muted-foreground/60 mb-2" />
                <p className="text-sm font-semibold text-foreground">No members found</p>
                <p className="text-xs text-muted-foreground max-w-[200px] mt-1">
                  Try searching for another name or invite members to your workspace.
                </p>
              </div>
            )}
          </ScrollArea>
        </div>
      </DialogContent>
    </Dialog>
  );
}
