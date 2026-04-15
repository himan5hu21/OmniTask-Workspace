// src/app/profile/page.tsx
"use client";

import { useRouter } from "next/navigation";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { UserCircle, LogOut, Mail, Calendar } from "lucide-react";
import { useLogoutMutation } from "@/services/auth.service";
import { useProfile } from "@/hooks/useAuth";

export default function ProfilePage() {
  const router = useRouter();
  const { user } = useProfile();
  const logoutMutation = useLogoutMutation({
    onSettled: () => {
      router.push("/login");
    },
  });

  const handleLogout = async () => {
    await logoutMutation.mutateAsync();
  };

  return (
    <div className="min-h-screen bg-slate-50 p-6 flex flex-col items-center">
      <div className="w-full max-w-3xl mt-10">
        <h1 className="text-3xl font-bold text-slate-900 mb-6">My Profile</h1>
        
        <Card className="shadow-sm border-slate-200">
          <CardHeader className="flex flex-row items-center gap-4 pb-4 border-b border-slate-100">
            <div className="w-16 h-16 bg-blue-100 text-blue-600 rounded-full flex items-center justify-center">
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
              <div className="p-4 bg-slate-50 rounded-lg border border-slate-100">
                <p className="text-sm text-slate-500 font-medium mb-1">Account ID</p>
                <p className="text-slate-900 font-mono text-sm">{user?.id || "N/A"}</p>
              </div>
              <div className="p-4 bg-slate-50 rounded-lg border border-slate-100">
                <p className="text-sm text-slate-500 font-medium flex items-center gap-1 mb-1">
                  <Calendar size={14} /> Joined Date
                </p>
                <p className="text-slate-900">{user?.created_at ? new Date(user.created_at).toLocaleDateString() : "Just now"}</p>
              </div>
            </div>

            <div className="flex justify-end pt-4 border-t border-slate-100">
              <Button 
                variant="destructive" 
                onClick={handleLogout} 
                disabled={logoutMutation.isPending}
                className="flex items-center gap-2"
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
