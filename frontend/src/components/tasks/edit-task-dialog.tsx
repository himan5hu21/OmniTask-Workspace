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
import { useUpdateTask } from "@/api/tasks";
import { handleApiError } from "@/api/api-errors";
import { useSyncedState } from "@/hooks/useSyncedState";

interface EditTaskDialogProps {
  channelId: string;
  taskId: string;
  initialTitle: string;
  trigger?: React.ReactNode;
  open?: boolean;
  onOpenChange?: (open: boolean) => void;
}

export function EditTaskDialog({ 
  channelId, 
  taskId,
  initialTitle,
  trigger, 
  open: controlledOpen, 
  onOpenChange: controlledOnOpenChange 
}: EditTaskDialogProps) {
  const [internalOpen, setInternalOpen] = useState(false);
  const open = controlledOpen ?? internalOpen;
  const onOpenChange = controlledOnOpenChange ?? setInternalOpen;

  const [taskTitle, setTaskTitle] = useSyncedState(initialTitle);
  const [taskTitleError, setTaskTitleError] = useState("");

  const updateTaskMutation = useUpdateTask(channelId);

  const handleUpdateTask = () => {
    if (!taskTitle.trim()) {
      setTaskTitleError("Task title is required");
      return;
    }

    updateTaskMutation.mutate({
      id: taskId,
      data: { title: taskTitle.trim() },
    }, {
      onSuccess: () => {
        setTaskTitleError("");
        onOpenChange(false);
        toast.success("Task updated successfully");
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
          <DialogTitle className="text-lg font-bold">Edit Task</DialogTitle>
          <DialogDescription className="text-xs">
            Update the title of this card.
          </DialogDescription>
        </DialogHeader>
        <form
          onSubmit={(e) => {
            e.preventDefault();
            handleUpdateTask();
          }}
          className="space-y-4 py-4"
        >
          <div className="space-y-2">
            <Label htmlFor="edit-task-title" className="text-foreground font-semibold text-sm">Title</Label>
            <Input
              id="edit-task-title"
              value={taskTitle}
              onChange={(event) => {
                setTaskTitle(event.target.value);
                setTaskTitleError("");
              }}
              placeholder="e.g. Fix login bug"
              autoFocus
            />
            {taskTitleError ? <p className="text-xs text-destructive">{taskTitleError}</p> : null}
          </div>
          <DialogFooter>
            <Button type="button" variant="ghost" size="sm" onClick={() => onOpenChange(false)}>
              Cancel
            </Button>
            <Button 
              type="submit"
              size="sm"
              disabled={updateTaskMutation.isPending || !taskTitle.trim() || taskTitle.trim() === initialTitle.trim()}
            >
              {updateTaskMutation.isPending ? <ButtonSpinner /> : "Save"}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}
