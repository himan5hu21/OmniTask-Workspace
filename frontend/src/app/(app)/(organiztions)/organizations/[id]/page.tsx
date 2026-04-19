"use client";

import { useState } from "react";
import { motion } from "framer-motion";
import { useParams } from "next/navigation";
import { Plus, Crown, ShieldCheck, UserCircle, Loader2, Edit2 } from "lucide-react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import {
  Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle, DialogTrigger,
} from "@/components/ui/dialog";
import { EditWorkspaceDialog } from "@/components/organizations/edit-workspace-dialog";
import { useAuthProfile } from "@/services/auth.service";
import { useOrganizations, useAddOrganizationMember, useOrganization } from "@/hooks/api/useOrganizations";
import { handleApiError } from "@/lib/api-errors";

export default function OrganizationDetailPage() {
  const params = useParams();
  const orgId = params.id as string;
  
  const { user } = useAuthProfile();
  const { organizations = [] } = useOrganizations();
  const { organization: orgWithMembers, isLoading: isLoadingOrg } = useOrganization(orgId);
  const organization = organizations.find(org => org.id === orgId) || orgWithMembers;

  // Get current user's role in the organization
  const currentUserMember = orgWithMembers?.members?.find((member) => member.user_id === user?.id);
  const userRole = currentUserMember?.role;

  const [isInviteDialogOpen, setIsInviteDialogOpen] = useState(false);
  const [isEditDialogOpen, setIsEditDialogOpen] = useState(false);
  const [inviteEmail, setInviteEmail] = useState("");
  const [inviteRole, setInviteRole] = useState<'ADMIN' | 'MEMBER'>('MEMBER');
  const [inviteEmailError, setInviteEmailError] = useState("");

  const addMemberMutation = useAddOrganizationMember({
    onSuccess: () => {
      setIsInviteDialogOpen(false);
      setInviteEmail("");
      setInviteEmailError("");
      toast.success("Member invited successfully");
    },
    onError: (error) => {
      handleApiError(
        error,
        {
          uniqueEmail: () => setInviteEmailError("This email is already a member"),
          onOtherError: (message: string) => toast.error(message)
        },
        "Failed to invite member. Please try again."
      );
    }
  });

  const handleInviteMember = () => {
    if (!inviteEmail.trim()) {
      setInviteEmailError("Email is required");
      return;
    }
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!emailRegex.test(inviteEmail)) {
      setInviteEmailError("Please enter a valid email address");
      return;
    }
    setInviteEmailError("");
    addMemberMutation.mutate({ 
      orgId, 
      data: { 
        email: inviteEmail, 
        role: inviteRole 
      } 
    });
  };

  return (
    <motion.div
      className="flex-1 flex flex-col h-full overflow-hidden"
      initial={{ opacity: 0, y: 18 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.28, ease: [0.22, 1, 0.36, 1] }}
    >

      {/* 🟢 Content */}
      <div className="flex-1 overflow-y-auto p-6 md:p-8">
        <div className="mx-auto space-y-8">
          
          <div className="mb-8">
            <h1 className="text-2xl font-bold text-foreground">Settings for {organization?.name || "Workspace"}</h1>
            <p className="text-muted-foreground mt-1 text-sm">Manage your workspace details and invite team members.</p>
          </div>
          
          {/* Workspace Name Display */}
          <div className="flex items-center justify-between p-4 rounded-lg border border-border bg-card">
            <div>
              <Label className="text-xs font-medium text-muted-foreground uppercase tracking-wider">Workspace Name</Label>
              <p className="text-lg font-semibold text-foreground mt-1">{organization?.name || "Workspace"}</p>
            </div>
            {userRole === 'OWNER' && (
              <Button
                size="sm"
                variant="outline"
                className="h-9 rounded-lg"
                onClick={() => setIsEditDialogOpen(true)}
              >
                <Edit2 className="h-4 w-4 mr-2" /> Edit
              </Button>
            )}
          </div>

          {isEditDialogOpen ? (
            <EditWorkspaceDialog
              orgId={orgId}
              onClose={() => setIsEditDialogOpen(false)}
            />
          ) : null}

          {/* Members Card */}
          <Card className="shadow-sm border-border">
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-4 border-b border-border/50 mb-4">
              <div>
                <CardTitle className="text-lg">Members</CardTitle>
                <CardDescription className="mt-1">Manage who has access to this workspace.</CardDescription>
              </div>
              <Dialog open={isInviteDialogOpen} onOpenChange={setIsInviteDialogOpen}>
                <DialogTrigger asChild>
                  <Button size="sm" className="h-9 rounded-lg">
                    <Plus className="h-4 w-4 mr-2" /> Invite Member
                  </Button>
                </DialogTrigger>
                <DialogContent className="sm:max-w-[425px] rounded-xl p-6">
                  <DialogHeader>
                    <DialogTitle className="text-xl">Invite Member</DialogTitle>
                    <DialogDescription className="mt-1.5">
                      Send an email invitation to join <strong>{organization?.name}</strong>.
                    </DialogDescription>
                  </DialogHeader>
                  <div className="py-4 space-y-4">
                    <div className="space-y-2">
                      <Label htmlFor="email" className="text-foreground font-semibold text-sm">Email Address</Label>
                      <Input
                        id="email"
                        type="email"
                        placeholder="name@company.com"
                        value={inviteEmail}
                        onChange={(e) => {
                          setInviteEmail(e.target.value);
                          setInviteEmailError("");
                        }}
                        className="h-11 px-4 text-base rounded-xl bg-background border-input shadow-sm hover:border-ring/50 focus-visible:ring-4 focus-visible:ring-ring/15 transition-all"
                      />
                      {inviteEmailError && (
                        <p className="text-sm text-destructive mt-1">{inviteEmailError}</p>
                      )}
                    </div>
                    <div className="space-y-2">
                      <Label htmlFor="role" className="text-foreground font-semibold text-sm">Role</Label>
                      <div className="flex gap-4">
                        <label className="flex items-center gap-2 cursor-pointer">
                          <input
                            type="radio"
                            name="role"
                            value="MEMBER"
                            checked={inviteRole === 'MEMBER'}
                            onChange={(e) => setInviteRole(e.target.value as 'ADMIN' | 'MEMBER')}
                            className="h-4 w-4 text-primary"
                          />
                          <span className="text-sm">Member</span>
                        </label>
                        <label className="flex items-center gap-2 cursor-pointer">
                          <input
                            type="radio"
                            name="role"
                            value="ADMIN"
                            checked={inviteRole === 'ADMIN'}
                            onChange={(e) => setInviteRole(e.target.value as 'ADMIN' | 'MEMBER')}
                            className="h-4 w-4 text-primary"
                          />
                          <span className="text-sm">Admin</span>
                        </label>
                      </div>
                    </div>
                  </div>
                  <DialogFooter className="gap-2">
                    <Button variant="outline" onClick={() => {
                      setIsInviteDialogOpen(false);
                      setInviteEmail("");
                      setInviteEmailError("");
                    }} className="h-11 px-4 rounded-xl transition-all font-semibold text-base">
                      Cancel
                    </Button>
                    <Button 
                      onClick={handleInviteMember} 
                      disabled={!inviteEmail || addMemberMutation.isPending} 
                      className="h-11 px-4 rounded-xl shadow-md transition-all font-semibold text-base"
                    >
                      {addMemberMutation.isPending && <Loader2 className="h-5 w-5 animate-spin mr-2" />}
                      Send Invite
                    </Button>
                  </DialogFooter>
                </DialogContent>
              </Dialog>
            </CardHeader>
            <CardContent>
              <div className="rounded-xl border border-border overflow-hidden">
                {isLoadingOrg ? (
                  <div className="p-8 text-center text-muted-foreground">
                    <Loader2 className="h-6 w-6 animate-spin mx-auto mb-2" />
                    <p className="text-sm">Loading members...</p>
                  </div>
                ) : orgWithMembers?.members && orgWithMembers.members.length > 0 ? (
                  orgWithMembers.members.map((member) => (
                    <div key={member.id} className="flex items-center justify-between p-4 bg-background hover:bg-muted/50 transition-colors border-b border-border/50 last:border-b-0">
                      <div className="flex items-center gap-3">
                        <Avatar className="h-10 w-10 border border-border/50">
                          <AvatarFallback className="bg-primary/10 text-primary font-semibold">
                            {member.user?.name?.charAt(0).toUpperCase() || 'U'}
                          </AvatarFallback>
                        </Avatar>
                        <div className="flex flex-col">
                          <span className="text-sm font-semibold text-foreground flex items-center gap-2">
                            {member.user?.name || 'Unknown User'}
                            {member.user_id === user?.id && (
                              <span className="text-[10px] font-medium bg-muted px-1.5 py-0.5 rounded text-muted-foreground uppercase tracking-wider">You</span>
                            )}
                          </span>
                          <span className="text-xs text-muted-foreground mt-0.5">{member.user?.email || 'user@example.com'}</span>
                        </div>
                      </div>
                      <div className="flex items-center gap-1.5 px-2.5 py-1 rounded-md text-xs font-bold tracking-wide">
                        {member.role === 'OWNER' ? (
                          <span className="text-amber-600 bg-amber-500/10 flex items-center gap-1.5">
                            <Crown className="h-3.5 w-3.5" /> OWNER
                          </span>
                        ) : member.role === 'ADMIN' ? (
                          <span className="text-primary bg-primary/10 flex items-center gap-1.5">
                            <ShieldCheck className="h-3.5 w-3.5" /> ADMIN
                          </span>
                        ) : (
                          <span className="text-foreground bg-muted flex items-center gap-1.5">
                            <UserCircle className="h-3.5 w-3.5" /> MEMBER
                          </span>
                        )}
                      </div>
                    </div>
                  ))
                ) : (
                  <div className="p-8 text-center text-muted-foreground">
                    <p className="text-sm">No members yet</p>
                  </div>
                )}
              </div>
            </CardContent>
          </Card>

        </div>
      </div>
    </motion.div>
  );
}
