// src/app/dashboard/page.tsx
"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { useForm } from "react-hook-form";
import * as z from "zod";
import { Building2, Plus, LogOut, Loader2, MoreVertical, Users, LayoutGrid } from "lucide-react";

import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card, CardDescription, CardHeader, CardTitle, CardFooter } from "@/components/ui/card";
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
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
import { useOrganizations, useCreateOrganization } from "@/hooks/api/useOrganizations";
import { useLogoutMutation, useAuthProfile } from "@/services/auth.service"; // 👈 Tamara user data mate

const createOrgSchema = z.object({
  name: z.string().min(3, { message: "Organization name must be at least 3 characters" }),
});

type CreateOrgFormValues = z.infer<typeof createOrgSchema>;

export default function DashboardPage() {
  const router = useRouter();
  const [isCreateDialogOpen, setIsCreateDialogOpen] = useState(false);

  // User data fetch karva mate (Jo custom hook na hoy toh directly store mathi pan lai shako)
  const { user } = useAuthProfile(); 

  const resolver = createZodResolver<CreateOrgFormValues>(createOrgSchema);

  const {
    register,
    handleSubmit,
    formState: { errors },
  } = useForm<CreateOrgFormValues>({ resolver });

  const { organizations, isLoading: isLoadingOrgs } = useOrganizations();

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

  // User na nam no pehlo akshar Avatar mate
  const userInitials = user?.name ? user.name.charAt(0).toUpperCase() : "U";

  return (
    <div className="flex flex-col h-screen overflow-hidden bg-[#F8FAFC]">
      
      {/* 👈 Clean & Sticky Header */}
      <header className="shrink-0 z-40 w-full border-b border-slate-200 bg-white/80 backdrop-blur-md">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex h-16 items-center justify-between">
            {/* Logo area */}
            <div className="flex items-center gap-2">
              <div className="flex h-9 w-9 items-center justify-center rounded-xl bg-linear-to-br from-indigo-600 to-blue-600 shadow-sm">
                <LayoutGrid className="h-5 w-5 text-white" />
              </div>
              <span className="text-xl font-bold tracking-tight text-slate-900">OmniTask</span>
            </div>

            {/* 👈 User Profile Dropdown */}
            <div className="flex items-center gap-4">
              <DropdownMenu>
                <DropdownMenuTrigger asChild>
                  <Button variant="ghost" className="relative h-10 w-10 rounded-full">
                    <Avatar className="h-10 w-10 border border-slate-200 shadow-sm">
                      <AvatarFallback className="bg-indigo-50 text-indigo-700 font-semibold">
                        {userInitials}
                      </AvatarFallback>
                    </Avatar>
                  </Button>
                </DropdownMenuTrigger>
                <DropdownMenuContent className="w-56" align="end" forceMount>
                  <DropdownMenuLabel className="font-normal">
                    <div className="flex flex-col space-y-1">
                      <p className="text-sm font-medium leading-none text-slate-900">{user?.name || "User"}</p>
                      <p className="text-xs leading-none text-slate-500">
                        {user?.email || "user@example.com"}
                      </p>
                    </div>
                  </DropdownMenuLabel>
                  <DropdownMenuSeparator />
                  <DropdownMenuItem 
                    onClick={handleLogout}
                    disabled={logoutMutation.isPending}
                    className="text-red-600 focus:text-red-600 focus:bg-red-50 cursor-pointer"
                  >
                    {logoutMutation.isPending ? (
                      <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                    ) : (
                      <LogOut className="mr-2 h-4 w-4" />
                    )}
                    <span>Log out</span>
                  </DropdownMenuItem>
                </DropdownMenuContent>
              </DropdownMenu>
            </div>
          </div>
        </div>
      </header>

      {/* Main Content */}
      <main className="flex-1 px-4 overflow-y-auto w-full ">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8 md:py-12">
        {/* Page Header */}
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 mb-8">
          <div>
            <h1 className="text-3xl font-bold tracking-tight text-slate-900">Workspaces</h1>
            <p className="text-slate-500 mt-1">Select an organization or create a new one to get started.</p>
          </div>
          
          <Dialog open={isCreateDialogOpen} onOpenChange={setIsCreateDialogOpen}>
            <DialogTrigger asChild>
              <Button className="bg-indigo-600 hover:bg-indigo-700 text-white shadow-sm">
                <Plus className="h-4 w-4 mr-2" />
                New Workspace
              </Button>
            </DialogTrigger>
            <DialogContent className="sm:max-w-md">
              <DialogHeader>
                <DialogTitle>Create Organization</DialogTitle>
                <DialogDescription>
                  Give your team a workspace to collaborate, chat, and manage tasks.
                </DialogDescription>
              </DialogHeader>
              <Form onSubmit={handleSubmit(onSubmit)} errors={errors} className="space-y-5 pt-2">
                <div className="space-y-2">
                  <Label htmlFor="name" className="text-slate-700 font-medium">Organization Name</Label>
                  <Input
                    id="name"
                    placeholder="e.g. Acme Corp"
                    className="h-11"
                    {...register("name")}
                  />
                  <FormFieldError errors={errors} name="name" />
                </div>
                <div className="flex justify-end gap-3 pt-4 border-t border-slate-100">
                  <Button type="button" variant="ghost" onClick={() => setIsCreateDialogOpen(false)}>
                    Cancel
                  </Button>
                  <Button
                    type="submit"
                    className="bg-indigo-600 hover:bg-indigo-700 text-white"
                    disabled={createOrgMutation.isPending}
                  >
                    {createOrgMutation.isPending ? (
                      <span className="flex items-center gap-2">
                        <Loader2 className="h-4 w-4 animate-spin" />
                        Creating...
                      </span>
                    ) : (
                      "Create"
                    )}
                  </Button>
                </div>
              </Form>
            </DialogContent>
          </Dialog>
        </div>

        {/* Organizations Grid */}
        {isLoadingOrgs ? (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {/* Loading Skeletons */}
            {[1, 2, 3].map((i) => (
              <Card key={i} className="h-[200px] border-slate-200 shadow-sm animate-pulse bg-slate-50/50">
                <CardHeader className="space-y-4">
                  <div className="h-12 w-12 bg-slate-200 rounded-xl" />
                  <div className="h-6 bg-slate-200 rounded w-3/4" />
                  <div className="h-4 bg-slate-200 rounded w-1/2" />
                </CardHeader>
              </Card>
            ))}
          </div>
        ) : organizations.length > 0 ? (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {organizations.map((org) => (
              <Card
                key={org.id}
                className="group relative flex flex-col justify-between border-slate-200 shadow-sm hover:border-indigo-300 hover:shadow-md transition-all cursor-pointer bg-white"
                onClick={() => router.push(`/organizations/${org.id}`)}
              >
                <CardHeader>
                  <div className="flex justify-between items-start">
                    <div className="w-12 h-12 bg-indigo-50 rounded-xl flex items-center justify-center mb-4 group-hover:bg-indigo-100 transition-colors text-indigo-600">
                      <Building2 className="h-6 w-6" />
                    </div>
                    <Button variant="ghost" size="icon" className="h-8 w-8 text-slate-400 opacity-0 group-hover:opacity-100 transition-opacity">
                      <MoreVertical className="h-4 w-4" />
                    </Button>
                  </div>
                  <CardTitle className="text-xl text-slate-900">{org.name}</CardTitle>
                  <CardDescription className="text-slate-500">
                    Created {new Date(org.created_at).toLocaleDateString(undefined, { month: 'short', day: 'numeric', year: 'numeric' })}
                  </CardDescription>
                </CardHeader>
                <CardFooter className="pt-4 pb-4 border-t border-slate-100 flex items-center text-sm text-slate-500">
                   <Users className="h-4 w-4 mr-2" />
                   {/* Ahiya future ma members count muki shakay */}
                   <span>Team Workspace</span>
                </CardFooter>
              </Card>
            ))}
          </div>
        ) : (
          /* Empty State */
          <div className="flex flex-col items-center justify-center min-h-[400px] bg-white border border-slate-200 border-dashed rounded-2xl">
            <div className="w-20 h-20 bg-slate-50 rounded-full flex items-center justify-center mb-6">
              <Building2 className="h-10 w-10 text-slate-300" />
            </div>
            <h3 className="text-xl font-bold text-slate-900 mb-2">No organizations yet</h3>
            <p className="text-slate-500 max-w-sm text-center mb-8">
              Organizations are where your team communicates, manages tasks, and shares files.
            </p>
            <Button 
              className="bg-indigo-600 hover:bg-indigo-700 text-white shadow-sm px-8"
              onClick={() => setIsCreateDialogOpen(true)}
            >
              <Plus className="h-4 w-4 mr-2" />
              Create your first workspace
            </Button>
          </div>
        )}
        </div>
      </main>
    </div>
  );
}