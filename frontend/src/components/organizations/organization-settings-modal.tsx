"use client";

import React, { useState } from 'react';
import { 
  Users, 
  UserPlus, 
  Shield, 
  Mail, 
  Search, 
  Trash2, 
  LayoutDashboard,
  ShieldAlert,
  Loader2,
  Plus,
  ChevronDown,
  Hash,
  Pencil,
  AlertTriangle
} from 'lucide-react';
import { useUIStore } from '@/store/ui.store';
import { 
  useOrganization, 
  useOrganizationMembers, 
  useUpdateOrganizationMemberRole, 
  useRemoveOrganizationMember,
  useDeleteOrganization
} from '@/api/organizations';
import { useParams, useRouter } from 'next/navigation';
import { 
  Dialog, 
  DialogContent, 
  DialogDescription,
  DialogHeader, 
  DialogTitle,
  DialogFooter
} from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Avatar, AvatarFallback } from '@/components/ui/avatar';
import { toast } from 'sonner';
import { ORG_ROLES } from '@/types/roles';
import { handleApiError } from '@/api/api-errors';
import { 
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger
} from '@/components/ui/dropdown-menu';
import { cn } from '@/lib/utils';
import { useQueryClient } from '@tanstack/react-query';
import { useAuthProfile } from '@/api/auth';
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
import { 
  useOrgChannels,
  useDeleteChannel,
  useUpdateChannel,
  channelKeys,
  type Channel
} from '@/api/channels';

import { useIsMounted } from '@/hooks/useIsMounted';
import { AbilityContext } from '@/lib/casl';
import { InviteMemberDialog } from '@/components/organizations/invite-member-dialog';
import { CreateChannelDialog } from '@/components/organizations/create-channel-dialog';

type Tab = 'overview' | 'members' | 'invites' | 'roles' | 'channels';

export default function OrganizationSettingsModal() {
  const isMounted = useIsMounted();
  const queryClient = useQueryClient();
  const { isOrgSettingsOpen, closeOrgSettings } = useUIStore();
  const ability = React.useContext(AbilityContext);
  const params = useParams();
  const router = useRouter();
  const orgId = params.id as string;
  const { user } = useAuthProfile();
  
  const [activeTab, setActiveTab] = useState<Tab>('members');
  const [memberSearch, setMemberSearch] = useState("");
  const [channelSearch, setChannelSearch] = useState("");
  const [page, setPage] = useState(1);
  const [limit] = useState(10);
  const [channelPage, setChannelPage] = useState(1);
  const [channelToEdit, setChannelToEdit] = useState<Channel | null>(null);
  const [channelToDelete, setChannelToDelete] = useState<Channel | null>(null);
  const [isUpdateChannelOpen, setIsUpdateChannelOpen] = useState(false);
  const [editChannelName, setEditChannelName] = useState("");

  const { organization } = useOrganization(orgId, {
    enabled: isOrgSettingsOpen && !!orgId
  });

  const { 
    members = [], 
    pagination,
    isLoading: isLoadingMembers 
  } = useOrganizationMembers(orgId, {
    search: memberSearch,
    page,
    limit
  }, {
    enabled: isOrgSettingsOpen && !!orgId && activeTab === 'members'
  });

  const {
    channels = [],
    pagination: channelPagination,
    isLoading: isLoadingChannels
  } = useOrgChannels(orgId, {
    search: channelSearch,
    page: channelPage,
    limit
  }, {
    enabled: isOrgSettingsOpen && !!orgId && activeTab === 'channels'
  });

  const updateRoleMutation = useUpdateOrganizationMemberRole();
  const removeMemberMutation = useRemoveOrganizationMember();
  const deleteOrgMutation = useDeleteOrganization();
  const deleteChannelMutation = useDeleteChannel();
  const updateChannelMutation = useUpdateChannel();

  const canInviteMembers = ability.can('invite', 'Member');
  const canDeleteOrganization = ability.can('delete', 'Organization');
  const canChangeRoles = ability.can('manage', 'Member') || ability.can('update', 'Member');
  const canManageChannels = ability.can('manage', 'Channel');
  const canCreateChannels = ability.can('create', 'Channel');
  const canUpdateChannels = ability.can('update', 'Channel');
  const canDeleteChannels = ability.can('delete', 'Channel');
  const canRemoveMembers = ability.can('remove', 'Member');

  const handleRemoveMember = (userId: string, name: string) => {
    if (confirm(`Are you sure you want to remove ${name} from the workspace?`)) {
      removeMemberMutation.mutate({ orgId, userId }, {
        onSuccess: () => toast.success("Member removed successfully"),
        onError: () => toast.error("Failed to remove member")
      });
    }
  };

  const handleUpdateChannel = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!channelToEdit || !editChannelName.trim()) return;

    updateChannelMutation.mutate({ 
      channelId: channelToEdit.id, 
      data: { name: editChannelName.trim() } 
    }, {
      onSuccess: () => {
        toast.success("Channel updated successfully");
        setIsUpdateChannelOpen(false);
        setChannelToEdit(null);
      },
      onError: (err) => handleApiError(err, undefined, "Failed to update channel")
    });
  };

  const openEditChannel = (channel: Channel) => {
    setChannelToEdit(channel);
    setEditChannelName(channel.name);
    setIsUpdateChannelOpen(true);
  };

  const handleDeleteChannel = async () => {
    if (!channelToDelete) return;
    deleteChannelMutation.mutate(channelToDelete.id, {
      onSuccess: async () => {
        toast.success(`Channel #${channelToDelete.name} deleted successfully`);
        // Force invalidate both the general channels key and the specific org list key
        await queryClient.invalidateQueries({ queryKey: channelKeys.all });
        await queryClient.invalidateQueries({ queryKey: ['channels', 'list', 'org', orgId] });
        setChannelToDelete(null);
      },
      onError: (err) => handleApiError(err, undefined, "Failed to delete channel")
    });
  };

  const handleDeleteWorkspace = () => {
    if (confirm("THIS IS PERMANENT. Are you absolutely sure you want to delete this workspace and ALL its data?")) {
      deleteOrgMutation.mutate(orgId, {
        onSuccess: () => {
          toast.success("Workspace deleted");
          closeOrgSettings();
          router.push("/dashboard");
        },
        onError: () => toast.error("Failed to delete workspace")
      });
    }
  };

  if (!orgId) return null;

  return (
    <>
    <Dialog open={isOrgSettingsOpen} onOpenChange={(open) => !open && closeOrgSettings()}>
      <DialogContent className="max-w-6xl p-0 gap-0 overflow-hidden bg-background border-border shadow-2xl rounded-xl w-[95vw] h-[85vh] md:h-[700px] flex flex-col md:flex-row">
        <DialogTitle className="sr-only">Organization Settings</DialogTitle>
        <DialogDescription className="sr-only">
          Manage your organization members, roles, and general settings.
        </DialogDescription>
        
        {/* Left Sidebar Navigation */}
        <div className="w-full md:w-[260px] bg-muted/30 border-r border-border flex flex-col shrink-0">
          <div className="px-6 h-[72px] border-b border-border flex items-center">
            <div className="flex items-center gap-3 w-full">
              <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl border border-primary/20 bg-primary/10 text-primary font-bold text-lg">
                {organization?.name?.charAt(0).toUpperCase() || "W"}
              </div>
              <h2 className="text-base font-bold tracking-tight text-foreground truncate">
                {organization?.name || "Workspace"}
              </h2>
            </div>
          </div>
          
          <nav className="flex-1 py-4 flex flex-row md:flex-col gap-1 overflow-x-auto md:overflow-x-visible px-2 md:px-0 pr-12">
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
            {canManageChannels && (
              <button 
                onClick={() => setActiveTab('channels')}
                className={cn(
                  "px-4 py-2.5 mx-1 md:mx-2 rounded-lg text-sm font-medium transition-all flex items-center gap-3 whitespace-nowrap",
                  activeTab === 'channels' ? "bg-primary text-primary-foreground shadow-md" : "text-muted-foreground hover:bg-muted hover:text-foreground"
                )}
              >
                <Hash className="h-4 w-4" />
                Channels
              </button>
            )}
            <button 
              onClick={() => setActiveTab('invites')}
              className={cn(
                "px-4 py-2.5 mx-1 md:mx-2 rounded-lg text-sm font-medium transition-all flex items-center gap-3 whitespace-nowrap",
                activeTab === 'invites' ? "bg-primary text-primary-foreground shadow-md" : "text-muted-foreground hover:bg-muted hover:text-foreground"
              )}
            >
              <Mail className="h-4 w-4" />
              Invites
            </button>
            <button 
              onClick={() => setActiveTab('roles')}
              className={cn(
                "px-4 py-2.5 mx-1 md:mx-2 rounded-lg text-sm font-medium transition-all flex items-center gap-3 whitespace-nowrap",
                activeTab === 'roles' ? "bg-primary text-primary-foreground shadow-md" : "text-muted-foreground hover:bg-muted hover:text-foreground"
              )}
            >
              <Shield className="h-4 w-4" />
              Roles
            </button>
          </nav>
        </div>

        {/* Right Content Area */}
        <div className="flex-1 flex flex-col h-full bg-background overflow-hidden">
          {/* Header */}
          <div className="px-6 pr-12 h-[72px] border-b border-border flex items-center justify-between shrink-0">
            <h1 className="text-lg font-bold tracking-tight text-foreground">
              {activeTab === 'members' && "Manage Members"}
              {activeTab === 'channels' && "Manage Channels"}
              {activeTab === 'overview' && "Workspace Overview"}
              {activeTab === 'invites' && "Pending Invitations"}
              {activeTab === 'roles' && "Roles & Permissions"}
            </h1>
            {activeTab === 'members' && canInviteMembers && (
              <InviteMemberDialog
                orgId={orgId}
                trigger={
                  <Button className="h-11 gap-2 rounded-xl px-6 text-sm font-semibold shadow-md transition-all hover:-translate-y-px hover:shadow-lg active:translate-y-px shadow-primary/20">
                    <UserPlus className="h-4 w-4" />
                    Invite
                  </Button>
                }
              />
            )}
            {activeTab === 'channels' && canCreateChannels && (
              <CreateChannelDialog
                orgId={orgId}
                trigger={
                  <Button className="h-11 gap-2 rounded-xl px-6 text-sm font-semibold shadow-md transition-all hover:-translate-y-px hover:shadow-lg active:translate-y-px shadow-primary/20">
                    <Plus className="h-4 w-4" />
                    New Channel
                  </Button>
                }
              />
            )}
          </div>

          {/* Main Content Scroll Area */}
          <div className="flex-1 overflow-y-auto p-6 custom-scrollbar">
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
                      onChange={(e) => setMemberSearch(e.target.value)}
                    />
                  </div>
                </div>

                {/* Member List Table */}
                <div className="border border-border rounded-xl overflow-hidden bg-card/30">
                  <Table>
                    <TableHeader className="bg-muted/50">
                      <TableRow className="hover:bg-transparent border-border">
                        <TableHead className="text-[10px] font-bold uppercase tracking-widest text-muted-foreground h-10">User</TableHead>
                        <TableHead className="text-[10px] font-bold uppercase tracking-widest text-muted-foreground h-10">Role</TableHead>
                        <TableHead className="text-[10px] font-bold uppercase tracking-widest text-muted-foreground h-10">Joined</TableHead>
                        <TableHead className="w-12 h-10"></TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {isLoadingMembers ? (
                        <TableRow>
                          <TableCell colSpan={4} className="h-32 text-center">
                            <div className="flex justify-center">
                              <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
                            </div>
                          </TableCell>
                        </TableRow>
                      ) : members.length === 0 ? (
                        <TableRow>
                          <TableCell colSpan={4} className="h-32 text-center text-sm text-muted-foreground">
                            No members found.
                          </TableCell>
                        </TableRow>
                      ) : (
                        members.map((member) => (
                          <TableRow key={member.id} className="border-border/50 hover:bg-muted/20 transition-colors group">
                            <TableCell>
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
                              {canChangeRoles && member.role !== 'OWNER' && member.user_id !== user?.id ? (
                                <DropdownMenu>
                                  <DropdownMenuTrigger asChild>
                                    <button className={cn(
                                      "inline-flex items-center gap-1.5 h-7 px-3 rounded-full text-[10px] font-bold uppercase tracking-wider transition-all hover:ring-2 hover:ring-offset-2 hover:ring-offset-background",
                                      member.role === 'ADMIN' && "bg-blue-500/10 text-blue-500 hover:bg-blue-500/20 hover:ring-blue-500/30",
                                      member.role === 'MEMBER' && "bg-emerald-500/10 text-emerald-500 hover:bg-emerald-500/20 hover:ring-emerald-500/30",
                                      member.role === 'GUEST' && "bg-muted text-muted-foreground hover:bg-muted/80 hover:ring-muted/30"
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
                                      className="flex flex-col items-start gap-0.5 rounded-lg p-2 cursor-pointer focus:bg-blue-500/10"
                                      onClick={() => updateRoleMutation.mutate({ orgId, userId: member.user_id, data: { role: ORG_ROLES.ADMIN } })}
                                    >
                                      <div className="flex items-center gap-2">
                                        <Shield className="h-3.5 w-3.5 text-blue-500" />
                                        <span className="text-sm font-bold text-foreground">Admin</span>
                                      </div>
                                      <p className="text-[10px] text-muted-foreground leading-relaxed">Full access to manage members, channels and settings.</p>
                                    </DropdownMenuItem>
                                    <DropdownMenuItem 
                                      className="flex flex-col items-start gap-0.5 rounded-lg p-2 cursor-pointer focus:bg-emerald-500/10 mt-1"
                                      onClick={() => updateRoleMutation.mutate({ orgId, userId: member.user_id, data: { role: ORG_ROLES.MEMBER } })}
                                    >
                                      <div className="flex items-center gap-2">
                                        <Users className="h-3.5 w-3.5 text-emerald-500" />
                                        <span className="text-sm font-bold text-foreground">Member</span>
                                      </div>
                                      <p className="text-[10px] text-muted-foreground leading-relaxed">Standard access to workspace channels and tools.</p>
                                    </DropdownMenuItem>
                                    <DropdownMenuItem 
                                      className="flex flex-col items-start gap-0.5 rounded-lg p-2 cursor-pointer focus:bg-muted mt-1"
                                      onClick={() => updateRoleMutation.mutate({ orgId, userId: member.user_id, data: { role: ORG_ROLES.GUEST } })}
                                    >
                                      <div className="flex items-center gap-2">
                                        <Mail className="h-3.5 w-3.5 text-muted-foreground" />
                                        <span className="text-sm font-bold text-foreground">Guest</span>
                                      </div>
                                      <p className="text-[10px] text-muted-foreground leading-relaxed">Limited access to specific channels and projects.</p>
                                    </DropdownMenuItem>
                                  </DropdownMenuContent>
                                </DropdownMenu>
                              ) : (
                                <div className={cn(
                                  "inline-flex items-center gap-1.5 h-7 px-3 rounded-full text-[10px] font-bold uppercase tracking-wider",
                                  member.role === 'OWNER' && "bg-amber-500/10 text-amber-500 border border-amber-500/20",
                                  member.role === 'ADMIN' && "bg-blue-500/10 text-blue-500",
                                  member.role === 'MEMBER' && "bg-emerald-500/10 text-emerald-500",
                                  member.role === 'GUEST' && "bg-muted text-muted-foreground"
                                )}>
                                  {member.role === 'OWNER' && <ShieldAlert className="h-3 w-3" />}
                                  {member.role}
                                </div>
                              )}
                            </TableCell>

                            <TableCell className="text-[11px] text-muted-foreground">
                              {isMounted && member.joined_at ? new Date(member.joined_at).toLocaleDateString() : '-'}
                            </TableCell>

                            <TableCell>
                              {canRemoveMembers && member.role !== 'OWNER' && member.user_id !== user?.id && (
                                <Button 
                                  variant="ghost" 
                                  size="icon" 
                                  className="h-8 w-8 text-muted-foreground hover:text-destructive opacity-0 group-hover:opacity-100 transition-all"
                                  onClick={() => handleRemoveMember(member.user_id, member.name || "member")}
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

            {activeTab === 'channels' && canManageChannels && (
              <div className="flex-1 flex flex-col min-h-0 space-y-6">
                {/* Search Header */}
                <div className="flex items-center gap-4 shrink-0 px-0.5 pt-0.5">
                  <div className="relative flex-1 group">
                    <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground group-focus-within:text-primary transition-colors" />
                    <Input 
                      placeholder="Search channels..." 
                      className="h-11 pl-10 bg-muted/20 border-border rounded-xl focus:bg-background transition-all focus-visible:ring-offset-0"
                      value={channelSearch}
                      onChange={(e) => {
                        setChannelSearch(e.target.value);
                        setChannelPage(1);
                      }}
                    />
                  </div>
                </div>

                {/* Channel List Table */}
                <div className="border border-border rounded-xl overflow-hidden bg-card/30 flex flex-col min-h-0">
                  <div className="overflow-auto flex-1">
                    <Table>
                      <TableHeader className="bg-muted/50 sticky top-0 z-10">
                        <TableRow className="hover:bg-transparent border-border">
                          <TableHead className="text-[10px] font-bold uppercase tracking-widest text-muted-foreground h-10">Name</TableHead>
                          <TableHead className="text-[10px] font-bold uppercase tracking-widest text-muted-foreground h-10 text-center">Members</TableHead>
                          <TableHead className="w-12 h-10"></TableHead>
                        </TableRow>
                      </TableHeader>
                      <TableBody>
                        {isLoadingChannels ? (
                          <TableRow>
                            <TableCell colSpan={3} className="h-32 text-center">
                              <div className="flex justify-center">
                                <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
                              </div>
                            </TableCell>
                          </TableRow>
                        ) : channels.length === 0 ? (
                          <TableRow>
                            <TableCell colSpan={3} className="h-32 text-center text-sm text-muted-foreground">
                              No channels found matching your search.
                            </TableCell>
                          </TableRow>
                        ) : (
                          channels.map((channel) => (
                            <TableRow key={channel.id} className="border-border/50 hover:bg-muted/20 transition-colors group">
                              <TableCell>
                                <div className="flex items-center gap-3">
                                  <div className="h-8 w-8 rounded-lg bg-primary/10 flex items-center justify-center text-primary border border-primary/20 shrink-0">
                                    <Hash className="h-4 w-4" />
                                  </div>
                                  <div className="min-w-0">
                                    <p className="text-sm font-bold flex items-center gap-2 truncate">
                                      {channel.name}
                                      {channel.isDefault && (
                                        <span className="text-[9px] px-1.5 py-0.5 rounded bg-muted text-muted-foreground font-bold border border-border shrink-0">DEFAULT</span>
                                      )}
                                    </p>
                                    <p className="text-[10px] text-muted-foreground">Created {isMounted ? new Date(channel.created_at).toLocaleDateString() : '...'}</p>
                                  </div>
                                </div>
                              </TableCell>

                              <TableCell className="text-center">
                                <div className="inline-flex items-center gap-1.5 px-2 py-1 rounded-md bg-muted/50 text-[11px] font-medium text-muted-foreground">
                                  <Users className="h-3 w-3" />
                                  {channel.stats?.memberCount || 0}
                                </div>
                              </TableCell>

                              <TableCell>
                                <div className="flex items-center justify-end gap-1">
                                  {!channel.isDefault && (
                                    <>
                                      {canUpdateChannels && (
                                        <Button 
                                          variant="ghost" 
                                          size="icon" 
                                          className="h-8 w-8 text-muted-foreground hover:text-primary opacity-0 group-hover:opacity-100 transition-all"
                                          onClick={() => openEditChannel(channel)}
                                        >
                                          <Pencil className="h-3.5 w-3.5" />
                                        </Button>
                                      )}
                                      {canDeleteChannels && (
                                        <Button 
                                          variant="ghost" 
                                          size="icon" 
                                          className="h-8 w-8 text-muted-foreground hover:text-destructive opacity-0 group-hover:opacity-100 transition-all"
                                          onClick={() => setChannelToDelete(channel)}
                                        >
                                          <Trash2 className="h-4 w-4" />
                                        </Button>
                                      )}
                                    </>
                                  )}
                                </div>
                              </TableCell>
                            </TableRow>
                          ))
                        )}
                      </TableBody>
                    </Table>
                  </div>

                  {/* Pagination */}
                  {channelPagination && channelPagination.totalPages > 1 && (
                    <div className="flex items-center justify-between px-4 py-4 border-t border-border bg-muted/20 shrink-0">
                      <p className="text-[11px] text-muted-foreground">
                        Showing <span className="font-medium">{(channelPage - 1) * limit + 1}</span> to <span className="font-medium">{Math.min(channelPage * limit, channelPagination.total)}</span> of <span className="font-medium">{channelPagination.total}</span>
                      </p>
                      <Pagination className="w-auto mx-0">
                        <PaginationContent>
                          <PaginationItem>
                            <PaginationPrevious 
                              href="#" 
                              onClick={(e) => { e.preventDefault(); if (channelPage > 1) setChannelPage(channelPage - 1); }}
                              className={cn("cursor-pointer h-7 px-2 rounded-lg text-[11px]", channelPage === 1 && "pointer-events-none opacity-50")}
                            />
                          </PaginationItem>
                          
                          <PaginationItem>
                            <span className="text-[11px] font-medium px-2">Page {channelPage} of {channelPagination.totalPages}</span>
                          </PaginationItem>

                          <PaginationItem>
                            <PaginationNext 
                              href="#" 
                              onClick={(e) => { e.preventDefault(); if (channelPage < channelPagination.totalPages) setChannelPage(channelPage + 1); }}
                              className={cn("cursor-pointer h-7 px-2 rounded-lg text-[11px]", channelPage === channelPagination.totalPages && "pointer-events-none opacity-50")}
                            />
                          </PaginationItem>
                        </PaginationContent>
                      </Pagination>
                    </div>
                  )}
                </div>
              </div>
            )}

            {activeTab === 'overview' && (
              <div className="space-y-8">
                <div className="p-6 border border-border rounded-xl bg-card/30">
                  <h3 className="text-sm font-bold mb-4">Workspace Details</h3>
                  <div className="space-y-4">
                    <div className="space-y-1">
                      <p className="text-[10px] font-bold uppercase tracking-widest text-muted-foreground">Name</p>
                      <p className="text-lg font-bold">{organization?.name}</p>
                    </div>
                    <div className="grid grid-cols-2 gap-4">
                      <div className="p-4 border border-border rounded-lg bg-muted/20">
                        <p className="text-[10px] font-bold uppercase tracking-widest text-muted-foreground">Total Members</p>
                        <p className="text-2xl font-bold mt-1">{organization?.stats?.memberCount || 0}</p>
                      </div>
                      <div className="p-4 border border-border rounded-lg bg-muted/20">
                        <p className="text-[10px] font-bold uppercase tracking-widest text-muted-foreground">Total Channels</p>
                        <p className="text-2xl font-bold mt-1">{organization?.stats?.channelCount || 0}</p>
                      </div>
                    </div>
                  </div>
                </div>

                {canDeleteOrganization && (
                  <div className="border border-destructive/20 bg-destructive/5 rounded-xl p-6 flex flex-col md:flex-row items-start md:items-center justify-between gap-4">
                    <div className="space-y-1">
                      <h3 className="text-sm font-bold text-destructive flex items-center gap-2">
                        <ShieldAlert className="h-4 w-4" />
                        Danger Zone
                      </h3>
                      <p className="text-xs text-muted-foreground leading-relaxed">
                        Permanently delete this workspace, including all channels, messages, and files. This action cannot be undone.
                      </p>
                    </div>
                    <Button 
                      variant="destructive" 
                      className="rounded-lg text-xs font-bold px-6 shrink-0"
                      onClick={handleDeleteWorkspace}
                      disabled={deleteOrgMutation.isPending}
                    >
                      {deleteOrgMutation.isPending ? <Loader2 className="h-3 w-3 animate-spin mr-2" /> : "Delete Workspace"}
                    </Button>
                  </div>
                )}
              </div>
            )}

            {activeTab === 'invites' && (
              <div className="flex flex-col items-center justify-center py-12 text-center space-y-4">
                <div className="h-16 w-16 rounded-full bg-muted/50 flex items-center justify-center">
                  <Mail className="h-8 w-8 text-muted-foreground" />
                </div>
                <div>
                  <h3 className="text-lg font-bold">Manage Invitations</h3>
                  <p className="text-sm text-muted-foreground max-w-[300px] mt-2">
                    Invite new team members or manage pending workspace requests.
                  </p>
                </div>
                <Button className="rounded-xl px-8 gap-2">
                  <Plus className="h-4 w-4" />
                  Invite via Email
                </Button>
              </div>
            )}

            {activeTab === 'roles' && (
              <div className="space-y-6">
                <div className="p-6 border border-border rounded-xl bg-card/30">
                  <h3 className="text-sm font-bold mb-4">Workspace Roles</h3>
                  <div className="space-y-4">
                    <div className="flex items-start gap-4 p-4 border border-border rounded-lg">
                      <div className="h-8 w-8 rounded bg-amber-500/10 flex items-center justify-center shrink-0">
                        <Crown className="h-4 w-4 text-amber-600" />
                      </div>
                      <div>
                        <p className="text-sm font-bold">Owner</p>
                        <p className="text-xs text-muted-foreground mt-1">Full control over the workspace, billing, and all settings.</p>
                      </div>
                    </div>
                    <div className="flex items-start gap-4 p-4 border border-border rounded-lg">
                      <div className="h-8 w-8 rounded bg-primary/10 flex items-center justify-center shrink-0">
                        <ShieldCheck className="h-4 w-4 text-primary" />
                      </div>
                      <div>
                        <p className="text-sm font-bold">Admin</p>
                        <p className="text-xs text-muted-foreground mt-1">Can manage members, channels, and most workspace settings.</p>
                      </div>
                    </div>
                    <div className="flex items-start gap-4 p-4 border border-border rounded-lg">
                      <div className="h-8 w-8 rounded bg-muted flex items-center justify-center shrink-0">
                        <Users className="h-4 w-4 text-muted-foreground" />
                      </div>
                      <div>
                        <p className="text-sm font-bold">Member</p>
                        <p className="text-xs text-muted-foreground mt-1">Standard team member with access to channels and messaging.</p>
                      </div>
                    </div>
                  </div>
                </div>
              </div>
            )}
          </div>
        </div>
      </DialogContent>
      </Dialog>

      {/* Edit Channel Dialog */}
      <Dialog open={isUpdateChannelOpen} onOpenChange={setIsUpdateChannelOpen}>
        <DialogContent className="sm:max-w-md bg-card border-border rounded-xl">
          <DialogHeader>
            <DialogTitle className="text-xl font-semibold text-foreground flex items-center gap-2">
              <Pencil className="h-5 w-5 text-primary" />
              Edit Channel
            </DialogTitle>
            <DialogDescription className="text-muted-foreground">
              Update the channel name.
            </DialogDescription>
          </DialogHeader>
          <form onSubmit={handleUpdateChannel} className="space-y-4 mt-4">
            <div className="space-y-2">
              <Label htmlFor="edit-channel-name" className="text-foreground">Channel Name</Label>
              <Input
                id="edit-channel-name"
                placeholder="e.g. general"
                value={editChannelName}
                onChange={(e) => setEditChannelName(e.target.value)}
                disabled={updateChannelMutation.isPending}
                className="h-11 bg-background border-border"
              />
            </div>
            <DialogFooter className="mt-6 gap-2">
              <Button type="button" variant="ghost" onClick={() => setIsUpdateChannelOpen(false)} className="rounded-lg">
                Cancel
              </Button>
              <Button type="submit" disabled={updateChannelMutation.isPending} className="rounded-lg">
                {updateChannelMutation.isPending && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                Save Changes
              </Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>

      {/* Delete Channel Confirmation Dialog */}
      <Dialog open={!!channelToDelete} onOpenChange={(open) => !open && setChannelToDelete(null)}>
        <DialogContent className="sm:max-w-md bg-card border-border rounded-xl">
          <DialogHeader>
            <DialogTitle className="text-xl font-semibold text-destructive flex items-center gap-2">
              <AlertTriangle className="h-5 w-5" />
              Delete Channel
            </DialogTitle>
            <DialogDescription className="text-muted-foreground">
              This action cannot be undone. This will permanently delete the 
              <span className="font-bold text-foreground mx-1">#{channelToDelete?.name}</span> 
              channel and all its messages.
            </DialogDescription>
          </DialogHeader>
          <DialogFooter className="mt-6 gap-2">
            <Button type="button" variant="ghost" onClick={() => setChannelToDelete(null)} className="rounded-lg">
              Cancel
            </Button>
            <Button 
              variant="destructive" 
              onClick={handleDeleteChannel} 
              disabled={deleteChannelMutation.isPending}
              className="rounded-lg"
            >
              {deleteChannelMutation.isPending && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
              Delete Permanently
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </>
  );
}

function Crown({ className }: { className?: string }) {
  return (
    <svg 
      xmlns="http://www.w3.org/2000/svg" 
      width="24" 
      height="24" 
      viewBox="0 0 24 24" 
      fill="none" 
      stroke="currentColor" 
      strokeWidth="2" 
      strokeLinecap="round" 
      strokeLinejoin="round" 
      className={className}
    >
      <path d="m2 4 3 12h14l3-12-6 7-4-7-4 7-6-7zm3 16h14" />
    </svg>
  );
}

function ShieldCheck({ className }: { className?: string }) {
  return (
    <svg 
      xmlns="http://www.w3.org/2000/svg" 
      width="24" 
      height="24" 
      viewBox="0 0 24 24" 
      fill="none" 
      stroke="currentColor" 
      strokeWidth="2" 
      strokeLinecap="round" 
      strokeLinejoin="round" 
      className={className}
    >
      <path d="M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10" />
      <path d="m9 12 2 2 4-4" />
    </svg>
  );
}
