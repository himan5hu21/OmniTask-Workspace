// src/app/profile/page.tsx
"use client";

import { useRouter } from "next/navigation";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { UserCircle, LogOut, Mail, Calendar } from "lucide-react";
import { useLogoutMutation } from "@/api/auth";
import { useAuthProfile } from "@/api/auth";

export default function ProfilePage() {
  const router = useRouter();
  const { user } = useAuthProfile();
  const logoutMutation = useLogoutMutation();
  
  const handleLogout = async () => {
    await logoutMutation.mutateAsync(undefined, {
      onSettled: () => {
        router.push("/login");
      },
    });
  };


  return (
    <div className="min-h-screen bg-background p-6 flex flex-col items-center">
      <div className="w-full max-w-3xl mt-10">
        <h1 className="text-3xl font-bold text-foreground mb-6">My Profile</h1>
        
        <Card className="shadow-sm border-border">
          <CardHeader className="flex flex-row items-center gap-4 pb-4 border-b border-border">
            <div className="w-16 h-16 bg-primary/10 text-primary rounded-full flex items-center justify-center">
              <UserCircle size={40} />
            </div>
            <div>
              <CardTitle className="text-2xl">{user?.name || "OmniTask User"}</CardTitle>
              <CardDescription className="text-base flex items-center gap-1 mt-1">
                <Mail size={16} /> {user?.email || "user@example.com"}
              </CardDescription>
            </div>
          </CardHeader>
          <CardContent className="pt-6">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6 mb-8">
              <div className="p-4 bg-muted rounded-lg border border-border">
                <p className="text-sm text-muted-foreground font-medium mb-1">Account ID</p>
                <p className="text-foreground font-mono text-sm">{user?.id || "N/A"}</p>
              </div>
              <div className="p-4 bg-muted rounded-lg border border-border">
                <p className="text-sm text-muted-foreground font-medium flex items-center gap-1 mb-1">
                  <Calendar size={14} /> Joined Date
                </p>
                <p className="text-foreground">{user?.created_at ? new Date(user.created_at).toLocaleDateString() : "Just now"}</p>
              </div>
            </div>

            <div className="flex justify-end pt-4 border-t border-border">
              <Button
                className="flex items-center gap-2 h-11 px-4 rounded-xl shadow-md transition-all font-semibold text-base"
                onClick={handleLogout}
                disabled={logoutMutation.isPending}
              >
                <LogOut size={18} />
                {logoutMutation.isPending ? "Logging out..." : "Logout"}
              </Button>
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}

