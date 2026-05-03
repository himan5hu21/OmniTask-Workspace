"use client";

import { useState } from "react";
import Link from "next/link";
import { useForm } from "react-hook-form";
import * as z from "zod";
import { 
  ArrowRight, Calendar, Check, AtSign, CheckCircle2, 
  AlertTriangle, Folder, PlusCircle, MoreVertical, Trash2 
} from "lucide-react";
import { OrbitalLoader } from "@/components/ui/orbital-loader";
import { toast } from "sonner";

import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle, DialogFooter, DialogTrigger } from "@/components/ui/dialog";
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger } from "@/components/ui/dropdown-menu";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { ScrollArea } from "@/components/ui/scroll-area";

import { createZodResolver, Form, FormFieldError } from "@/lib/form";
import { handleApiError } from "@/api/api-errors";
import { useAuthProfile } from "@/api/auth";
import { useOrganizations, useCreateOrganization, useDeleteOrganization } from "@/api/organizations";
import type { Organization } from "@/api/organizations";

const orgSchema = z.object({
  name: z.string().min(3, { message: "Name must be at least 3 characters" }),
});

export default function DashboardPage() {
  const { user } = useAuthProfile();
  const { organizations = [] } = useOrganizations();
  const createMutation = useCreateOrganization();
  const deleteMutation = useDeleteOrganization();

  const [isCreateOpen, setCreateOpen] = useState(false);
  const [orgToDelete, setOrgToDelete] = useState<Organization | null>(null);

  const form = useForm<z.infer<typeof orgSchema>>({
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
        uniqueName: () => form.setError("name", { message: "This organization name is already taken" }),
        onOtherError: (message) => toast.error(message),
      }, "Failed to create organization");
    }
  };

  const onDelete = async (id: string) => {
    try {
      await deleteMutation.mutateAsync(id);
      toast.success("Organization deleted successfully");
      setOrgToDelete(null);
    } catch {
      toast.error("Failed to delete organization");
    }
  };

  const currentDate = new Date().toLocaleDateString('en-US', { 
    weekday: 'long', month: 'long', day: 'numeric', year: 'numeric' 
  });

  return (
    <div className="w-full max-w-7xl mx-auto py-5">
      <div className="mb-8">
        <h1 className="text-2xl md:text-3xl font-bold text-foreground mb-1">
          Good morning, {user?.name?.split(' ')[0] || 'User'}
        </h1>
        <p className="text-muted-foreground text-sm">{currentDate}</p>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 px-0.5">
        {/* Widget A: My Tasks */}
        <Card className="lg:col-span-2 bg-card border-border flex flex-col h-[400px] shadow-sm">
          <CardHeader className="p-4 border-b border-border flex flex-row justify-between items-center space-y-0">
            <CardTitle className="text-base text-foreground font-bold">My Tasks</CardTitle>
            <Button variant="ghost" size="sm" className="text-muted-foreground hover:text-foreground text-xs h-8 px-2">
              View All <ArrowRight className="ml-1 h-3 w-3" />
            </Button>
          </CardHeader>
          <CardContent className="p-0 flex-1 min-h-0">
            <ScrollArea className="h-full">
              <div className="p-4 space-y-1">
                {/* Task 1 */}
                <div className="group flex items-center gap-4 p-3 rounded-lg hover:bg-accent transition-colors cursor-pointer border border-transparent hover:border-border">
                  <div className="w-5 h-5 rounded border-2 border-muted-foreground/50 flex-shrink-0 group-hover:border-primary transition-colors"></div>
                  <div className="flex-1 min-w-0">
                    <h3 className="text-sm font-medium text-foreground truncate mb-1">Finalize Q4 Marketing Budget</h3>
                    <div className="flex items-center gap-2">
                      <span className="text-[10px] uppercase font-bold text-muted-foreground bg-background px-2 py-0.5 rounded border border-border">Marketing</span>
                      <span className="text-xs text-muted-foreground flex items-center gap-1">
                        <Calendar className="h-3 w-3" /> Oct 25
                      </span>
                    </div>
                  </div>
                  <div className="flex-shrink-0">
                    <span className="bg-destructive/10 text-destructive text-[10px] font-bold tracking-[0.06em] px-2 py-1 rounded-full uppercase">High</span>
                  </div>
                </div>

                {/* Task 2 */}
                <div className="group flex items-center gap-4 p-3 rounded-lg hover:bg-accent transition-colors cursor-pointer border border-transparent hover:border-border">
                  <div className="w-5 h-5 rounded border-2 border-muted-foreground/50 flex-shrink-0 group-hover:border-primary transition-colors"></div>
                  <div className="flex-1 min-w-0">
                    <h3 className="text-sm font-medium text-foreground truncate mb-1">Review new design system components</h3>
                    <div className="flex items-center gap-2">
                      <span className="text-[10px] uppercase font-bold text-muted-foreground bg-background px-2 py-0.5 rounded border border-border">Design</span>
                      <span className="text-xs text-muted-foreground flex items-center gap-1">
                        <Calendar className="h-3 w-3" /> Oct 26
                      </span>
                    </div>
                  </div>
                  <div className="flex-shrink-0">
                    <span className="bg-amber-500/10 text-amber-500 text-[10px] font-bold tracking-[0.06em] px-2 py-1 rounded-full uppercase">Med</span>
                  </div>
                </div>

                {/* Task 3 (Completed) */}
                <div className="group flex items-center gap-4 p-3 rounded-lg hover:bg-accent transition-colors cursor-pointer border border-transparent hover:border-border">
                  <div className="w-5 h-5 rounded border-2 border-primary bg-primary flex-shrink-0 flex items-center justify-center">
                    <Check className="h-3 w-3 text-primary-foreground" />
                  </div>
                  <div className="flex-1 min-w-0 opacity-50">
                    <h3 className="text-sm font-medium text-foreground truncate mb-1 line-through">Update staging server credentials</h3>
                    <div className="flex items-center gap-2">
                      <span className="text-[10px] uppercase font-bold text-muted-foreground bg-background px-2 py-0.5 rounded border border-border">DevOps</span>
                    </div>
                  </div>
                  <div className="flex-shrink-0 opacity-50">
                    <span className="bg-emerald-500/10 text-emerald-500 text-[10px] font-bold tracking-[0.06em] px-2 py-1 rounded-full uppercase">Low</span>
                  </div>
                </div>
              </div>
            </ScrollArea>
          </CardContent>
        </Card>

        {/* Widget B: Recent Notifications */}
        <Card className="bg-card border-border flex flex-col gap-0 h-[400px] shadow-sm pb-0">
          <CardHeader className="p-4 border-b border-border space-y-0">
            <CardTitle className="text-base text-foreground font-bold">Recent Activity</CardTitle>
          </CardHeader>
          <CardContent className="p-0 flex-1 min-h-0 m-0">
            <ScrollArea className="h-full">
              <div className="p-4 space-y-5">
                <div className="flex gap-3 relative">
                  <div className="absolute left-0 top-2 w-2 h-2 rounded-full bg-primary"></div>
                  <div className="w-8 h-8 rounded-full bg-primary/20 text-primary flex items-center justify-center flex-shrink-0 ml-3">
                    <AtSign className="h-4 w-4" />
                  </div>
                  <div>
                    <p className="text-sm text-foreground"><span className="font-bold">Sarah Jenkins</span> mentioned you in <span className="text-primary hover:underline cursor-pointer">Project Alpha</span></p>
                    <p className="text-xs text-muted-foreground mt-1">10 mins ago</p>
                  </div>
                </div>

                <div className="flex gap-3 relative pl-3">
                  <div className="w-8 h-8 rounded-full bg-emerald-500/20 text-emerald-500 flex items-center justify-center flex-shrink-0">
                    <CheckCircle2 className="h-4 w-4" />
                  </div>
                  <div>
                    <p className="text-sm text-muted-foreground"><span className="font-bold text-foreground">Mike Thompson</span> completed <span className="text-foreground">API Integration</span></p>
                    <p className="text-xs text-muted-foreground mt-1">1 hour ago</p>
                  </div>
                </div>

                <div className="flex gap-3 relative pl-3">
                  <div className="w-8 h-8 rounded-full bg-amber-500/20 text-amber-500 flex items-center justify-center flex-shrink-0">
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
        </Card>

        {/* Widget C: Organization Quick Access */}
        <Card className="lg:col-span-3 bg-card border-border p-6 shadow-sm">
          <h2 className="text-base font-bold text-foreground mb-4">Organization Quick Access</h2>
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
            
            {organizations.map((org, i) => (
              <div key={org.id} className="relative group bg-background border border-border rounded-lg p-4 hover:border-primary hover:bg-accent transition-all shadow-sm">
                <Link href={`/organizations/${org.id}`} className="absolute inset-0 z-0" />
                
                <div className="flex justify-between items-start mb-3 relative z-10">
                  <div className="flex items-center gap-3">
                    <div className="w-10 h-10 rounded-lg bg-primary/10 border border-primary/20 flex items-center justify-center text-primary font-bold text-lg shadow-sm uppercase">
                      {org.name.charAt(0)}
                    </div>
                    <div>
                      <h3 className="font-bold text-foreground group-hover:text-primary transition-colors truncate max-w-[120px]">{org.name}</h3>
                      <p className="text-xs text-muted-foreground">{org.currentUserRole === 'OWNER' ? 'Owner' : 'Member'}</p>
                    </div>
                  </div>
                  
                  {/* Delete Option if Owner */}
                  {org.currentUserRole === 'OWNER' && (
                    <DropdownMenu>
                      <DropdownMenuTrigger asChild>
                        <Button variant="ghost" size="icon" className="h-8 w-8 text-muted-foreground hover:text-foreground">
                          <MoreVertical className="h-4 w-4" />
                        </Button>
                      </DropdownMenuTrigger>
                      <DropdownMenuContent align="end" className="w-40">
                        <DropdownMenuItem 
                          className="text-destructive focus:text-destructive cursor-pointer"
                          onClick={() => setOrgToDelete(org)}
                        >
                          <Trash2 className="mr-2 h-4 w-4" /> Delete
                        </DropdownMenuItem>
                      </DropdownMenuContent>
                    </DropdownMenu>
                  )}
                </div>

                <div className="flex items-center justify-between mt-4 text-sm text-muted-foreground relative z-10">
                  <div className="flex items-center gap-1">
                    <Folder className="h-4 w-4" />
                    <span>Active</span>
                  </div>
                  <div className="flex -space-x-2">
                    {/* Simulated Avatars based on HTML design */}
                    <Avatar className="w-6 h-6 border-2 border-background z-20">
                      <AvatarImage src={`https://api.dicebear.com/7.x/avataaars/svg?seed=${org.name}1`} />
                      <AvatarFallback>U</AvatarFallback>
                    </Avatar>
                    <Avatar className="w-6 h-6 border-2 border-background z-10">
                      <AvatarImage src={`https://api.dicebear.com/7.x/avataaars/svg?seed=${org.name}2`} />
                      <AvatarFallback>U</AvatarFallback>
                    </Avatar>
                  </div>
                </div>
              </div>
            ))}

            {/* Create New Org Action */}
            <Dialog open={isCreateOpen} onOpenChange={setCreateOpen}>
              <DialogTrigger asChild>
                <div className="border border-dashed border-border rounded-lg p-4 flex flex-col items-center justify-center text-muted-foreground hover:text-foreground hover:border-primary hover:bg-background transition-all cursor-pointer min-h-[120px]">
                  <PlusCircle className="h-6 w-6 mb-2" />
                  <span className="text-sm font-medium">New Organization</span>
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

          </div>
        </Card>
      </div>

      {/* Delete Confirmation Dialog */}
      <Dialog open={!!orgToDelete} onOpenChange={(open) => !open && setOrgToDelete(null)}>
        <DialogContent className="sm:max-w-md bg-card border-destructive/20 rounded-xl">
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
            <Button variant="outline" onClick={() => setOrgToDelete(null)} className="rounded-lg">
              Cancel
            </Button>
            <Button
              onClick={() => orgToDelete && onDelete(orgToDelete.id)}
              disabled={deleteMutation.isPending}
              className="rounded-lg bg-destructive text-destructive-foreground hover:bg-destructive/90"
            >
              {deleteMutation.isPending && <OrbitalLoader size="sm" className="mr-2" />}
              Delete Workspace
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}