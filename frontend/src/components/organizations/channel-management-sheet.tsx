"use client";

import { useMemo, useState } from "react";
import {
  Hash,
  Loader2,
  Trash2,
  UserMinus,
  UserPlus,
  Users,
  MessageSquareText,
  Plus,
  Settings2,
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
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
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
import { useOrganization, useOrganizationMembers } from "@/hooks/api/useOrganizations";
import { handleApiError } from "@/lib/api-errors";
import { useAuthProfile } from "@/services/auth.service";

function ChannelRoleBadge({ role }: { role: "MANAGER" | "MEMBER" }) {
  return (
    <span
      className={`inline-flex items-center rounded-md px-2 py-0.5 text-[10px] font-bold uppercase tracking-wider ${
        role === "MANAGER"
          ? "bg-primary/10 text-primary border border-primary/20"
          : "bg-muted text-muted-foreground border border-border/50"
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
  const [isAddMemberOpen, setIsAddMemberOpen] = useState(false);
  const [isEditNameOpen, setIsEditNameOpen] = useState(false);

  const { channel, isLoading: isLoadingChannel } = useChannel(channelId, { enabled: open });
  const { user } = useAuthProfile();
  const { organization } = useOrganization(orgId);
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

  const orgOwnerId = useMemo(() => {
    return orgMembers.find(m => m.role === 'OWNER')?.user_id;
  }, [orgMembers]);

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
        <SheetContent side="right" className="w-full overflow-y-auto border-l border-border bg-background sm:max-w-2xl p-0">
          <SheetHeader className="px-6 pt-6 pb-4 border-b border-border/50">
            <SheetTitle className="flex items-center gap-2 text-lg font-bold">
              {channel?.isDefault ? <MessageSquareText className="h-4 w-4 text-primary" /> : <Hash className="h-4 w-4 text-primary" />}
              {channel?.isDefault ? "Organization Chat Management" : "Channel Management"}
            </SheetTitle>
            <SheetDescription className="text-xs">
              Manage settings and membership for this channel.
            </SheetDescription>
          </SheetHeader>

          {isLoadingChannel ? (
            <div className="flex items-center justify-center py-16 text-muted-foreground">
              <Loader2 className="h-5 w-5 animate-spin" />
            </div>
          ) : channel ? (
            <div className="space-y-6 p-6">
              {/* Channel Header */}
              <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between border-b border-border/50 pb-6">
                <div>
                  <h1 className="text-2xl font-bold text-foreground flex items-center gap-2">
                    <span className="text-primary/60 font-mono">#</span>
                    {channel.name}
                  </h1>
                  <p className="text-sm text-muted-foreground mt-1">Manage this channel's settings and members.</p>
                </div>
                <div className="flex items-center gap-2">
                  {canEdit && (
                    <Button 
                      variant="outline"
                      size="sm" 
                      className="h-11 rounded-xl px-4 font-semibold shadow-sm transition-all bg-background" 
                      onClick={() => {
                        setNameDraft(channel.name);
                        setIsEditNameOpen(true);
                      }}
                    >
                      <Settings2 className="mr-1.5 h-4 w-4" />
                      Edit
                    </Button>
                  )}
                  {canAddMembers && (
                    <Button 
                      size="sm" 
                      className="h-11 rounded-xl px-4 font-semibold shadow-sm transition-all" 
                      onClick={() => setIsAddMemberOpen(true)}
                    >
                      <Plus className="mr-1.5 h-4 w-4" />
                      Add Member
                    </Button>
                  )}
                </div>
              </div>

              {canEdit && (
                <Dialog open={isEditNameOpen} onOpenChange={setIsEditNameOpen}>
                  <DialogContent open={isEditNameOpen} className="sm:max-w-md rounded-xl">
                    <DialogHeader>
                      <DialogTitle className="text-lg font-bold">Edit Channel</DialogTitle>
                      <DialogDescription className="text-xs">
                        Update the name of this channel.
                      </DialogDescription>
                    </DialogHeader>
                    <div className="space-y-4 py-4">
                      <div className="space-y-2">
                        <Label htmlFor="edit-channel-name" className="text-foreground font-semibold text-sm">Channel Name</Label>
                        <Input
                          id="edit-channel-name"
                          value={nameDraft}
                          onChange={(event) => setNameDraft(event.target.value)}
                          placeholder="e.g. general"
                          className="h-11 px-4 text-base rounded-xl bg-background border-input shadow-sm hover:border-ring/50 focus-visible:ring-4 focus-visible:ring-ring/15 transition-all"
                          autoFocus
                        />
                      </div>
                      <div className="flex justify-end gap-2">
                        <Button variant="ghost" className="rounded-xl h-11 px-6 font-semibold" onClick={() => setIsEditNameOpen(false)}>Cancel</Button>
                        <Button 
                          className="rounded-xl h-11 px-6 font-semibold shadow-md"
                          onClick={handleSaveName}
                          disabled={updateChannelMutation.isPending || !nameDraft.trim() || nameDraft.trim() === channel.name}
                        >
                          {updateChannelMutation.isPending ? <Loader2 className="h-4 w-4 animate-spin" /> : "Save Changes"}
                        </Button>
                      </div>
                    </div>
                  </DialogContent>
                </Dialog>
              )}

              {canAddMembers && (
                <Dialog open={isAddMemberOpen} onOpenChange={setIsAddMemberOpen}>
                  <DialogContent open={isAddMemberOpen} className="sm:max-w-md rounded-xl">
                    <DialogHeader>
                      <DialogTitle className="text-lg font-bold">Add Member</DialogTitle>
                      <DialogDescription className="text-xs">
                        Add an existing workspace member to this channel.
                      </DialogDescription>
                    </DialogHeader>
                    <div className="space-y-4 py-4">
                      <div className="space-y-4">
                        <div className="space-y-2">
                          <Label className="text-foreground font-semibold text-sm">Select Role</Label>
                          <Select value={selectedAddRole} onValueChange={(value) => setSelectedAddRole(value as "MANAGER" | "MEMBER")}>
                            <SelectTrigger className="h-11 px-4 text-base rounded-xl bg-background border-input shadow-sm hover:border-ring/50 focus:ring-4 focus:ring-ring/15 transition-all">
                              <SelectValue />
                            </SelectTrigger>
                            <SelectContent>
                              <SelectItem value="MEMBER">Member</SelectItem>
                              <SelectItem value="MANAGER">Manager</SelectItem>
                            </SelectContent>
                          </Select>
                        </div>
                        
                        <div className="space-y-2">
                          <Label className="text-foreground font-semibold text-sm">Search Workspace</Label>
                          <Input
                            value={candidateSearch}
                            onChange={(event) => setCandidateSearch(event.target.value)}
                            placeholder="Type name or email..."
                            className="h-11 px-4 text-base rounded-xl bg-background border-input shadow-sm hover:border-ring/50 focus-visible:ring-4 focus-visible:ring-ring/15 transition-all"
                            autoFocus
                          />
                        </div>
                      </div>
                      <div className="space-y-1 max-h-60 overflow-y-auto pt-2">
                        {candidateMembers.length > 0 ? (
                          candidateMembers.map((member) => (
                            <div
                              key={member.id}
                              className="flex items-center justify-between rounded-xl border border-border/50 bg-muted/20 px-3 py-2"
                            >
                              <div className="min-w-0">
                                <p className="truncate text-xs font-bold">{member.user.name}</p>
                                <p className="truncate text-[10px] text-muted-foreground">{member.user.email}</p>
                              </div>
                              <Button
                                size="sm"
                                variant="secondary"
                                className="h-8 rounded-xl text-[11px] font-bold px-4"
                                disabled={addMemberMutation.isPending}
                                onClick={() =>
                                  addMemberMutation.mutate({
                                    channelId,
                                    data: { user_id: member.user_id, role: selectedAddRole },
                                  })
                                }
                              >
                                {addMemberMutation.isPending ? <Loader2 className="h-3 w-3 animate-spin" /> : "Add"}
                              </Button>
                            </div>
                          ))
                        ) : candidateSearch ? (
                          <p className="text-[11px] text-muted-foreground text-center py-6">No workspace members found.</p>
                        ) : null}
                      </div>
                    </div>
                  </DialogContent>
                </Dialog>
              )}
              <Card className="rounded-xl border-border shadow-sm">
                <CardHeader className="pb-3 px-5 pt-5">
                  <CardTitle className="text-sm font-bold">Quick Stats</CardTitle>
                </CardHeader>
                <CardContent className="px-5 pb-5">
                  <div className="grid grid-cols-3 gap-3">
                    <div className="rounded-xl border border-border bg-muted/20 p-3">
                      <p className="text-[9px] font-bold uppercase tracking-wider text-muted-foreground">Members</p>
                      <p className="mt-1 text-lg font-bold">{channel.stats.memberCount}</p>
                    </div>
                    <div className="rounded-xl border border-border bg-muted/20 p-3">
                      <p className="text-[9px] font-bold uppercase tracking-wider text-muted-foreground">Messages</p>
                      <p className="mt-1 text-lg font-bold">{channel.stats.messageCount}</p>
                    </div>
                    <div className="rounded-xl border border-border bg-muted/20 p-3">
                      <p className="text-[9px] font-bold uppercase tracking-wider text-muted-foreground">Tasks</p>
                      <p className="mt-1 text-lg font-bold">{channel.stats.taskCount}</p>
                    </div>
                  </div>
                </CardContent>
              </Card>

              <Card className="rounded-xl border-border shadow-sm overflow-hidden">
                <CardHeader className="border-b border-border/50 bg-muted/20 px-5 py-3">
                  <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
                    <CardTitle className="text-sm font-bold">Members</CardTitle>
                    <div className="flex flex-wrap items-center gap-2">
                      <Input
                        value={memberSearch}
                        onChange={(event) => setMemberSearch(event.target.value)}
                        placeholder="Search members..."
                        className="h-11 px-4 text-base rounded-xl bg-background border-input shadow-sm hover:border-ring/50 focus-visible:ring-4 focus-visible:ring-ring/15 transition-all w-48"
                      />
                      <Select value={memberRoleFilter} onValueChange={(value) => setMemberRoleFilter(value as "ALL" | "MANAGER" | "MEMBER")}>
                        <SelectTrigger className="h-11 px-4 text-base rounded-xl bg-background border-input shadow-sm hover:border-ring/50 focus:ring-4 focus:ring-ring/15 transition-all w-32">
                          <SelectValue placeholder="Role" />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value="ALL">All</SelectItem>
                          <SelectItem value="MANAGER">Managers</SelectItem>
                          <SelectItem value="MEMBER">Members</SelectItem>
                        </SelectContent>
                      </Select>
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
                          className="flex items-center justify-between px-5 py-2.5 transition-colors hover:bg-muted/30"
                        >
                          <div className="flex min-w-0 items-center gap-3">
                            <Avatar className="h-8 w-8 border border-border">
                              <AvatarFallback className="bg-primary/10 text-[10px] font-bold text-primary uppercase">
                                {member.user.name.charAt(0)}
                              </AvatarFallback>
                            </Avatar>
                            <div className="min-w-0">
                              <p className="truncate text-[13px] font-semibold">{member.user.name}</p>
                              <p className="truncate text-[10px] text-muted-foreground">{member.user.email}</p>
                            </div>
                          </div>
                          <div className="flex items-center gap-2">
                            <ChannelRoleBadge role={member.role} />
                            {canChangeRoles && member.user_id !== orgOwnerId && (
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
                                <SelectTrigger className="h-8 w-28 rounded-xl text-[10px] font-bold bg-background border-input shadow-sm hover:border-ring/50 focus:ring-4 focus:ring-ring/15 transition-all">
                                  <SelectValue />
                                </SelectTrigger>
                                <SelectContent>
                                  <SelectItem value="MEMBER">Member</SelectItem>
                                  <SelectItem value="MANAGER">Manager</SelectItem>
                                </SelectContent>
                              </Select>
                            )}
                            {canRemoveMembers && member.user_id !== orgOwnerId && member.user_id !== user?.id && (
                              <Button
                                variant="ghost"
                                size="sm"
                                className="h-7 w-7 p-0 text-destructive hover:bg-destructive/10"
                                onClick={() =>
                                  setMemberToRemove({
                                    id: member.user_id,
                                    name: member.user.name,
                                  })
                                }
                              >
                                <UserMinus className="h-3.5 w-3.5" />
                              </Button>
                            )}
                          </div>
                        </div>
                      ))}
                    </div>
                  ) : (
                    <div className="flex flex-col items-center justify-center py-12 text-center">
                      <Users className="h-6 w-6 text-muted-foreground/30 mb-1" />
                      <p className="text-xs font-bold text-foreground">No members found</p>
                    </div>
                  )}
                </CardContent>
              </Card>

              {canDelete ? (
                <Card className="rounded-xl border-destructive/20 bg-destructive/5 shadow-sm">
                  <CardHeader className="pb-3">
                    <CardTitle className="text-sm font-bold text-destructive">Danger Zone</CardTitle>
                  </CardHeader>
                  <CardContent>
                    <Button
                      variant="destructive"
                      size="sm"
                      className="w-full rounded-md"
                      onClick={() => setConfirmDelete(true)}
                    >
                      <Trash2 className="mr-2 h-3.5 w-3.5" />
                      Delete Channel
                    </Button>
                  </CardContent>
                </Card>
              ) : null}
            </div>
          ) : null}

          <SheetFooter className="px-6 py-4 border-t border-border/50">
            <p className="text-[10px] text-muted-foreground italic">
              Organization owners have persistent access to all sectors.
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
