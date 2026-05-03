"use client";

import { useMemo, useState } from "react";
import { useParams, useRouter } from "next/navigation";
import {
  ArrowRight,
  Building2,
  Crown,
  Filter,
  Hash,
  Loader2,
  MessageSquareText,
  PencilLine,
  Plus,
  Search,
  Shield,
  ShieldAlert,
  ShieldCheck,
  Trash2,
  UserCircle,
  UserMinus,
  Users,
} from "lucide-react";
import { toast } from "sonner";

import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
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
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";

import { EditWorkspaceDialog } from "@/components/organizations/edit-workspace-dialog";
import { ChannelManagementSheet } from "@/components/organizations/channel-management-sheet";
import { useAuthProfile } from "@/api/auth";
import {
  useAddOrganizationMember,
  useDeleteOrganization,
  useOrganization,
  useOrganizationMembers,
  useRemoveOrganizationMember,
  useUpdateOrganizationMemberRole,
} from "@/api/organizations";
import {
  useCreateChannel,
  useOrgChannels,
} from "@/api/channels";
import { handleApiError } from "@/api/api-errors";

function OrganizationRoleBadge({ role }: { role: "OWNER" | "ADMIN" | "MEMBER" }) {
  if (role === "OWNER") {
    return (
      <span className="inline-flex items-center gap-1.5 rounded-md bg-amber-500/10 px-2 py-0.5 text-[10px] font-bold uppercase tracking-wider text-amber-700 border border-amber-500/20">
        <Crown className="h-3 w-3" />
        Owner
      </span>
    );
  }

  if (role === "ADMIN") {
    return (
      <span className="inline-flex items-center gap-1.5 rounded-md bg-primary/10 px-2 py-0.5 text-[10px] font-bold uppercase tracking-wider text-primary border border-primary/20">
        <ShieldCheck className="h-3 w-3" />
        Admin
      </span>
    );
  }

  return (
    <span className="inline-flex items-center gap-1.5 rounded-md bg-muted px-2 py-0.5 text-[10px] font-bold uppercase tracking-wider text-muted-foreground border border-border/50">
      <UserCircle className="h-3 w-3" />
      Member
    </span>
  );
}

export default function OrganizationDetailPage() {
  const params = useParams();
  const router = useRouter();
  const orgId = params.id as string;
  const { user } = useAuthProfile();

  const [isInviteDialogOpen, setIsInviteDialogOpen] = useState(false);
  const [isCreateChannelOpen, setIsCreateChannelOpen] = useState(false);
  const [isEditDialogOpen, setIsEditDialogOpen] = useState(false);
  const [isDeleteDialogOpen, setIsDeleteDialogOpen] = useState(false);
  const [memberToRemove, setMemberToRemove] = useState<{ id: string; name: string } | null>(null);

  const [memberSearch, setMemberSearch] = useState("");
  const [memberRoleFilter, setMemberRoleFilter] = useState<"ALL" | "OWNER" | "ADMIN" | "MEMBER">("ALL");
  const [memberPage, setMemberPage] = useState(1);

  const [channelSearch, setChannelSearch] = useState("");
  const [channelMembershipFilter, setChannelMembershipFilter] = useState<"ALL" | "JOINED" | "MANAGED">("ALL");
  const [channelPage, setChannelPage] = useState(1);

  const [inviteEmail, setInviteEmail] = useState("");
  const [inviteRole, setInviteRole] = useState<"ADMIN" | "MEMBER">("MEMBER");
  const [inviteEmailError, setInviteEmailError] = useState("");

  const [channelName, setChannelName] = useState("");
  const [channelNameError, setChannelNameError] = useState("");

  const { organization, isLoading: isLoadingOrganization } = useOrganization(orgId);
  const {
    members,
    pagination: memberPagination,
    permissions,
    isLoading: isLoadingMembers,
    currentUserRole,
  } = useOrganizationMembers(orgId, {
    page: memberPage,
    limit: 8,
    search: memberSearch,
    role: memberRoleFilter,
  });
  const {
    channels,
    pagination: channelPagination,
    isLoading: isLoadingChannels,
  } = useOrgChannels(orgId, {
    page: channelPage,
    limit: 8,
    search: channelSearch,
    membership: channelMembershipFilter,
  });


  // currentUserRole is already destructured from useOrganizationMembers above


  const canCreateChannels = permissions?.canCreateChannels ?? false;
  const canInviteMembers = permissions?.canInviteMembers ?? false;
  const canDeleteOrganization = permissions?.canDeleteOrganization ?? false;
  const canEditSettings = permissions?.canEditSettings ?? false;
  const canChangeRoles = permissions?.canChangeMemberRoles ?? false;
  const canRemoveMembers = permissions?.canRemoveMembers ?? false;

  console.log("Permissions:", permissions);

  const addMemberMutation = useAddOrganizationMember();


  const updateRoleMutation = useUpdateOrganizationMemberRole();


  const removeMemberMutation = useRemoveOrganizationMember();


  const deleteOrgMutation = useDeleteOrganization();


  const createChannelMutation = useCreateChannel();


  console.log("Is Create Channel Open:", isCreateChannelOpen);

  const canShowRemove = useMemo(
    () => (member: (typeof members)[number]) => {
      // 1. Users cannot remove themselves from the listing UI (done via channel settings if needed)
      if (member.user_id === user?.id) return false;

      // 2. Organization Owner cannot be removed by anyone through this UI
      if (member.role === "OWNER") return false;

      // 3. Admins cannot remove other Admins (enforced by backend)
      if (currentUserRole === "ADMIN" && member.role === "ADMIN") return false;

      // 4. Otherwise, respect the general canRemoveMembers permission
      return canRemoveMembers;
    },
    [canRemoveMembers, currentUserRole, user?.id]
  );

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
        setInviteRole("MEMBER");
        setInviteEmailError("");
        setIsInviteDialogOpen(false);
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

  const handleCreateChannel = () => {
    if (!channelName.trim() || channelName.trim().length < 2) {
      setChannelNameError("Channel name must be at least 2 characters");
      return;
    }

    createChannelMutation.mutate({
      name: channelName.trim(),
      org_id: orgId,
    }, {
      onSuccess: () => {
        setChannelName("");
        setChannelNameError("");
        setIsCreateChannelOpen(false);
        toast.success("Channel created successfully");
      },
      onError: (error) =>
        handleApiError(error, {
          uniqueName: () => setChannelNameError("That channel name already exists in this workspace"),
          accessDenied: () => toast.error("You do not have permission to create channels"),
          onOtherError: (message) => toast.error(message),
        }),
    });
  };

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
    <div className="mx-auto flex w-full max-w-6xl flex-col gap-6 pb-12">
      {/* Simple Professional Header */}
      <section className="flex flex-col gap-4 border-b border-border pb-6 sm:flex-row sm:items-center sm:justify-between">
        <div className="space-y-1">
          <div className="flex items-center gap-2 text-xs font-bold uppercase tracking-widest text-muted-foreground">
            <Building2 className="h-3.5 w-3.5" />
            Workspace
          </div>
          <h1 className="text-2xl font-bold tracking-tight text-foreground sm:text-3xl">
            {organization.name}
          </h1>
          <div className="flex items-center gap-3">
            <OrganizationRoleBadge role={currentUserRole ?? "MEMBER"} />
            <span className="text-xs font-medium text-muted-foreground">
              {organization.stats?.memberCount ?? 0} members · {organization.stats?.channelCount ?? 0} channels
            </span>
          </div>
        </div>

        <div className="flex gap-2">
          <div className="rounded-lg border border-border bg-card p-3 shadow-sm min-w-[100px]">
            <p className="text-[10px] font-bold uppercase tracking-widest text-muted-foreground">Tasks</p>
            <p className="mt-1 text-xl font-bold">{organization.stats?.taskCount ?? 0}</p>
          </div>
          <div className="rounded-lg border border-border bg-card p-3 shadow-sm min-w-[100px]">
            <p className="text-[10px] font-bold uppercase tracking-widest text-muted-foreground">Channels</p>
            <p className="mt-1 text-xl font-bold">{organization.stats?.channelCount ?? 0}</p>
          </div>
        </div>
      </section>

      <div className="grid gap-6 xl:grid-cols-[280px_1fr]">
        <aside className="space-y-6">
          <Card className="rounded-xl border-border shadow-sm">
            <CardHeader className="pb-4">
              <CardTitle className="text-sm font-bold">Settings</CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="space-y-1">
                <p className="text-[10px] font-bold uppercase tracking-widest text-muted-foreground">Workspace Name</p>
                <p className="text-sm font-semibold">{organization.name}</p>
              </div>
              
              <div className="flex flex-col gap-2">
                <Button
                  variant="outline"
                  size="sm"
                  className="w-full justify-start rounded-md"
                  disabled={!canEditSettings}
                  onClick={() => setIsEditDialogOpen(true)}
                >
                  <PencilLine className="mr-2 h-3.5 w-3.5" />
                  Edit Name
                </Button>
                
                {canCreateChannels && (
                  <>
                    <Button 
                      size="sm" 
                      className="w-full justify-start rounded-md" 
                      onClick={() => setIsCreateChannelOpen(true)}
                    >
                      <Plus className="mr-2 h-4 w-4" />
                      New Channel
                    </Button>
                    <Dialog open={isCreateChannelOpen} onOpenChange={setIsCreateChannelOpen}>
                      <DialogContent open={isCreateChannelOpen} className="sm:max-w-sm rounded-xl">
                      <DialogHeader>
                        <DialogTitle className="text-lg font-bold">Create Channel</DialogTitle>
                        <DialogDescription className="text-xs">
                          Initialize a new sector for team communication.
                        </DialogDescription>
                      </DialogHeader>
                      <form
                        onSubmit={(e) => {
                          e.preventDefault();
                          handleCreateChannel();
                        }}
                        className="space-y-4 py-4"
                      >
                        <div className="space-y-2">
                          <Label htmlFor="channel-name" className="text-foreground font-semibold text-sm">Name</Label>
                          <Input
                            id="channel-name"
                            value={channelName}
                            onChange={(event) => {
                              setChannelName(event.target.value);
                              setChannelNameError("");
                            }}
                            placeholder="e.g. general"
                            className="h-11 px-4 text-base rounded-xl bg-background border-input shadow-sm hover:border-ring/50 focus-visible:ring-4 focus-visible:ring-ring/15 transition-all"
                            autoFocus
                          />
                          {channelNameError ? <p className="text-xs text-destructive">{channelNameError}</p> : null}
                        </div>
                        <DialogFooter>
                          <Button type="button" variant="ghost" size="sm" onClick={() => setIsCreateChannelOpen(false)}>
                            Cancel
                          </Button>
                          <Button 
                            type="submit"
                            size="sm"
                            disabled={createChannelMutation.isPending || !channelName.trim()}
                          >
                            {createChannelMutation.isPending ? <Loader2 className="h-4 w-4 animate-spin" /> : "Create"}
                          </Button>
                        </DialogFooter>
                      </form>
                      </DialogContent>
                    </Dialog>
                  </>
                )}
              </div>
            </CardContent>
          </Card>

          {canDeleteOrganization ? (
            <Card className="rounded-xl border-destructive/20 bg-destructive/5 shadow-sm">
              <CardHeader className="pb-4">
                <CardTitle className="text-sm font-bold text-destructive flex items-center gap-2">
                  <ShieldAlert className="h-4 w-4" />
                  Danger Zone
                </CardTitle>
              </CardHeader>
              <CardContent>
                <Button
                  variant="destructive"
                  size="sm"
                  className="w-full rounded-md"
                  onClick={() => setIsDeleteDialogOpen(true)}
                >
                  <Trash2 className="mr-2 h-3.5 w-3.5" />
                  Delete Workspace
                </Button>
              </CardContent>
            </Card>
          ) : null}
        </aside>

        <main className="min-w-0 space-y-6">
          <Card className="rounded-xl border-border shadow-sm overflow-hidden">
            <CardHeader className="border-b border-border/50 bg-muted/20 px-6 py-4">
              <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
                <div>
                  <CardTitle className="text-lg font-bold">Members</CardTitle>
                </div>
                <div className="flex flex-wrap gap-2">
                  <Input
                    value={memberSearch}
                    onChange={(event) => {
                      setMemberSearch(event.target.value);
                      setMemberPage(1);
                    }}
                    placeholder="Search..."
                    className="h-11 px-4 text-base rounded-xl sm:w-48 bg-background border-input shadow-sm hover:border-ring/50 focus-visible:ring-4 focus-visible:ring-ring/15 transition-all"
                  />
                  <Select
                    value={memberRoleFilter}
                    onValueChange={(value) => {
                      setMemberRoleFilter(value as "ALL" | "OWNER" | "ADMIN" | "MEMBER");
                      setMemberPage(1);
                    }}
                  >
                    <SelectTrigger className="h-11 px-4 text-base rounded-xl sm:w-36 bg-background border-input shadow-sm hover:border-ring/50 focus:ring-4 focus:ring-ring/15 transition-all">
                      <SelectValue placeholder="Role" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="ALL">All Roles</SelectItem>
                      <SelectItem value="OWNER">Owners</SelectItem>
                      <SelectItem value="ADMIN">Admins</SelectItem>
                      <SelectItem value="MEMBER">Members</SelectItem>
                    </SelectContent>
                  </Select>
                  {canInviteMembers && (
                    <>
                      <Button 
                        size="sm" 
                        className="h-9 rounded-md" 
                        onClick={() => setIsInviteDialogOpen(true)}
                      >
                        <Plus className="mr-1.5 h-3.5 w-3.5" />
                        Invite
                      </Button>
                      <Dialog open={isInviteDialogOpen} onOpenChange={setIsInviteDialogOpen}>
                        <DialogContent open={isInviteDialogOpen} className="sm:max-w-sm rounded-xl">
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
                            className="h-11 px-4 text-base rounded-xl bg-background border-input shadow-sm hover:border-ring/50 focus-visible:ring-4 focus-visible:ring-ring/15 transition-all"
                            autoFocus
                          />
                          {inviteEmailError ? <p className="text-xs text-destructive">{inviteEmailError}</p> : null}
                        </div>
                        <div className="space-y-2">
                          <Label className="text-foreground font-semibold text-sm">Role</Label>
                          <Select value={inviteRole} onValueChange={(value) => setInviteRole(value as "ADMIN" | "MEMBER")}>
                            <SelectTrigger className="h-11 px-4 text-base rounded-xl bg-background border-input shadow-sm hover:border-ring/50 focus:ring-4 focus:ring-ring/15 transition-all">
                              <SelectValue />
                            </SelectTrigger>
                            <SelectContent>
                              <SelectItem value="MEMBER">Member</SelectItem>
                              <SelectItem value="ADMIN">Admin</SelectItem>
                            </SelectContent>
                          </Select>
                        </div>
                        <DialogFooter className="pt-2">
                          <Button type="button" variant="ghost" size="sm" onClick={() => setIsInviteDialogOpen(false)}>
                            Cancel
                          </Button>
                          <Button type="submit" size="sm" disabled={addMemberMutation.isPending || !inviteEmail.trim()}>
                            {addMemberMutation.isPending ? <Loader2 className="h-4 w-4 animate-spin" /> : "Send Invite"}
                          </Button>
                        </DialogFooter>
                      </form>
                    </DialogContent>
                  </Dialog>
                  </>
                  )}
                </div>
              </div>
            </CardHeader>
            <CardContent className="p-0">
              {isLoadingMembers ? (
                <div className="flex h-32 items-center justify-center">
                  <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
                </div>
              ) : members.length > 0 ? (
                <div className="divide-y divide-border/50">
                  {members.map((member) => (
                    <div
                      key={member.id}
                      className="flex items-center justify-between px-6 py-3 transition-colors hover:bg-muted/30"
                    >
                      <div className="flex min-w-0 items-center gap-3">
                        <Avatar className="h-9 w-9 border border-border">
                          <AvatarFallback className="bg-primary/10 text-[10px] font-bold text-primary uppercase">
                            {member.name.charAt(0)}
                          </AvatarFallback>
                        </Avatar>
                        <div className="min-w-0">
                          <div className="flex items-center gap-2">
                            <p className="truncate text-sm font-semibold">{member.name}</p>
                            {member.user_id === user?.id && (
                              <span className="rounded bg-primary/10 px-1.5 py-0.5 text-[9px] font-bold uppercase tracking-wider text-primary">You</span>
                            )}
                          </div>
                          <p className="truncate text-[11px] text-muted-foreground">{member.email}</p>
                        </div>
                      </div>
                      <div className="flex items-center gap-3">
                        <OrganizationRoleBadge role={member.role} />
                        {canChangeRoles && member.role !== "OWNER" && (
                          <Select
                            value={member.role}
                            onValueChange={(value: "ADMIN" | "MEMBER") =>
                              updateRoleMutation.mutate({
                                orgId,
                                userId: member.user_id,
                                data: { role: value },
                              }, {
                                onSuccess: () => toast.success("Member role updated successfully"),
                                onError: (error) =>
                                  handleApiError(error, {
                                    accessDenied: () => toast.error("Only the owner can change workspace roles"),
                                    onOtherError: (message) => toast.error(message),
                                  }),
                              })
                            }
                          >
                            <SelectTrigger className="h-9 w-28 rounded-xl text-[11px] font-bold bg-background border-input shadow-sm hover:border-ring/50 focus:ring-4 focus:ring-ring/15 transition-all">
                              <SelectValue />
                            </SelectTrigger>
                            <SelectContent>
                              <SelectItem value="ADMIN">Admin</SelectItem>
                              <SelectItem value="MEMBER">Member</SelectItem>
                            </SelectContent>
                          </Select>
                        )}
                        {canShowRemove(member) && member.role !== "OWNER" && (
                          <Button
                            variant="ghost"
                            size="sm"
                            className="h-8 w-8 p-0 text-destructive hover:bg-destructive/10"
                            onClick={() => setMemberToRemove({ id: member.user_id, name: member.name })}
                          >
                            <UserMinus className="h-4 w-4" />
                          </Button>
                        )}
                      </div>
                    </div>
                  ))}
                  
                  <div className="flex items-center justify-between bg-muted/10 px-6 py-3">
                    <p className="text-[10px] font-bold uppercase tracking-widest text-muted-foreground">
                      Page {memberPagination?.page ?? 1} / {memberPagination?.totalPages ?? 1}
                    </p>
                    <div className="flex gap-2">
                      <Button
                        variant="ghost"
                        size="sm"
                        className="h-8 rounded-md"
                        disabled={!memberPagination || memberPagination.page <= 1}
                        onClick={() => setMemberPage((page) => Math.max(1, page - 1))}
                      >
                        Prev
                      </Button>
                      <Button
                        variant="ghost"
                        size="sm"
                        className="h-8 rounded-md"
                        disabled={!memberPagination?.hasMore}
                        onClick={() => setMemberPage((page) => page + 1)}
                      >
                        Next
                      </Button>
                    </div>
                  </div>
                </div>
              ) : (
                <div className="flex flex-col items-center justify-center py-12 text-center">
                  <Users className="h-8 w-8 text-muted-foreground/30 mb-2" />
                  <p className="text-sm font-bold text-foreground">No Members</p>
                </div>
              )}
            </CardContent>
          </Card>

          <Card className="rounded-xl border-border shadow-sm overflow-hidden">
            <CardHeader className="border-b border-border/50 bg-muted/20 px-6 py-4">
              <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
                <div>
                  <CardTitle className="text-lg font-bold">Channels</CardTitle>
                </div>
                <div className="flex flex-wrap gap-2">
                  <Input
                    value={channelSearch}
                    onChange={(event) => {
                      setChannelSearch(event.target.value);
                      setChannelPage(1);
                    }}
                    placeholder="Search..."
                    className="h-11 px-4 text-base rounded-xl sm:w-48 bg-background border-input shadow-sm hover:border-ring/50 focus-visible:ring-4 focus-visible:ring-ring/15 transition-all"
                  />
                  <Select
                    value={channelMembershipFilter}
                    onValueChange={(value) => {
                      setChannelMembershipFilter(value as "ALL" | "JOINED" | "MANAGED");
                      setChannelPage(1);
                    }}
                  >
                    <SelectTrigger className="h-11 px-4 text-base rounded-xl sm:w-36 bg-background border-input shadow-sm hover:border-ring/50 focus:ring-4 focus:ring-ring/15 transition-all">
                      <SelectValue placeholder="Role" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="ALL">All</SelectItem>
                      <SelectItem value="JOINED">Joined</SelectItem>
                      <SelectItem value="MANAGED">Managed</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
              </div>
            </CardHeader>
            <CardContent className="p-0">
              {isLoadingChannels ? (
                <div className="flex h-32 items-center justify-center">
                  <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
                </div>
              ) : channels.length > 0 ? (
                <div className="divide-y divide-border/50">
                  {channels.map((channel) => (
                    <div
                      key={channel.id}
                      className="flex items-center justify-between px-6 py-4 transition-colors hover:bg-muted/30"
                    >
                      <div className="flex min-w-0 items-center gap-4">
                        <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-lg bg-primary/10 text-primary">
                          {channel.isDefault ? <MessageSquareText className="h-5 w-5" /> : <Hash className="h-5 w-5" />}
                        </div>
                        <div className="min-w-0">
                          <div className="flex items-center gap-2">
                            <p className="truncate text-sm font-bold">{channel.isDefault ? "Organization Chat" : channel.name}</p>
                            {channel.isDefault && (
                              <span className="rounded bg-muted px-1.5 py-0.5 text-[9px] font-bold uppercase tracking-wider">Default</span>
                            )}
                          </div>
                          <p className="text-[11px] text-muted-foreground">
                            {channel.stats?.memberCount ?? 0} members · {channel.stats?.messageCount ?? 0} msgs
                          </p>
                        </div>
                      </div>
                      <div className="flex items-center gap-2">
                        <Button
                          variant="outline"
                          size="sm"
                          className="h-8 rounded-md text-xs font-bold"
                          onClick={() => router.push(`/organizations/${orgId}/channels/${channel.id}`)}
                        >
                          Open
                        </Button>
                        <ChannelManagementSheet
                          channelId={channel.id}
                          orgId={orgId}
                          trigger={
                            <Button variant="ghost" size="sm" className="h-8 w-8 p-0">
                              <Shield className="h-4 w-4" />
                            </Button>
                          }
                        />
                      </div>
                    </div>
                  ))}
                  
                  <div className="flex items-center justify-between bg-muted/10 px-6 py-3">
                    <p className="text-[10px] font-bold uppercase tracking-widest text-muted-foreground">
                      Page {channelPagination?.page ?? 1} / {channelPagination?.totalPages ?? 1}
                    </p>
                    <div className="flex gap-2">
                      <Button
                        variant="ghost"
                        size="sm"
                        className="h-8 rounded-md"
                        disabled={!channelPagination || channelPagination.page <= 1}
                        onClick={() => setChannelPage((page) => Math.max(1, page - 1))}
                      >
                        Prev
                      </Button>
                      <Button
                        variant="ghost"
                        size="sm"
                        className="h-8 rounded-md"
                        disabled={!channelPagination?.hasMore}
                        onClick={() => setChannelPage((page) => page + 1)}
                      >
                        Next
                      </Button>
                    </div>
                  </div>
                </div>
              ) : (
                <div className="flex flex-col items-center justify-center py-12 text-center">
                  <Hash className="h-8 w-8 text-muted-foreground/30 mb-2" />
                  <p className="text-sm font-bold text-foreground">No Channels</p>
                </div>
              )}
            </CardContent>
          </Card>
        </main>
      </div>

      {isEditDialogOpen ? <EditWorkspaceDialog orgId={orgId} onClose={() => setIsEditDialogOpen(false)} /> : null}

      <AlertDialog open={!!memberToRemove} onOpenChange={() => setMemberToRemove(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Remove member?</AlertDialogTitle>
            <AlertDialogDescription>
              {memberToRemove?.name} will lose workspace access and be removed from all workspace channels.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction
              className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
              onClick={() =>
                memberToRemove &&
                removeMemberMutation.mutate({
                  orgId,
                  userId: memberToRemove.id,
                }, {
                  onSuccess: () => {
                    toast.success("Member removed successfully");
                    setMemberToRemove(null);
                  },
                  onError: (error) =>
                    handleApiError(error, {
                      accessDenied: () => toast.error("You do not have permission to remove this member"),
                      onOtherError: (message) => toast.error(message),
                    }),
                })
              }
            >
              {removeMemberMutation.isPending ? <Loader2 className="h-4 w-4 animate-spin" /> : "Remove"}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      <AlertDialog open={isDeleteDialogOpen} onOpenChange={setIsDeleteDialogOpen}>
        <AlertDialogContent className="border-destructive/20">
          <AlertDialogHeader>
            <AlertDialogTitle className="text-destructive">Delete workspace?</AlertDialogTitle>
            <AlertDialogDescription>
              This permanently removes {organization.name}, all channels, messages, tasks, and member access.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction
              className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
              onClick={() => deleteOrgMutation.mutate(orgId, {
                onSuccess: () => {
                  toast.success("Workspace deleted successfully");
                  router.push("/dashboard");
                },
                onError: (error) =>
                  handleApiError(error, {
                    accessDenied: () => toast.error("Only the workspace owner can delete it"),
                    onOtherError: (message) => toast.error(message),
                  }),
              })}
            >
              {deleteOrgMutation.isPending ? <Loader2 className="h-4 w-4 animate-spin" /> : "Delete workspace"}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}
