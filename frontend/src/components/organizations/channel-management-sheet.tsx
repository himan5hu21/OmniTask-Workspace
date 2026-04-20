"use client";

import { useMemo, useState } from "react";
import {
  Hash,
  Loader2,
  PencilLine,
  Shield,
  Trash2,
  UserMinus,
  UserPlus,
  Users,
} from "lucide-react";
import { toast } from "sonner";

import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  Sheet,
  SheetContent,
  SheetDescription,
  SheetFooter,
  SheetHeader,
  SheetTitle,
  SheetTrigger,
} from "@/components/ui/sheet";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
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
  useAddChannelMember,
  useChannel,
  useChannelMembers,
  useDeleteChannel,
  useRemoveChannelMember,
  useUpdateChannel,
  useUpdateChannelMemberRole,
} from "@/hooks/api/useChannels";
import { useOrganizationMembers } from "@/hooks/api/useOrganizations";
import { handleApiError } from "@/lib/api-errors";

function ChannelRoleBadge({ role }: { role: "MANAGER" | "MEMBER" }) {
  return (
    <span
      className={`inline-flex items-center rounded-full px-2.5 py-1 text-[11px] font-semibold uppercase tracking-[0.16em] ${
        role === "MANAGER"
          ? "bg-primary/10 text-primary"
          : "bg-muted text-muted-foreground"
      }`}
    >
      {role}
    </span>
  );
}

export function ChannelManagementSheet({
  channelId,
  orgId,
  trigger,
  onDeleted,
}: {
  channelId: string;
  orgId: string;
  trigger: React.ReactNode;
  onDeleted?: () => void;
}) {
  const [open, setOpen] = useState(false);
  const [memberSearch, setMemberSearch] = useState("");
  const [memberRoleFilter, setMemberRoleFilter] = useState<"ALL" | "MANAGER" | "MEMBER">("ALL");
  const [candidateSearch, setCandidateSearch] = useState("");
  const [selectedAddRole, setSelectedAddRole] = useState<"MANAGER" | "MEMBER">("MEMBER");
  const [nameDraft, setNameDraft] = useState("");
  const [memberToRemove, setMemberToRemove] = useState<{ id: string; name: string } | null>(null);
  const [confirmDelete, setConfirmDelete] = useState(false);

  const { channel, isLoading: isLoadingChannel } = useChannel(channelId, { enabled: open });
  const {
    members,
    pagination,
    permissions,
    isLoading: isLoadingMembers,
  } = useChannelMembers(channelId, {
    page: 1,
    limit: 8,
    search: memberSearch,
    role: memberRoleFilter,
  });
  const { members: orgMembers } = useOrganizationMembers(orgId, {
    page: 1,
    limit: 8,
    search: candidateSearch,
    role: "ALL",
  });

  const channelMemberIds = useMemo(() => new Set(members.map((member) => member.user_id)), [members]);
  const candidateMembers = useMemo(
    () => orgMembers.filter((member) => !channelMemberIds.has(member.user_id)),
    [channelMemberIds, orgMembers]
  );

  const updateChannelMutation = useUpdateChannel({
    onSuccess: () => toast.success("Channel updated successfully"),
    onError: (error) =>
      handleApiError(error, {
        uniqueName: () => toast.error("That channel name already exists in this workspace"),
        accessDenied: () => toast.error("You do not have permission to update this channel"),
        onOtherError: (message) => toast.error(message),
      }),
  });

  const deleteChannelMutation = useDeleteChannel({
    onSuccess: () => {
      toast.success("Channel deleted successfully");
      setConfirmDelete(false);
      setOpen(false);
      onDeleted?.();
    },
    onError: (error) =>
      handleApiError(error, {
        accessDenied: () => toast.error("You do not have permission to delete this channel"),
        onOtherError: (message) => toast.error(message),
      }),
  });

  const addMemberMutation = useAddChannelMember({
    onSuccess: () => toast.success("Member added to channel"),
    onError: (error) =>
      handleApiError(error, {
        accessDenied: () => toast.error("You do not have permission to add members"),
        onOtherError: (message) => toast.error(message),
      }),
  });

  const updateRoleMutation = useUpdateChannelMemberRole({
    onSuccess: () => toast.success("Channel role updated"),
    onError: (error) =>
      handleApiError(error, {
        accessDenied: () => toast.error("You do not have permission to change roles"),
        onOtherError: (message) => toast.error(message),
      }),
  });

  const removeMemberMutation = useRemoveChannelMember({
    onSuccess: () => {
      toast.success("Member removed from channel");
      setMemberToRemove(null);
    },
    onError: (error) =>
      handleApiError(error, {
        accessDenied: () => toast.error("You do not have permission to remove this member"),
        onOtherError: (message) => toast.error(message),
      }),
  });

  const canEdit = channel?.permissions?.canEditChannel;
  const canDelete = channel?.permissions?.canDeleteChannel;
  const canAddMembers = permissions?.canAddMembers;
  const canChangeRoles = permissions?.canChangeMemberRoles;
  const canRemoveMembers = permissions?.canRemoveMembers;

  const handleSaveName = () => {
    const nextName = nameDraft.trim();
    if (!channel || !nextName || nextName === channel.name) {
      return;
    }

    updateChannelMutation.mutate({
      channelId,
      data: { name: nextName },
    });
  };

  return (
    <>
      <Sheet
        open={open}
        onOpenChange={(nextOpen) => {
          setOpen(nextOpen);
          if (nextOpen && channel) {
            setNameDraft(channel.name);
          }
        }}
      >
        <SheetTrigger asChild>{trigger}</SheetTrigger>
        <SheetContent side="right" className="w-full overflow-y-auto border-l border-border bg-background sm:max-w-2xl">
          <SheetHeader className="border-b border-border/60 pb-5">
            <SheetTitle className="flex items-center gap-3 text-xl">
              <span className="flex h-11 w-11 items-center justify-center rounded-2xl bg-primary/10 text-primary">
                <Hash className="h-5 w-5" />
              </span>
              Channel Management
            </SheetTitle>
            <SheetDescription>
              Rename the channel, review membership, and manage access with role-aware controls.
            </SheetDescription>
          </SheetHeader>

          {isLoadingChannel ? (
            <div className="flex items-center justify-center py-16 text-muted-foreground">
              <Loader2 className="h-5 w-5 animate-spin" />
            </div>
          ) : channel ? (
            <div className="space-y-6 py-6">
              <Card className="overflow-hidden rounded-3xl border-border/80 bg-card shadow-sm">
                <CardHeader className="border-b border-border/60 bg-muted/20">
                  <CardTitle className="text-base">Channel Settings</CardTitle>
                </CardHeader>
                <CardContent className="space-y-5 p-5">
                  <div className="grid gap-4 md:grid-cols-[1fr_auto]">
                    <div className="space-y-2">
                      <Label htmlFor={`channel-name-${channelId}`}>Channel Name</Label>
                      <Input
                        id={`channel-name-${channelId}`}
                        value={nameDraft || channel.name}
                        onChange={(event) => setNameDraft(event.target.value)}
                        disabled={!canEdit || updateChannelMutation.isPending}
                        className="h-11 rounded-2xl"
                      />
                    </div>
                    <div className="flex items-end">
                      <Button
                        onClick={handleSaveName}
                        disabled={!canEdit || updateChannelMutation.isPending || !nameDraft.trim() || nameDraft.trim() === channel.name}
                        className="h-11 rounded-2xl px-5"
                      >
                        {updateChannelMutation.isPending ? <Loader2 className="h-4 w-4 animate-spin" /> : <PencilLine className="mr-2 h-4 w-4" />}
                        Save
                      </Button>
                    </div>
                  </div>

                  <div className="grid gap-4 md:grid-cols-3">
                    <div className="rounded-2xl border border-border/70 bg-muted/20 p-4">
                      <p className="text-xs font-semibold uppercase tracking-[0.16em] text-muted-foreground">Members</p>
                      <p className="mt-2 text-2xl font-semibold text-foreground">{channel.stats.memberCount}</p>
                    </div>
                    <div className="rounded-2xl border border-border/70 bg-muted/20 p-4">
                      <p className="text-xs font-semibold uppercase tracking-[0.16em] text-muted-foreground">Messages</p>
                      <p className="mt-2 text-2xl font-semibold text-foreground">{channel.stats.messageCount}</p>
                    </div>
                    <div className="rounded-2xl border border-border/70 bg-muted/20 p-4">
                      <p className="text-xs font-semibold uppercase tracking-[0.16em] text-muted-foreground">Tasks</p>
                      <p className="mt-2 text-2xl font-semibold text-foreground">{channel.stats.taskCount}</p>
                    </div>
                  </div>
                </CardContent>
              </Card>

              <Card className="overflow-hidden rounded-3xl border-border/80 bg-card shadow-sm">
                <CardHeader className="border-b border-border/60 bg-muted/20">
                  <div className="flex flex-col gap-4 md:flex-row md:items-center md:justify-between">
                    <div>
                      <CardTitle className="text-base">Channel Members</CardTitle>
                      <p className="mt-1 text-sm text-muted-foreground">
                        Search existing members, adjust access, or add organization teammates to this channel.
                      </p>
                    </div>
                    <div className="flex flex-col gap-3 sm:flex-row">
                      <Input
                        value={memberSearch}
                        onChange={(event) => setMemberSearch(event.target.value)}
                        placeholder="Search member"
                        className="h-10 w-full rounded-2xl sm:w-56"
                      />
                      <Select value={memberRoleFilter} onValueChange={(value) => setMemberRoleFilter(value as "ALL" | "MANAGER" | "MEMBER")}>
                        <SelectTrigger className="h-10 w-full rounded-2xl sm:w-40">
                          <SelectValue placeholder="Role" />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value="ALL">All roles</SelectItem>
                          <SelectItem value="MANAGER">Managers</SelectItem>
                          <SelectItem value="MEMBER">Members</SelectItem>
                        </SelectContent>
                      </Select>
                    </div>
                  </div>
                </CardHeader>
                <CardContent className="space-y-5 p-5">
                  {canAddMembers ? (
                    <div className="rounded-2xl border border-dashed border-primary/30 bg-primary/5 p-4">
                      <div className="flex items-center gap-2">
                        <UserPlus className="h-4 w-4 text-primary" />
                        <p className="text-sm font-semibold text-foreground">Add from workspace members</p>
                      </div>
                      <div className="mt-4 flex flex-col gap-3 sm:flex-row">
                        <Input
                          value={candidateSearch}
                          onChange={(event) => setCandidateSearch(event.target.value)}
                          placeholder="Search workspace members"
                          className="h-10 rounded-2xl"
                        />
                        <Select value={selectedAddRole} onValueChange={(value) => setSelectedAddRole(value as "MANAGER" | "MEMBER")}>
                          <SelectTrigger className="h-10 rounded-2xl sm:w-40">
                            <SelectValue />
                          </SelectTrigger>
                          <SelectContent>
                            <SelectItem value="MEMBER">Member</SelectItem>
                            <SelectItem value="MANAGER">Manager</SelectItem>
                          </SelectContent>
                        </Select>
                      </div>
                      <div className="mt-4 space-y-2">
                        {candidateMembers.length > 0 ? (
                          candidateMembers.map((member) => (
                            <div
                              key={member.id}
                              className="flex items-center justify-between rounded-2xl border border-border/70 bg-background/80 px-4 py-3"
                            >
                              <div className="min-w-0">
                                <p className="truncate text-sm font-semibold text-foreground">{member.user.name}</p>
                                <p className="truncate text-xs text-muted-foreground">{member.user.email}</p>
                              </div>
                              <Button
                                size="sm"
                                className="rounded-xl"
                                disabled={addMemberMutation.isPending}
                                onClick={() =>
                                  addMemberMutation.mutate({
                                    channelId,
                                    data: { user_id: member.user_id, role: selectedAddRole },
                                  })
                                }
                              >
                                {addMemberMutation.isPending ? <Loader2 className="h-4 w-4 animate-spin" /> : "Add"}
                              </Button>
                            </div>
                          ))
                        ) : (
                          <p className="text-sm text-muted-foreground">No eligible workspace members match this search.</p>
                        )}
                      </div>
                    </div>
                  ) : null}

                  {isLoadingMembers ? (
                    <div className="flex items-center justify-center py-10 text-muted-foreground">
                      <Loader2 className="h-5 w-5 animate-spin" />
                    </div>
                  ) : members.length > 0 ? (
                    <div className="space-y-3">
                      {members.map((member) => (
                        <div
                          key={member.id}
                          className="flex flex-col gap-4 rounded-2xl border border-border/70 bg-muted/15 p-4 md:flex-row md:items-center md:justify-between"
                        >
                          <div className="flex min-w-0 items-center gap-3">
                            <Avatar className="h-11 w-11 border border-border/70">
                              <AvatarFallback className="bg-primary/10 text-primary">
                                {member.user.name.charAt(0).toUpperCase()}
                              </AvatarFallback>
                            </Avatar>
                            <div className="min-w-0">
                              <p className="truncate text-sm font-semibold text-foreground">{member.user.name}</p>
                              <p className="truncate text-xs text-muted-foreground">{member.user.email}</p>
                            </div>
                          </div>
                          <div className="flex flex-wrap items-center gap-2">
                            <ChannelRoleBadge role={member.role} />
                            {canChangeRoles ? (
                              <Select
                                value={member.role}
                                onValueChange={(value) =>
                                  updateRoleMutation.mutate({
                                    channelId,
                                    userId: member.user_id,
                                    data: { role: value as "MANAGER" | "MEMBER" },
                                  })
                                }
                              >
                                <SelectTrigger className="h-9 w-[130px] rounded-xl">
                                  <SelectValue />
                                </SelectTrigger>
                                <SelectContent>
                                  <SelectItem value="MEMBER">Member</SelectItem>
                                  <SelectItem value="MANAGER">Manager</SelectItem>
                                </SelectContent>
                              </Select>
                            ) : null}
                            {canRemoveMembers ? (
                              <Button
                                variant="outline"
                                size="sm"
                                className="rounded-xl border-destructive/20 text-destructive hover:bg-destructive/10 hover:text-destructive"
                                onClick={() =>
                                  setMemberToRemove({
                                    id: member.user_id,
                                    name: member.user.name,
                                  })
                                }
                              >
                                <UserMinus className="mr-2 h-4 w-4" />
                                Remove
                              </Button>
                            ) : null}
                          </div>
                        </div>
                      ))}
                      <p className="text-xs text-muted-foreground">
                        Showing {members.length} of {pagination?.total ?? members.length} channel members.
                      </p>
                    </div>
                  ) : (
                    <div className="rounded-2xl border border-dashed border-border/80 bg-muted/10 p-8 text-center">
                      <Users className="mx-auto h-8 w-8 text-muted-foreground" />
                      <p className="mt-3 text-sm font-medium text-foreground">No members match this view</p>
                      <p className="mt-1 text-sm text-muted-foreground">Try clearing search or changing the role filter.</p>
                    </div>
                  )}
                </CardContent>
              </Card>

              {canDelete ? (
                <Card className="overflow-hidden rounded-3xl border-destructive/20 bg-destructive/5 shadow-sm">
                  <CardHeader>
                    <CardTitle className="text-base text-destructive">Delete Channel</CardTitle>
                  </CardHeader>
                  <CardContent className="space-y-4">
                    <p className="text-sm text-muted-foreground">
                      Deleting this channel will remove its member list and messages. This action cannot be undone.
                    </p>
                    <Button
                      variant="destructive"
                      className="rounded-2xl"
                      onClick={() => setConfirmDelete(true)}
                    >
                      <Trash2 className="mr-2 h-4 w-4" />
                      Delete Channel
                    </Button>
                  </CardContent>
                </Card>
              ) : null}
            </div>
          ) : null}

          <SheetFooter className="border-t border-border/60 pt-4">
            <p className="text-xs text-muted-foreground">
              Role-aware controls are enforced by the backend, so unavailable actions stay blocked even if someone tries them manually.
            </p>
          </SheetFooter>
        </SheetContent>
      </Sheet>

      <AlertDialog open={!!memberToRemove} onOpenChange={() => setMemberToRemove(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Remove member from channel?</AlertDialogTitle>
            <AlertDialogDescription>
              {memberToRemove?.name} will lose access to this channel immediately.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction
              className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
              onClick={() =>
                memberToRemove &&
                removeMemberMutation.mutate({
                  channelId,
                  userId: memberToRemove.id,
                })
              }
            >
              {removeMemberMutation.isPending ? <Loader2 className="h-4 w-4 animate-spin" /> : "Remove"}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      <AlertDialog open={confirmDelete} onOpenChange={setConfirmDelete}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Delete channel?</AlertDialogTitle>
            <AlertDialogDescription>
              This permanently deletes the channel, its messages, and its member links.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction
              className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
              onClick={() => deleteChannelMutation.mutate(channelId)}
            >
              {deleteChannelMutation.isPending ? <Loader2 className="h-4 w-4 animate-spin" /> : "Delete"}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </>
  );
}
