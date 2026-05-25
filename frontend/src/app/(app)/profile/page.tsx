// src/app/profile/page.tsx
"use client";

import { useRouter } from "next/navigation";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { LogOut, Mail, Calendar, Settings, ShieldAlert } from "lucide-react";
import { useLogoutMutation, useAuthProfile } from "@/api/auth";
import { useUIStore } from "@/store/ui.store";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { getInitials } from "@/lib/utils";
import { buildAuthenticatedFileUrl } from "@/lib/file-url";

export default function ProfilePage() {
  const router = useRouter();
  const { user } = useAuthProfile();
  const logoutMutation = useLogoutMutation();
  const openProfileSettings = useUIStore((state) => state.openProfileSettings);
  
  const handleLogout = async () => {
    await logoutMutation.mutateAsync(undefined, {
      onSettled: () => {
        router.push("/login");
      },
    });
  };

  const userInitials = getInitials(user?.name, "U");

  return (
    <div className="min-h-screen bg-background p-6 flex flex-col items-center justify-start">
      <div className="w-full max-w-3xl mt-10 space-y-6">
        <div className="flex items-center justify-between">
          <h1 className="text-3xl font-bold tracking-tight text-foreground">My Profile</h1>
          <Button 
            variant="outline" 
            className="flex items-center gap-2 rounded-xl h-10 px-4 font-semibold text-xs border-border"
            onClick={openProfileSettings}
          >
            <Settings size={15} />
            Edit Profile Settings
          </Button>
        </div>
        
        <Card className="shadow-md border-border bg-card/40 overflow-hidden">
          <CardHeader className="flex flex-col sm:flex-row items-center gap-5 pb-6 border-b border-border bg-muted/20">
            <Avatar className="h-20 w-20 border-2 border-border shadow-sm">
              <AvatarImage src={user?.avatar_url ? buildAuthenticatedFileUrl(user.avatar_url) : undefined} className="object-cover" />
              <AvatarFallback className="text-2xl font-extrabold bg-primary/10 text-primary uppercase">
                {userInitials}
              </AvatarFallback>
            </Avatar>
            <div className="text-center sm:text-left space-y-1">
              <CardTitle className="text-2xl font-bold">{user?.name || "OmniTask User"}</CardTitle>
              <CardDescription className="text-base flex items-center justify-center sm:justify-start gap-1.5 mt-1 font-medium">
                <Mail size={16} className="text-muted-foreground" /> 
                <span>{user?.email || "user@example.com"}</span>
              </CardDescription>
            </div>
          </CardHeader>
          <CardContent className="pt-6 space-y-6">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              <div className="p-4 bg-muted/20 rounded-xl border border-border">
                <p className="text-[10px] text-muted-foreground font-bold uppercase tracking-wider mb-1">Account ID</p>
                <p className="text-foreground font-mono text-sm select-all">{user?.id || "N/A"}</p>
              </div>
              <div className="p-4 bg-muted/20 rounded-xl border border-border">
                <p className="text-[10px] text-muted-foreground font-bold uppercase tracking-wider flex items-center gap-1 mb-1">
                  <Calendar size={14} className="text-muted-foreground" /> Joined Date
                </p>
                <p className="text-foreground font-semibold">
                  {user?.created_at ? new Date(user.created_at).toLocaleDateString(undefined, {
                    year: 'numeric',
                    month: 'long',
                    day: 'numeric'
                  }) : "Just now"}
                </p>
              </div>
            </div>

            <div className="flex flex-col sm:flex-row justify-between items-center pt-6 border-t border-border gap-4">
              <p className="text-xs text-muted-foreground max-w-sm text-center sm:text-left leading-relaxed">
                Customize your name, email, avatar image, change your login password or manage account settings via profile editor.
              </p>
              <div className="flex items-center gap-2 shrink-0">
                <Button
                  variant="outline"
                  className="flex items-center gap-2 h-10 px-4 rounded-xl border-border font-semibold text-xs text-muted-foreground hover:text-foreground"
                  onClick={openProfileSettings}
                >
                  <Settings size={14} />
                  Settings
                </Button>
                <Button
                  className="flex items-center gap-2 h-10 px-4 rounded-xl shadow-md transition-all font-semibold text-xs"
                  onClick={handleLogout}
                  disabled={logoutMutation.isPending}
                >
                  <LogOut size={14} />
                  {logoutMutation.isPending ? "Logging out..." : "Logout"}
                </Button>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
