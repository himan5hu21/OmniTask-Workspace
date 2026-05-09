"use client";

import React, { useState, useEffect } from "react";
import { toast } from "sonner";
import { ButtonSpinner } from "@/components/ui/orbital-loader";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { useUpdateBoardList } from "@/api/tasks";
import { handleApiError } from "@/api/api-errors";

interface EditListDialogProps {
  channelId: string;
  listId: string;
  initialName: string;
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

export function EditListDialog({ 
  channelId, 
  listId,
  initialName,
  open, 
  onOpenChange,
}: EditListDialogProps) {
  const [listName, setListName] = useState(initialName);
  const [listNameError, setListNameError] = useState("");


  const updateListMutation = useUpdateBoardList(channelId);

  const handleUpdateList = () => {
    if (!listName.trim()) {
      setListNameError("List name is required");
      return;
    }

    updateListMutation.mutate({
      id: listId,
      data: { name: listName.trim() },
    }, {
      onSuccess: () => {
        setListNameError("");
        onOpenChange(false);
        toast.success("List updated successfully");
      },
      onError: (error) =>
        handleApiError(error, {
          onOtherError: (message) => toast.error(message),
        }),
    });
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-sm rounded-xl">
        <DialogHeader>
          <DialogTitle className="text-lg font-bold">Edit List</DialogTitle>
          <DialogDescription className="text-xs">
            Change the name of your column.
          </DialogDescription>
        </DialogHeader>
        <form
          onSubmit={(e) => {
            e.preventDefault();
            handleUpdateList();
          }}
          className="space-y-4 py-4"
        >
          <div className="space-y-2">
            <Label htmlFor="edit-list-name" className="text-foreground font-semibold text-sm">Name</Label>
            <Input
              id="edit-list-name"
              value={listName}
              onChange={(event) => {
                setListName(event.target.value);
                setListNameError("");
              }}
              placeholder="e.g. Done"
              autoFocus
            />
            {listNameError ? <p className="text-xs text-destructive">{listNameError}</p> : null}
          </div>
          <DialogFooter>
            <Button type="button" variant="ghost" size="sm" onClick={() => onOpenChange(false)}>
              Cancel
            </Button>
            <Button 
              type="submit"
              size="sm"
              disabled={updateListMutation.isPending || !listName.trim() || listName.trim() === initialName}
            >
              {updateListMutation.isPending ? <ButtonSpinner /> : "Save"}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}
