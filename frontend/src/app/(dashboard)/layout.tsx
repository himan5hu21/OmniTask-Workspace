// src/app/(app)/layout.tsx
"use client";

import { useRouter } from "next/navigation";
import { 
  LayoutGrid, Building2, MessageSquare, CheckCircle2, 
  Bell, LogOut, Loader2
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import {
  DropdownMenu, DropdownMenuContent, DropdownMenuItem,
  DropdownMenuLabel, DropdownMenuSeparator, DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { Search } from "lucide-react";
import { useAuthProfile, useLogoutMutation } from "@/services/auth.service";

export default function AppLayout({ children }: { children: React.ReactNode }) {
  const router = useRouter();
  const { user } = useAuthProfile();
  
  const logoutMutation = useLogoutMutation({
    onSuccess: () => router.push("/login"),
  });

  const userInitials = user?.name ? user.name.charAt(0).toUpperCase() : "U";

  return (
    <div className="flex h-screen overflow-hidden bg-background font-sans text-foreground">
      
      {/* 🟢 Sidebar */}
      <aside className="w-64 border-r border-border bg-background shrink-0 hidden md:flex flex-col">
        <div className="h-16 flex items-center px-6 border-b border-border">
          <div className="flex items-center gap-2 cursor-pointer" onClick={() => router.push('/dashboard')}>
            <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-primary shadow-sm shadow-primary/20">
              <LayoutGrid className="h-4 w-4 text-white" />
            </div>
            <span className="text-xl font-bold tracking-tight text-foreground">OmniTask</span>
          </div>
        </div>
        
        <div className="flex-1 overflow-y-auto py-6 px-4">
          <div className="space-y-1">
            <h3 className="px-2 text-xs font-semibold text-muted-foreground uppercase tracking-wider mb-2">Main Menu</h3>
            <Button variant="secondary" className="w-full justify-start bg-primary/10 text-primary hover:bg-primary/20 font-medium" onClick={() => router.push('/dashboard')}>
              <Building2 className="mr-3 h-5 w-5" />
              Workspaces
            </Button>
            <Button variant="ghost" className="w-full justify-start text-foreground hover:text-foreground hover:bg-muted">
              <MessageSquare className="mr-3 h-5 w-5 text-muted-foreground" />
              Direct Messages
            </Button>
            <Button variant="ghost" className="w-full justify-start text-foreground hover:text-foreground hover:bg-muted">
              <CheckCircle2 className="mr-3 h-5 w-5 text-muted-foreground" />
              My Tasks
            </Button>
          </div>
        </div>
      </aside>

      {/* 🟢 Main Content Wrapper */}
      <div className="flex-1 flex flex-col min-w-0">
        
        {/* 🟢 Header */}
        <header className="h-16 shrink-0 border-b border-border bg-background/80 backdrop-blur-md flex items-center justify-between px-6 z-10">
          <div className="flex items-center gap-4 md:hidden">
            <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-primary">
              <LayoutGrid className="h-4 w-4 text-white" />
            </div>
            <span className="text-lg font-bold">OmniTask</span>
          </div>

          <div className="hidden md:flex flex-1 max-w-md relative">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
            <Input 
              placeholder="Search workspaces..." 
              className="w-full h-11 pl-10 text-base rounded-full bg-background border-input hover:border-ring/50 focus-visible:ring-4 focus-visible:ring-ring/15 transition-all"
            />
          </div>

          <div className="flex items-center gap-3 ml-auto">
            <Button variant="ghost" size="icon" className="text-muted-foreground hover:text-foreground">
              <Bell className="h-5 w-5" />
            </Button>

            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <Button variant="ghost" className="relative h-9 w-9 rounded-full ring-2 ring-transparent hover:ring-primary/20 transition-all p-0">
                  <Avatar className="h-full w-full">
                    <AvatarFallback className="bg-primary/10 text-primary font-semibold">
                      {userInitials}
                    </AvatarFallback>
                  </Avatar>
                </Button>
              </DropdownMenuTrigger>
              <DropdownMenuContent className="w-56 p-2" align="end" forceMount>
                {/* As requested: User Details */}
                <DropdownMenuLabel className="font-normal p-2">
                  <div className="flex flex-col space-y-1">
                    <p className="text-sm font-semibold leading-none text-foreground">{user?.name || "User"}</p>
                    <p className="text-xs leading-none text-muted-foreground font-medium">
                      {user?.email || "user@example.com"}
                    </p>
                  </div>
                </DropdownMenuLabel>
                <DropdownMenuSeparator className="my-1" />
                
                {/* As requested: Logout Only */}
                <DropdownMenuItem 
                  onClick={() => logoutMutation.mutate()}
                  disabled={logoutMutation.isPending}
                  className="text-destructive font-medium p-2 focus:bg-destructive/10 focus:text-destructive rounded-md cursor-pointer transition-colors"
                >
                  {logoutMutation.isPending ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : <LogOut className="mr-2 h-4 w-4" />}
                  <span>Log out securely</span>
                </DropdownMenuItem>
              </DropdownMenuContent>
            </DropdownMenu>
          </div>
        </header>

        {/* 🟢 Page Content Box */}
        <main className="flex-1 overflow-y-auto w-full p-6 lg:p-10">
          {children}
        </main>
      </div>
    </div>
  );
}