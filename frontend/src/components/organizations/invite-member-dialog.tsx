"use client";

import React, { useState } from "react";
import { toast } from "sonner";
import { Shield, Users, Mail, Copy, Check, Link2 } from "lucide-react";
import { ButtonSpinner } from "@/components/ui/orbital-loader";

import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Dialog,
  DialogContent,
  DialogDescription,
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

import { useGenerateInvitationLink } from "@/api/organizations";
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
  const [generatedLink, setGeneratedLink] = useState<string | null>(null);
  const [copied, setCopied] = useState(false);

  const generateLinkMutation = useGenerateInvitationLink();

  const handleGenerateLink = () => {
    if (!inviteEmail.trim() || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(inviteEmail)) {
      setInviteEmailError("Please enter a valid email address");
      return;
    }

    generateLinkMutation.mutate(
      { orgId, data: { email: inviteEmail.trim(), role: inviteRole as 'ADMIN' | 'MEMBER' | 'GUEST' } },
      {
        onSuccess: (response) => {
          if (response.success) {
            setGeneratedLink(response.data.inviteLink);
            setInviteEmailError("");
          }
        },
        onError: (error) =>
          handleApiError(error, {
            accessDenied: () => toast.error("You do not have permission to invite members"),
            onOtherError: (message) => toast.error(message),
          }),
      }
    );
  };

  const handleCopyLink = async () => {
    if (!generatedLink) return;
    await navigator.clipboard.writeText(generatedLink);
    setCopied(true);
    toast.success("Invite link copied to clipboard!");
    setTimeout(() => setCopied(false), 2500);
  };

  const handleReset = () => {
    setGeneratedLink(null);
    setInviteEmail("");
    setInviteRole(ORG_ROLES.MEMBER);
    setInviteEmailError("");
    setCopied(false);
  };

  const handleClose = (open: boolean) => {
    if (!open) handleReset();
    onOpenChange(open);
  };

  return (
    <Dialog open={open} onOpenChange={handleClose}>
      {trigger && <DialogTrigger asChild>{trigger}</DialogTrigger>}
      <DialogContent className="sm:max-w-md rounded-2xl border-border bg-card shadow-2xl overflow-hidden">
        <DialogHeader>
          <DialogTitle className="text-xl text-left font-bold tracking-tight text-foreground flex items-center gap-2">
            <Link2 className="h-5 w-5 text-primary" />
            Invite Team Member
          </DialogTitle>
          <DialogDescription className="text-sm text-left text-muted-foreground mt-1.5">
            Generate a secure invite link to share with your colleague.
          </DialogDescription>
        </DialogHeader>

        {!generatedLink ? (
          // Step 1: Enter email + role
          <form
            onSubmit={(e) => {
              e.preventDefault();
              handleGenerateLink();
            }}
            className="space-y-6"
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
                    "pl-10 bg-background border-border transition-all focus-visible:ring-4 focus-visible:ring-primary/10 focus-visible:border-primary focus-visible:ring-offset-0",
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
                <SelectTrigger className="bg-background border-border shadow-sm hover:border-primary/30 focus:ring-4 focus:ring-primary/10 transition-all outline-hidden">
                  <div className="hidden" style={{ display: "none" }}>
                    <SelectValue />
                  </div>
                  <div className="flex items-center gap-2.5">
                    {inviteRole === ORG_ROLES.ADMIN && <Shield className="h-4 w-4 text-blue-500" />}
                    {inviteRole === ORG_ROLES.MEMBER && <Users className="h-4 w-4 text-emerald-500" />}
                    {inviteRole === ORG_ROLES.GUEST && <Mail className="h-4 w-4 text-muted-foreground" />}
                    <span className="font-semibold text-sm text-foreground">
                      {inviteRole === ORG_ROLES.ADMIN ? "Admin" : inviteRole === ORG_ROLES.MEMBER ? "Member" : "Guest"}
                    </span>
                  </div>
                </SelectTrigger>
                <SelectContent position="popper">
                  <SelectItem value={ORG_ROLES.ADMIN} textValue="Admin" className="p-3 focus:bg-blue-500/10 cursor-pointer">
                    <div className="flex items-center gap-3">
                      <Shield className="h-4 w-4 text-blue-500" />
                      <div className="flex flex-col items-start">
                        <span className="font-bold text-foreground">Admin</span>
                        <p className="text-xs text-muted-foreground mt-0.5">Can manage channels, members and settings</p>
                      </div>
                    </div>
                  </SelectItem>
                  <SelectItem value={ORG_ROLES.MEMBER} textValue="Member" className="p-3 focus:bg-emerald-500/10 mt-1 cursor-pointer">
                    <div className="flex items-center gap-3">
                      <Users className="h-4 w-4 text-emerald-500" />
                      <div className="flex flex-col items-start">
                        <span className="font-bold text-foreground">Member</span>
                        <p className="text-xs text-muted-foreground mt-0.5">Standard workspace member</p>
                      </div>
                    </div>
                  </SelectItem>
                  <SelectItem value={ORG_ROLES.GUEST} textValue="Guest" className="p-3 focus:bg-muted mt-1 cursor-pointer">
                    <div className="flex items-center gap-3">
                      <Mail className="h-4 w-4 text-muted-foreground" />
                      <div className="flex flex-col items-start">
                        <span className="font-bold text-foreground">Guest</span>
                        <p className="text-xs text-muted-foreground mt-0.5">Limited view-only access</p>
                      </div>
                    </div>
                  </SelectItem>
                </SelectContent>
              </Select>
            </div>

            {/* Footer */}
            <div className="flex items-center gap-3 justify-end pt-2">
              <Button
                type="button"
                variant="ghost"
                size="default"
                onClick={() => handleClose(false)}
              >
                Cancel
              </Button>
              <Button
                type="submit"
                size={"default"}
                disabled={generateLinkMutation.isPending || !inviteEmail.trim()}
              >
                {generateLinkMutation.isPending ? (
                  <ButtonSpinner />
                ) : (
                  <>
                    <Link2 className="h-4 w-4 mr-2" />
                    Generate Link
                  </>
                )}
              </Button>
            </div>
          </form>
        ) : (
          // Step 2: Show generated link
          <div className="p-6 space-y-5">
            {/* Success State */}
            <div className="flex items-start gap-3 p-4 rounded-xl bg-emerald-500/10 border border-emerald-500/20">
              <div className="mt-0.5 shrink-0 flex items-center justify-center h-8 w-8 rounded-full bg-emerald-500/20">
                <Check className="h-4 w-4 text-emerald-500" />
              </div>
              <div>
                <p className="text-sm font-semibold text-foreground whitespace-pre-wrap wrap-anywhere">Invitation link ready!</p>
                <p className="text-xs text-muted-foreground mt-0.5">
                  Send this link to <span className="font-medium text-foreground">{inviteEmail}</span>. 
                  It expires in 7 days.
                </p>
              </div>
            </div>

            {/* Link Display */}
            <div className="space-y-2">
              <Label className="text-xs font-bold uppercase tracking-widest text-muted-foreground ml-0.5">
                Invite Link
              </Label>
              <div className="flex items-center gap-2">
                <div className="flex-1 min-w-0 px-3.5 py-3 rounded-xl bg-muted/50 border border-border font-mono text-xs text-muted-foreground truncate select-all wrap-anywhere whitespace-pre-wrap">
                  {generatedLink}
                </div>
              </div>
            </div>

            {/* Action Buttons */}
            <div className="flex items-center gap-3">
              <Button
                className={cn(
                  "flex-1 h-11 rounded-xl font-bold transition-all active:scale-95",
                  copied
                    ? "bg-emerald-500 hover:bg-emerald-500/90 text-white shadow-lg shadow-emerald-500/25"
                    : "bg-primary hover:bg-primary/90 text-primary-foreground shadow-lg shadow-primary/20"
                )}
                onClick={handleCopyLink}
              >
                {copied ? (
                  <>
                    <Check className="h-4 w-4 mr-2" />
                    Copied!
                  </>
                ) : (
                  <>
                    <Copy className="h-4 w-4 mr-2" />
                    Copy Link
                  </>
                )}
              </Button>
              {/* <Button
                variant="outline"
                className="h-11 rounded-xl px-4 font-semibold border-border hover:bg-muted/50 transition-all"
                onClick={() => window.open(generatedLink!, "_blank")}
              >
                <ExternalLink className="h-4 w-4" />
              </Button> */}
            </div>

            {/* Footer */}
            <div className="flex items-center gap-3 pt-1 border-t border-border">
              <Button
                variant="ghost"
                className="h-10 rounded-xl px-4 text-sm font-semibold text-muted-foreground hover:text-foreground transition-all"
                onClick={handleReset}
              >
                Invite Another
              </Button>
              <Button
                variant="ghost"
                className="ml-auto h-10 rounded-xl px-4 text-sm font-semibold text-muted-foreground hover:text-foreground transition-all"
                onClick={() => handleClose(false)}
              >
                Done
              </Button>
            </div>
          </div>
        )}
      </DialogContent>
    </Dialog>
  );
}
