// src/app/organizations/[id]/channels/[channelId]/page.tsx
"use client";

import { useParams, useRouter } from "next/navigation";
import { useEffect, useState } from "react";
import { Building2, Loader2, Send, Plus, Hash, Users, Settings, MoreVertical, Search, Bell } from "lucide-react";

import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { useAuthProfile } from "@/services/auth.service";
import { useMessages, useCreateMessage } from "@/hooks/useMessages";
import { useOrgChannelsQuery } from "@/services/channel.service";
import { useOrganizations } from "@/hooks/useOrganizations";
import { getSocket } from "@/lib/socket";
import type { Message } from "@/services/message.service";

export default function ChannelDetailPage() {
  const params = useParams();
  const router = useRouter();
  const orgId = params.id as string;
  const channelId = params.channelId as string;

  const { user, isLoading: isLoadingUser } = useAuthProfile({ enabled: true });
  const { messages, channelName, isLoading: isLoadingMessages } = useMessages(channelId);
  const { organizations = [] } = useOrganizations();
  const { data: channelsData } = useOrgChannelsQuery(orgId);
  const channels = channelsData?.success ? channelsData.data : [];
  const [newMessage, setNewMessage] = useState("");
  const [socketMessages, setSocketMessages] = useState<Message[]>([]);
  const createMessage = useCreateMessage(channelId, {
    onSuccess: () => {
      setNewMessage("");
    },
    onError: (error) => {
      console.error('Failed to send message:', error);
    },
  });

  useEffect(() => {
    if (!isLoadingUser && !user) {
      router.push("/login");
    }
  }, [user, isLoadingUser, router]);

  // Socket connection for real-time messages
  useEffect(() => {
    const socket = getSocket();
    
    socket.on(`channel:${channelId}:message_created`, (data: Message) => {
      setSocketMessages((prev) => [...prev, data]);
    });

    return () => {
      socket.off(`channel:${channelId}:message_created`);
    };
  }, [channelId]);

  // Combine API messages with socket messages and deduplicate by ID
  const allMessages = [...messages, ...socketMessages].reduce((acc, message) => {
    const exists = acc.find(m => m.id === message.id);
    if (!exists) {
      acc.push(message);
    }
    return acc;
  }, [] as Message[]);

  const handleSendMessage = () => {
    if (!newMessage.trim()) return;
    createMessage.mutate({ content: newMessage });
  };

  if (isLoadingUser || isLoadingMessages) {
    return (
      <div className="flex items-center justify-center min-h-screen bg-background">
        <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
      </div>
    );
  }

  return (
    <div className="flex h-screen bg-background overflow-hidden font-sans text-foreground">
      
      {/* Left Sidebar - Organizations, Channels, Direct Messages */}
      <aside className="w-72 border-r border-border bg-background shrink-0 hidden md:flex flex-col">
        {/* Logo */}
        <div className="h-16 flex items-center px-6 border-b border-border">
          <div className="flex items-center gap-2 cursor-pointer" onClick={() => router.push('/dashboard')}>
            <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-primary shadow-sm shadow-primary/20">
              <Building2 className="h-4 w-4 text-white" />
            </div>
            <span className="text-xl font-bold tracking-tight text-foreground">OmniTask</span>
          </div>
        </div>

        {/* Organizations */}
        <div className="flex-1 overflow-y-auto py-4 px-4">
          <div className="space-y-4">
            {/* Organizations Section */}
            <div>
              <h3 className="px-2 text-xs font-semibold text-muted-foreground uppercase tracking-wider mb-2">Organizations</h3>
              <div className="space-y-1">
                {organizations.map((org) => (
                  <button
                    key={org.id}
                    onClick={() => router.push(`/organizations/${org.id}`)}
                    className={`w-full flex items-center gap-2 px-3 py-2 rounded-lg transition-colors text-left ${org.id === orgId ? 'bg-primary/10 text-primary' : 'hover:bg-muted text-foreground'}`}
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
                <h3 className="text-xs font-semibold text-muted-foreground uppercase tracking-wider">Channels</h3>
                <Button size="icon" variant="ghost" className="h-6 w-6 p-0">
                  <Plus className="h-3 w-3" />
                </Button>
              </div>
              <div className="space-y-1">
                {channels.map((channel) => (
                  <button
                    key={channel.id}
                    onClick={() => router.push(`/organizations/${orgId}/channels/${channel.id}`)}
                    className={`w-full flex items-center gap-2 px-3 py-2 rounded-lg transition-colors text-left ${channel.id === channelId ? 'bg-primary/10 text-primary' : 'hover:bg-muted text-foreground'}`}
                  >
                    <Hash className="h-4 w-4" />
                    <span className="text-sm truncate">{channel.name}</span>
                  </button>
                ))}
              </div>
            </div>

            {/* Direct Messages Section */}
            <div>
              <h3 className="px-2 text-xs font-semibold text-muted-foreground uppercase tracking-wider mb-2">Direct Messages</h3>
              <div className="space-y-1">
                <Button variant="ghost" className="w-full justify-start text-foreground hover:bg-muted">
                  <Users className="mr-2 h-4 w-4 text-muted-foreground" />
                  <span className="text-sm">New Message</span>
                </Button>
              </div>
            </div>
          </div>
        </div>

        {/* User Profile */}
        <div className="p-4 border-t border-border">
          <div className="flex items-center gap-3">
            <Avatar className="h-8 w-8">
              <AvatarFallback className="bg-primary/10 text-primary font-semibold">
                {user?.name?.charAt(0).toUpperCase() || 'U'}
              </AvatarFallback>
            </Avatar>
            <div className="flex-1 min-w-0">
              <p className="text-sm font-medium text-foreground truncate">{user?.name || 'User'}</p>
              <p className="text-xs text-muted-foreground truncate">{user?.email || ''}</p>
            </div>
            <Button variant="ghost" size="icon" className="h-8 w-8">
              <Settings className="h-4 w-4 text-muted-foreground" />
            </Button>
          </div>
        </div>
      </aside>

      {/* Center Area - Chat */}
      <div className="flex-1 flex flex-col min-w-0">
        {/* Chat Header */}
        <header className="h-16 shrink-0 border-b border-border bg-background/80 backdrop-blur-md flex items-center justify-between px-6">
          <div className="flex items-center gap-3">
            <div className="h-10 w-10 bg-primary/10 rounded-lg flex items-center justify-center">
              <span className="text-primary font-semibold">#</span>
            </div>
            <div>
              <h2 className="font-semibold text-foreground">{channelName}</h2>
              <p className="text-xs text-muted-foreground">{allMessages.length} messages</p>
            </div>
          </div>
          <div className="flex items-center gap-2">
            <Button variant="ghost" size="icon" className="text-muted-foreground">
              <Search className="h-5 w-5" />
            </Button>
            <Button variant="ghost" size="icon" className="text-muted-foreground">
              <Bell className="h-5 w-5" />
            </Button>
            <Button variant="ghost" size="icon" className="text-muted-foreground">
              <MoreVertical className="h-5 w-5" />
            </Button>
          </div>
        </header>

        {/* Messages Area */}
        <div className="flex-1 overflow-y-auto p-6 space-y-4">
          {allMessages.length === 0 ? (
            <div className="flex flex-col items-center justify-center h-full text-muted-foreground">
              <Send className="h-12 w-12 mb-4 text-muted-foreground/50" />
              <p className="text-sm">No messages yet</p>
              <p className="text-xs mt-1">Start the conversation!</p>
            </div>
          ) : (
            allMessages.map((message) => (
              <div
                key={message.id}
                className={`flex gap-3 ${message.user_id === user?.id ? 'flex-row-reverse' : ''}`}
              >
                <div className="w-8 h-8 rounded-full bg-primary/10 flex items-center justify-center shrink-0">
                  <span className="text-primary text-xs font-semibold">
                    {message.user_name?.charAt(0).toUpperCase() || 'U'}
                  </span>
                </div>
                <div
                  className={`${
                    message.user_id === user?.id
                      ? 'bg-primary text-primary-foreground'
                      : 'bg-background border border-border text-foreground'
                  } rounded-2xl px-4 py-3 max-w-[70%]`}
                >
                  <div className="flex items-baseline gap-2 mb-1">
                    <span className="text-xs font-semibold">
                      {message.user_name || 'Unknown'}
                    </span>
                    <span className="text-[10px] opacity-70">
                      {new Date(message.created_at).toLocaleTimeString([], {
                        hour: '2-digit',
                        minute: '2-digit',
                      })}
                    </span>
                  </div>
                  <p className="text-sm">{message.content}</p>
                </div>
              </div>
            ))
          )}
        </div>

        {/* Message Input */}
        <div className="p-4 border-t border-border bg-background/80 backdrop-blur-xl">
          <div className="flex gap-2">
            <Input
              value={newMessage}
              onChange={(e) => setNewMessage(e.target.value)}
              onKeyDown={(e) => e.key === 'Enter' && handleSendMessage()}
              placeholder="Type your message..."
              className="flex-1 h-11 px-4 text-base rounded-xl bg-background border-input shadow-sm hover:border-ring/50 focus-visible:ring-4 focus-visible:ring-ring/15 transition-all"
            />
            <Button onClick={handleSendMessage} disabled={!newMessage.trim()} className="h-11 px-4 rounded-xl shadow-md transition-all font-semibold text-base">
              <Send className="h-4 w-4" />
            </Button>
          </div>
        </div>
      </div>

      {/* Right Panel - Task Detail, Members, or Activity */}
      <aside className="w-80 border-l border-border bg-background shrink-0 hidden lg:flex flex-col">
        {/* Panel Header */}
        <div className="h-16 flex items-center px-6 border-b border-border">
          <h3 className="font-semibold text-foreground">Channel Details</h3>
        </div>

        {/* Panel Content */}
        <div className="flex-1 overflow-y-auto p-6 space-y-6">
          {/* Channel Info */}
          <Card>
            <CardHeader>
              <CardTitle className="text-base">About this channel</CardTitle>
            </CardHeader>
            <CardContent>
              <p className="text-sm text-muted-foreground">
                This is where your team discusses topics related to this channel.
              </p>
            </CardContent>
          </Card>

          {/* Members */}
          <div>
            <h4 className="text-sm font-semibold text-foreground mb-3">Members</h4>
            <div className="space-y-2">
              {[1, 2, 3].map((i) => (
                <div key={i} className="flex items-center gap-3">
                  <Avatar className="h-8 w-8">
                    <AvatarFallback className="bg-muted text-foreground">
                      U{i}
                    </AvatarFallback>
                  </Avatar>
                  <div>
                    <p className="text-sm font-medium text-foreground">User {i}</p>
                    <p className="text-xs text-muted-foreground">Member</p>
                  </div>
                </div>
              ))}
            </div>
            <Button variant="outline" className="w-full mt-4 bg-primary hover:bg-primary/90 text-primary-foreground border-transparent">
              <Plus className="h-4 w-4 mr-2" />
              Invite Members
            </Button>
          </div>
        </div>
      </aside>
    </div>
  );
}
