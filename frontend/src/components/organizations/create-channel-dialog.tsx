"use client";

import React, { useState } from "react";
import { toast } from "sonner";
import { OrbitalLoader } from "@/components/ui/orbital-loader";

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

import { useCreateChannel } from "@/api/channels";
import { handleApiError } from "@/api/api-errors";

interface CreateChannelDialogProps {
  orgId: string;
  trigger?: React.ReactNode;
  open?: boolean;
  onOpenChange?: (open: boolean) => void;
}

export function CreateChannelDialog({ 
  orgId, 
  trigger, 
  open: controlledOpen, 
  onOpenChange: controlledOnOpenChange 
}: CreateChannelDialogProps) {
  const [internalOpen, setInternalOpen] = useState(false);
  const open = controlledOpen ?? internalOpen;
  const onOpenChange = controlledOnOpenChange ?? setInternalOpen;

  const [channelName, setChannelName] = useState("");
  const [channelNameError, setChannelNameError] = useState("");

  const createChannelMutation = useCreateChannel();

  const handleCreateChannel = () => {
    if (!channelName.trim() || channelName.trim().length < 2) {
      setChannelNameError("Channel name must be at least 2 characters");
      return;
    }

    createChannelMutation.mutate({
      name: channelName.trim(),
      org_id: orgId,
    }, {
      onSuccess: () => {
        setChannelName("");
        setChannelNameError("");
        onOpenChange(false);
        toast.success("Channel created successfully");
      },
      onError: (error) =>
        handleApiError(error, {
          uniqueName: () => setChannelNameError("That channel name already exists in this workspace"),
          accessDenied: () => toast.error("You do not have permission to create channels"),
          onOtherError: (message) => toast.error(message),
        }),
    });
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      {trigger && <DialogTrigger asChild>{trigger}</DialogTrigger>}
      <DialogContent className="sm:max-w-sm rounded-xl">
        <DialogHeader>
          <DialogTitle className="text-lg font-bold">Create Channel</DialogTitle>
          <DialogDescription className="text-xs">
            Initialize a new sector for team communication.
          </DialogDescription>
        </DialogHeader>
        <form
          onSubmit={(e) => {
            e.preventDefault();
            handleCreateChannel();
          }}
          className="space-y-4 py-4"
        >
          <div className="space-y-2">
            <Label htmlFor="channel-name" className="text-foreground font-semibold text-sm">Name</Label>
            <Input
              id="channel-name"
              value={channelName}
              onChange={(event) => {
                setChannelName(event.target.value);
                setChannelNameError("");
              }}
              placeholder="e.g. general"
              autoFocus
            />
            {channelNameError ? <p className="text-xs text-destructive">{channelNameError}</p> : null}
          </div>
          <DialogFooter>
            <Button type="button" variant="ghost" size="sm" onClick={() => onOpenChange(false)}>
              Cancel
            </Button>
            <Button 
              type="submit"
              size="sm"
              disabled={createChannelMutation.isPending || !channelName.trim()}
            >
              {createChannelMutation.isPending ? <OrbitalLoader size="sm" variant="minimal" color="currentColor" /> : "Create"}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}
