"use client";

import React, { useState } from "react";
import { toast } from "sonner";
import { Shield, Users, Mail } from "lucide-react";
import { OrbitalLoader } from "@/components/ui/orbital-loader";

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
import { cn } from "@/lib/utils";

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
      <DialogContent className="sm:max-w-md rounded-2xl border-border bg-card shadow-2xl p-0 overflow-hidden">
        <DialogHeader className="p-6 pb-0">
          <DialogTitle className="text-xl font-bold tracking-tight text-foreground">
            Invite Team Member
          </DialogTitle>
          <DialogDescription className="text-sm text-muted-foreground mt-1.5">
            Add a new member to your workspace and define their permissions.
          </DialogDescription>
        </DialogHeader>

        <form
          onSubmit={(e) => {
            e.preventDefault();
            handleInviteMember();
          }}
          className="p-6 space-y-6"
        >
          {/* Email Field */}
          <div className="space-y-2.5">
            <Label htmlFor="invite-email" className="text-xs font-bold uppercase tracking-widest text-muted-foreground ml-0.5">
              Email Address
            </Label>
            <div className="relative group">
              <Mail className="absolute left-3.5 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground group-focus-within:text-primary transition-colors" />
              <Input
                id="invite-email"
                value={inviteEmail}
                onChange={(event) => {
                  setInviteEmail(event.target.value);
                  setInviteEmailError("");
                }}
                placeholder="colleague@example.com"
                className={cn(
                  "h-12 pl-10 rounded-xl bg-background border-border transition-all focus-visible:ring-4 focus-visible:ring-primary/10 focus-visible:border-primary focus-visible:ring-offset-0",
                  inviteEmailError && "border-destructive/50 focus-visible:ring-destructive/10 focus-visible:border-destructive"
                )}
                autoFocus
              />
            </div>
            {inviteEmailError ? (
              <p className="text-[11px] font-medium text-destructive ml-1 animate-in fade-in slide-in-from-top-1">
                {inviteEmailError}
              </p>
            ) : null}
          </div>

          {/* Role Selection */}
          <div className="space-y-2.5">
            <Label className="text-xs font-bold uppercase tracking-widest text-muted-foreground ml-0.5">
              Select Role
            </Label>
            <Select value={inviteRole} onValueChange={(value) => setInviteRole(value as OrgRole)}>
              <SelectTrigger className="h-12! px-4 rounded-xl bg-background border-border shadow-sm hover:border-primary/30 focus:ring-4 focus:ring-primary/10 transition-all outline-hidden">
                <div className="flex items-center gap-2.5">
                  <SelectValue placeholder="Select a role" />
                </div>
              </SelectTrigger>
              <SelectContent className="rounded-xl p-2 bg-card border-border shadow-2xl">
                <SelectItem value={ORG_ROLES.ADMIN} textValue="Admin" className="rounded-lg p-3 focus:bg-blue-500/10 cursor-pointer">
                  <div className="flex items-center gap-3">
                    <Shield className="h-4 w-4 text-blue-500" />
                    <span className="font-bold text-foreground">Admin</span>
                  </div>
                </SelectItem>
                <SelectItem value={ORG_ROLES.MEMBER} textValue="Member" className="rounded-lg p-3 focus:bg-emerald-500/10 mt-1 cursor-pointer">
                  <div className="flex items-center gap-3">
                    <Users className="h-4 w-4 text-emerald-500" />
                    <span className="font-bold text-foreground">Member</span>
                  </div>
                </SelectItem>
                <SelectItem value={ORG_ROLES.GUEST} textValue="Guest" className="rounded-lg p-3 focus:bg-muted mt-1 cursor-pointer">
                  <div className="flex items-center gap-3">
                    <Mail className="h-4 w-4 text-muted-foreground" />
                    <span className="font-bold text-foreground">Guest</span>
                  </div>
                </SelectItem>
              </SelectContent>
            </Select>
          </div>

          {/* Footer Actions */}
          <DialogFooter className="pt-2 flex items-center gap-3 sm:justify-end">
            <Button 
              type="button" 
              variant="ghost" 
              className="h-11 rounded-xl px-6 font-semibold text-muted-foreground hover:text-foreground transition-all"
              onClick={() => onOpenChange(false)}
            >
              Cancel
            </Button>
            <Button 
              type="submit" 
              className="h-11 rounded-xl px-8 bg-primary hover:bg-primary/90 text-primary-foreground font-bold shadow-lg shadow-primary/20 transition-all active:scale-95 min-w-[140px]"
              disabled={addMemberMutation.isPending || !inviteEmail.trim()}
            >
              {addMemberMutation.isPending ? (
                <OrbitalLoader size="sm" variant="minimal" color="currentColor" />
              ) : (
                "Send Invite"
              )}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}
