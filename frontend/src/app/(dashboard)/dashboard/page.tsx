"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { useForm } from "react-hook-form";
import * as z from "zod";
import { Building2, Plus, Loader2, MoreVertical, ArrowRight, Trash2 } from "lucide-react";
import { toast } from "sonner";

import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card, CardDescription, CardHeader, CardTitle, CardFooter } from "@/components/ui/card";
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger } from "@/components/ui/dropdown-menu";

import { createZodResolver, Form, FormFieldError } from "@/lib/form";
import { handleApiError } from "@/lib/api-errors";
import { useAuthProfile } from "@/services/auth.service";
import { useOrganizations, useCreateOrganization, useDeleteOrganization } from "@/hooks/useOrganizations";
import { useIsMounted } from "@/hooks/useIsMounted";
import type { Organization } from "@/services/organization.service";

const orgSchema = z.object({
  name: z.string().min(3, { message: "Name must be at least 3 characters" }),
});
type OrgFormValues = z.infer<typeof orgSchema>;

export default function DashboardPage() {
  const router = useRouter();
  const { user } = useAuthProfile();
  const isMounted = useIsMounted();

  // States for Modals
  const [isCreateOpen, setIsCreateOpen] = useState(false);
  const [orgToDelete, setOrgToDelete] = useState<Organization | null>(null);

  const { organizations, isLoading: isLoadingOrgs } = useOrganizations();

  // Mutations
  const createMutation = useCreateOrganization({ 
    onSuccess: () => setIsCreateOpen(false),
    onError: (error) => {
      handleApiError(
        error,
        {
          uniqueName: () => setCreateError("name", { type: "manual", message: "A workspace with this name already exists" }),
          onOtherError: (message) => toast.error(message)
        },
        "Failed to create workspace. Please try again."
      );
    }
  });
  const deleteMutation = useDeleteOrganization({ onSuccess: () => setOrgToDelete(null) });

  // Forms
  const { register: regCreate, handleSubmit: handleCreateSubmit, formState: { errors: errCreate }, setError: setCreateError, reset: resetCreate } = useForm<OrgFormValues>({ resolver: createZodResolver(orgSchema) });

  const onCreate = (data: OrgFormValues) => createMutation.mutate(data);

  return (
    <div className="max-w-6xl mx-auto space-y-10">
      
      {/* Welcome Banner */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-6 bg-background p-8 rounded-2xl border border-border shadow-sm relative overflow-hidden">
        <div className="absolute top-0 right-0 w-64 h-64 bg-primary/10 rounded-full blur-3xl -mr-10 -mt-10 opacity-70"></div>
        <div className="relative z-10 space-y-2">
          <h1 className="text-2xl md:text-3xl font-bold tracking-tight text-foreground">
            Welcome back, {isMounted ? (user?.name?.split(' ')[0] || "User") : "User"} 👋
          </h1>
          <p className="text-muted-foreground text-base max-w-xl">
            Select an organization to dive into channels, tasks, and team chats.
          </p>
        </div>
        
        <Button onClick={() => { resetCreate(); setIsCreateOpen(true); }} className="relative z-10 h-11 px-6 rounded-xl shadow-md font-semibold text-base whitespace-nowrap">
          <Plus className="h-5 w-5 mr-2" /> New Workspace
        </Button>
      </div>

      <div className="space-y-6">
        <h2 className="text-xl font-bold text-foreground flex items-center">
          <Building2 className="mr-2 h-5 w-5 text-primary" />
          Your Workspaces
        </h2>

        {isLoadingOrgs ? (
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-5">
            {[1, 2, 3].map((i) => (
              <Card key={i} className="h-[180px] rounded-xl border-border animate-pulse bg-muted/20" />
            ))}
          </div>
        ) : organizations.length > 0 ? (
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-5">
            {organizations.map((org) => (
              <Card key={org.id} className="group relative flex flex-col justify-between overflow-hidden rounded-xl border border-border bg-background shadow-sm hover:border-primary hover:shadow-md transition-all cursor-pointer" onClick={() => router.push(`/organizations/${org.id}`)}>
                <CardHeader className="px-5 pb-3">
                  <div className="flex justify-between items-start mb-3">
                    <div className="w-12 h-12 bg-primary/10 rounded-lg flex items-center justify-center text-primary group-hover:bg-primary group-hover:text-primary-foreground transition-colors duration-300">
                      <Building2 className="h-6 w-6" />
                    </div>
                    
                    {/* Dropdown for Edit / Delete */}
                    {org.role === 'OWNER' && (
                      <DropdownMenu>
                        <DropdownMenuTrigger asChild onClick={(e) => e.stopPropagation()}>
                          <Button variant="ghost" size="icon" className="h-8 w-8 text-muted-foreground hover:bg-muted">
                            <MoreVertical className="h-4 w-4" />
                          </Button>
                        </DropdownMenuTrigger>
                        <DropdownMenuContent align="end" className="w-40">
                          {/* Only Owner can delete */}

                          <DropdownMenuItem
                            onClick={(e) => { e.stopPropagation(); setOrgToDelete(org); }}
                            className="text-destructive focus:bg-destructive/10 focus:text-destructive"
                          >
                            <Trash2 className="mr-2 h-4 w-4" /> Delete
                          </DropdownMenuItem>
                        </DropdownMenuContent>
                      </DropdownMenu>
                    )}

                  </div>
                  <CardTitle className="text-lg font-bold text-foreground group-hover:text-primary transition-colors line-clamp-1">
                    {org.name}
                  </CardTitle>
                  <CardDescription className="text-muted-foreground mt-1 text-sm">
                    Role: {org.role}
                  </CardDescription>
                </CardHeader>
                
                <CardFooter className="px-5 py-3">
                   <div className="flex items-center justify-between w-full">
                     <span className="text-xs text-muted-foreground">Joined {org.joined_at ? new Date(org.joined_at).toLocaleDateString() : 'N/A'}</span>
                     <ArrowRight className="h-4 w-4 text-muted-foreground group-hover:text-primary transition-colors group-hover:translate-x-1" />
                   </div>
                </CardFooter>
              </Card>
            ))}
          </div>
        ) : (
          <div className="flex flex-col items-center justify-center py-16 bg-background border border-border border-dashed rounded-xl shadow-sm">
            <div className="w-16 h-16 bg-primary/10 rounded-full flex items-center justify-center mb-4">
              <Building2 className="h-8 w-8 text-primary/50" />
            </div>
            <h3 className="text-lg font-bold text-foreground mb-1">No workspaces yet</h3>
            <p className="text-muted-foreground text-sm max-w-xs text-center mb-6">
              Create your first workspace to start collaborating.
            </p>
            <Button onClick={() => setIsCreateOpen(true)} className="h-11 px-4 rounded-xl shadow-md font-semibold text-base">
              <Plus className="h-4 w-4 mr-2" /> Create Workspace
            </Button>
          </div>
        )}
      </div>

      {/* 🟢 Create Workspace Modal */}
      <Dialog open={isCreateOpen} onOpenChange={setIsCreateOpen}>
        <DialogContent className="sm:max-w-[425px] p-6 rounded-xl">
          <DialogHeader>
            <DialogTitle className="text-xl font-semibold text-foreground">Create Workspace</DialogTitle>
            <DialogDescription className="text-base mt-1.5 text-muted-foreground">
              Give your team a dedicated space to collaborate.
            </DialogDescription>
          </DialogHeader>
          
          <Form onSubmit={handleCreateSubmit(onCreate)} errors={errCreate} className="space-y-6 pt-2">
            <div className="space-y-2">
              <Label htmlFor="nameCreate" className="text-foreground font-semibold text-sm">Workspace Name</Label>
              <Input 
                id="nameCreate" 
                placeholder="e.g. Acme Corp" 
                className="h-11 px-4 text-base rounded-xl bg-background border-input shadow-sm hover:border-ring/50 focus-visible:ring-4 focus-visible:ring-ring/15 transition-all"
                {...regCreate("name")} 
              />
              <FormFieldError errors={errCreate} name="name" />
            </div>
            
            <DialogFooter className="gap-2">
              <Button 
                type="button" 
                variant="outline" 
                onClick={() => setIsCreateOpen(false)}
                className="h-11 rounded-xl transition-all font-semibold text-base"
              >
                Cancel
              </Button>
              <Button 
                type="submit" 
                className="h-11 rounded-xl shadow-md transition-all font-semibold text-base" 
                disabled={createMutation.isPending}
              >
                {createMutation.isPending && <Loader2 className="h-5 w-5 animate-spin mr-2" />} 
                Create Workspace
              </Button>
            </DialogFooter>
          </Form>
        </DialogContent>
      </Dialog>

      {/* 🟢 Delete Confirm Modal */}
      <Dialog open={!!orgToDelete} onOpenChange={(open) => !open && setOrgToDelete(null)}>
        <DialogContent className="sm:max-w-[425px] p-6 rounded-xl border-destructive/20">
          <DialogHeader>
            <DialogTitle className="text-xl font-semibold flex items-center gap-2 text-foreground">
              <Trash2 className="h-5 w-5 text-destructive" />
              Delete Workspace
            </DialogTitle>
            <DialogDescription className="text-base mt-2 leading-relaxed text-muted-foreground">
              This action cannot be undone. This will permanently delete the <strong className="text-foreground font-semibold">{orgToDelete?.name}</strong> workspace and all its data.
            </DialogDescription>
          </DialogHeader>
          
          <DialogFooter className="gap-2 mt-4">
            <Button 
              variant="outline" 
              onClick={() => setOrgToDelete(null)}
              className="h-11 rounded-xl transition-all font-semibold text-base"
            >
              Cancel
            </Button>
            <Button
              onClick={() => orgToDelete && deleteMutation.mutate(orgToDelete.id)}
              disabled={deleteMutation.isPending}
              className="h-11 rounded-xl shadow-md transition-all font-semibold text-base bg-destructive text-destructive-foreground hover:bg-destructive/90"
            >
              {deleteMutation.isPending && <Loader2 className="h-5 w-5 animate-spin mr-2" />}
              Delete Workspace
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

    </div>
  );
}