"use client";

import { useState } from "react";
import Link from "next/link";
import { useForm } from "react-hook-form";
import * as z from "zod";
import { PlusCircle, Trash2, Pencil } from "lucide-react";
import { OrbitalLoader } from "@/components/ui/orbital-loader";
import { toast } from "sonner";

import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card } from "@/components/ui/card";
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle, DialogFooter, DialogTrigger } from "@/components/ui/dialog";

import { createZodResolver, Form, FormFieldError } from "@/lib/form";
import { handleApiError } from "@/api/api-errors";
import { useAuthProfile } from "@/api/auth";
import { useOrganizations, useCreateOrganization, useDeleteOrganization, useUpdateOrganization } from "@/api/organizations";
import { Can, AbilityContext } from "@/lib/casl";
import { AbilityProvider } from "@/components/providers/AbilityProvider";
import { useAbility } from "@casl/react";
import { useIsMounted, useServerValue } from "@/hooks/useIsMounted";
import type { Organization } from "@/api/organizations";

const orgSchema = z.object({
  name: z.string().min(3, { message: "Name must be at least 3 characters" }),
});

interface OrganizationCardProps {
  org: Organization;
  onEdit: (org: Organization) => void;
  onDelete: (org: Organization) => void;
}

function OrganizationCard({ org, onEdit, onDelete }: OrganizationCardProps) {
  const ability = useAbility(AbilityContext);
  const canUpdate = ability.can("update", "Organization");
  const canDelete = ability.can("delete", "Organization");
  const hasManagementActions = canUpdate || canDelete;

  return (
    <div className="relative group bg-background border border-border rounded-lg p-4 flex flex-col justify-center min-h-[80px] hover:border-primary/50 hover:bg-accent/30 transition-all shadow-sm overflow-hidden">
      <Link href={`/organizations/${org.id}`} className="absolute inset-0 z-20" />
      
      {/* Hover Actions Overlay */}
      {hasManagementActions && (
        <div className="absolute inset-0 z-30 flex items-center rounded-lg justify-center gap-2 bg-background/60 backdrop-blur-[2px] opacity-0 group-hover:opacity-100 transition-all duration-200 translate-y-2 group-hover:translate-y-0 pointer-events-none">
          <Can I="update" a="Organization">
            <Button 
              variant="secondary" 
              size="sm" 
              className="h-9 w-9 p-0 rounded-full shadow-lg border border-border hover:bg-primary hover:text-primary-foreground transition-colors pointer-events-auto"
              onClick={(e) => {
                e.preventDefault();
                e.stopPropagation();
                onEdit(org);
              }}
            >
              <Pencil className="h-4 w-4" />
            </Button>
          </Can>
          
          <Can I="delete" a="Organization">
            <Button 
              variant="secondary" 
              size="sm" 
              className="h-9 w-9 p-0 rounded-full shadow-lg border border-border hover:bg-destructive hover:text-destructive-foreground transition-colors pointer-events-auto"
              onClick={(e) => {
                e.preventDefault();
                e.stopPropagation();
                onDelete(org);
              }}
            >
              <Trash2 className="h-4 w-4" />
            </Button>
          </Can>
        </div>
      )}

      <div className="flex flex-col items-start relative z-10">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-lg bg-primary/10 border border-primary/20 flex items-center justify-center text-primary font-bold text-lg shadow-sm uppercase">
            {org.name.charAt(0)}
          </div>
          <div>
            <h3 className="font-bold text-foreground group-hover:text-primary transition-colors truncate max-w-[120px]">{org.name}</h3>
            <p className="text-xs text-muted-foreground">{org.currentUserRole === 'OWNER' ? 'Owner' : 'Member'}</p>
          </div>
        </div>
      </div>
    </div>
  );
}

export default function DashboardPage() {
  const { user } = useAuthProfile();
  const { organizations = [] } = useOrganizations();
  
  const [isCreateOpen, setCreateOpen] = useState(false);
  const [isUpdateOpen, setUpdateOpen] = useState(false);
  const [orgToDelete, setOrgToDelete] = useState<Organization | null>(null);
  const [orgToEdit, setOrgToEdit] = useState<Organization | null>(null);
  const isMounted = useIsMounted();
  
  const createMutation = useCreateOrganization();
  const updateMutation = useUpdateOrganization();
  const deleteMutation = useDeleteOrganization();

  const currentDate = useServerValue(
    () =>
      new Date().toLocaleDateString("en-US", {
        weekday: "long",
        month: "long",
        day: "numeric",
        year: "numeric",
      }),
    "Loading date..."
  );

  const form = useForm<z.infer<typeof orgSchema>>({
    resolver: createZodResolver(orgSchema),
    defaultValues: { name: "" },
  });

  const updateForm = useForm<z.infer<typeof orgSchema>>({
    resolver: createZodResolver(orgSchema),
    defaultValues: { name: "" },
  });

  const onSubmit = async (values: z.infer<typeof orgSchema>) => {
    try {
      await createMutation.mutateAsync(values);
      toast.success("Organization created successfully");
      setCreateOpen(false);
      form.reset();
    } catch (error) {
      handleApiError(error, {
        uniqueName: (msg) => {
          form.setError("name", { message: msg || "This organization name is already taken" });
        },
        onOtherError: (message) => toast.error(message),
      }, "Failed to create organization");
    }
  };

  const onUpdateSubmit = async (values: z.infer<typeof orgSchema>) => {
    if (!orgToEdit) return;
    try {
      await updateMutation.mutateAsync({ orgId: orgToEdit.id, data: values });
      toast.success("Organization updated successfully");
      setUpdateOpen(false);
      setOrgToEdit(null);
    } catch (error) {
      handleApiError(error, {
        uniqueName: (msg) => {
          updateForm.setError("name", { message: msg || "This organization name is already taken" });
        },
        onOtherError: (message) => toast.error(message),
      }, "Failed to update organization");
    }
  };

  const handleDelete = async () => {
    if (!orgToDelete) return;
    try {
      await deleteMutation.mutateAsync(orgToDelete.id);
      toast.success("Organization deleted successfully");
      setOrgToDelete(null);
    } catch (error) {
      handleApiError(error, {}, "Failed to delete organization");
    }
  };

  const openEditDialog = (org: Organization) => {
    setOrgToEdit(org);
    updateForm.reset({ name: org.name });
    setUpdateOpen(true);
  };

  const greetingName = isMounted ? user?.name?.split(" ")[0] ?? "User" : "User";

  return (
    <div className="w-full max-w-7xl mx-auto py-5">
      <div className="mb-8">
        <h1 className="text-2xl md:text-3xl font-bold text-foreground mb-1">
          Good morning, {greetingName}
        </h1>
        <p className="text-muted-foreground text-sm">{currentDate || "Loading date..."}</p>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 px-0.5">
        {/* Widget A: My Tasks */}
        {/* <Card className="lg:col-span-2 bg-card border-border flex flex-col h-[400px] shadow-sm">
          <CardHeader className="p-4 border-b border-border flex flex-row justify-between items-center space-y-0">
            <CardTitle className="text-base text-foreground font-bold">My Tasks</CardTitle>
            <Button variant="ghost" size="sm" className="text-muted-foreground hover:text-foreground text-xs h-8 px-2">
              View All <ArrowRight className="ml-1 h-3 w-3" />
            </Button>
          </CardHeader>
          <CardContent className="p-0 flex-1 min-h-0">
            <ScrollArea className="h-full">
              <div className="p-4 space-y-1">
                <div className="group flex items-center gap-4 p-3 rounded-lg hover:bg-accent transition-colors cursor-pointer border border-transparent hover:border-border">
                  <div className="w-5 h-5 rounded border-2 border-muted-foreground/50 shrink-0 group-hover:border-primary transition-colors"></div>
                  <div className="flex-1 min-w-0">
                    <h3 className="text-sm font-medium text-foreground truncate mb-1">Finalize Q4 Marketing Budget</h3>
                    <div className="flex items-center gap-2">
                      <span className="text-[10px] uppercase font-bold text-muted-foreground bg-background px-2 py-0.5 rounded border border-border">Marketing</span>
                      <span className="text-xs text-muted-foreground flex items-center gap-1">
                        <Calendar className="h-3 w-3" /> Oct 25
                      </span>
                    </div>
                  </div>
                  <div className="shrink-0">
                    <span className="bg-destructive/10 text-destructive text-[10px] font-bold tracking-[0.06em] px-2 py-1 rounded-full uppercase">High</span>
                  </div>
                </div>

                <div className="group flex items-center gap-4 p-3 rounded-lg hover:bg-accent transition-colors cursor-pointer border border-transparent hover:border-border">
                  <div className="w-5 h-5 rounded border-2 border-muted-foreground/50 shrink-0 group-hover:border-primary transition-colors"></div>
                  <div className="flex-1 min-w-0">
                    <h3 className="text-sm font-medium text-foreground truncate mb-1">Review new design system components</h3>
                    <div className="flex items-center gap-2">
                      <span className="text-[10px] uppercase font-bold text-muted-foreground bg-background px-2 py-0.5 rounded border border-border">Design</span>
                      <span className="text-xs text-muted-foreground flex items-center gap-1">
                        <Calendar className="h-3 w-3" /> Oct 26
                      </span>
                    </div>
                  </div>
                  <div className="shrink-0">
                    <span className="bg-amber-500/10 text-amber-500 text-[10px] font-bold tracking-[0.06em] px-2 py-1 rounded-full uppercase">Med</span>
                  </div>
                </div>

                <div className="group flex items-center gap-4 p-3 rounded-lg hover:bg-accent transition-colors cursor-pointer border border-transparent hover:border-border">
                  <div className="w-5 h-5 rounded border-2 border-primary bg-primary shrink-0 flex items-center justify-center">
                    <Check className="h-3 w-3 text-primary-foreground" />
                  </div>
                  <div className="flex-1 min-w-0 opacity-50">
                    <h3 className="text-sm font-medium text-foreground truncate mb-1 line-through">Update staging server credentials</h3>
                    <div className="flex items-center gap-2">
                      <span className="text-[10px] uppercase font-bold text-muted-foreground bg-background px-2 py-0.5 rounded border border-border">DevOps</span>
                    </div>
                  </div>
                  <div className="shrink-0 opacity-50">
                    <span className="bg-emerald-500/10 text-emerald-500 text-[10px] font-bold tracking-[0.06em] px-2 py-1 rounded-full uppercase">Low</span>
                  </div>
                </div>
              </div>
            </ScrollArea>
          </CardContent>
        </Card> */}

        {/* Widget B: Recent Notifications */}
        {/* <Card className="bg-card border-border flex flex-col gap-0 h-[400px] shadow-sm pb-0">
          <CardHeader className="p-4 border-b border-border space-y-0">
            <CardTitle className="text-base text-foreground font-bold">Recent Activity</CardTitle>
          </CardHeader>
          <CardContent className="p-0 flex-1 min-h-0 m-0">
            <ScrollArea className="h-full">
              <div className="p-4 space-y-5">
                <div className="flex gap-3 relative">
                  <div className="absolute left-0 top-2 w-2 h-2 rounded-full bg-primary"></div>
                  <div className="w-8 h-8 rounded-full bg-primary/20 text-primary flex items-center justify-center shrink-0 ml-3">
                    <AtSign className="h-4 w-4" />
                  </div>
                  <div>
                    <p className="text-sm text-foreground"><span className="font-bold">Sarah Jenkins</span> mentioned you in <span className="text-primary hover:underline cursor-pointer">Project Alpha</span></p>
                    <p className="text-xs text-muted-foreground mt-1">10 mins ago</p>
                  </div>
                </div>

                <div className="flex gap-3 relative pl-3">
                  <div className="w-8 h-8 rounded-full bg-emerald-500/20 text-emerald-500 flex items-center justify-center shrink-0">
                    <CheckCircle2 className="h-4 w-4" />
                  </div>
                  <div>
                    <p className="text-sm text-muted-foreground"><span className="font-bold text-foreground text-foreground">Mike Thompson</span> completed <span className="text-foreground">API Integration</span></p>
                    <p className="text-xs text-muted-foreground mt-1">1 hour ago</p>
                  </div>
                </div>

                <div className="flex gap-3 relative pl-3">
                  <div className="w-8 h-8 rounded-full bg-amber-500/20 text-amber-500 flex items-center justify-center shrink-0">
                    <AlertTriangle className="h-4 w-4" />
                  </div>
                  <div>
                    <p className="text-sm text-muted-foreground">System maintenance scheduled for tonight at 2AM EST.</p>
                    <p className="text-xs text-muted-foreground mt-1">3 hours ago</p>
                  </div>
                </div>
              </div>
            </ScrollArea>
          </CardContent>
        </Card> */}

        {/* Widget C: Organization */}
        <Card className="lg:col-span-3 bg-card border-border p-4 shadow-sm">
          <h2 className="text-lg font-semibold text-foreground mb-1">Organization</h2>
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
            
            {organizations.map((org) => (
              <AbilityProvider key={org.id} orgRole={org.currentUserRole}>
                <OrganizationCard 
                  org={org} 
                  onEdit={openEditDialog} 
                  onDelete={setOrgToDelete} 
                />
              </AbilityProvider>
            ))}

            {/* Create New Org Action */}
            <Dialog open={isCreateOpen} onOpenChange={setCreateOpen}>
              <DialogTrigger asChild>
                <div className="border border-dashed border-border rounded-lg p-4 flex items-center gap-3 text-muted-foreground hover:text-primary hover:border-primary/50 hover:bg-accent/30 transition-all cursor-pointer min-h-[80px] shadow-sm">
                  <div className="w-10 h-10 rounded-lg bg-muted/20 border border-dashed border-muted-foreground/30 flex items-center justify-center">
                    <PlusCircle className="h-5 w-5" />
                  </div>
                  <span className="text-sm font-semibold">New Organization</span>
                </div>
              </DialogTrigger>
              <DialogContent className="sm:max-w-md bg-card border-border rounded-xl">
                <DialogHeader>
                  <DialogTitle className="text-xl font-semibold text-foreground">Create Organization</DialogTitle>
                  <DialogDescription className="text-muted-foreground">
                    Create a new workspace to collaborate with your team.
                  </DialogDescription>
                </DialogHeader>
                <Form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4 mt-4">
                  <div className="space-y-2">
                    <Label htmlFor="name" className="text-foreground">Organization Name</Label>
                    <Input
                      id="name"
                      placeholder="e.g. Acme Corp"
                      {...form.register("name")}
                      disabled={createMutation.isPending}
                      className="h-11 bg-background border-border"
                    />
                    <FormFieldError errors={form.formState.errors} name="name" />
                  </div>
                  <DialogFooter className="mt-6 gap-2">
                    <Button type="button" variant="ghost" onClick={() => setCreateOpen(false)} className="rounded-lg">
                      Cancel
                    </Button>
                    <Button type="submit" disabled={createMutation.isPending} className="rounded-lg">
                      {createMutation.isPending && <OrbitalLoader size="sm" className="mr-2" />}
                      Create
                    </Button>
                  </DialogFooter>
                </Form>
              </DialogContent>
            </Dialog>

            {/* Update Org Dialog */}
            <Dialog open={isUpdateOpen} onOpenChange={setUpdateOpen}>
              <DialogContent className="sm:max-w-md bg-card border-border rounded-xl">
                <DialogHeader>
                  <DialogTitle className="text-xl font-semibold text-foreground">Edit Organization</DialogTitle>
                  <DialogDescription className="text-muted-foreground">
                    Update your workspace details.
                  </DialogDescription>
                </DialogHeader>
                <Form onSubmit={updateForm.handleSubmit(onUpdateSubmit)} className="space-y-4 mt-4">
                  <div className="space-y-2">
                    <Label htmlFor="edit-name" className="text-foreground">Organization Name</Label>
                    <Input
                      id="edit-name"
                      placeholder="e.g. Acme Corp"
                      {...updateForm.register("name")}
                      disabled={updateMutation.isPending}
                      className="h-11 bg-background border-border"
                    />
                    <FormFieldError errors={updateForm.formState.errors} name="name" />
                  </div>
                  <DialogFooter className="mt-6 gap-2">
                    <Button type="button" variant="ghost" onClick={() => setUpdateOpen(false)} className="rounded-lg">
                      Cancel
                    </Button>
                    <Button type="submit" disabled={updateMutation.isPending} className="rounded-lg">
                      {updateMutation.isPending && <OrbitalLoader size="sm" className="mr-2" />}
                      Save Changes
                    </Button>
                  </DialogFooter>
                </Form>
              </DialogContent>
            </Dialog>

            {/* Delete Confirmation Dialog */}
            <Dialog open={!!orgToDelete} onOpenChange={(open) => !open && setOrgToDelete(null)}>
              <DialogContent className="sm:max-w-md bg-card border-border rounded-xl">
                <DialogHeader>
                  <DialogTitle className="text-xl font-semibold text-destructive flex items-center gap-2">
                    <Trash2 className="h-5 w-5" />
                    Delete Organization
                  </DialogTitle>
                  <DialogDescription className="text-muted-foreground">
                    This action cannot be undone. This will permanently delete the 
                    <span className="font-bold text-foreground mx-1">{orgToDelete?.name}</span> 
                    organization and all its data.
                  </DialogDescription>
                </DialogHeader>
                <DialogFooter className="mt-6 gap-2">
                  <Button type="button" variant="ghost" onClick={() => setOrgToDelete(null)} className="rounded-lg">
                    Cancel
                  </Button>
                  <Button 
                    variant="destructive" 
                    onClick={handleDelete} 
                    disabled={deleteMutation.isPending}
                    className="rounded-lg"
                  >
                    {deleteMutation.isPending && <OrbitalLoader size="sm" className="mr-2" />}
                    Delete Permanently
                  </Button>
                </DialogFooter>
              </DialogContent>
            </Dialog>

          </div>
        </Card>
      </div>
    </div>
  );
}
