"use client";

import dynamic from "next/dynamic";
import { useState } from "react";
import { useForm } from "react-hook-form";
import * as z from "zod";
import { LayoutGrid, List, Plus, Calendar } from "lucide-react";
import { ButtonSpinner } from "@/components/ui/orbital-loader";
import Spinner from "@/components/Loading";
import { toast } from "sonner";

import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle, DialogFooter, DialogTrigger } from "@/components/ui/dialog";

import { createZodResolver, Form, FormFieldError } from "@/lib/form";
import { handleApiError } from "@/api/api-errors";
import { useAuthProfile } from "@/api/auth";
import { useOrganizations, useCreateOrganization, useUpdateOrganization } from "@/api/organizations";
import { AbilityProvider } from "@/components/providers/AbilityProvider";
import { useIsMounted, useServerValue } from "@/hooks/useIsMounted";
import type { Organization } from "@/api/organizations";
const DeleteOrganizationDialog = dynamic(
  () => import("@/components/organizations/delete-organization-dialog").then(mod => mod.DeleteOrganizationDialog),
  { ssr: false }
);
import { OrganizationCard, OrganizationListRow } from "@/components/organizations/OrganizationCard";

const orgSchema = z.object({
  name: z.string().min(3, { message: "Name must be at least 3 characters" }),
});

export default function DashboardPage() {
  const { user } = useAuthProfile();
  const { organizations = [], isLoading: isOrgsLoading, isError: isOrgsError } = useOrganizations();
  
  const [isCreateOpen, setCreateOpen] = useState(false);
  const [isUpdateOpen, setUpdateOpen] = useState(false);
  const [orgToDelete, setOrgToDelete] = useState<Organization | null>(null);
  const [orgToEdit, setOrgToEdit] = useState<Organization | null>(null);
  const [viewMode, setViewMode] = useState<"grid" | "list">("grid");
  const isMounted = useIsMounted();
  
  const createMutation = useCreateOrganization();
  const updateMutation = useUpdateOrganization();

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

  const openEditDialog = (org: Organization) => {
    setOrgToEdit(org);
    updateForm.reset({ name: org.name });
    setUpdateOpen(true);
  };

  const greetingName = isMounted ? user?.name?.split(" ")[0] ?? "User" : "User";

  const getGreeting = () => {
    if (!isMounted) return "Good morning";
    const hour = new Date().getHours();
    if (hour < 12) return "Good morning";
    if (hour < 17) return "Good afternoon";
    return "Good evening";
  };
  const greeting = getGreeting();

  return (
    <div className="w-full max-w-7xl mx-auto py-6 px-8 space-y-8">
      {/* Top Banner Greeting */}
      <div>
        <h1 className="text-3xl md:text-4xl font-extrabold text-foreground mb-1 tracking-tight">
          {greeting}, {greetingName}
        </h1>
        <div className="flex items-center gap-1.5 text-muted-foreground text-sm font-semibold select-none mt-1.5">
          <Calendar className="h-4 w-4 shrink-0 text-muted-foreground/80" />
          <span>{currentDate || "Loading date..."}</span>
        </div>
      </div>

      <div className="space-y-6">
        {/* Section Header with List/Grid Toggle */}
        <div className="flex justify-between items-center pb-2 border-b border-border">
          <h2 className="text-lg font-bold tracking-tight text-foreground">Your Workspaces</h2>
          <div className="flex items-center gap-0.5 rounded-lg border border-border bg-muted/30 p-0.5">
            <Button
              variant="ghost"
              size="icon"
              className={`h-7 w-7 rounded-md p-0 ${viewMode === "grid" ? "bg-background text-foreground shadow-sm" : "text-muted-foreground hover:text-foreground"}`}
              onClick={() => setViewMode("grid")}
            >
              <LayoutGrid className="h-4 w-4" />
            </Button>
            <Button
              variant="ghost"
              size="icon"
              className={`h-7 w-7 rounded-md p-0 ${viewMode === "list" ? "bg-background text-foreground shadow-sm" : "text-muted-foreground hover:text-foreground"}`}
              onClick={() => setViewMode("list")}
            >
              <List className="h-4 w-4" />
            </Button>
          </div>
        </div>

        {/* Workspaces List/Grid */}
        {isOrgsLoading ? (
          <div className="flex justify-center items-center py-12">
            <Spinner size="md" />
          </div>
        ) : isOrgsError ? (
          <div className="flex flex-col items-center justify-center py-12 gap-2 text-center border border-border border-dashed rounded-xl bg-card">
            <p className="text-sm font-semibold text-destructive">Failed to load organizations</p>
            <p className="text-xs text-muted-foreground">Something went wrong. Please refresh the page and try again.</p>
          </div>
        ) : (
          <div className={viewMode === "grid" ? "grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6" : "flex flex-col gap-3"}>
            
            {/* Active Organizations list */}
            {organizations.map((org) => (
              <AbilityProvider key={org.id} orgRole={org.currentUserRole}>
                {viewMode === "grid" ? (
                  <OrganizationCard 
                    org={org} 
                    onEdit={openEditDialog} 
                    onDelete={setOrgToDelete} 
                  />
                ) : (
                  <OrganizationListRow
                    org={org}
                    onEdit={openEditDialog}
                    onDelete={setOrgToDelete}
                  />
                )}
              </AbilityProvider>
            ))}

            {/* Create New Org Action card/row */}
            <Dialog open={isCreateOpen} onOpenChange={setCreateOpen}>
              <DialogTrigger asChild>
                {viewMode === "grid" ? (
                  <div className="border-2 border-dashed border-border rounded-xl p-5 flex flex-col items-center justify-center gap-3 text-muted-foreground hover:text-primary hover:border-primary/50 hover:bg-accent/10 transition-all cursor-pointer min-h-[175px] shadow-sm select-none">
                    <div className="w-12 h-12 rounded-full bg-muted/40 border border-dashed border-muted-foreground/30 flex items-center justify-center shrink-0">
                      <Plus className="h-5 w-5" />
                    </div>
                    <span className="text-sm font-semibold">New Workspace</span>
                  </div>
                ) : (
                  <div className="border border-dashed border-border rounded-xl p-4 flex items-center justify-center gap-2 text-muted-foreground hover:text-primary hover:border-primary/50 hover:bg-accent/10 transition-all cursor-pointer shadow-sm w-full select-none">
                    <Plus className="h-4 w-4" />
                    <span className="text-sm font-semibold">New Workspace</span>
                  </div>
                )}
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
                    <Label htmlFor="name" className="text-foreground font-semibold">Organization Name</Label>
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
                      {createMutation.isPending && <ButtonSpinner className="mr-2" />}
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
                    <Label htmlFor="edit-name" className="text-foreground font-semibold">Organization Name</Label>
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
                      {updateMutation.isPending && <ButtonSpinner className="mr-2" />}
                      Save Changes
                    </Button>
                  </DialogFooter>
                </Form>
              </DialogContent>
            </Dialog>

            {/* Delete Confirmation Dialog */}
            <DeleteOrganizationDialog
              orgId={orgToDelete?.id || ""}
              orgName={orgToDelete?.name || ""}
              open={!!orgToDelete}
              onOpenChange={(open) => !open && setOrgToDelete(null)}
            />

          </div>
        )}
      </div>
    </div>
  );
}
