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
import { useAuthProfile } from "@/services/auth.service";
import {
  useAddOrganizationMember,
  useDeleteOrganization,
  useOrganization,
  useOrganizationMembers,
  useRemoveOrganizationMember,
  useUpdateOrganizationMemberRole,
} from "@/hooks/api/useOrganizations";
import {
  useCreateChannel,
  useOrgChannels,
} from "@/hooks/api/useChannels";
import { handleApiError } from "@/lib/api-errors";

function OrganizationRoleBadge({ role }: { role: "OWNER" | "ADMIN" | "MEMBER" }) {
  if (role === "OWNER") {
    return (
      <span className="inline-flex items-center gap-1.5 rounded-full bg-amber-500/10 px-2.5 py-1 text-[11px] font-semibold uppercase tracking-[0.16em] text-amber-700">
        <Crown className="h-3.5 w-3.5" />
        Owner
      </span>
    );
  }

  if (role === "ADMIN") {
    return (
      <span className="inline-flex items-center gap-1.5 rounded-full bg-primary/10 px-2.5 py-1 text-[11px] font-semibold uppercase tracking-[0.16em] text-primary">
        <ShieldCheck className="h-3.5 w-3.5" />
        Admin
      </span>
    );
  }

  return (
    <span className="inline-flex items-center gap-1.5 rounded-full bg-muted px-2.5 py-1 text-[11px] font-semibold uppercase tracking-[0.16em] text-muted-foreground">
      <UserCircle className="h-3.5 w-3.5" />
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

  const currentUserRole = organization?.currentUserRole;
  const canCreateChannels = organization?.permissions?.canCreateChannels;
  const canInviteMembers = organization?.permissions?.canInviteMembers;
  const canDeleteOrganization = organization?.permissions?.canDeleteOrganization;
  const canEditSettings = organization?.permissions?.canEditSettings;
  const canChangeRoles = organization?.permissions?.canChangeMemberRoles;
  const canRemoveMembers = organization?.permissions?.canRemoveMembers;

  const addMemberMutation = useAddOrganizationMember({
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

  const updateRoleMutation = useUpdateOrganizationMemberRole({
    onSuccess: () => toast.success("Member role updated successfully"),
    onError: (error) =>
      handleApiError(error, {
        accessDenied: () => toast.error("Only the owner can change workspace roles"),
        onOtherError: (message) => toast.error(message),
      }),
  });

  const removeMemberMutation = useRemoveOrganizationMember({
    onSuccess: () => {
      toast.success("Member removed successfully");
      setMemberToRemove(null);
    },
    onError: (error) =>
      handleApiError(error, {
        accessDenied: () => toast.error("You do not have permission to remove this member"),
        onOtherError: (message) => toast.error(message),
      }),
  });

  const deleteOrgMutation = useDeleteOrganization({
    onSuccess: () => {
      toast.success("Workspace deleted successfully");
      router.push("/dashboard");
    },
    onError: (error) =>
      handleApiError(error, {
        accessDenied: () => toast.error("Only the workspace owner can delete it"),
        onOtherError: (message) => toast.error(message),
      }),
  });

  const createChannelMutation = useCreateChannel({
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

  const canShowRemove = useMemo(
    () =>
      (member: (typeof members)[number]) =>
        member.user_id === user?.id || (canRemoveMembers && member.role !== "OWNER"),
    [canRemoveMembers, user?.id, members]
  );

  const handleInviteMember = () => {
    if (!inviteEmail.trim() || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(inviteEmail)) {
      setInviteEmailError("Please enter a valid email address");
      return;
    }

    addMemberMutation.mutate({
      orgId,
      data: { email: inviteEmail.trim(), role: inviteRole },
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
    <div className="mx-auto flex w-full max-w-7xl flex-col gap-8">
      <section className="overflow-hidden rounded-[32px] border border-border/70 bg-card shadow-sm">
        <div className="relative px-6 py-8 sm:px-8">
          <div className="absolute inset-x-0 top-0 h-32 bg-[radial-gradient(circle_at_top_right,rgba(88,80,236,0.16),transparent_45%),radial-gradient(circle_at_top_left,rgba(14,165,233,0.08),transparent_35%)]" />
          <div className="relative flex flex-col gap-8 xl:flex-row xl:items-end xl:justify-between">
            <div className="space-y-4">
              <div className="inline-flex items-center gap-2 rounded-full border border-primary/15 bg-primary/8 px-3 py-1 text-xs font-semibold uppercase tracking-[0.18em] text-primary">
                <Building2 className="h-3.5 w-3.5" />
                Workspace Control Center
              </div>
              <div>
                <h1 className="text-3xl font-semibold tracking-tight text-foreground sm:text-4xl">{organization.name}</h1>
                <p className="mt-2 max-w-2xl text-sm leading-6 text-muted-foreground">
                  Manage channels, access, and workspace operations from a single premium admin surface with role-aware actions.
                </p>
              </div>
              <div className="flex flex-wrap items-center gap-3">
                <OrganizationRoleBadge role={currentUserRole ?? "MEMBER"} />
                <span className="rounded-full bg-muted px-3 py-1 text-xs font-semibold uppercase tracking-[0.16em] text-muted-foreground">
                  {organization.stats.memberCount} members
                </span>
                <span className="rounded-full bg-muted px-3 py-1 text-xs font-semibold uppercase tracking-[0.16em] text-muted-foreground">
                  {organization.stats.channelCount} channels
                </span>
              </div>
            </div>

            <div className="grid gap-3 sm:grid-cols-3 xl:min-w-[420px]">
              <div className="rounded-3xl border border-border/70 bg-background/80 p-4 backdrop-blur-sm">
                <p className="text-xs font-semibold uppercase tracking-[0.16em] text-muted-foreground">Members</p>
                <p className="mt-3 text-3xl font-semibold text-foreground">{organization.stats.memberCount}</p>
              </div>
              <div className="rounded-3xl border border-border/70 bg-background/80 p-4 backdrop-blur-sm">
                <p className="text-xs font-semibold uppercase tracking-[0.16em] text-muted-foreground">Channels</p>
                <p className="mt-3 text-3xl font-semibold text-foreground">{organization.stats.channelCount}</p>
              </div>
              <div className="rounded-3xl border border-border/70 bg-background/80 p-4 backdrop-blur-sm">
                <p className="text-xs font-semibold uppercase tracking-[0.16em] text-muted-foreground">Tasks</p>
                <p className="mt-3 text-3xl font-semibold text-foreground">{organization.stats.taskCount}</p>
              </div>
            </div>
          </div>
        </div>
      </section>

      <div className="grid gap-8 xl:grid-cols-[340px_minmax(0,1fr)]">
        <div className="space-y-6">
          <Card className="rounded-[28px] border-border/80 shadow-sm">
            <CardHeader>
              <CardTitle>Workspace Settings</CardTitle>
              <CardDescription>High-level controls for this workspace.</CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="rounded-2xl border border-border/70 bg-muted/15 p-4">
                <p className="text-xs font-semibold uppercase tracking-[0.16em] text-muted-foreground">Workspace name</p>
                <p className="mt-2 text-lg font-semibold text-foreground">{organization.name}</p>
              </div>
              <div className="rounded-2xl border border-border/70 bg-muted/15 p-4">
                <p className="text-xs font-semibold uppercase tracking-[0.16em] text-muted-foreground">Your access</p>
                <p className="mt-2 text-lg font-semibold text-foreground">{currentUserRole}</p>
              </div>
              <div className="flex flex-col gap-3">
                <Button
                  variant="outline"
                  className="justify-start rounded-2xl"
                  disabled={!canEditSettings}
                  onClick={() => setIsEditDialogOpen(true)}
                >
                  <PencilLine className="mr-2 h-4 w-4" />
                  Edit workspace name
                </Button>
                <Dialog open={isCreateChannelOpen} onOpenChange={setIsCreateChannelOpen}>
                  <DialogTrigger asChild>
                    <Button className="justify-start rounded-2xl" disabled={!canCreateChannels}>
                      <Plus className="mr-2 h-4 w-4" />
                      Create new channel
                    </Button>
                  </DialogTrigger>
                  <DialogContent className="rounded-3xl">
                    <DialogHeader>
                      <DialogTitle>Create channel</DialogTitle>
                      <DialogDescription>
                        Add a new collaboration space inside {organization.name}.
                      </DialogDescription>
                    </DialogHeader>
                    <div className="space-y-2 py-2">
                      <Label htmlFor="channel-name">Channel name</Label>
                      <Input
                        id="channel-name"
                        value={channelName}
                        onChange={(event) => {
                          setChannelName(event.target.value);
                          setChannelNameError("");
                        }}
                        placeholder="e.g. product-launch"
                        className="h-11 rounded-2xl"
                      />
                      {channelNameError ? <p className="text-sm text-destructive">{channelNameError}</p> : null}
                    </div>
                    <DialogFooter>
                      <Button variant="outline" className="rounded-2xl" onClick={() => setIsCreateChannelOpen(false)}>
                        Cancel
                      </Button>
                      <Button className="rounded-2xl" onClick={handleCreateChannel} disabled={createChannelMutation.isPending}>
                        {createChannelMutation.isPending ? <Loader2 className="h-4 w-4 animate-spin" /> : "Create channel"}
                      </Button>
                    </DialogFooter>
                  </DialogContent>
                </Dialog>
              </div>
            </CardContent>
          </Card>

          {canDeleteOrganization ? (
            <Card className="rounded-[28px] border-destructive/20 bg-destructive/5 shadow-sm">
              <CardHeader>
                <CardTitle className="flex items-center gap-2 text-destructive">
                  <ShieldAlert className="h-5 w-5" />
                  Danger Zone
                </CardTitle>
                <CardDescription className="text-destructive/80">
                  Permanent actions for this workspace.
                </CardDescription>
              </CardHeader>
              <CardContent className="space-y-4">
                <p className="text-sm leading-6 text-muted-foreground">
                  Deleting this workspace removes channels, tasks, and access for everyone in the organization.
                </p>
                <Button
                  variant="destructive"
                  className="w-full rounded-2xl"
                  onClick={() => setIsDeleteDialogOpen(true)}
                >
                  <Trash2 className="mr-2 h-4 w-4" />
                  Delete workspace
                </Button>
              </CardContent>
            </Card>
          ) : null}
        </div>

        <div className="space-y-8">
          <Card className="rounded-[28px] border-border/80 shadow-sm">
            <CardHeader className="border-b border-border/60">
              <div className="flex flex-col gap-4 lg:flex-row lg:items-center lg:justify-between">
                <div>
                  <CardTitle className="text-xl">Member Management</CardTitle>
                  <CardDescription className="mt-1">
                    Invite members, change roles, and remove access with workspace-level permissions.
                  </CardDescription>
                </div>
                <div className="flex flex-col gap-3 sm:flex-row">
                  <div className="relative">
                    <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
                    <Input
                      value={memberSearch}
                      onChange={(event) => {
                        setMemberSearch(event.target.value);
                        setMemberPage(1);
                      }}
                      placeholder="Search members"
                      className="h-11 rounded-2xl pl-10 sm:w-56"
                    />
                  </div>
                  <Select
                    value={memberRoleFilter}
                    onValueChange={(value) => {
                      setMemberRoleFilter(value as "ALL" | "OWNER" | "ADMIN" | "MEMBER");
                      setMemberPage(1);
                    }}
                  >
                    <SelectTrigger className="h-11 rounded-2xl sm:w-40">
                      <Filter className="mr-2 h-4 w-4 text-muted-foreground" />
                      <SelectValue placeholder="Role" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="ALL">All roles</SelectItem>
                      <SelectItem value="OWNER">Owner</SelectItem>
                      <SelectItem value="ADMIN">Admin</SelectItem>
                      <SelectItem value="MEMBER">Member</SelectItem>
                    </SelectContent>
                  </Select>
                  <Dialog open={isInviteDialogOpen} onOpenChange={setIsInviteDialogOpen}>
                    <DialogTrigger asChild>
                      <Button className="h-11 rounded-2xl" disabled={!canInviteMembers}>
                        <Plus className="mr-2 h-4 w-4" />
                        Invite member
                      </Button>
                    </DialogTrigger>
                    <DialogContent className="rounded-3xl">
                      <DialogHeader>
                        <DialogTitle>Invite workspace member</DialogTitle>
                        <DialogDescription>
                          Add someone to {organization.name} by email and assign their initial workspace role.
                        </DialogDescription>
                      </DialogHeader>
                      <div className="space-y-4 py-2">
                        <div className="space-y-2">
                          <Label htmlFor="invite-email">Email</Label>
                          <Input
                            id="invite-email"
                            value={inviteEmail}
                            onChange={(event) => {
                              setInviteEmail(event.target.value);
                              setInviteEmailError("");
                            }}
                            placeholder="name@company.com"
                            className="h-11 rounded-2xl"
                          />
                          {inviteEmailError ? <p className="text-sm text-destructive">{inviteEmailError}</p> : null}
                        </div>
                        <div className="space-y-2">
                          <Label>Role</Label>
                          <Select value={inviteRole} onValueChange={(value) => setInviteRole(value as "ADMIN" | "MEMBER")}>
                            <SelectTrigger className="h-11 rounded-2xl">
                              <SelectValue />
                            </SelectTrigger>
                            <SelectContent>
                              <SelectItem value="MEMBER">Member</SelectItem>
                              <SelectItem value="ADMIN">Admin</SelectItem>
                            </SelectContent>
                          </Select>
                        </div>
                      </div>
                      <DialogFooter>
                        <Button variant="outline" className="rounded-2xl" onClick={() => setIsInviteDialogOpen(false)}>
                          Cancel
                        </Button>
                        <Button className="rounded-2xl" onClick={handleInviteMember} disabled={addMemberMutation.isPending}>
                          {addMemberMutation.isPending ? <Loader2 className="h-4 w-4 animate-spin" /> : "Send invite"}
                        </Button>
                      </DialogFooter>
                    </DialogContent>
                  </Dialog>
                </div>
              </div>
            </CardHeader>
            <CardContent className="space-y-4 p-5">
              {isLoadingMembers ? (
                <div className="flex items-center justify-center py-10 text-muted-foreground">
                  <Loader2 className="h-5 w-5 animate-spin" />
                </div>
              ) : members.length > 0 ? (
                <>
                  {members.map((member) => (
                    <div
                      key={member.id}
                      className="flex flex-col gap-4 rounded-3xl border border-border/70 bg-muted/10 p-4 lg:flex-row lg:items-center lg:justify-between"
                    >
                      <div className="flex min-w-0 items-center gap-3">
                        <Avatar className="h-12 w-12 border border-border/70">
                          <AvatarFallback className="bg-primary/10 text-primary">
                            {member.user.name.charAt(0).toUpperCase()}
                          </AvatarFallback>
                        </Avatar>
                        <div className="min-w-0">
                          <div className="flex flex-wrap items-center gap-2">
                            <p className="truncate text-sm font-semibold text-foreground">{member.user.name}</p>
                            {member.user_id === user?.id ? (
                              <span className="rounded-full bg-muted px-2 py-0.5 text-[10px] font-semibold uppercase tracking-[0.16em] text-muted-foreground">
                                You
                              </span>
                            ) : null}
                          </div>
                          <p className="truncate text-xs text-muted-foreground">{member.user.email}</p>
                        </div>
                      </div>
                      <div className="flex flex-wrap items-center gap-2">
                        <OrganizationRoleBadge role={member.role} />
                        {canChangeRoles && member.role !== "OWNER" ? (
                          <Select
                            value={member.role}
                            onValueChange={(value) =>
                              updateRoleMutation.mutate({
                                orgId,
                                userId: member.user_id,
                                data: { role: value as "OWNER" | "ADMIN" | "MEMBER" },
                              })
                            }
                          >
                            <SelectTrigger className="h-10 w-[130px] rounded-2xl">
                              <SelectValue />
                            </SelectTrigger>
                            <SelectContent>
                              <SelectItem value="ADMIN">Admin</SelectItem>
                              <SelectItem value="MEMBER">Member</SelectItem>
                            </SelectContent>
                          </Select>
                        ) : null}
                        {canShowRemove(member) ? (
                          <Button
                            variant="outline"
                            className="rounded-2xl border-destructive/20 text-destructive hover:bg-destructive/10 hover:text-destructive"
                            onClick={() => setMemberToRemove({ id: member.user_id, name: member.user.name })}
                          >
                            <UserMinus className="mr-2 h-4 w-4" />
                            Remove
                          </Button>
                        ) : null}
                      </div>
                    </div>
                  ))}
                  <div className="flex items-center justify-between rounded-2xl border border-border/70 bg-muted/10 px-4 py-3">
                    <p className="text-sm text-muted-foreground">
                      Page {memberPagination?.page ?? 1} of {memberPagination?.totalPages ?? 1}
                    </p>
                    <div className="flex gap-2">
                      <Button
                        variant="outline"
                        className="rounded-2xl"
                        disabled={!memberPagination || memberPagination.page <= 1}
                        onClick={() => setMemberPage((page) => Math.max(1, page - 1))}
                      >
                        Previous
                      </Button>
                      <Button
                        variant="outline"
                        className="rounded-2xl"
                        disabled={!memberPagination?.hasMore}
                        onClick={() => setMemberPage((page) => page + 1)}
                      >
                        Next
                      </Button>
                    </div>
                  </div>
                </>
              ) : (
                <div className="rounded-3xl border border-dashed border-border/80 bg-muted/10 p-10 text-center">
                  <Users className="mx-auto h-9 w-9 text-muted-foreground" />
                  <p className="mt-3 text-base font-semibold text-foreground">No members found</p>
                  <p className="mt-1 text-sm text-muted-foreground">Try adjusting the search or role filter.</p>
                </div>
              )}
            </CardContent>
          </Card>

          <Card className="rounded-[28px] border-border/80 shadow-sm">
            <CardHeader className="border-b border-border/60">
              <div className="flex flex-col gap-4 lg:flex-row lg:items-center lg:justify-between">
                <div>
                  <CardTitle className="text-xl">Channel Studio</CardTitle>
                  <CardDescription className="mt-1">
                    Create channels, open settings, and keep channel access organized with premium controls.
                  </CardDescription>
                </div>
                <div className="flex flex-col gap-3 sm:flex-row">
                  <div className="relative">
                    <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
                    <Input
                      value={channelSearch}
                      onChange={(event) => {
                        setChannelSearch(event.target.value);
                        setChannelPage(1);
                      }}
                      placeholder="Search channels"
                      className="h-11 rounded-2xl pl-10 sm:w-56"
                    />
                  </div>
                  <Select
                    value={channelMembershipFilter}
                    onValueChange={(value) => {
                      setChannelMembershipFilter(value as "ALL" | "JOINED" | "MANAGED");
                      setChannelPage(1);
                    }}
                  >
                    <SelectTrigger className="h-11 rounded-2xl sm:w-40">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="ALL">All channels</SelectItem>
                      <SelectItem value="JOINED">Joined only</SelectItem>
                      <SelectItem value="MANAGED">Managed only</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
              </div>
            </CardHeader>
            <CardContent className="space-y-4 p-5">
              {isLoadingChannels ? (
                <div className="flex items-center justify-center py-10 text-muted-foreground">
                  <Loader2 className="h-5 w-5 animate-spin" />
                </div>
              ) : channels.length > 0 ? (
                <>
                  {channels.map((channel) => (
                    <div
                      key={channel.id}
                      className="flex flex-col gap-5 rounded-3xl border border-border/70 bg-muted/10 p-5 xl:flex-row xl:items-center xl:justify-between"
                    >
                      <div className="min-w-0 space-y-3">
                        <div className="flex flex-wrap items-center gap-2">
                          <span className="flex h-11 w-11 items-center justify-center rounded-2xl bg-primary/10 text-primary">
                            <Hash className="h-5 w-5" />
                          </span>
                          <div className="min-w-0">
                            <p className="truncate text-base font-semibold text-foreground">{channel.name}</p>
                            <p className="text-sm text-muted-foreground">
                              {channel.memberCount ?? 0} members · {channel.messageCount ?? 0} messages
                            </p>
                          </div>
                          {channel.isDefault ? (
                            <span className="rounded-full bg-primary/10 px-2.5 py-1 text-[11px] font-semibold uppercase tracking-[0.16em] text-primary">
                              Default
                            </span>
                          ) : null}
                        </div>
                        <div className="flex flex-wrap items-center gap-2 text-xs text-muted-foreground">
                          {channel.currentUserChannelRole ? (
                            <span className="rounded-full bg-muted px-3 py-1 font-semibold uppercase tracking-[0.16em]">
                              Channel role: {channel.currentUserChannelRole}
                            </span>
                          ) : null}
                          <span className="rounded-full bg-muted px-3 py-1 font-semibold uppercase tracking-[0.16em]">
                            Workspace role: {currentUserRole}
                          </span>
                        </div>
                      </div>
                      <div className="flex flex-wrap gap-3">
                        <Button
                          variant="outline"
                          className="rounded-2xl"
                          onClick={() => router.push(`/organizations/${orgId}/channels/${channel.id}`)}
                        >
                          Open channel
                          <ArrowRight className="ml-2 h-4 w-4" />
                        </Button>
                        <ChannelManagementSheet
                          channelId={channel.id}
                          orgId={orgId}
                          trigger={
                            <Button className="rounded-2xl">
                              <Shield className="mr-2 h-4 w-4" />
                              Manage
                            </Button>
                          }
                        />
                      </div>
                    </div>
                  ))}
                  <div className="flex items-center justify-between rounded-2xl border border-border/70 bg-muted/10 px-4 py-3">
                    <p className="text-sm text-muted-foreground">
                      Page {channelPagination?.page ?? 1} of {channelPagination?.totalPages ?? 1}
                    </p>
                    <div className="flex gap-2">
                      <Button
                        variant="outline"
                        className="rounded-2xl"
                        disabled={!channelPagination || channelPagination.page <= 1}
                        onClick={() => setChannelPage((page) => Math.max(1, page - 1))}
                      >
                        Previous
                      </Button>
                      <Button
                        variant="outline"
                        className="rounded-2xl"
                        disabled={!channelPagination?.hasMore}
                        onClick={() => setChannelPage((page) => page + 1)}
                      >
                        Next
                      </Button>
                    </div>
                  </div>
                </>
              ) : (
                <div className="rounded-3xl border border-dashed border-border/80 bg-muted/10 p-10 text-center">
                  <Hash className="mx-auto h-9 w-9 text-muted-foreground" />
                  <p className="mt-3 text-base font-semibold text-foreground">No channels found</p>
                  <p className="mt-1 text-sm text-muted-foreground">Create a new channel or broaden your filters.</p>
                </div>
              )}
            </CardContent>
          </Card>
        </div>
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
              onClick={() => deleteOrgMutation.mutate(orgId)}
            >
              {deleteOrgMutation.isPending ? <Loader2 className="h-4 w-4 animate-spin" /> : "Delete workspace"}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}
