// src/app/organizations/[id]/page.tsx
"use client";

import { useParams, useRouter } from "next/navigation";
import { useEffect } from "react";
import { Building2, ArrowLeft, Loader2, Plus, Hash, MessageSquare } from "lucide-react";

import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { useAuthProfile } from "@/services/auth.service";
import { useOrgChannelsQuery } from "@/services/channel.service";

export default function OrganizationDetailPage() {
  const params = useParams();
  const router = useRouter();
  const orgId = params.id as string;

  const { user, isLoading: isLoadingUser } = useAuthProfile({ enabled: true });
  const { data: channelsData } = useOrgChannelsQuery(orgId);
  const channels = channelsData?.success ? channelsData.data : [];

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

  return (
    <div className="flex h-screen bg-slate-50 overflow-hidden">
      {/* Left Sidebar - Channels */}
      <div className="w-72 border-r border-slate-200/60 bg-white/80 backdrop-blur-xl flex flex-col">
        {/* Header */}
        <div className="p-4 border-b border-slate-200/60">
          <Button
            variant="ghost"
            size="sm"
            onClick={() => router.push("/dashboard")}
            className="text-slate-600 hover:text-slate-900 mb-3"
          >
            <ArrowLeft className="h-4 w-4 mr-2" />
            Back to Dashboard
          </Button>
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 bg-slate-900 rounded-lg flex items-center justify-center shadow-md">
              <Building2 className="h-5 w-5 text-white" />
            </div>
            <div className="flex-1 min-w-0">
              <h2 className="font-semibold text-slate-900 truncate">Organization</h2>
              <p className="text-xs text-slate-500 truncate">{orgId}</p>
            </div>
          </div>
        </div>

        {/* Channels List */}
        <div className="flex-1 overflow-y-auto p-4">
          <div className="flex items-center justify-between mb-3">
            <h3 className="text-sm font-semibold text-slate-700">Channels</h3>
            <Button size="sm" variant="ghost" className="h-7 w-7 p-0">
              <Plus className="h-4 w-4" />
            </Button>
          </div>

          {channels.length === 0 ? (
            <div className="text-center py-8 text-slate-500">
              <Hash className="h-8 w-8 mx-auto mb-2 text-slate-300" />
              <p className="text-sm">No channels yet</p>
              <p className="text-xs mt-1">Create your first channel</p>
            </div>
          ) : (
            <div className="space-y-1">
              {channels.map((channel) => (
                <button
                  key={channel.id}
                  className="w-full flex items-center gap-2 px-3 py-2 rounded-lg hover:bg-slate-100 transition-colors text-left"
                >
                  <Hash className="h-4 w-4 text-slate-400" />
                  <span className="text-sm text-slate-700 truncate">{channel.name}</span>
                </button>
              ))}
            </div>
          )}
        </div>
      </div>

      {/* Right Side - Chat Placeholder */}
      <div className="flex-1 flex flex-col">
        {/* Chat Header */}
        <div className="h-16 border-b border-slate-200/60 bg-white/80 backdrop-blur-xl flex items-center px-6">
          <MessageSquare className="h-5 w-5 text-slate-400 mr-3" />
          <div>
            <h3 className="font-semibold text-slate-900">Chat Setup</h3>
            <p className="text-xs text-slate-500">Select a channel to start chatting</p>
          </div>
        </div>

        {/* Chat Content Placeholder */}
        <div className="flex-1 flex items-center justify-center p-6">
          <Card className="max-w-md w-full border-slate-200/60 bg-white/80 backdrop-blur-xl">
            <CardHeader className="text-center">
              <div className="w-16 h-16 bg-slate-100 rounded-full flex items-center justify-center mx-auto mb-4">
                <MessageSquare className="h-8 w-8 text-slate-400" />
              </div>
              <CardTitle>Welcome to OmniTask Chat</CardTitle>
              <CardDescription>
                Select a channel from the left sidebar to start collaborating with your team
              </CardDescription>
            </CardHeader>
            <CardContent className="text-center">
              <p className="text-sm text-slate-500 mb-4">
                Channels help organize conversations by topic, project, or team
              </p>
              <Button
                onClick={() => router.push("/dashboard")}
                variant="outline"
                className="w-full"
              >
                Go to Dashboard
              </Button>
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  );
}
