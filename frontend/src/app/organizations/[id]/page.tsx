// src/app/organizations/[id]/page.tsx
"use client";

import { useParams, useRouter } from "next/navigation";
import { useEffect, useState } from "react";
import { Building2, ArrowLeft, Loader2, Plus, Users, Settings, Crown, Shield, User } from "lucide-react";

import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
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
import { useAuthProfile } from "@/services/auth.service";
import { useOrgChannelsQuery } from "@/services/channel.service";
import { useOrganizations } from "@/hooks/useOrganizations";

export default function OrganizationDetailPage() {
  const params = useParams();
  const router = useRouter();
  const orgId = params.id as string;

  const { user, isLoading: isLoadingUser } = useAuthProfile({ enabled: true });
  const { organizations = [] } = useOrganizations();
  const { data: channelsData } = useOrgChannelsQuery(orgId);
  const channels = channelsData?.success ? channelsData.data : [];
  
  const [isInviteDialogOpen, setIsInviteDialogOpen] = useState(false);
  const [inviteEmail, setInviteEmail] = useState("");
  
  const organization = organizations.find(org => org.id === orgId);

  useEffect(() => {
    if (!isLoadingUser && !user) {
      router.push("/login");
    }
  }, [user, isLoadingUser, router]);

  if (isLoadingUser) {
    return (
      <div className="flex items-center justify-center min-h-screen bg-slate-50">
        <Loader2 className="h-8 w-8 animate-spin text-slate-400" />
      </div>
    );
  }

  const handleInviteMember = () => {
    // TODO: Implement invite member API call
    console.log("Inviting member:", inviteEmail);
    setIsInviteDialogOpen(false);
    setInviteEmail("");
  };

  const getRoleIcon = (role: string) => {
    switch (role) {
      case "OWNER":
        return <Crown className="h-4 w-4 text-amber-500" />;
      case "ADMIN":
        return <Shield className="h-4 w-4 text-indigo-500" />;
      default:
        return <User className="h-4 w-4 text-slate-400" />;
    }
  };

  const getRoleColor = (role: string) => {
    switch (role) {
      case "OWNER":
        return "text-amber-600 bg-amber-50";
      case "ADMIN":
        return "text-indigo-600 bg-indigo-50";
      default:
        return "text-slate-600 bg-slate-50";
    }
  };

  return (
    <div className="flex h-screen bg-slate-50 overflow-hidden font-sans text-slate-900">
      
      {/* Left Sidebar - Organizations, Channels, Direct Messages */}
      <aside className="w-72 border-r border-slate-200 bg-white shrink-0 hidden md:flex flex-col">
        {/* Logo */}
        <div className="h-16 flex items-center px-6 border-b border-slate-200">
          <div className="flex items-center gap-2 cursor-pointer" onClick={() => router.push('/dashboard')}>
            <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-indigo-600 shadow-sm shadow-indigo-200">
              <Building2 className="h-4 w-4 text-white" />
            </div>
            <span className="text-xl font-bold tracking-tight text-slate-900">OmniTask</span>
          </div>
        </div>

        {/* Organizations */}
        <div className="flex-1 overflow-y-auto py-4 px-4">
          <div className="space-y-4">
            {/* Organizations Section */}
            <div>
              <h3 className="px-2 text-xs font-semibold text-slate-500 uppercase tracking-wider mb-2">Organizations</h3>
              <div className="space-y-1">
                {organizations.map((org) => (
                  <button
                    key={org.id}
                    onClick={() => router.push(`/organizations/${org.id}`)}
                    className={`w-full flex items-center gap-2 px-3 py-2 rounded-lg transition-colors text-left ${org.id === orgId ? 'bg-indigo-50 text-indigo-700' : 'hover:bg-slate-100 text-slate-600'}`}
                  >
                    <Building2 className="h-4 w-4" />
                    <span className="text-sm truncate">{org.name}</span>
                  </button>
                ))}
              </div>
            </div>

            {/* Channels Section */}
            <div>
              <div className="flex items-center justify-between px-2 mb-2">
                <h3 className="text-xs font-semibold text-slate-500 uppercase tracking-wider">Channels</h3>
                <Button size="icon" variant="ghost" className="h-6 w-6 p-0">
                  <Plus className="h-3 w-3" />
                </Button>
              </div>
              <div className="space-y-1">
                {channels.map((channel) => (
                  <button
                    key={channel.id}
                    onClick={() => router.push(`/organizations/${orgId}/channels/${channel.id}`)}
                    className="w-full flex items-center gap-2 px-3 py-2 rounded-lg hover:bg-slate-100 transition-colors text-left text-slate-600"
                  >
                    <span className="h-4 w-4 text-slate-400">#</span>
                    <span className="text-sm truncate">{channel.name}</span>
                  </button>
                ))}
              </div>
            </div>

            {/* Direct Messages Section */}
            <div>
              <h3 className="px-2 text-xs font-semibold text-slate-500 uppercase tracking-wider mb-2">Direct Messages</h3>
              <div className="space-y-1">
                <Button variant="ghost" className="w-full justify-start text-slate-600 hover:bg-slate-100">
                  <Users className="mr-2 h-4 w-4 text-slate-400" />
                  <span className="text-sm">New Message</span>
                </Button>
              </div>
            </div>
          </div>
        </div>

        {/* User Profile */}
        <div className="p-4 border-t border-slate-200">
          <div className="flex items-center gap-3">
            <Avatar className="h-8 w-8">
              <AvatarFallback className="bg-indigo-100 text-indigo-700 font-semibold">
                {user?.name?.charAt(0).toUpperCase() || 'U'}
              </AvatarFallback>
            </Avatar>
            <div className="flex-1 min-w-0">
              <p className="text-sm font-medium text-slate-900 truncate">{user?.name || 'User'}</p>
              <p className="text-xs text-slate-500 truncate">{user?.email || ''}</p>
            </div>
            <Button variant="ghost" size="icon" className="h-8 w-8">
              <Settings className="h-4 w-4 text-slate-400" />
            </Button>
          </div>
        </div>
      </aside>

      {/* Center Area - Organization Settings */}
      <div className="flex-1 flex flex-col min-w-0">
        {/* Header */}
        <header className="h-16 shrink-0 border-b border-slate-200 bg-white/80 backdrop-blur-md flex items-center justify-between px-6">
          <div className="flex items-center gap-3">
            <div className="h-10 w-10 bg-indigo-100 rounded-lg flex items-center justify-center">
              <Building2 className="h-5 w-5 text-indigo-600" />
            </div>
            <div>
              <h2 className="font-semibold text-slate-900">{organization?.name || 'Organization'}</h2>
              <p className="text-xs text-slate-500">Settings & Members</p>
            </div>
          </div>
          <div className="flex items-center gap-2">
            <Button variant="outline" onClick={() => router.push('/dashboard')}>
              Back to Dashboard
            </Button>
          </div>
        </header>

        {/* Content */}
        <div className="flex-1 overflow-y-auto p-6 lg:p-10">
          <div className="max-w-4xl mx-auto space-y-8">
            
            {/* Organization Details Card */}
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <Settings className="h-5 w-5" />
                  Organization Details
                </CardTitle>
                <CardDescription>
                  Manage your organization information
                </CardDescription>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="space-y-2">
                  <Label htmlFor="orgName">Organization Name</Label>
                  <Input
                    id="orgName"
                    defaultValue={organization?.name || ''}
                    placeholder="Organization name"
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="orgDescription">Description</Label>
                  <Input
                    id="orgDescription"
                    placeholder="Brief description of your organization"
                  />
                </div>
                <Button className="mt-2">Save Changes</Button>
              </CardContent>
            </Card>

            {/* Members Card */}
            <Card>
              <CardHeader>
                <div className="flex items-center justify-between">
                  <div>
                    <CardTitle className="flex items-center gap-2">
                      <Users className="h-5 w-5" />
                      Members
                    </CardTitle>
                    <CardDescription>
                      Manage organization members and their roles
                    </CardDescription>
                  </div>
                  <Dialog open={isInviteDialogOpen} onOpenChange={setIsInviteDialogOpen}>
                    <DialogTrigger asChild>
                      <Button>
                        <Plus className="h-4 w-4 mr-2" />
                        Invite Member
                      </Button>
                    </DialogTrigger>
                    <DialogContent>
                      <DialogHeader>
                        <DialogTitle>Invite Member</DialogTitle>
                        <DialogDescription>
                          Enter the email address of the person you want to invite to this organization.
                        </DialogDescription>
                      </DialogHeader>
                      <div className="space-y-4 py-4">
                        <div className="space-y-2">
                          <Label htmlFor="email">Email address</Label>
                          <Input
                            id="email"
                            type="email"
                            placeholder="name@example.com"
                            value={inviteEmail}
                            onChange={(e) => setInviteEmail(e.target.value)}
                          />
                        </div>
                      </div>
                      <DialogFooter>
                        <Button variant="outline" onClick={() => setIsInviteDialogOpen(false)}>
                          Cancel
                        </Button>
                        <Button onClick={handleInviteMember}>
                          Send Invite
                        </Button>
                      </DialogFooter>
                    </DialogContent>
                  </Dialog>
                </div>
              </CardHeader>
              <CardContent>
                <div className="space-y-3">
                  {/* Owner */}
                  <div className="flex items-center justify-between p-3 rounded-lg bg-slate-50">
                    <div className="flex items-center gap-3">
                      <Avatar className="h-10 w-10">
                        <AvatarFallback className="bg-amber-100 text-amber-700 font-semibold">
                          {user?.name?.charAt(0).toUpperCase() || 'O'}
                        </AvatarFallback>
                      </Avatar>
                      <div>
                        <p className="text-sm font-medium text-slate-900">{user?.name || 'Owner'}</p>
                        <p className="text-xs text-slate-500">{user?.email || ''}</p>
                      </div>
                    </div>
                    <div className={`flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-semibold ${getRoleColor('OWNER')}`}>
                      {getRoleIcon('OWNER')}
                      <span>OWNER</span>
                    </div>
                  </div>

                  {/* Placeholder members */}
                  {[1, 2, 3].map((i) => (
                    <div key={i} className="flex items-center justify-between p-3 rounded-lg hover:bg-slate-50 transition-colors">
                      <div className="flex items-center gap-3">
                        <Avatar className="h-10 w-10">
                          <AvatarFallback className="bg-slate-100 text-slate-600">
                            U{i}
                          </AvatarFallback>
                        </Avatar>
                        <div>
                          <p className="text-sm font-medium text-slate-900">User {i}</p>
                          <p className="text-xs text-slate-500">user{i}@example.com</p>
                        </div>
                      </div>
                      <div className={`flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-semibold ${getRoleColor(i === 1 ? 'ADMIN' : 'MEMBER')}`}>
                        {getRoleIcon(i === 1 ? 'ADMIN' : 'MEMBER')}
                        <span>{i === 1 ? 'ADMIN' : 'MEMBER'}</span>
                      </div>
                    </div>
                  ))}
                </div>
              </CardContent>
            </Card>

            {/* Channels Overview Card */}
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <span className="h-5 w-5 text-slate-400">#</span>
                  Channels Overview
                </CardTitle>
                <CardDescription>
                  {channels.length} channel{channels.length !== 1 ? 's' : ''} in this organization
                </CardDescription>
              </CardHeader>
              <CardContent>
                {channels.length === 0 ? (
                  <div className="text-center py-8 text-slate-500">
                    <p className="text-sm">No channels yet</p>
                    <p className="text-xs mt-1">Create your first channel to start collaborating</p>
                  </div>
                ) : (
                  <div className="space-y-2">
                    {channels.map((channel) => (
                      <button
                        key={channel.id}
                        onClick={() => router.push(`/organizations/${orgId}/channels/${channel.id}`)}
                        className="w-full flex items-center gap-3 p-3 rounded-lg hover:bg-slate-50 transition-colors text-left"
                      >
                        <span className="h-5 w-5 text-slate-400">#</span>
                        <span className="text-sm font-medium text-slate-900">{channel.name}</span>
                        <span className="ml-auto text-xs text-slate-500">
                          Created {new Date(channel.created_at).toLocaleDateString()}
                        </span>
                      </button>
                    ))}
                  </div>
                )}
              </CardContent>
            </Card>

          </div>
        </div>
      </div>
    </div>
  );
}
