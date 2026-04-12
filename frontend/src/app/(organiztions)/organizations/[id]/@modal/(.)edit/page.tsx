// src/app/organizations/[id]/@modal/(.)edit/page.tsx
"use client";

import { useParams, useRouter } from "next/navigation";
import { useForm } from "react-hook-form";
import * as z from "zod";
import { Loader2 } from "lucide-react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { createZodResolver, Form, FormFieldError } from "@/lib/form";
import { handleApiError } from "@/lib/api-errors";
import { useUpdateOrganization, useOrganization } from "@/hooks/useOrganizations";

const orgSchema = z.object({
  name: z.string().min(3, { message: "Name must be at least 3 characters" }),
});
type OrgFormValues = z.infer<typeof orgSchema>;

export default function EditWorkspacePage() {
  const params = useParams();
  const router = useRouter();
  const orgId = params.id as string;

  const { organization } = useOrganization(orgId);

  const { register, handleSubmit, formState: { errors }, setError } = useForm<OrgFormValues>({
    resolver: createZodResolver(orgSchema),
  });

  const updateMutation = useUpdateOrganization({
    onSuccess: () => {
      toast.success("Workspace name updated successfully");
      router.back();
    },
    onError: (error) => {
      handleApiError(
        error,
        {
          uniqueName: () => setError("name", { type: "manual", message: "A workspace with this name already exists" }),
          accessDenied: () => toast.error("You don't have permission to update this workspace"),
          onOtherError: (message: string) => toast.error(message)
        },
        "Failed to update workspace name. Please try again."
      );
    }
  });

  const onSubmit = (data: OrgFormValues) => {
    updateMutation.mutate({ orgId, data });
  };

  const handleClose = () => {
    router.back();
  };

  return (
    <Dialog open={true} onOpenChange={handleClose}>
      <DialogContent className="sm:max-w-[425px] p-6 rounded-xl">
        <DialogHeader>
          <DialogTitle className="text-xl font-semibold text-foreground">Edit Workspace</DialogTitle>
          <DialogDescription className="text-base mt-1.5 text-muted-foreground">
            Update your workspace settings.
          </DialogDescription>
        </DialogHeader>
        
        <Form onSubmit={handleSubmit(onSubmit)} errors={errors} className="space-y-6 pt-2">
          <div className="space-y-2">
            <Label htmlFor="name" className="text-foreground font-semibold text-sm">Workspace Name</Label>
            <Input
              id="name"
              defaultValue={organization?.name || ""}
              className="h-11 px-4 text-base rounded-xl bg-background border-input shadow-sm hover:border-ring/50 focus-visible:ring-4 focus-visible:ring-ring/15 transition-all"
              {...register("name")}
            />
            <FormFieldError errors={errors} name="name" />
          </div>
          
          <DialogFooter className="gap-2 bg-background p-2">
            <Button
              type="button"
              variant="outline"
              onClick={handleClose}
              className="h-11 rounded-xl transition-all font-semibold text-base"
            >
              Cancel
            </Button>
            <Button
              type="submit"
              className="h-11 rounded-xl shadow-md transition-all font-semibold text-base"
              disabled={updateMutation.isPending}
            >
              {updateMutation.isPending && <Loader2 className="h-5 w-5 animate-spin mr-2" />}
              Save Changes
            </Button>
          </DialogFooter>
        </Form>
      </DialogContent>
    </Dialog>
  );
}
