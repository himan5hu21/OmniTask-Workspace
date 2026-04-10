"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { useForm } from "react-hook-form";
import * as z from "zod";
import { 
  Building2, 
  Plus, 
  LogOut, 
  Loader2, 
  MoreVertical, 
  Users, 
  LayoutGrid, 
  ArrowRight,
  Bell,
  Search,
  Settings,
  MessageSquare,
  CheckCircle2
} from "lucide-react";

import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card, CardDescription, CardHeader, CardTitle, CardFooter, CardContent } from "@/components/ui/card";
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle, DialogTrigger, DialogFooter } from "@/components/ui/dialog";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";

import { createZodResolver, Form, FormFieldError } from "@/lib/form";
import { useOrganizations, useCreateOrganization } from "@/hooks/useOrganizations";
import { useLogoutMutation, useAuthProfile } from "@/services/auth.service";

const createOrgSchema = z.object({
  name: z.string().min(3, { message: "Organization name must be at least 3 characters" }),
});

type CreateOrgFormValues = z.infer<typeof createOrgSchema>;

export default function DashboardPage() {
  const router = useRouter();
  const [isCreateDialogOpen, setIsCreateDialogOpen] = useState(false);

  const { user } = useAuthProfile(); 
  const resolver = createZodResolver<CreateOrgFormValues>(createOrgSchema);

  const {
    register,
    handleSubmit,
    formState: { errors },
  } = useForm<CreateOrgFormValues>({ resolver });

  const { organizations = [], isLoading: isLoadingOrgs } = useOrganizations();

  const createOrgMutation = useCreateOrganization({
    onSuccess: () => {
      setIsCreateDialogOpen(false);
    },
  });

  const logoutMutation = useLogoutMutation({
    onSuccess: () => {
      router.push("/login");
    },
  });

  const onSubmit = (data: CreateOrgFormValues) => {
    createOrgMutation.mutate(data);
  };

  const handleLogout = () => {
    logoutMutation.mutate();
  };

  const userInitials = user?.name ? user.name.charAt(0).toUpperCase() : "U";

  // Dummy activity data for a professional look (You can fetch this later)
  const recentActivities = [
    { id: 1, text: "You were mentioned in Development by Sarah", time: "2 hours ago", icon: MessageSquare, color: "text-blue-500", bg: "bg-blue-50" },
    { id: 2, text: "Backend API task was marked as complete", time: "5 hours ago", icon: CheckCircle2, color: "text-emerald-500", bg: "bg-emerald-50" },
    { id: 3, text: "Alex invited you to Design Channel", time: "Yesterday", icon: Users, color: "text-indigo-500", bg: "bg-indigo-50" },
  ];

  return (
    <div className="flex h-screen overflow-hidden bg-slate-50 font-sans text-slate-900">
      
      {/* 👈 Sidebar / Navigation Pane (NEW) */}
      <aside className="w-64 border-r border-slate-200 bg-white shrink-0 hidden md:flex flex-col">
        <div className="h-16 flex items-center px-6 border-b border-slate-200">
          <div className="flex items-center gap-2 cursor-pointer" onClick={() => router.push('/dashboard')}>
            <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-indigo-600 shadow-sm shadow-indigo-200">
              <LayoutGrid className="h-4 w-4 text-white" />
            </div>
            <span className="text-xl font-bold tracking-tight text-slate-900">OmniTask</span>
          </div>
        </div>
        
        <div className="flex-1 overflow-y-auto py-6 px-4">
          <div className="space-y-1">
            <h3 className="px-2 text-xs font-semibold text-slate-500 uppercase tracking-wider mb-2">Main Menu</h3>
            <Button variant="secondary" className="w-full justify-start bg-indigo-50 text-indigo-700 hover:bg-indigo-100 font-medium">
              <Building2 className="mr-3 h-5 w-5" />
              Workspaces
            </Button>
            <Button variant="ghost" className="w-full justify-start text-slate-600 hover:text-slate-900 hover:bg-slate-100">
              <MessageSquare className="mr-3 h-5 w-5 text-slate-400" />
              Direct Messages
            </Button>
            <Button variant="ghost" className="w-full justify-start text-slate-600 hover:text-slate-900 hover:bg-slate-100">
              <CheckCircle2 className="mr-3 h-5 w-5 text-slate-400" />
              My Tasks
            </Button>
          </div>
        </div>

        <div className="p-4 border-t border-slate-200">
          <Button variant="outline" className="w-full justify-start text-slate-600" onClick={() => setIsCreateDialogOpen(true)}>
            <Plus className="mr-2 h-4 w-4" />
            New Workspace
          </Button>
        </div>
      </aside>

      {/* 👈 Main Content Area */}
      <div className="flex-1 flex flex-col min-w-0">
        
        {/* Top Header */}
        <header className="h-16 shrink-0 border-b border-slate-200 bg-white/80 backdrop-blur-md flex items-center justify-between px-6 z-10">
          
          <div className="flex items-center gap-4 md:hidden">
            <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-indigo-600">
              <LayoutGrid className="h-4 w-4 text-white" />
            </div>
            <span className="text-lg font-bold">OmniTask</span>
          </div>

          <div className="hidden md:flex flex-1 max-w-md ml-4 relative">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-slate-400" />
            <Input 
              placeholder="Search workspaces, tasks, or messages..." 
              className="w-full pl-10 bg-slate-100 border-transparent focus:bg-white focus:border-indigo-500 h-10 rounded-full"
            />
          </div>

          <div className="flex items-center gap-3 ml-auto">
            <Button variant="ghost" size="icon" className="text-slate-500 hover:text-slate-900">
              <Bell className="h-5 w-5" />
            </Button>
            <Button variant="ghost" size="icon" className="text-slate-500 hover:text-slate-900 mr-2">
              <Settings className="h-5 w-5" />
            </Button>

            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <Button variant="ghost" className="relative h-9 w-9 rounded-full ring-2 ring-transparent hover:ring-indigo-100 transition-all p-0">
                  <Avatar className="h-full w-full">
                    <AvatarFallback className="bg-indigo-100 text-indigo-700 font-semibold">
                      {userInitials}
                    </AvatarFallback>
                  </Avatar>
                </Button>
              </DropdownMenuTrigger>
              <DropdownMenuContent className="w-64 p-2" align="end" forceMount>
                <DropdownMenuLabel className="font-normal p-2">
                  <div className="flex flex-col space-y-1">
                    <p className="text-sm font-semibold leading-none text-slate-900">{user?.name || "User"}</p>
                    <p className="text-xs leading-none text-slate-500 font-medium">
                      {user?.email || "user@example.com"}
                    </p>
                  </div>
                </DropdownMenuLabel>
                <DropdownMenuSeparator className="my-1" />
                <DropdownMenuItem className="p-2 cursor-pointer rounded-md">
                  <Settings className="mr-2 h-4 w-4 text-slate-500" />
                  <span>Profile Settings</span>
                </DropdownMenuItem>
                <DropdownMenuSeparator className="my-1" />
                <DropdownMenuItem 
                  onClick={handleLogout}
                  disabled={logoutMutation.isPending}
                  className="text-red-600 font-medium p-2 focus:text-red-700 focus:bg-red-50 rounded-md cursor-pointer transition-colors"
                >
                  {logoutMutation.isPending ? (
                    <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                  ) : (
                    <LogOut className="mr-2 h-4 w-4" />
                  )}
                  <span>Log out securely</span>
                </DropdownMenuItem>
              </DropdownMenuContent>
            </DropdownMenu>
          </div>
        </header>

        {/* Page Scrollable Content */}
        <main className="flex-1 overflow-y-auto w-full p-6 lg:p-10">
          <div className="max-w-6xl mx-auto space-y-10">
            
            {/* Welcome Banner */}
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-6 bg-white p-8 rounded-2xl border border-slate-200 shadow-sm relative overflow-hidden">
              <div className="absolute top-0 right-0 w-64 h-64 bg-indigo-50 rounded-full blur-3xl -mr-10 -mt-10 opacity-70"></div>
              <div className="relative z-10 space-y-2">
                <h1 className="text-2xl md:text-3xl font-bold tracking-tight text-slate-900">
                  Welcome back, {user?.name?.split(' ')[0] || "User"} 👋
                </h1>
                <p className="text-slate-500 text-base max-w-xl">
                  Here is an overview of your workspaces. Select an organization to dive into channels, tasks, and team chats.
                </p>
              </div>
              
              <Dialog open={isCreateDialogOpen} onOpenChange={setIsCreateDialogOpen}>
                <DialogTrigger asChild>
                  <Button className="relative z-10 bg-indigo-600 hover:bg-indigo-700 text-white shadow-md transition-all rounded-xl h-11 px-6 font-medium whitespace-nowrap">
                    <Plus className="h-5 w-5 mr-2" />
                    New Workspace
                  </Button>
                </DialogTrigger>
                <DialogContent className="sm:max-w-md p-6 rounded-2xl">
                  <DialogHeader className="mb-2">
                    <DialogTitle className="text-xl font-bold text-slate-900">Create Workspace</DialogTitle>
                    <DialogDescription className="text-sm text-slate-500">
                      Give your team a dedicated space to collaborate and manage projects.
                    </DialogDescription>
                  </DialogHeader>
                  <Form onSubmit={handleSubmit(onSubmit)} errors={errors} className="space-y-6">
                    <div className="space-y-3">
                      <Label htmlFor="name" className="text-slate-700 font-semibold text-sm">Organization Name</Label>
                      <Input
                        id="name"
                        placeholder="e.g. Acme Corp"
                        className="h-11 rounded-lg border-slate-300 focus-visible:ring-indigo-500"
                        {...register("name")}
                      />
                      <FormFieldError errors={errors} name="name" />
                    </div>
                    <DialogFooter className="pt-2">
                      <Button type="button" variant="ghost" onClick={() => setIsCreateDialogOpen(false)}>
                        Cancel
                      </Button>
                      <Button type="submit" className="bg-indigo-600 hover:bg-indigo-700 text-white" disabled={createOrgMutation.isPending}>
                        {createOrgMutation.isPending ? <Loader2 className="h-4 w-4 animate-spin mr-2" /> : null}
                        Create Workspace
                      </Button>
                    </DialogFooter>
                  </Form>
                </DialogContent>
              </Dialog>
            </div>

            <div className="grid grid-cols-1 xl:grid-cols-3 gap-8">
              
              {/* Left Column: Workspaces (Takes up 2/3 of space on large screens) */}
              <div className="xl:col-span-2 space-y-6">
                <div className="flex items-center justify-between">
                  <h2 className="text-xl font-bold text-slate-900 flex items-center">
                    <Building2 className="mr-2 h-5 w-5 text-indigo-500" />
                    Your Workspaces
                  </h2>
                </div>

                {isLoadingOrgs ? (
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-5">
                    {[1, 2, 3, 4].map((i) => (
                      <Card key={i} className="h-[180px] rounded-xl border-slate-200 shadow-sm animate-pulse bg-white">
                        <CardHeader className="space-y-4 p-5">
                          <div className="h-12 w-12 bg-slate-200 rounded-lg" />
                          <div className="space-y-2 pt-1">
                            <div className="h-5 bg-slate-200 rounded w-3/4" />
                            <div className="h-3 bg-slate-200 rounded w-1/2" />
                          </div>
                        </CardHeader>
                      </Card>
                    ))}
                  </div>
                ) : organizations?.length > 0 ? (
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-5">
                    {organizations.map((org) => (
                      <Card
                        key={org.id}
                        className="group relative flex flex-col justify-between overflow-hidden rounded-xl border border-slate-200 bg-white shadow-sm hover:border-indigo-300 hover:shadow-md transition-all cursor-pointer"
                        onClick={() => router.push(`/organizations/${org.id}`)}
                      >
                        <CardHeader className="p-5 pb-3">
                          <div className="flex justify-between items-start mb-3">
                            <div className="w-12 h-12 bg-indigo-50 rounded-lg flex items-center justify-center text-indigo-600 group-hover:bg-indigo-600 group-hover:text-white transition-colors duration-300">
                              <Building2 className="h-6 w-6" />
                            </div>
                            <Button variant="ghost" size="icon" className="h-8 w-8 text-slate-400 opacity-0 group-hover:opacity-100 transition-opacity">
                              <MoreVertical className="h-4 w-4" />
                            </Button>
                          </div>
                          <CardTitle className="text-lg font-bold text-slate-900 group-hover:text-indigo-700 transition-colors line-clamp-1">
                            {org.name}
                          </CardTitle>
                          <CardDescription className="text-slate-500 mt-1 text-sm">
                            Created {new Date(org.created_at).toLocaleDateString(undefined, { month: 'short', day: 'numeric', year: 'numeric' })}
                          </CardDescription>
                        </CardHeader>
                        
                        <CardFooter className="p-5 pt-3 mt-auto">
                           <div className="flex items-center justify-between w-full border-t border-slate-100 pt-3">
                             <div className="flex -space-x-2">
                               {/* Placeholder for member avatars */}
                               <div className="w-6 h-6 rounded-full bg-slate-200 border-2 border-white"></div>
                               <div className="w-6 h-6 rounded-full bg-slate-300 border-2 border-white"></div>
                               <div className="w-6 h-6 rounded-full bg-slate-100 border-2 border-white flex items-center justify-center text-[10px] font-medium text-slate-600">+</div>
                             </div>
                             <ArrowRight className="h-4 w-4 text-slate-300 group-hover:text-indigo-600 transition-colors group-hover:translate-x-1" />
                           </div>
                        </CardFooter>
                      </Card>
                    ))}
                  </div>
                ) : (
                  <div className="flex flex-col items-center justify-center py-16 bg-white border border-slate-200 border-dashed rounded-xl shadow-sm">
                    <div className="w-16 h-16 bg-indigo-50 rounded-full flex items-center justify-center mb-4">
                      <Building2 className="h-8 w-8 text-indigo-400" />
                    </div>
                    <h3 className="text-lg font-bold text-slate-900 mb-1">No workspaces yet</h3>
                    <p className="text-slate-500 text-sm max-w-xs text-center mb-6">
                      Create your first workspace to start collaborating with your team.
                    </p>
                    <Button onClick={() => setIsCreateDialogOpen(true)} className="bg-indigo-600 hover:bg-indigo-700 text-white">
                      <Plus className="h-4 w-4 mr-2" />
                      Create Workspace
                    </Button>
                  </div>
                )}
              </div>

              {/* Right Column: Activity & Overview (Takes 1/3 of space) */}
              <div className="space-y-6">
                
                {/* Recent Activity Panel */}
                <Card className="rounded-xl border border-slate-200 shadow-sm bg-white overflow-hidden">
                  <CardHeader className="p-5 border-b border-slate-100 bg-slate-50/50">
                    <CardTitle className="text-base font-bold text-slate-900 flex items-center">
                      <Bell className="mr-2 h-4 w-4 text-slate-500" />
                      Recent Activity
                    </CardTitle>
                  </CardHeader>
                  <CardContent className="p-0">
                    <ul className="divide-y divide-slate-100">
                      {recentActivities.map((activity) => (
                        <li key={activity.id} className="p-5 hover:bg-slate-50 transition-colors">
                          <div className="flex gap-4">
                            <div className={`mt-0.5 shrink-0 h-8 w-8 rounded-full ${activity.bg} flex items-center justify-center`}>
                              <activity.icon className={`h-4 w-4 ${activity.color}`} />
                            </div>
                            <div>
                              <p className="text-sm font-medium text-slate-800 leading-snug">
                                {activity.text}
                              </p>
                              <p className="text-xs text-slate-500 mt-1">{activity.time}</p>
                            </div>
                          </div>
                        </li>
                      ))}
                    </ul>
                  </CardContent>
                  <CardFooter className="p-3 border-t border-slate-100 bg-slate-50/50 justify-center">
                    <Button variant="link" className="text-indigo-600 h-auto p-0 text-sm">
                      View all notifications
                    </Button>
                  </CardFooter>
                </Card>

                {/* Quick Stats / Info Panel */}
                <Card className="rounded-xl border border-slate-200 shadow-sm bg-linear-to-br from-indigo-600 to-blue-700 text-white">
                  <CardContent className="p-6">
                    <div className="mb-4">
                      <h3 className="text-lg font-bold">Need help getting started?</h3>
                      <p className="text-indigo-100 text-sm mt-1">Read our guide on how to setup your first channel and assign tasks.</p>
                    </div>
                    <Button variant="secondary" className="w-full bg-white text-indigo-700 hover:bg-slate-50">
                      Read Documentation
                    </Button>
                  </CardContent>
                </Card>

              </div>
            </div>
            
          </div>
        </main>
      </div>
    </div>
  );
}