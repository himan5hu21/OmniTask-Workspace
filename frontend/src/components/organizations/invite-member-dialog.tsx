"use client";

import React, { useState } from "react";
import { Loader2 } from "lucide-react";
import { toast } from "sonner";

import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";

import { useAddOrganizationMember } from "@/api/organizations";
import { handleApiError } from "@/api/api-errors";
import { ORG_ROLES, type OrgRole } from "@/types/roles";

interface InviteMemberDialogProps {
  orgId: string;
  trigger?: React.ReactNode;
  open?: boolean;
  onOpenChange?: (open: boolean) => void;
}

export function InviteMemberDialog({ 
  orgId, 
  trigger, 
  open: controlledOpen, 
  onOpenChange: controlledOnOpenChange 
}: InviteMemberDialogProps) {
  const [internalOpen, setInternalOpen] = useState(false);
  const open = controlledOpen ?? internalOpen;
  const onOpenChange = controlledOnOpenChange ?? setInternalOpen;

  const [inviteEmail, setInviteEmail] = useState("");
  const [inviteRole, setInviteRole] = useState<OrgRole>(ORG_ROLES.MEMBER);
  const [inviteEmailError, setInviteEmailError] = useState("");

  const addMemberMutation = useAddOrganizationMember();

  const handleInviteMember = () => {
    if (!inviteEmail.trim() || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(inviteEmail)) {
      setInviteEmailError("Please enter a valid email address");
      return;
    }

    addMemberMutation.mutate({
      orgId,
      data: { email: inviteEmail.trim(), role: inviteRole },
    }, {
      onSuccess: () => {
        setInviteEmail("");
        setInviteRole(ORG_ROLES.MEMBER);
        setInviteEmailError("");
        onOpenChange(false);
        toast.success("Member invited successfully");
      },
      onError: (error) =>
        handleApiError(error, {
          uniqueEmail: () => setInviteEmailError("This email is already part of the workspace"),
          accessDenied: () => toast.error("You do not have permission to invite members"),
          onOtherError: (message) => toast.error(message),
        }),
    });
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      {trigger && <DialogTrigger asChild>{trigger}</DialogTrigger>}
      <DialogContent className="sm:max-w-sm rounded-xl">
        <DialogHeader>
          <DialogTitle className="text-lg font-bold">Invite Member</DialogTitle>
          <DialogDescription className="text-xs">
            Grant workspace access to a new team operative.
          </DialogDescription>
        </DialogHeader>
        <form
          onSubmit={(e) => {
            e.preventDefault();
            handleInviteMember();
          }}
          className="space-y-4 py-4"
        >
          <div className="space-y-2">
            <Label htmlFor="invite-email" className="text-foreground font-semibold text-sm">Email</Label>
            <Input
              id="invite-email"
              value={inviteEmail}
              onChange={(event) => {
                setInviteEmail(event.target.value);
                setInviteEmailError("");
              }}
              placeholder="name@company.com"
              autoFocus
            />
            {inviteEmailError ? <p className="text-xs text-destructive">{inviteEmailError}</p> : null}
          </div>
          <div className="space-y-2">
            <Label className="text-foreground font-semibold text-sm">Role</Label>
            <Select value={inviteRole} onValueChange={(value) => setInviteRole(value as OrgRole)}>
              <SelectTrigger className="h-11 px-4 text-base rounded-xl bg-background border-input shadow-sm hover:border-ring/50 focus:ring-4 focus:ring-ring/15 transition-all">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value={ORG_ROLES.MEMBER}>Member</SelectItem>
                <SelectItem value={ORG_ROLES.ADMIN}>Admin</SelectItem>
                <SelectItem value={ORG_ROLES.GUEST}>Guest</SelectItem>
              </SelectContent>
            </Select>
          </div>
          <DialogFooter className="pt-2">
            <Button type="button" variant="ghost" size="sm" onClick={() => onOpenChange(false)}>
              Cancel
            </Button>
            <Button type="submit" size="sm" disabled={addMemberMutation.isPending || !inviteEmail.trim()}>
              {addMemberMutation.isPending ? <Loader2 className="h-4 w-4 animate-spin" /> : "Send Invite"}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}
