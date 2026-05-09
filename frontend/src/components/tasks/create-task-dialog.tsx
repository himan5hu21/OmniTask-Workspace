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
import { useCreateTask } from "@/api/tasks";
import { handleApiError } from "@/api/api-errors";

interface CreateTaskDialogProps {
  orgId: string;
  channelId: string;
  listId: string;
  trigger?: React.ReactNode;
  open?: boolean;
  onOpenChange?: (open: boolean) => void;
}

export function CreateTaskDialog({ 
  orgId,
  channelId, 
  listId,
  trigger, 
  open: controlledOpen, 
  onOpenChange: controlledOnOpenChange 
}: CreateTaskDialogProps) {
  const [internalOpen, setInternalOpen] = useState(false);
  const open = controlledOpen ?? internalOpen;
  const onOpenChange = controlledOnOpenChange ?? setInternalOpen;

  const [taskTitle, setTaskTitle] = useState("");
  const [taskTitleError, setTaskTitleError] = useState("");

  const createTaskMutation = useCreateTask(channelId);

  const handleCreateTask = () => {
    if (!taskTitle.trim()) {
      setTaskTitleError("Task title is required");
      return;
    }

    createTaskMutation.mutate({
      title: taskTitle.trim(),
      list_id: listId,
      channel_id: channelId,
      org_id: orgId,
    }, {
      onSuccess: () => {
        setTaskTitle("");
        setTaskTitleError("");
        onOpenChange(false);
        toast.success("Task created successfully");
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
          <DialogTitle className="text-lg font-bold">Create Task</DialogTitle>
          <DialogDescription className="text-xs">
            Add a new card to this list.
          </DialogDescription>
        </DialogHeader>
        <form
          onSubmit={(e) => {
            e.preventDefault();
            handleCreateTask();
          }}
          className="space-y-4 py-4"
        >
          <div className="space-y-2">
            <Label htmlFor="task-title" className="text-foreground font-semibold text-sm">Title</Label>
            <Input
              id="task-title"
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
              disabled={createTaskMutation.isPending || !taskTitle.trim()}
            >
              {createTaskMutation.isPending ? <ButtonSpinner /> : "Create"}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}
