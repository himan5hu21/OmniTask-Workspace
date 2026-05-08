"use client";

import React, { useMemo, useState, useContext } from "react";
import {
  Hash,
  Trash2,
  UserMinus,
  Users,
  MessageSquareText,
  Plus,
  Settings2,
  LayoutDashboard,
  Settings,
  Shield,
  ShieldAlert,
  ShieldCheck,
  ChevronDown,
  Pencil,
  Search
} from "lucide-react";
import { OrbitalLoader } from "@/components/ui/orbital-loader";
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
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import { ScrollArea } from "@/components/ui/scroll-area";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger
} from '@/components/ui/dropdown-menu';
import { 
  Table, 
  TableBody, 
  TableCell, 
  TableHead, 
  TableHeader, 
  TableRow 
} from "@/components/ui/table";
import {
  Pagination,
  PaginationContent,
  PaginationItem,
  PaginationLink,
  PaginationNext,
  PaginationPrevious,
} from "@/components/ui/pagination";
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
} from "@/api/channels";
import { useOrganization, useOrganizationMembers } from "@/api/organizations";
import { handleApiError } from "@/api/api-errors";
import { useAuthProfile } from "@/api/auth";
import { useDebounce } from "@/hooks/useDebounce";
import { CHANNEL_ROLES, type ChannelRole } from "@/types/roles";
import { AbilityContext, Can } from "@/lib/casl";
import { cn, getInitials } from "@/lib/utils";

function ChannelRoleBadge({ role }: { role: ChannelRole }) {
  const styles = {
    [CHANNEL_ROLES.MANAGER]: "bg-primary/10 text-primary border border-primary/20",
    [CHANNEL_ROLES.CONTRIBUTOR]: "bg-blue-500/10 text-blue-500 border border-blue-500/20",
    [CHANNEL_ROLES.VIEWER]: "bg-muted text-muted-foreground border border-border/50",
  };

  return (
    <span
      className={cn(
        "inline-flex items-center rounded-md px-2 py-0.5 text-[10px] font-bold uppercase tracking-wider",
        styles[role]
      )}
    >
      {role}
    </span>
  );
}

export function ChannelSettingsModal({
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
  const [activeTab, setActiveTab] = useState<'overview' | 'members' | 'settings'>('overview');
  const [page, setPage] = useState(1);
  const limit = 10;
  const [memberSearch, setMemberSearch] = useState("");
  const debouncedMemberSearch = useDebounce(memberSearch, 500);
  const [candidateSearch, setCandidateSearch] = useState("");
  const debouncedCandidateSearch = useDebounce(candidateSearch, 500);
  const [selectedAddRole, setSelectedAddRole] = useState<ChannelRole>(CHANNEL_ROLES.CONTRIBUTOR);
  const [nameDraft, setNameDraft] = useState("");
  const [memberToRemove, setMemberToRemove] = useState<{ id: string; name: string } | null>(null);
  const [confirmDelete, setConfirmDelete] = useState(false);
  const [isAddMemberOpen, setIsAddMemberOpen] = useState(false);

  const { channel, isLoading: isLoadingChannel } = useChannel(channelId, { enabled: open });
  const { user } = useAuthProfile();
  const { organization } = useOrganization(orgId);
  const {
    members = [],
    pagination,
    permissions,
    currentUserOrgRole,
    currentUserChannelRole,
    isLoading: isLoadingMembers,
  } = useChannelMembers(channelId, {
    page,
    limit,
    search: debouncedMemberSearch,
  });
  const { members: orgMembers } = useOrganizationMembers(orgId, {
    page: 1,
    limit: 8,
    search: debouncedCandidateSearch,
    role: "ALL",
  });

  const channelMemberIds = useMemo(() => new Set(members.map((member) => member.user_id)), [members]);
  const candidateMembers = useMemo(
    () => orgMembers.filter((member) => !channelMemberIds.has(member.user_id)),
    [channelMemberIds, orgMembers]
  );


  const updateChannelMutation = useUpdateChannel();


  const deleteChannelMutation = useDeleteChannel();


  const addMemberMutation = useAddChannelMember();


  const updateRoleMutation = useUpdateChannelMemberRole();


  const removeMemberMutation = useRemoveChannelMember();


  const ability = useContext(AbilityContext);

  const canEdit = ability.can('update', 'Channel');
  const canDelete = ability.can('delete', 'Channel');
  const canAddMembers = ability.can('add', 'Channel') || ability.can('create', 'Member');
  const canChangeRoles = ability.can('promote', 'Channel') || ability.can('change', 'Member');
  const canRemoveMembers = ability.can('remove', 'Channel') || ability.can('remove', 'Member');
  
  // Everyone in the channel can view the modal (Overview & Members)


  const handleSaveName = () => {
    const nextName = nameDraft.trim();
    if (!channel || !nextName || nextName === channel.name) {
      return;
    }

    updateChannelMutation.mutate({
      channelId,
      data: { name: nextName },
    }, {
      onSuccess: () => toast.success("Channel updated successfully"),
      onError: (error) =>
        handleApiError(error, {
          uniqueName: () => toast.error("That channel name already exists in this workspace"),
          accessDenied: () => toast.error("You do not have permission to update this channel"),
          onOtherError: (message) => toast.error(message),
        }),
    });
  };

  return (
    <>
      <Dialog
        open={open}
        onOpenChange={(nextOpen) => {
          setOpen(nextOpen);
          if (nextOpen && channel) {
            setNameDraft(channel.name);
            setPage(1);
          }
        }}
      >
        {/* <Can I="read" a="Channel"> */}
          <DialogTrigger asChild>{trigger}</DialogTrigger>
        {/* </Can> */}
        <DialogContent className="max-w-6xl p-0 gap-0 overflow-hidden bg-background border-border shadow-2xl rounded-xl w-[95vw] h-[85vh] md:h-[700px] flex flex-col md:flex-row">
          <DialogTitle className="sr-only">Channel Settings</DialogTitle>
          <DialogDescription className="sr-only">
            Manage your channel settings and members.
          </DialogDescription>

          {/* Left Sidebar Navigation */}
        <div className="w-full md:w-[260px] bg-muted/30 border-r border-border flex flex-col shrink-0">
          <div className="px-6 h-[72px] border-b border-border flex items-center">
            <div className="flex items-center gap-3 w-full">
              <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl border border-primary/20 bg-primary/10 text-primary font-bold text-lg">
                {getInitials(channel?.name, "CH")}
              </div>
              <h2 className="text-base font-bold tracking-tight text-foreground truncate">
                #{channel?.name || "Channel"}
              </h2>
            </div>
          </div>
          
          <nav className="flex-1 py-4 flex flex-row md:flex-col gap-1 overflow-x-auto md:overflow-x-visible px-2 md:px-0 pr-12 md:pr-0">
            <button 
              onClick={() => setActiveTab('overview')}
              className={cn(
                "px-4 py-2.5 mx-1 md:mx-2 rounded-lg text-sm font-medium transition-all flex items-center gap-3 whitespace-nowrap",
                activeTab === 'overview' ? "bg-primary text-primary-foreground shadow-md" : "text-muted-foreground hover:bg-muted hover:text-foreground"
              )}
            >
              <LayoutDashboard className="h-4 w-4" />
              Overview
            </button>
            <button 
              onClick={() => setActiveTab('members')}
              className={cn(
                "px-4 py-2.5 mx-1 md:mx-2 rounded-lg text-sm font-medium transition-all flex items-center gap-3 whitespace-nowrap",
                activeTab === 'members' ? "bg-primary text-primary-foreground shadow-md" : "text-muted-foreground hover:bg-muted hover:text-foreground"
              )}
            >
              <Users className="h-4 w-4" />
              Members
            </button>
            <Can I="update" a="Channel">
              <button 
                onClick={() => setActiveTab('settings')}
                className={cn(
                  "px-4 py-2.5 mx-1 md:mx-2 rounded-lg text-sm font-medium transition-all flex items-center gap-3 whitespace-nowrap",
                  activeTab === 'settings' ? "bg-primary text-primary-foreground shadow-md" : "text-muted-foreground hover:bg-muted hover:text-foreground"
                )}
              >
                <Settings className="h-4 w-4" />
                Settings
              </button>
            </Can>
          </nav>
        </div>

          {/* Right Content Area */}
          <div className="flex-1 flex flex-col h-full bg-background overflow-hidden">
            {/* Header */}
            <div className="px-6 md:pr-15 h-[72px] border-b border-border flex items-center justify-between shrink-0">
              <h1 className="text-lg font-bold tracking-tight text-foreground">
                {activeTab === 'overview' && "Channel Overview"}
                {activeTab === 'members' && "Manage Members"}
                {activeTab === 'settings' && "General Settings"}
              </h1>
              {activeTab === 'members' && canAddMembers && (
                <Button 
                  onClick={() => setIsAddMemberOpen(true)}
                  className="h-10 gap-2 rounded-lg px-5 text-xs font-bold shadow-lg transition-all hover:opacity-90 hover:shadow-primary/25 active:scale-95 shadow-primary/20"
                >
                  <Plus className="h-3.5 w-3.5" />
                  Add Member
                </Button>
              )}
            </div>

            {/* Main Content Scroll Area */}
            <ScrollArea className="flex-1">
              <div className="px-6 py-6">
                {isLoadingChannel ? (
                  <div className="flex h-64 items-center justify-center">
                    <OrbitalLoader size="md" />
                  </div>
                ) : (
                  <>
                    {activeTab === 'overview' && (
                      <div className="space-y-8">
                        <div className="p-6 border border-border rounded-xl bg-card/30">
                          <h3 className="text-sm font-bold mb-4">Channel Details</h3>
                          <div className="space-y-4">
                            <div className="space-y-1">
                              <p className="text-[10px] font-bold uppercase tracking-widest text-muted-foreground">Name</p>
                              <p className="text-lg font-bold flex items-center gap-2">
                                <Hash className="h-4 w-4 text-primary" />
                                {channel?.name}
                              </p>
                            </div>
                            <div className="grid grid-cols-3 gap-4">
                              <div className="p-4 border border-border rounded-lg bg-muted/20">
                                <p className="text-[10px] font-bold uppercase tracking-widest text-muted-foreground">Total Members</p>
                                <p className="text-2xl font-bold mt-1">{channel?.stats?.memberCount || 0}</p>
                              </div>
                              <div className="p-4 border border-border rounded-lg bg-muted/20">
                                <p className="text-[10px] font-bold uppercase tracking-widest text-muted-foreground">Messages</p>
                                <p className="text-2xl font-bold mt-1">{channel?.stats?.messageCount || 0}</p>
                              </div>
                              <div className="p-4 border border-border rounded-lg bg-muted/20">
                                <p className="text-[10px] font-bold uppercase tracking-widest text-muted-foreground">Tasks</p>
                                <p className="text-2xl font-bold mt-1">{channel?.stats?.taskCount || 0}</p>
                              </div>
                            </div>
                          </div>
                        </div>

                        <Can I="update" a="Channel">
                          <div className="p-6 border border-border rounded-xl bg-card/30">
                            <h3 className="text-sm font-bold mb-4">Your Permissions</h3>
                            <div className="grid grid-cols-2 gap-3">
                              <PermissionItem label="Manage Members" allowed={canAddMembers} />
                              <PermissionItem label="Edit Channel" allowed={canEdit} />
                              <PermissionItem label="Delete Channel" allowed={canDelete} />
                              <PermissionItem label="Change Roles" allowed={canChangeRoles} />
                            </div>
                          </div>
                        </Can>
                      </div>
                    )}

                    {activeTab === 'members' && (
                      <div className="space-y-6">
                        {/* Search Bar */}
                        <div className="flex items-center gap-4 shrink-0 px-0.5 pt-0.5">
                          <div className="relative flex-1 group">
                            <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground group-focus-within:text-primary transition-colors" />
                            <Input 
                              placeholder="Search members..." 
                              className="h-11 pl-10 bg-muted/20 border-border rounded-xl focus:bg-background transition-all focus-visible:ring-offset-0" 
                              value={memberSearch}
                              onChange={(e) => {
                                setMemberSearch(e.target.value);
                                setPage(1);
                              }}
                            />
                          </div>
                        </div>

                        {/* Member List Table */}
                        <div className="border border-border rounded-xl overflow-hidden bg-card/30">
                          <Table>
                            <TableHeader className="bg-muted/50">
                              <TableRow className="hover:bg-transparent border-border">
                                <TableHead className="text-[10px] font-bold uppercase tracking-widest text-muted-foreground h-10 px-6">User</TableHead>
                                <TableHead className="text-[10px] font-bold uppercase tracking-widest text-muted-foreground h-10">Role</TableHead>
                                <TableHead className="w-12 h-10"></TableHead>
                              </TableRow>
                            </TableHeader>
                            <TableBody>
                              {isLoadingMembers ? (
                                <TableRow>
                                  <TableCell colSpan={3} className="h-32 text-center">
                                    <div className="flex justify-center">
                                      <OrbitalLoader size="md" className="text-muted-foreground" />
                                    </div>
                                  </TableCell>
                                </TableRow>
                              ) : members.length === 0 ? (
                                <TableRow>
                                  <TableCell colSpan={3} className="h-32 text-center text-sm text-muted-foreground">
                                    No members found.
                                  </TableCell>
                                </TableRow>
                              ) : (
                                members.map((member) => (
                                  <TableRow key={member.id} className="border-border/50 hover:bg-muted/20 transition-colors group">
                                    <TableCell className="px-6">
                                      <div className="flex items-center gap-3 min-w-0">
                                        <Avatar className="h-8 w-8 border border-border">
                                          <AvatarFallback className="bg-primary/10 text-[10px] font-bold text-primary uppercase">
                                            {member.name?.charAt(0) || "U"}
                                          </AvatarFallback>
                                        </Avatar>
                                        <div className="min-w-0">
                                          <p className="text-sm font-bold truncate flex items-center gap-1.5">
                                            {member.name || "Unnamed"}
                                            {member.user_id === user?.id && (
                                              <span className="text-[9px] px-1.5 py-0.5 rounded bg-primary/10 text-primary font-bold">(You)</span>
                                            )}
                                          </p>
                                          <p className="text-[11px] text-muted-foreground truncate">{member.email}</p>
                                        </div>
                                      </div>
                                    </TableCell>
                                    
                                    <TableCell>
                                      {canChangeRoles && member.user_id !== user?.id && member.user_id !== organization?.owner_id ? (
                                        <DropdownMenu>
                                          <DropdownMenuTrigger asChild>
                                            <button className={cn(
                                              "inline-flex items-center gap-1.5 h-7 px-3 rounded-full text-[10px] font-bold uppercase tracking-wider transition-all hover:ring-2 hover:ring-offset-2 hover:ring-offset-background",
                                              member.role === CHANNEL_ROLES.MANAGER && "bg-primary/10 text-primary hover:bg-primary/20 hover:ring-primary/30",
                                              member.role === CHANNEL_ROLES.CONTRIBUTOR && "bg-blue-500/10 text-blue-500 hover:bg-blue-500/20 hover:ring-blue-500/30",
                                              member.role === CHANNEL_ROLES.VIEWER && "bg-muted text-muted-foreground hover:bg-muted/80 hover:ring-muted/30"
                                            )}>
                                              {member.role}
                                              <ChevronDown className="h-3 w-3 opacity-50" />
                                            </button>
                                          </DropdownMenuTrigger>
                                          <DropdownMenuContent align="start" className="w-64 rounded-xl p-2 bg-card border-border shadow-2xl">
                                            <div className="px-2 py-1.5 mb-1">
                                              <p className="text-[10px] font-bold text-muted-foreground uppercase tracking-widest">Change Role</p>
                                            </div>
                                            <DropdownMenuItem 
                                              className="flex flex-col items-start gap-0.5 rounded-lg p-2 cursor-pointer focus:bg-primary/10"
                                              onClick={() => updateRoleMutation.mutate({ channelId, userId: member.user_id, data: { role: CHANNEL_ROLES.MANAGER } })}
                                            >
                                              <div className="flex items-center gap-2">
                                                <ShieldAlert className="h-3.5 w-3.5 text-primary" />
                                                <span className="text-sm font-bold text-foreground">Manager</span>
                                              </div>
                                              <p className="text-[10px] text-muted-foreground leading-relaxed">Full management access to the channel.</p>
                                            </DropdownMenuItem>
                                            <DropdownMenuItem 
                                              className="flex flex-col items-start gap-0.5 rounded-lg p-2 cursor-pointer focus:bg-blue-500/10 mt-1"
                                              onClick={() => updateRoleMutation.mutate({ channelId, userId: member.user_id, data: { role: CHANNEL_ROLES.CONTRIBUTOR } })}
                                            >
                                              <div className="flex items-center gap-2">
                                                <ShieldCheck className="h-3.5 w-3.5 text-blue-500" />
                                                <span className="text-sm font-bold text-foreground">Contributor</span>
                                              </div>
                                              <p className="text-[10px] text-muted-foreground leading-relaxed">Can send messages and create tasks.</p>
                                            </DropdownMenuItem>
                                            <DropdownMenuItem 
                                              className="flex flex-col items-start gap-0.5 rounded-lg p-2 cursor-pointer focus:bg-muted mt-1"
                                              onClick={() => updateRoleMutation.mutate({ channelId, userId: member.user_id, data: { role: CHANNEL_ROLES.VIEWER } })}
                                            >
                                              <div className="flex items-center gap-2">
                                                <Shield className="h-3.5 w-3.5 text-muted-foreground" />
                                                <span className="text-sm font-bold text-foreground">Viewer</span>
                                              </div>
                                              <p className="text-[10px] text-muted-foreground leading-relaxed">Read-only access to messages.</p>
                                            </DropdownMenuItem>
                                          </DropdownMenuContent>
                                        </DropdownMenu>
                                      ) : (
                                        <div className={cn(
                                          "inline-flex items-center gap-1.5 h-7 px-3 rounded-full text-[10px] font-bold uppercase tracking-wider",
                                          member.role === CHANNEL_ROLES.MANAGER && "bg-primary/10 text-primary",
                                          member.role === CHANNEL_ROLES.CONTRIBUTOR && "bg-blue-500/10 text-blue-500",
                                          member.role === CHANNEL_ROLES.VIEWER && "bg-muted text-muted-foreground"
                                        )}>
                                          {member.role}
                                        </div>
                                      )}
                                    </TableCell>
 
                                    <TableCell className="px-6">
                                      {canRemoveMembers && member.user_id !== organization?.owner_id && member.user_id !== user?.id && (
                                        <Button 
                                          variant="ghost" 
                                          size="icon" 
                                          className="h-8 w-8 text-muted-foreground hover:text-destructive opacity-0 group-hover:opacity-100 transition-all"
                                          onClick={() => setMemberToRemove({ id: member.user_id, name: member.name || "member" })}
                                        >
                                          <Trash2 className="h-4 w-4" />
                                        </Button>
                                      )}
                                    </TableCell>
                                  </TableRow>
                                ))
                              )}
                            </TableBody>
                          </Table>
                        </div>

                        {/* Pagination */}
                        {pagination && pagination.totalPages > 1 && (
                          <div className="flex items-center justify-between px-2 py-4 border-t border-border mt-4">
                            <p className="text-xs text-muted-foreground">
                              Showing <span className="font-medium">{(page - 1) * limit + 1}</span> to <span className="font-medium">{Math.min(page * limit, pagination.total)}</span> of <span className="font-medium">{pagination.total}</span> members
                            </p>
                            <Pagination className="w-auto mx-0">
                              <PaginationContent>
                                <PaginationItem>
                                  <PaginationPrevious 
                                    href="#" 
                                    onClick={(e) => { e.preventDefault(); if (page > 1) setPage(page - 1); }}
                                    className={cn("cursor-pointer h-8 px-3 rounded-lg", page === 1 && "pointer-events-none opacity-50")}
                                  />
                                </PaginationItem>
                                
                                {[...Array(pagination.totalPages)].map((_, i) => (
                                  <PaginationItem key={i}>
                                    <PaginationLink 
                                      href="#" 
                                      onClick={(e) => { e.preventDefault(); setPage(i + 1); }}
                                      isActive={page === i + 1}
                                      className="h-8 w-8 rounded-lg cursor-pointer"
                                    >
                                      {i + 1}
                                    </PaginationLink>
                                  </PaginationItem>
                                ))}

                                <PaginationItem>
                                  <PaginationNext 
                                    href="#" 
                                    onClick={(e) => { e.preventDefault(); if (page < pagination.totalPages) setPage(page + 1); }}
                                    className={cn("cursor-pointer h-8 px-3 rounded-lg", page === pagination.totalPages && "pointer-events-none opacity-50")}
                                  />
                                </PaginationItem>
                              </PaginationContent>
                            </Pagination>
                          </div>
                        )}
                      </div>
                    )}

                    {activeTab === 'settings' && (
                      <div className="space-y-8">
                        {canEdit && (
                          <div className="p-6 border border-border rounded-xl bg-card/30 space-y-4">
                            <h3 className="text-sm font-bold">General Settings</h3>
                            <div className="space-y-4 max-w-md">
                              <div className="space-y-2">
                                <Label htmlFor="channel-name" className="text-xs font-bold text-muted-foreground uppercase tracking-wider">Channel Name</Label>
                                <div className="flex gap-2">
                                  <Input 
                                    id="channel-name"
                                    value={nameDraft}
                                    onChange={(e) => setNameDraft(e.target.value)}
                                    className="h-11 bg-muted/20 border-border" 
                                  />
                                  <Button 
                                    onClick={handleSaveName}
                                    disabled={updateChannelMutation.isPending || !nameDraft.trim() || nameDraft.trim() === channel?.name}
                                    className="h-11 px-6 rounded-xl font-bold"
                                  >
                                    Save
                                  </Button>
                                </div>
                              </div>
                            </div>
                          </div>
                        )}

                        {canDelete && (
                          <div className="border border-destructive/20 bg-destructive/5 rounded-xl p-6 flex flex-col md:flex-row items-start md:items-center justify-between gap-4">
                            <div className="space-y-1">
                              <h3 className="text-sm font-bold text-destructive flex items-center gap-2">
                                <ShieldAlert className="h-4 w-4" />
                                Danger Zone
                              </h3>
                              <p className="text-xs text-muted-foreground leading-relaxed">
                                Permanently delete this channel and all its data. This action cannot be undone.
                              </p>
                            </div>
                            <Button 
                              variant="destructive" 
                              className="rounded-lg text-xs font-bold px-6 shrink-0"
                              onClick={() => setConfirmDelete(true)}
                              disabled={deleteChannelMutation.isPending}
                            >
                              Delete Channel
                            </Button>
                          </div>
                        )}
                      </div>
                    )}
                  </>
                )}
              </div>
            </ScrollArea>
          </div>
        </DialogContent>
      </Dialog>

      <Dialog open={isAddMemberOpen} onOpenChange={setIsAddMemberOpen}>
        <DialogContent className="sm:max-w-md rounded-xl p-0 overflow-hidden border-border shadow-2xl">
          <div className="p-6 border-b border-border bg-muted/30">
            <DialogHeader>
              <DialogTitle className="text-lg font-bold">Add Member to Channel</DialogTitle>
              <DialogDescription className="text-xs font-medium text-muted-foreground mt-1">
                Select a member from the workspace to add to this channel.
              </DialogDescription>
            </DialogHeader>
          </div>
          
          <div className="p-6 space-y-6">
            <div className="space-y-4">
              <div className="space-y-2">
                <Label className="text-[10px] font-bold uppercase tracking-widest text-muted-foreground">Select Role</Label>
                <Select value={selectedAddRole} onValueChange={(value) => setSelectedAddRole(value as ChannelRole)}>
                  <SelectTrigger className="h-11 px-4 rounded-xl bg-background border-border shadow-sm focus:ring-2 focus:ring-primary/20 transition-all">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent className="rounded-xl border-border shadow-xl">
                    <SelectItem value={CHANNEL_ROLES.CONTRIBUTOR} className="rounded-lg">Contributor</SelectItem>
                    <SelectItem value={CHANNEL_ROLES.MANAGER} className="rounded-lg">Manager</SelectItem>
                    <SelectItem value={CHANNEL_ROLES.VIEWER} className="rounded-lg">Viewer</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              
              <div className="space-y-2">
                <Label className="text-[10px] font-bold uppercase tracking-widest text-muted-foreground">Search Workspace</Label>
                <div className="relative group">
                  <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground group-focus-within:text-primary transition-colors" />
                  <Input
                    value={candidateSearch}
                    onChange={(event) => setCandidateSearch(event.target.value)}
                    placeholder="Type name or email..."
                    className="h-11 pl-10 rounded-xl bg-background border-border"
                    autoFocus
                  />
                </div>
              </div>
            </div>

            <div className="space-y-2 max-h-[300px] overflow-y-auto pr-1">
              {candidateMembers.length > 0 ? (
                candidateMembers.map((member) => (
                  <div
                    key={member.id}
                    className="flex items-center justify-between rounded-xl border border-border/50 bg-muted/20 px-4 py-3 hover:bg-muted/40 transition-colors group"
                  >
                    <div className="flex items-center gap-3 min-w-0">
                      <Avatar className="h-8 w-8 border border-border/50 group-hover:border-primary/30 transition-colors">
                        <AvatarFallback className="bg-primary/5 text-[10px] font-bold text-primary uppercase">
                          {member.name?.charAt(0) || "U"}
                        </AvatarFallback>
                      </Avatar>
                      <div className="min-w-0">
                        <p className="truncate text-xs font-bold text-foreground">{member.name || "Unnamed Member"}</p>
                        <p className="truncate text-[10px] text-muted-foreground font-medium">{member.email}</p>
                      </div>
                    </div>
                    <Button
                      size="sm"
                      className="h-8 rounded-lg text-[10px] font-bold px-4 shadow-sm"
                      disabled={addMemberMutation.isPending}
                      onClick={() =>
                        addMemberMutation.mutate({
                          channelId,
                          data: { user_id: member.user_id, role: selectedAddRole },
                        }, {
                          onSuccess: () => {
                            toast.success("Member added to channel");
                            setIsAddMemberOpen(false);
                            setCandidateSearch("");
                          },
                          onError: (error) =>
                            handleApiError(error, {
                              accessDenied: () => toast.error("You do not have permission to add members"),
                              onOtherError: (message) => toast.error(message),
                            }),
                        })
                      }
                    >
                      {addMemberMutation.isPending ? <OrbitalLoader size="sm" variant="minimal" /> : "Add"}
                    </Button>
                  </div>
                ))
              ) : candidateSearch ? (
                <div className="py-12 text-center">
                  <Users className="h-8 w-8 text-muted-foreground/20 mx-auto mb-2" />
                  <p className="text-xs font-bold text-muted-foreground">No members found</p>
                  <p className="text-[10px] text-muted-foreground/60 mt-1">Try a different search term</p>
                </div>
              ) : (
                <div className="py-12 text-center">
                  <Search className="h-8 w-8 text-muted-foreground/20 mx-auto mb-2" />
                  <p className="text-xs font-bold text-muted-foreground">Search to add members</p>
                </div>
              )}
            </div>
          </div>
        </DialogContent>
      </Dialog>

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
                }, {
                  onSuccess: () => {
                    toast.success("Member removed from channel");
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
              {removeMemberMutation.isPending ? <OrbitalLoader size="sm" variant="minimal" /> : "Remove"}
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
              onClick={() => deleteChannelMutation.mutate(channelId, {
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
              })}
            >
              {deleteChannelMutation.isPending ? <OrbitalLoader size="sm" variant="minimal" /> : "Delete"}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </>
  );
}
function PermissionItem({ label, allowed }: { label: string; allowed?: boolean }) {
  return (
    <div className="flex items-center justify-between p-3 rounded-lg border border-border/50 bg-muted/10">
      <span className="text-[11px] font-medium text-foreground">{label}</span>
      {allowed ? (
        <span className="flex h-5 w-5 items-center justify-center rounded-full bg-emerald-500/10 text-emerald-500">
          <ShieldCheck className="h-3 w-3" />
        </span>
      ) : (
        <span className="flex h-5 w-5 items-center justify-center rounded-full bg-destructive/10 text-destructive">
          <ShieldAlert className="h-3 w-3" />
        </span>
      )}
    </div>
  );
}
