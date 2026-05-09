"use client";

import React, { useState } from "react";
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
  DialogTrigger,
} from "@/components/ui/dialog";
import { useCreateBoardList } from "@/api/tasks";
import { handleApiError } from "@/api/api-errors";

interface CreateListDialogProps {
  channelId: string;
  trigger?: React.ReactNode;
  open?: boolean;
  onOpenChange?: (open: boolean) => void;
  position: number;
}

export function CreateListDialog({ 
  channelId, 
  trigger, 
  open: controlledOpen, 
  onOpenChange: controlledOnOpenChange,
  position
}: CreateListDialogProps) {
  const [internalOpen, setInternalOpen] = useState(false);
  const open = controlledOpen ?? internalOpen;
  const onOpenChange = controlledOnOpenChange ?? setInternalOpen;

  const [listName, setListName] = useState("");
  const [listNameError, setListNameError] = useState("");

  const createListMutation = useCreateBoardList();

  const handleCreateList = () => {
    if (!listName.trim()) {
      setListNameError("List name is required");
      return;
    }

    createListMutation.mutate({
      name: listName.trim(),
      channel_id: channelId,
      position,
    }, {
      onSuccess: () => {
        setListName("");
        setListNameError("");
        onOpenChange(false);
        toast.success("List created successfully");
      },
      onError: (error) =>
        handleApiError(error, {
          onOtherError: (message) => toast.error(message),
        }),
    });
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      {trigger && <DialogTrigger asChild>{trigger}</DialogTrigger>}
      <DialogContent className="sm:max-w-sm rounded-xl">
        <DialogHeader>
          <DialogTitle className="text-lg font-bold">Create List</DialogTitle>
          <DialogDescription className="text-xs">
            Add a new column to your Kanban board.
          </DialogDescription>
        </DialogHeader>
        <form
          onSubmit={(e) => {
            e.preventDefault();
            handleCreateList();
          }}
          className="space-y-4 py-4"
        >
          <div className="space-y-2">
            <Label htmlFor="list-name" className="text-foreground font-semibold text-sm">Name</Label>
            <Input
              id="list-name"
              value={listName}
              onChange={(event) => {
                setListName(event.target.value);
                setListNameError("");
              }}
              placeholder="e.g. To Do"
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
              disabled={createListMutation.isPending || !listName.trim()}
            >
              {createListMutation.isPending ? <ButtonSpinner /> : "Create"}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}
