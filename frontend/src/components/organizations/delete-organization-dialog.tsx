"use client";

import { Trash2, AlertTriangle } from "lucide-react";
import { toast } from "sonner";
import { OrbitalLoader } from "@/components/ui/orbital-loader";

import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";

import { useDeleteOrganization } from "@/api/organizations";
import { handleApiError } from "@/api/api-errors";

interface DeleteOrganizationDialogProps {
  orgId: string;
  orgName: string;
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onSuccess?: () => void;
}

export function DeleteOrganizationDialog({ 
  orgId, 
  orgName,
  open, 
  onOpenChange,
  onSuccess
}: DeleteOrganizationDialogProps) {
  const deleteOrgMutation = useDeleteOrganization();

  const handleDelete = () => {
    deleteOrgMutation.mutate(orgId, {
      onSuccess: () => {
        toast.success("Workspace deleted successfully");
        onOpenChange(false);
        if (onSuccess) {
          onSuccess();
        }
      },
      onError: (error) =>
        handleApiError(error, {
          onOtherError: (message) => toast.error(message),
        }, "Failed to delete workspace"),
    });
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-md rounded-xl bg-card border-border shadow-2xl">
        <DialogHeader className="space-y-3">
          <div className="h-12 w-12 rounded-full bg-destructive/10 flex items-center justify-center text-destructive mb-2">
            <AlertTriangle className="h-6 w-6" />
          </div>
          <DialogTitle className="text-xl font-bold flex items-center gap-2 text-foreground">
            Delete Workspace
          </DialogTitle>
          <DialogDescription className="text-sm text-muted-foreground leading-relaxed">
            This action is <span className="font-bold text-destructive">permanent</span> and cannot be undone. 
            All channels, messages, and files in <span className="font-bold text-foreground">&quot;{orgName}&quot;</span> will be permanently removed.
          </DialogDescription>
        </DialogHeader>

        <div className="py-4 px-4 bg-destructive/5 rounded-lg border border-destructive/10 mt-2">
          <p className="text-xs text-destructive font-medium flex items-center gap-2">
            <Trash2 className="h-3 w-3" />
            Are you absolutely sure you want to proceed?
          </p>
        </div>

        <DialogFooter className="mt-6 sm:justify-end gap-3">
          <Button 
            type="button" 
            variant="ghost" 
            className="rounded-lg font-semibold" 
            onClick={() => onOpenChange(false)}
            disabled={deleteOrgMutation.isPending}
          >
            Cancel
          </Button>
          <Button 
            variant="destructive"
            className="rounded-lg px-6 font-bold shadow-lg shadow-destructive/20"
            onClick={handleDelete}
            disabled={deleteOrgMutation.isPending}
          >
            {deleteOrgMutation.isPending ? (
              <>
                <OrbitalLoader size="sm" variant="minimal" className="mr-2" />
                Deleting...
              </>
            ) : (
              "Delete Workspace"
            )}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
