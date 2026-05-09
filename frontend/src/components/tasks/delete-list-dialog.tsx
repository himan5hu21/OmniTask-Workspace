"use client";

import { Trash2, AlertTriangle } from "lucide-react";
import { toast } from "sonner";
import { ButtonSpinner } from "@/components/ui/orbital-loader";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { useDeleteBoardList } from "@/api/tasks";
import { handleApiError } from "@/api/api-errors";

interface DeleteListDialogProps {
  channelId: string;
  listId: string;
  listName: string;
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

export function DeleteListDialog({ 
  channelId, 
  listId,
  listName,
  open, 
  onOpenChange,
}: DeleteListDialogProps) {
  const deleteListMutation = useDeleteBoardList(channelId);

  const handleDelete = () => {
    deleteListMutation.mutate(listId, {
      onSuccess: () => {
        toast.success("List deleted successfully");
        onOpenChange(false);
      },
      onError: (error) =>
        handleApiError(error, {
          onOtherError: (message) => toast.error(message),
        }, "Failed to delete list"),
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
            Delete List
          </DialogTitle>
          <DialogDescription className="text-sm text-muted-foreground leading-relaxed">
            This action is <span className="font-bold text-destructive">permanent</span> and cannot be undone. 
            The list <span className="font-bold text-foreground">&quot;{listName}&quot;</span> and all of its tasks will be permanently removed.
          </DialogDescription>
        </DialogHeader>

        <div className="py-4 px-4 bg-destructive/5 rounded-lg border border-destructive/10 mt-2">
          <p className="text-xs text-destructive font-medium flex items-center gap-2">
            <Trash2 className="h-3 w-3" />
            Are you sure you want to delete this column?
          </p>
        </div>

        <DialogFooter className="mt-6 sm:justify-end gap-3">
          <Button 
            type="button" 
            variant="ghost" 
            className="rounded-lg font-semibold" 
            onClick={() => onOpenChange(false)}
            disabled={deleteListMutation.isPending}
          >
            Cancel
          </Button>
          <Button 
            variant="destructive"
            className="rounded-lg px-6 font-bold shadow-lg shadow-destructive/20"
            onClick={handleDelete}
            disabled={deleteListMutation.isPending}
          >
            {deleteListMutation.isPending ? (
              <>
                <ButtonSpinner className="mr-2" />
                Deleting...
              </>
            ) : (
              "Delete List"
            )}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
