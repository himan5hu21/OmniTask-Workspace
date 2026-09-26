"use client";

/* 
 * UI Component & Icon Imports
 * Includes Lucide icons for visual representation and common utility components.
 */
import { useState, useRef, useEffect, useMemo } from "react";
import Image from "next/image";
import {
  AlignLeft,
  CheckSquare,
  MessageSquare,
  Calendar as CalendarIcon,
  Plus,
  PlusCircle,
  FileText,
  Check,
  Paperclip,
  List,
  ChevronsUp,
  Trash2,
  X,
  ZoomIn,
  ZoomOut,
  Download,
  ExternalLink,
  RotateCcw,
  History,
  UserPlus,
  UserMinus,
  Tag,
  TagIcon,
  Activity,
  GitCommitHorizontal,
  Pencil,
  CheckCircle2,
  Clock,
} from "lucide-react";
import { format } from "date-fns";
import { cn, getInitials } from "@/lib/utils";
import { buildAuthenticatedDownloadUrl, buildAuthenticatedFileUrl } from "@/lib/file-url";
import { TiptapEditor } from "@/components/TiptapEditor";

/* 
 * API & Data Management Hooks
 * Custom hooks for task-related operations like updating, commenting, 
 * checklist management, and member assignments.
 */
import {
  useTask,
  useUpdateTask,
  useTaskComments,
  useCreateComment,
  useUpdateChecklistItem,
  useDeleteChecklistItem,
  useAddChecklistItem,
  useCreateChecklist,
  useUpdateChecklist,
  useDeleteChecklist,
  useCreateSubtask,
  useDeleteTask,
  useAssignUser,
  useUnassignUser,
  useAddAttachment,
  useDeleteAttachment,
  useLabels,
  useAssignLabel,
  useUnassignLabel,
  useCreateLabel,
  useDeleteLabel,
  useTaskActivities,
  taskKeys,
  TaskUser,
  TaskPriority,
  type TaskActivity,
} from "@/api/tasks";
import { useQueryClient } from "@tanstack/react-query";
import { useChannelMembers } from "@/api/channels";
import { toast } from "sonner";
import { motion } from "framer-motion";
import { useAbility } from "@casl/react";
import { AbilityContext } from "@/lib/casl";
import { useAuthProfile } from "@/api/auth";
import { useTaskRealtime } from "@/hooks/useTaskRealtime";
import { useSyncedState } from "@/hooks/useSyncedState";

import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Badge } from "@/components/ui/badge";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { Input } from "@/components/ui/input";
import { ButtonSpinner, OrbitalLoader } from "@/components/ui/orbital-loader";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
  DropdownMenuLabel,
  DropdownMenuSeparator,
} from "@/components/ui/dropdown-menu";
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from "@/components/ui/tooltip";
import { Calendar } from "@/components/ui/calendar";
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
  PopoverClose,
} from "@/components/ui/popover";
import { Tabs, TabsList, TabsTrigger, TabsContent } from "@/components/ui/tabs";

/**
 * PROPS & INTERFACES
 * Defines the structure of data passed to the component and internal objects.
 */
interface TaskDetailDialogProps {
  taskId: string;
  channelId: string;
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

interface ChannelMember {
  user_id: string;
  name: string;
  avatar_url?: string | null;
  email?: string;
}

type DraftState = {
  value: string;
  lastServerValue: string;
  baseValue: string;
  isEditing: boolean;
  isDirty: boolean;
  serverVersionAtStart: string | null;
};

const createDraftState = (value = "", updatedAt: string | null = null): DraftState => ({
  value,
  lastServerValue: value,
  baseValue: value,
  isEditing: false,
  isDirty: false,
  serverVersionAtStart: updatedAt,
});

const syncDraftState = (previousDraft: DraftState, nextValue: string, nextUpdatedAt: string | null) => {
  if (!previousDraft.isEditing) {
    return createDraftState(nextValue, nextUpdatedAt);
  }

  if (!previousDraft.isDirty) {
    return {
      ...previousDraft,
      value: nextValue,
      lastServerValue: nextValue,
      baseValue: nextValue,
      serverVersionAtStart: nextUpdatedAt,
    };
  }

  return {
    ...previousDraft,
    lastServerValue: nextValue,
  };
};

/**
 * SingleAssigneeSelector Component
 * A reusable dropdown component to select or remove a single assignee
 * for a task, subtask, or checklist item.
 */
function SingleAssigneeSelector({
  currentAssignee,
  members,
  onSelect,
  placeholder = "Assign",
  size = "sm",
  alwaysVisible = false,
  disabled = false
}: {
  currentAssignee?: TaskUser | null;
  members: ChannelMember[];
  onSelect: (userId: string | null) => void;
  placeholder?: string;
  size?: "sm" | "xs" | "icon";
  alwaysVisible?: boolean;
  disabled?: boolean;
}) {
  const triggerEl = (
    <div className={cn(
      "outline-none transition-all duration-200",
      disabled ? "cursor-default opacity-80" : "cursor-pointer",
      (!currentAssignee && !alwaysVisible && !disabled) && "opacity-0 group-hover:opacity-100 data-[state=open]:opacity-100"
    )}>
      {currentAssignee ? (
        <TooltipProvider>
          <Tooltip>
            <TooltipTrigger asChild>
              <Avatar className={cn(
                !disabled && "hover:ring-2 hover:ring-primary transition-all",
                size === "sm" ? "w-7 h-7" : size === "xs" ? "w-6 h-6" : "w-5 h-5"
              )}>
                <AvatarImage src={currentAssignee.avatar_url ? buildAuthenticatedFileUrl(currentAssignee.avatar_url) : ""} />
                <AvatarFallback className="text-[10px] font-bold bg-primary/10 text-primary uppercase">
                  {getInitials(currentAssignee.name)}
                </AvatarFallback>
              </Avatar>
            </TooltipTrigger>
            <TooltipContent side="bottom" className="text-[10px] font-bold">
              {currentAssignee.name} {!disabled && "(Click to change)"}
            </TooltipContent>
          </Tooltip>
        </TooltipProvider>
      ) : (
        !disabled && (
          <TooltipProvider>
            <Tooltip>
              <TooltipTrigger asChild>
                <Button
                  variant="ghost"
                  size="icon"
                  className={cn(
                    "rounded-full border border-dashed border-muted-foreground/30 text-muted-foreground hover:text-primary hover:border-primary",
                    size === "sm" ? "w-7 h-7" : size === "xs" ? "w-6 h-6" : "w-5 h-5"
                  )}
                >
                  <Plus size={size === "xs" ? 12 : 14} />
                </Button>
              </TooltipTrigger>
              <TooltipContent side="bottom" className="text-[10px] font-bold">
                {placeholder}
              </TooltipContent>
            </Tooltip>
          </TooltipProvider>
        )
      )}
    </div>
  );

  if (disabled) return triggerEl;

  return (
    <DropdownMenu>
      <DropdownMenuTrigger asChild>
        {triggerEl}
      </DropdownMenuTrigger>
      <DropdownMenuContent align="end" className="w-56 rounded-xl bg-card border-border shadow-xl p-1">
        <DropdownMenuLabel className="text-[10px] font-bold uppercase tracking-widest text-muted-foreground px-2 py-1.5">
          Assign to...
        </DropdownMenuLabel>
        <DropdownMenuSeparator className="bg-border/50" />
        <div className="max-h-60 overflow-y-auto">
          {members?.map((member) => (
            <DropdownMenuItem
              key={member.user_id}
              onClick={() => currentAssignee?.id === member.user_id ? onSelect(null) : onSelect(member.user_id)}
              className="flex items-center gap-2 px-2 py-1.5 cursor-pointer rounded-lg hover:bg-muted"
            >
              <Avatar className="w-6 h-6">
                <AvatarImage src={member.avatar_url ? buildAuthenticatedFileUrl(member.avatar_url) : undefined} />
                <AvatarFallback className="text-[8px] font-bold">
                  {getInitials(member.name)}
                </AvatarFallback>
              </Avatar>
              <div className="flex flex-col flex-1 min-w-0">
                <span className="text-xs font-medium truncate">{member.name}</span>
                {member.email && (
                  <span className="text-[10px] text-muted-foreground truncate">{member.email}</span>
                )}
              </div>
              {currentAssignee?.id === member.user_id && <Check size={14} className="text-primary" />}
            </DropdownMenuItem>
          ))}
        </div>
      </DropdownMenuContent>
    </DropdownMenu>
  );
}

/**
 * CommentInput Component
 * Keeps typing state local to reduce full TaskDetailDialog re-renders.
 */
function CommentInput({ onSubmit }: { onSubmit: (content: string) => Promise<void> }) {
  const [comment, setComment] = useState("");
  const [isSaving, setIsSaving] = useState(false);

  const handleSubmit = async () => {
    if (!comment.trim() || isSaving) return;
    setIsSaving(true);
    try {
      await onSubmit(comment);
      setComment("");
    } catch (error) {
      console.error(error);
    } finally {
      setIsSaving(false);
    }
  };

  return (
    <div className="bg-muted/10 border border-border rounded-lg focus-within:border-primary focus-within:ring-1 focus-within:ring-primary transition-all flex flex-col">
      <textarea
        value={comment}
        disabled={isSaving}
        onChange={(e) => setComment(e.target.value)}
        onKeyDown={(e) => {
          if (e.key === 'Enter' && !e.shiftKey) {
            e.preventDefault();
            handleSubmit();
          }
        }}
        className="w-full bg-transparent border-none p-3 focus:ring-0 text-sm text-foreground placeholder-muted-foreground resize-none h-20 focus:outline-none disabled:opacity-60"
        placeholder="Write a comment..."
      />
      <div className="flex items-center justify-end p-1 bg-card border-t border-border rounded-b-lg">
        <Button
          onClick={handleSubmit}
          disabled={!comment.trim() || isSaving}
          size="sm"
          className="text-[13px] font-medium px-4 py-1.5 h-auto flex items-center gap-1.5"
        >
          {isSaving && <ButtonSpinner className="h-3 w-3" />}
          Comment
        </Button>
      </div>
    </div>
  );
}

/**
 * ActivityFeed Component
 * Renders the paginated activity log for a task with icons, user info, and timestamps.
 */
const ACTIVITY_META: Record<
  string,
  { label: string; icon: React.ReactNode; color: string }
> = {
  CREATED:           { label: "created this task",           icon: <PlusCircle size={13} />,          color: "text-emerald-500" },
  UPDATED:           { label: "updated this task",           icon: <Pencil size={13} />,              color: "text-blue-500"   },
  STATUS_CHANGED:    { label: "changed the status",          icon: <CheckCircle2 size={13} />,        color: "text-violet-500" },
  ASSIGNED:          { label: "assigned a member",           icon: <UserPlus size={13} />,            color: "text-sky-500"    },
  UNASSIGNED:        { label: "removed a member",            icon: <UserMinus size={13} />,           color: "text-orange-500" },
  COMMENTED:         { label: "commented",                   icon: <MessageSquare size={13} />,       color: "text-muted-foreground" },
  CHECKLIST_UPDATED: { label: "updated a checklist",         icon: <CheckSquare size={13} />,         color: "text-amber-500"  },
  ATTACHMENT_ADDED:  { label: "added an attachment",         icon: <Paperclip size={13} />,           color: "text-pink-500"   },
  LABEL_ADDED:       { label: "added a label",               icon: <Tag size={13} />,                 color: "text-teal-500"   },
  LABEL_REMOVED:     { label: "removed a label",             icon: <Tag size={13} />,                 color: "text-rose-500"   },
  PRIORITY_CHANGED:  { label: "changed the priority",        icon: <ChevronsUp size={13} />,          color: "text-yellow-500" },
  DUE_DATE_CHANGED:  { label: "changed the due date",        icon: <Clock size={13} />,               color: "text-indigo-500" },
  DELETED:           { label: "deleted an item",             icon: <Trash2 size={13} />,              color: "text-destructive" },
};

function ActivityFeed({ taskId }: { taskId: string }) {
  const { activities, isLoading } = useTaskActivities(taskId, { enabled: !!taskId });

  if (isLoading) {
    return (
      <div className="flex items-center justify-center py-10">
        <OrbitalLoader size="sm" />
      </div>
    );
  }

  return (
    <ScrollArea className="flex-1 px-4 py-0">
      <div className="flex flex-col gap-0 py-4">
        {activities.length === 0 && (
          <div className="flex flex-col items-center justify-center gap-2 pt-10 text-center">
            <History className="h-8 w-8 text-muted-foreground/40" />
            <p className="text-sm text-muted-foreground">No activity yet.</p>
            <p className="text-xs text-muted-foreground/60">Changes to this task will appear here.</p>
          </div>
        )}
        {activities.map((activity: TaskActivity, idx: number) => {
          const meta = ACTIVITY_META[activity.type] ?? {
            label: activity.type.toLowerCase().replace(/_/g, " "),
            icon: <Activity size={13} />,
            color: "text-muted-foreground",
          };
          const displayLabel = activity.type === "ATTACHMENT_ADDED" && activity.content?.toLowerCase().includes("removed")
            ? "removed an attachment"
            : meta.label;
          const isLast = idx === activities.length - 1;
          return (
            <div key={activity.id} className="flex gap-2.5 relative">
              {/* Timeline line */}
              {!isLast && (
                <div className="absolute left-[15px] top-7 bottom-0 w-px bg-border z-0" />
              )}
              {/* Icon bubble */}
              <div className={cn(
                "w-7 h-7 rounded-full border border-border bg-background flex items-center justify-center shrink-0 z-10 mt-1",
                meta.color
              )}>
                {meta.icon}
              </div>
              {/* Content */}
              <div className="flex flex-col gap-0.5 flex-1 py-1 pb-3">
                <div className="flex items-center gap-1.5 flex-wrap">
                  <span className="text-[12px] font-semibold text-foreground leading-tight">
                    {activity.user?.name || "Someone"}
                  </span>
                  <span className="text-[12px] text-muted-foreground leading-tight">{displayLabel}</span>
                </div>
                {activity.content && (
                  <p className="text-[11px] text-muted-foreground/80 bg-muted/50 rounded px-2 py-1 mt-0.5 italic leading-snug">
                    {activity.content}
                  </p>
                )}
                <span className="text-[10px] text-muted-foreground/60 mt-0.5">
                  {format(new Date(activity.created_at), "MMM d, p")}
                </span>
              </div>
            </div>
          );
        })}
      </div>
    </ScrollArea>
  );
}


/**
 * AddSubtaskForm Component
 * Keeps subtask addition typing state local to reduce dialogue re-renders.
 */
function AddSubtaskForm({
  onSubmit,
  onCancel
}: {
  onSubmit: (title: string) => Promise<void>;
  onCancel: () => void;
}) {
  const [title, setTitle] = useState("");
  const [isSaving, setIsSaving] = useState(false);
  const inputRef = useRef<HTMLTextAreaElement>(null);

  const handleSubmit = async () => {
    if (!title.trim() || isSaving) return;
    setIsSaving(true);
    try {
      await onSubmit(title);
      setTitle("");
      onCancel();
    } catch (error) {
      console.error(error);
    } finally {
      setIsSaving(false);
    }
  };

  const handleBlur = (e: React.FocusEvent) => {
    const currentTarget = e.currentTarget;
    setTimeout(() => {
      if (!currentTarget.contains(document.activeElement) && !title.trim()) {
        onCancel();
      }
    }, 50);
  };

  return (
    <div
      onBlur={handleBlur}
      className="flex flex-col p-2 border border-primary/40 rounded-lg bg-card animate-in fade-in slide-in-from-top-2 duration-200 mt-1"
    >
      <Textarea
        ref={inputRef}
        disabled={isSaving}
        className="text-sm bg-transparent border-none px-1 py-0 focus:ring-0 focus:outline-none focus-visible:ring-0 focus-visible:border-none text-foreground placeholder-muted-foreground/75 min-h-8 h-8 resize-none rounded-none disabled:opacity-60 w-full disabled:bg-transparent"
        placeholder="What needs to be done?"
        value={title}
        autoFocus
        onInput={(e) => {
          const target = e.target as HTMLTextAreaElement;
          target.style.height = 'auto';
          target.style.height = `${target.scrollHeight}px`;
        }}
        onChange={(e) => setTitle(e.target.value)}
        onKeyDown={(e) => {
          if (e.key === 'Enter' && !e.shiftKey) {
            e.preventDefault();
            if (!isSaving) handleSubmit();
          }
          if (e.key === 'Escape' && !isSaving) {
            onCancel();
          }
        }}
      />
      <div className="border-t border-border/60 my-1" />
      <div className="flex items-center justify-end gap-2 animate-in fade-in duration-200">
        <Button
          variant="ghost"
          size="sm"
          onClick={onCancel}
          disabled={isSaving}
          className="h-8 text-xs font-semibold rounded-lg px-3 text-muted-foreground hover:text-foreground hover:bg-muted/40"
        >
          Cancel
        </Button>
        <Button
          size="sm"
          onClick={handleSubmit}
          disabled={isSaving || !title.trim()}
          className="h-8 text-xs font-semibold rounded-lg px-4 bg-[#4F6EF7] text-white hover:bg-[#435fd9] flex items-center justify-center gap-1.5 transition-colors shadow-xs disabled:opacity-50"
        >
          {isSaving && <ButtonSpinner />}
          Add Subtask
        </Button>
      </div>
    </div>
  );
}

/**
 * AddChecklistItemForm Component
 * Keeps checklist item addition typing state local to reduce dialogue re-renders.
 */
function AddChecklistItemForm({
  onSubmit,
  onCancel
}: {
  onSubmit: (text: string) => Promise<void>;
  onCancel: () => void;
}) {
  const [text, setText] = useState("");
  const [isSaving, setIsSaving] = useState(false);
  const inputRef = useRef<HTMLTextAreaElement>(null);

  const handleSubmit = async () => {
    if (!text.trim() || isSaving) return;
    setIsSaving(true);
    try {
      await onSubmit(text);
      setText("");
      onCancel();
    } catch (error) {
      console.error(error);
    } finally {
      setIsSaving(false);
    }
  };

  const handleBlur = (e: React.FocusEvent) => {
    const currentTarget = e.currentTarget;
    setTimeout(() => {
      if (!currentTarget.contains(document.activeElement) && !text.trim()) {
        onCancel();
      }
    }, 50);
  };

  return (
    <div
      onBlur={handleBlur}
      className="flex flex-col p-2 border border-primary/40 rounded-lg bg-card animate-in fade-in slide-in-from-top-2 duration-200 mt-1"
    >
      <Textarea
        ref={inputRef}
        disabled={isSaving}
        className="text-sm bg-transparent border-none px-1 py-0 focus:ring-0 focus:outline-none focus-visible:ring-0 focus-visible:border-none text-foreground placeholder-muted-foreground/75 resize-none rounded-none disabled:opacity-60 w-full min-h-8 h-8 disabled:bg-transparent"
        placeholder="What needs to be done?"
        value={text}
        autoFocus
        onInput={(e) => {
          const target = e.target as HTMLTextAreaElement;
          target.style.height = 'auto';
          target.style.height = `${target.scrollHeight}px`;
        }}
        onChange={(e) => setText(e.target.value)}
        onKeyDown={(e) => {
          if (e.key === 'Enter' && !e.shiftKey) {
            e.preventDefault();
            if (!isSaving) handleSubmit();
          }
          if (e.key === 'Escape' && !isSaving) {
            onCancel();
          }
        }}
      />
      <div className="border-t border-border/60 my-1" />
      <div className="flex items-center justify-end gap-2 animate-in fade-in duration-200">
        <Button
          variant="ghost"
          size="sm"
          onClick={onCancel}
          disabled={isSaving}
          className="h-8 text-xs font-semibold rounded-lg px-3 text-muted-foreground hover:text-foreground hover:bg-muted/40"
        >
          Cancel
        </Button>
        <Button
          size="sm"
          onClick={handleSubmit}
          disabled={isSaving || !text.trim()}
          className="h-8 text-xs font-semibold rounded-lg px-4 bg-[#4F6EF7] text-white hover:bg-[#435fd9] flex items-center justify-center gap-1.5 transition-colors shadow-xs disabled:opacity-50"
        >
          {isSaving && <ButtonSpinner />}
          Add Item
        </Button>
      </div>
    </div>
  );
}

function ControlledInlineTextareaEditor({
  value,
  onChange,
  onSubmit,
  onCancel,
  placeholder = "Enter value...",
  isLoading = false,
}: {
  value: string;
  onChange: (value: string) => void;
  onSubmit: () => void;
  onCancel: () => void;
  placeholder?: string;
  isLoading?: boolean;
}) {
  return (
    <div className="flex flex-col gap-2 p-2 border border-border/80 rounded-xl bg-muted/20 dark:bg-muted/5 focus-within:border-primary/50 focus-within:ring-1 focus-within:ring-primary/20 transition-all duration-200 animate-in fade-in slide-in-from-top-2 mt-1">
      <Textarea
        autoFocus
        disabled={isLoading}
        className="text-sm bg-transparent border-none px-1 py-0 focus:ring-0 focus:outline-none focus-visible:ring-0 focus-visible:border-none text-foreground placeholder-muted-foreground min-h-8 h-8 resize-none rounded-none disabled:opacity-60 w-full"
        value={value}
        placeholder={placeholder}
        onInput={(e) => {
          const target = e.target as HTMLTextAreaElement;
          target.style.height = 'auto';
          target.style.height = `${target.scrollHeight}px`;
        }}
        onChange={(e) => onChange(e.target.value)}
        onKeyDown={(e) => {
          if (e.key === 'Enter' && !e.shiftKey) {
            e.preventDefault();
            if (value.trim() && !isLoading) onSubmit();
          }
          if (e.key === 'Escape' && !isLoading) onCancel();
        }}
      />
      <div className="border-t border-border/60 my-1" />
      <div className="flex items-center justify-end gap-2 animate-in fade-in duration-200">
        <Button variant="ghost" size="sm" onClick={onCancel} disabled={isLoading} className="h-8 text-xs text-muted-foreground hover:text-foreground">
          Cancel
        </Button>
        <Button size="sm" onClick={onSubmit} disabled={isLoading || !value.trim()} className="h-8 text-xs px-4 flex items-center justify-center gap-1.5">
          {isLoading && <ButtonSpinner />}
          Save
        </Button>
      </div>
    </div>
  );
}

function ControlledInlineInputEditor({
  value,
  onChange,
  onSubmit,
  onCancel,
  className
}: {
  value: string;
  onChange: (value: string) => void;
  onSubmit: () => void;
  onCancel: () => void;
  className?: string;
}) {
  return (
    <input
      autoFocus
      className={className}
      value={value}
      onChange={(e) => onChange(e.target.value)}
      onBlur={() => {
        if (value.trim()) onSubmit();
        else onCancel();
      }}
      onKeyDown={(e) => {
        if (e.key === 'Enter' && value.trim()) onSubmit();
        if (e.key === 'Escape') onCancel();
      }}
    />
  );
}

/**
 * AddChecklistDialog Component
 * Secondary dialog to get a new checklist title without re-rendering parent.
 */
function AddChecklistDialog({
  open,
  onOpenChange,
  onCreate
}: {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onCreate: (title: string) => void;
}) {
  const [title, setTitle] = useState("Checklist");

  const handleCreate = () => {
    if (!title.trim()) return;
    onCreate(title);
    setTitle("Checklist");
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-[425px]">
        <DialogHeader>
          <DialogTitle>Add Checklist</DialogTitle>
        </DialogHeader>
        <div className="grid gap-4 py-4">
          <div className="flex flex-col gap-2">
            <label htmlFor="name" className="text-sm font-medium">Title</label>
            <input
              id="name"
              autoFocus
              className="w-full bg-background border border-input px-3 py-2 text-sm rounded-md focus:ring-1 focus:ring-primary focus:outline-none"
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              onKeyDown={(e) => {
                if (e.key === 'Enter') handleCreate();
              }}
            />
          </div>
        </div>
        <div className="flex justify-end gap-2">
          <Button variant="ghost" onClick={() => onOpenChange(false)}>Cancel</Button>
          <Button onClick={handleCreate}>Add</Button>
        </div>
      </DialogContent>
    </Dialog>
  );
}

/**
 * ConfirmDeleteLabelDialog Component
 * Prompts the user to confirm deleting a label.
 */
function ConfirmDeleteLabelDialog({
  open,
  onOpenChange,
  onConfirm,
  labelName,
}: {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onConfirm: () => void;
  labelName: string;
}) {
  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-106.25 bg-card border-border shadow-2xl rounded-2xl">
        <DialogHeader>
          <DialogTitle className="text-foreground">Delete Label</DialogTitle>
          <DialogDescription className="text-muted-foreground text-sm mt-2">
            Are you sure you want to delete label &quot;{labelName}&quot;? This will remove it from all tasks. This action cannot be undone.
          </DialogDescription>
        </DialogHeader>
        <div className="flex justify-end gap-2 mt-4">
          <Button variant="ghost" className="hover:bg-muted font-semibold text-xs" onClick={() => onOpenChange(false)}>
            Cancel
          </Button>
          <Button variant="destructive" className="font-semibold text-xs" onClick={onConfirm}>
            Delete
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  );
}

/**
 * CreateLabelForm Component
 * Label creation inline view that encapsulates typing state to avoid parent re-renders.
 */
function CreateLabelForm({
  onSubmit,
  onBack
}: {
  onSubmit: (name: string, color: string) => void;
  onBack: () => void;
}) {
  const [name, setName] = useState("");
  const [color, setColor] = useState("#3b82f6");

  const handleSubmit = () => {
    if (!name.trim()) return;
    onSubmit(name, color);
    setName("");
  };

  return (
    <div className="space-y-3">
      <div className="space-y-1">
        <Label htmlFor="label-name-row" className="text-[10px] uppercase font-bold text-muted-foreground">Label Name</Label>
        <Input
          id="label-name-row"
          value={name}
          onChange={(e) => setName(e.target.value)}
          placeholder="e.g. Urgent, Bug..."
          className="h-8 text-xs"
          autoFocus
        />
      </div>
      <div className="space-y-1">
        <Label className="text-[10px] uppercase font-bold text-muted-foreground">Color</Label>
        <div className="grid grid-cols-5 gap-1.5">
          {['#ef4444', '#f59e0b', '#10b981', '#3b82f6', '#6366f1', '#8b5cf6', '#ec4899', '#64748b', '#000000', '#f472b6'].map((c) => (
            <button
              key={c}
              className={cn(
                "w-full aspect-square rounded-md border border-border transition-transform hover:scale-110",
                color === c && "ring-2 ring-primary ring-offset-2"
              )}
              style={{ backgroundColor: c }}
              onClick={() => setColor(c)}
            />
          ))}
        </div>
      </div>
      <div className="flex items-center gap-2 pt-1">
        <Button
          size="sm"
          className="flex-1 h-8 text-xs font-bold"
          disabled={!name.trim()}
          onClick={handleSubmit}
        >
          Create
        </Button>
        <Button
          variant="ghost"
          size="sm"
          className="h-8 text-xs"
          onClick={onBack}
        >
          Back
        </Button>
      </div>
    </div>
  );
}

/**
 * TaskDetailDialog Component
 * The main full-screen/dialog view for a task. 
 * Allows users to edit title, description, status, priority, due date, 
 * labels, subtasks, and checklists, and participate in comments.
 */
export function TaskDetailDialog({
  taskId,
  channelId,
  open,
  onOpenChange
}: TaskDetailDialogProps) {
  const ability = useAbility(AbilityContext);
  const { user } = useAuthProfile({ enabled: open });
  const canUpdateBasic = ability.can("update-basic", "Task");
  const canUpdateManage = ability.can("update-manage", "Task");
  const canDeleteTask = ability.can("delete", "Task");
  const canAttachment = ability.can("attachment", "Task");
  const canComment = ability.can("comment", "Task");

  /* 
   * DATA FETCHING & MUTATIONS
   * Hooks for real-time task data and actions to modify task state.
   */
  const { task, isLoading } = useTask(taskId, { enabled: open });
  const { comments } = useTaskComments(taskId, { enabled: open });
  const { mutate: updateTask, mutateAsync: updateTaskAsync } = useUpdateTask(channelId, taskId);
  const { mutateAsync: createCommentAsync } = useCreateComment();
  const { mutateAsync: deleteTaskAsync } = useDeleteTask(channelId, taskId);
  const { mutateAsync: assignUserAsync } = useAssignUser(taskId);
  const { mutateAsync: unassignUserAsync } = useUnassignUser(taskId);
  const { mutate: addAttachment, isPending: isAddingAttachment } = useAddAttachment(taskId);
  const { mutate: deleteAttachment } = useDeleteAttachment(taskId);
  const { members: channelMembers } = useChannelMembers(channelId);
 
  const fileInputRef = useRef<HTMLInputElement>(null);
  const activeTaskIdRef = useRef<string | null>(taskId);
  const openDialogRef = useRef(open);
  const dirtyFieldsRef = useRef<Record<string, boolean>>({});
  const { mutate: updateChecklistItem, mutateAsync: updateChecklistItemAsync } = useUpdateChecklistItem(taskId);
  const { mutateAsync: deleteChecklistItemAsync } = useDeleteChecklistItem(taskId);
  const { mutateAsync: updateChecklistAsync } = useUpdateChecklist(taskId);
  const { mutateAsync: deleteChecklistAsync } = useDeleteChecklist(taskId);
  const { mutateAsync: addChecklistItemAsync } = useAddChecklistItem(taskId);
  const { mutateAsync: createChecklistAsync } = useCreateChecklist();
  const { mutateAsync: createSubtaskAsync } = useCreateSubtask(taskId);
  const { labels: allOrgLabels } = useLabels(task?.org_id || "", { enabled: !!task?.org_id });
  const { mutateAsync: assignLabelAsync } = useAssignLabel(taskId);
  const { mutateAsync: unassignLabelAsync } = useUnassignLabel(taskId);
  const { mutate: createLabel } = useCreateLabel(task?.org_id || "");
  const { mutate: deleteLabel } = useDeleteLabel(task?.org_id || "");

  const titleServerState = useMemo(
    () => ({
      value: task?.title || "",
      updatedAt: task?.updated_at || null,
    }),
    [task?.title, task?.updated_at]
  );

  const descriptionServerState = useMemo(
    () => ({
      value: task?.description || "",
      updatedAt: task?.updated_at || null,
    }),
    [task?.description, task?.updated_at]
  );

  const checklistServerState = useMemo(
    () => ({
      checklists: task?.checklists ?? [],
      updatedAt: task?.updated_at || null,
    }),
    [task?.checklists, task?.updated_at]
  );

  const subtaskServerState = useMemo(
    () => ({
      subtasks: task?.subtasks ?? [],
      updatedAt: task?.updated_at || null,
    }),
    [task?.subtasks, task?.updated_at]
  );

  /* 
   * LOCAL UI STATE
   * Manages inline editing modes, input values, and temporary visibility states.
   */
  const [titleDraft, setTitleDraft] = useSyncedState(
    titleServerState,
    (server) => createDraftState(server.value, server.updatedAt),
    (previousDraft, server) => syncDraftState(previousDraft, server.value, server.updatedAt)
  );
  const [descriptionDraft, setDescriptionDraft] = useSyncedState(
    descriptionServerState,
    (server) => createDraftState(server.value, server.updatedAt),
    (previousDraft, server) => syncDraftState(previousDraft, server.value, server.updatedAt)
  );
  const [addingChecklistId, setAddingChecklistId] = useState<string | null>(null);
  const [editingItemId, setEditingItemId] = useState<string | null>(null);
  const [editingChecklistId, setEditingChecklistId] = useState<string | null>(null);
  const [editingSubtaskId, setEditingSubtaskId] = useState<string | null>(null);
  const [savingSubtaskIds, setSavingSubtaskIds] = useState<Record<string, boolean>>({});
  const [savingChecklistItemIds, setSavingChecklistItemIds] = useState<Record<string, boolean>>({});
  const [deletingSubtaskIds, setDeletingSubtaskIds] = useState<Record<string, boolean>>({});
  const [deletingChecklistItemIds, setDeletingChecklistItemIds] = useState<Record<string, boolean>>({});
  const [optimisticChecklistItems, setOptimisticChecklistItems] = useState<Record<string, boolean>>({});
  const [optimisticSubtaskStatus, setOptimisticSubtaskStatus] = useState<Record<string, string>>({});
  const queryClient = useQueryClient();
  const [checklistDrafts, setChecklistDrafts] = useSyncedState(
    checklistServerState,
    () => ({} as Record<string, DraftState>),
    (previousDrafts, server) => {
      const nextDrafts = { ...previousDrafts };
      server.checklists.forEach((checklist) => {
        nextDrafts[checklist.id] = syncDraftState(
          nextDrafts[checklist.id] ?? createDraftState(checklist.name || "", server.updatedAt),
          checklist.name || "",
          server.updatedAt
        );
      });
      return nextDrafts;
    }
  );
  const [subtaskDrafts, setSubtaskDrafts] = useSyncedState(
    subtaskServerState,
    () => ({} as Record<string, DraftState>),
    (previousDrafts, server) => {
      const nextDrafts = { ...previousDrafts };
      server.subtasks.forEach((subtask) => {
        nextDrafts[subtask.id] = syncDraftState(
          nextDrafts[subtask.id] ?? createDraftState(subtask.title || "", server.updatedAt),
          subtask.title || "",
          server.updatedAt
        );
      });
      return nextDrafts;
    }
  );
  const [itemDrafts, setItemDrafts] = useSyncedState(
    checklistServerState,
    () => ({} as Record<string, DraftState>),
    (previousDrafts, server) => {
      const nextDrafts = { ...previousDrafts };
      server.checklists.forEach((checklist) => {
        checklist.items?.forEach((item) => {
          nextDrafts[item.id] = syncDraftState(
            nextDrafts[item.id] ?? createDraftState(item.text || "", server.updatedAt),
            item.text || "",
            server.updatedAt
          );
        });
      });
      return nextDrafts;
    }
  );
  const [isAddChecklistDialogOpen, setIsAddChecklistDialogOpen] = useState(false);
  const [isAddingSubtaskMode, setIsAddingSubtaskMode] = useState(false);
  const [selectedImage, setSelectedImage] = useState<string | null>(null);
  const [zoomLevel, setZoomLevel] = useState(1);
  const [isLabelPopoverOpen, setIsLabelPopoverOpen] = useState(false);
  const [isCreatingLabel, setIsCreatingLabel] = useState(false);
  const [isEditingTitle, setIsEditingTitle] = useState(false);
  const [labelToDelete, setLabelToDelete] = useState<{ id: string; name: string } | null>(null);

  useEffect(() => {
    activeTaskIdRef.current = taskId;
    openDialogRef.current = open;
  }, [open, taskId]);

  useTaskRealtime(channelId, {
    userId: user?.id,
    activeTaskIdRef,
    openDialogRef,
    dirtyFieldsRef,
    onTaskDeleted: (payload) => {
      if (payload.taskId === taskId) {
        toast.error("This task was deleted.");
        onOpenChange(false);
      }
    },
  });

  if (!open) return null;

  /* 
   * ACTION HANDLERS
   * Logic for processing user interactions and calling API mutations.
   */

  const markDirty = (key: string, nextValue: string, previousValue: string) => {
    const isDirty = nextValue !== previousValue;
    dirtyFieldsRef.current[key] = isDirty;
    return isDirty;
  };

  const beginTitleEdit = () => {
    setIsEditingTitle(true);
    setTitleDraft((prev) => ({
      ...prev,
      value: prev.lastServerValue,
      baseValue: prev.lastServerValue,
      isEditing: true,
      isDirty: false,
      serverVersionAtStart: task?.updated_at || null,
    }));
  };

  const cancelTitleEdit = () => {
    setIsEditingTitle(false);
    dirtyFieldsRef.current.title = false;
    setTitleDraft((prev) => ({
      ...prev,
      value: prev.lastServerValue,
      baseValue: prev.lastServerValue,
      isEditing: false,
      isDirty: false,
      serverVersionAtStart: task?.updated_at || null,
    }));
  };

  const handleUpdateTitle = () => {
    updateTask(
      {
        id: taskId,
        data: {
          title: titleDraft.value,
          expectedUpdatedAt: titleDraft.serverVersionAtStart || undefined,
        },
      },
      {
        onSuccess: () => {
          setIsEditingTitle(false);
          dirtyFieldsRef.current.title = false;
          setTitleDraft((prev) => ({
            ...prev,
            value: prev.value,
            lastServerValue: prev.value,
            baseValue: prev.value,
            isEditing: false,
            isDirty: false,
            serverVersionAtStart: null,
          }));
        },
        onError: (error: unknown) => {
          const err = error as { status?: number; message?: string };
          if (err.status === 409) {
            toast.error("Someone else updated this task while you were editing. Your draft was preserved.");
            return;
          }
          toast.error(err.message || "Failed to update task title");
        },
      }
    );
  };

  // Updates the task's rich text description
  const handleUpdateDescription = () => {
    updateTask(
      {
        id: taskId,
        data: {
          description: descriptionDraft.value,
          expectedUpdatedAt: descriptionDraft.serverVersionAtStart || undefined,
        },
      },
      {
        onSuccess: () => {
          dirtyFieldsRef.current.description = false;
          setDescriptionDraft((prev) => ({
            ...prev,
            value: prev.value,
            lastServerValue: prev.value,
            baseValue: prev.value,
            isEditing: false,
            isDirty: false,
            serverVersionAtStart: null,
          }));
        },
        onError: (error: unknown) => {
          const err = error as { status?: number; message?: string };
          if (err.status === 409) {
            toast.error("Someone else updated this task while you were editing. Your draft was preserved.");
            return;
          }
          toast.error(err.message || "Failed to update description");
        },
      }
    );
  };

  // Submits a new comment to the task activity feed
  const handleAddComment = async (content: string): Promise<void> => {
    await createCommentAsync({ id: taskId, data: { content } });
  };

  // Helper: snapshot + patch task cache
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const patchTaskCache = (patcher: (data: any) => any) => {
    const snapshot = queryClient.getQueryData(taskKeys.detail(taskId));
    queryClient.setQueryData(taskKeys.detail(taskId), (old: unknown) => {
      if (!old || typeof old !== 'object' || !(old as { success?: boolean }).success) return old;
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      const data = (old as { data: any }).data;
      return { ...old as object, data: patcher(data) };
    });
    return snapshot;
  };

  // Adds one or multiple subtasks (supports multi-line input)
  const handleAddSubtask = async (title: string) => {
    const lines = title.split('\n').map(l => l.trim()).filter(l => l !== "");
    try {
      for (const line of lines) {
        const response = await createSubtaskAsync({ parentId: taskId, data: { title: line } });
        if (response.success && response.data) {
          const newSubtask = response.data;
          queryClient.setQueryData(taskKeys.detail(taskId), (old: unknown) => {
            if (!old || typeof old !== 'object' || !(old as { success?: boolean }).success) return old;
            // eslint-disable-next-line @typescript-eslint/no-explicit-any
            const oldData = (old as { data: any }).data;
            return {
              ...old as object,
              data: {
                ...oldData,
                subtasks: [...(oldData.subtasks ?? []), newSubtask]
              }
            };
          });
        }
      }
    } catch (error) {
      toast.error("Failed to add subtask. Please try again.");
      throw error;
    }
  };



  // Adds one or multiple items to a specific checklist
  const handleAddChecklistItem = async (checklistId: string, text: string) => {
    const lines = text.split('\n').map(l => l.trim()).filter(l => l !== "");
    try {
      for (const line of lines) {
        const response = await addChecklistItemAsync({ checklistId, data: { text: line } });
        if (response.success && response.data) {
          const newItem = response.data;
          queryClient.setQueryData(taskKeys.detail(taskId), (old: unknown) => {
            if (!old || typeof old !== 'object' || !(old as { success?: boolean }).success) return old;
            // eslint-disable-next-line @typescript-eslint/no-explicit-any
            const oldData = (old as { data: any }).data;
            return {
              ...old as object,
              data: {
                ...oldData,
                checklists: oldData.checklists?.map((cl: { id: string; items?: unknown[] }) =>
                  cl.id === checklistId
                    ? { ...cl, items: [...(cl.items ?? []), newItem] }
                    : cl
                )
              }
            };
          });
        }
      }
    } catch (error) {
      toast.error("Failed to add checklist item. Please try again.");
      throw error;
    }
  };

  // Updates the title of an existing checklist — optimistic
  const handleUpdateChecklistTitle = async (checklistId: string, title: string) => {
    setEditingChecklistId(null);
    dirtyFieldsRef.current[`checklist:${checklistId}`] = false;
    const snapshot = patchTaskCache((data) => ({
      ...data,
      checklists: data.checklists?.map((cl: { id: string }) =>
        cl.id === checklistId ? { ...cl, title, name: title } : cl
      ),
    }));
    try {
      await updateChecklistAsync({ id: checklistId, data: { title } });
      setChecklistDrafts((prev) => ({
        ...prev,
        [checklistId]: {
          ...(prev[checklistId] ?? createDraftState(title)),
          value: title,
          lastServerValue: title,
          baseValue: title,
          isEditing: false,
          isDirty: false,
        },
      }));
    } catch {
      queryClient.setQueryData(taskKeys.detail(taskId), snapshot);
      toast.error("Failed to update checklist title. Please try again.");
    }
  };

  // Updates the title of an existing subtask — optimistic
  const handleUpdateSubtaskTitle = async (subtaskId: string, title: string) => {
    setSavingSubtaskIds(prev => ({ ...prev, [subtaskId]: true }));
    const snapshot = patchTaskCache((data) => ({
      ...data,
      subtasks: data.subtasks?.map((st: { id: string }) =>
        st.id === subtaskId ? { ...st, title } : st
      ),
    }));
    try {
      await updateTaskAsync({ id: subtaskId, data: { title } });
      setEditingSubtaskId(null);
      dirtyFieldsRef.current[`subtask:${subtaskId}`] = false;
      setSubtaskDrafts((prev) => ({
        ...prev,
        [subtaskId]: {
          ...(prev[subtaskId] ?? createDraftState(title)),
          value: title,
          lastServerValue: title,
          baseValue: title,
          isEditing: false,
          isDirty: false,
        },
      }));
    } catch {
      queryClient.setQueryData(taskKeys.detail(taskId), snapshot);
      toast.error("Failed to update subtask. Please try again.");
    } finally {
      setSavingSubtaskIds(prev => ({ ...prev, [subtaskId]: false }));
    }
  };

  // Updates the text of a checklist item — optimistic
  const handleUpdateItemTitle = async (itemId: string, text: string) => {
    setSavingChecklistItemIds(prev => ({ ...prev, [itemId]: true }));
    const snapshot = patchTaskCache((data) => ({
      ...data,
      checklists: data.checklists?.map((cl: { items?: Array<{ id: string }> }) => ({
        ...cl,
        items: cl.items?.map((it) => it.id === itemId ? { ...it, text } : it),
      })),
    }));
    try {
      await updateChecklistItemAsync({ itemId, data: { text } });
      setEditingItemId(null);
      dirtyFieldsRef.current[`item:${itemId}`] = false;
      setItemDrafts((prev) => ({
        ...prev,
        [itemId]: {
          ...(prev[itemId] ?? createDraftState(text)),
          value: text,
          lastServerValue: text,
          baseValue: text,
          isEditing: false,
          isDirty: false,
        },
      }));
    } catch {
      queryClient.setQueryData(taskKeys.detail(taskId), snapshot);
      toast.error("Failed to update item. Please try again.");
    } finally {
      setSavingChecklistItemIds(prev => ({ ...prev, [itemId]: false }));
    }
  };

  // Deletes a subtask — optimistic
  const handleDeleteSubtask = async (subtaskId: string) => {
    setDeletingSubtaskIds(prev => ({ ...prev, [subtaskId]: true }));
    const snapshot = patchTaskCache((data) => ({
      ...data,
      subtasks: data.subtasks?.filter((st: { id: string }) => st.id !== subtaskId),
    }));
    try {
      await deleteTaskAsync(subtaskId);
    } catch {
      queryClient.setQueryData(taskKeys.detail(taskId), snapshot);
      toast.error("Failed to delete subtask. Please try again.");
    } finally {
      setDeletingSubtaskIds(prev => ({ ...prev, [subtaskId]: false }));
    }
  };

  // Deletes a checklist item — optimistic
  const handleDeleteChecklistItem = async (itemId: string) => {
    setDeletingChecklistItemIds(prev => ({ ...prev, [itemId]: true }));
    const snapshot = patchTaskCache((data) => ({
      ...data,
      checklists: data.checklists?.map((cl: { items?: Array<{ id: string }> }) => ({
        ...cl,
        items: cl.items?.filter((it) => it.id !== itemId),
      })),
    }));
    try {
      await deleteChecklistItemAsync(itemId);
    } catch {
      queryClient.setQueryData(taskKeys.detail(taskId), snapshot);
      toast.error("Failed to delete item. Please try again.");
    } finally {
      setDeletingChecklistItemIds(prev => ({ ...prev, [itemId]: false }));
    }
  };

  const handleToggleChecklistItem = (itemId: string, currentIsCompleted: boolean) => {
    if (!canUpdateBasic) return;
    const newValue = !currentIsCompleted;
    // 1. Optimistically update local state for instant UI
    setOptimisticChecklistItems(prev => ({ ...prev, [itemId]: newValue }));
    // 2. Also patch the query cache directly so refetch doesn't cause flicker
    queryClient.setQueryData(taskKeys.detail(taskId), (old: unknown) => {
      if (!old || typeof old !== 'object' || !(old as { success?: boolean }).success) return old;
      const data = (old as { data: { checklists?: Array<{ items?: Array<{ id: string; is_completed: boolean }> }> } }).data;
      return {
        ...old as object,
        data: {
          ...data,
          checklists: data.checklists?.map((cl) => ({
            ...cl,
            items: cl.items?.map((it) =>
              it.id === itemId ? { ...it, is_completed: newValue } : it
            ),
          })),
        },
      };
    });
    updateChecklistItemAsync({ itemId, data: { is_completed: newValue } })
      .then(() => {
        // Clear optimistic entry — cache was already patched so no flicker
        setOptimisticChecklistItems(prev => {
          const next = { ...prev };
          delete next[itemId];
          return next;
        });
      })
      .catch(() => {
        // Revert both optimistic state and cache patch
        setOptimisticChecklistItems(prev => ({ ...prev, [itemId]: currentIsCompleted }));
        queryClient.setQueryData(taskKeys.detail(taskId), (old: unknown) => {
          if (!old || typeof old !== 'object' || !(old as { success?: boolean }).success) return old;
          const data = (old as { data: { checklists?: Array<{ items?: Array<{ id: string; is_completed: boolean }> }> } }).data;
          return {
            ...old as object,
            data: {
              ...data,
              checklists: data.checklists?.map((cl) => ({
                ...cl,
                items: cl.items?.map((it) =>
                  it.id === itemId ? { ...it, is_completed: currentIsCompleted } : it
                ),
              })),
            },
          };
        });
      });
  };

  const handleToggleSubtaskStatus = (subtaskId: string, currentStatus: string) => {
    if (!canUpdateBasic) return;
    const newStatus = currentStatus === 'COMPLETED' ? 'OPEN' : 'COMPLETED';
    // Optimistically update local state
    setOptimisticSubtaskStatus(prev => ({ ...prev, [subtaskId]: newStatus }));
    // Patch query cache directly to prevent flicker on refetch
    queryClient.setQueryData(taskKeys.detail(taskId), (old: unknown) => {
      if (!old || typeof old !== 'object' || !(old as { success?: boolean }).success) return old;
      const data = (old as { data: { subtasks?: Array<{ id: string; status: string }> } }).data;
      return {
        ...old as object,
        data: {
          ...data,
          subtasks: data.subtasks?.map((st) =>
            st.id === subtaskId ? { ...st, status: newStatus } : st
          ),
        },
      };
    });
    updateTaskAsync({ id: subtaskId, data: { status: newStatus } })
      .then(() => {
        setOptimisticSubtaskStatus(prev => {
          const next = { ...prev };
          delete next[subtaskId];
          return next;
        });
      })
      .catch(() => {
        // Revert
        setOptimisticSubtaskStatus(prev => ({ ...prev, [subtaskId]: currentStatus }));
        queryClient.setQueryData(taskKeys.detail(taskId), (old: unknown) => {
          if (!old || typeof old !== 'object' || !(old as { success?: boolean }).success) return old;
          const data = (old as { data: { subtasks?: Array<{ id: string; status: string }> } }).data;
          return {
            ...old as object,
            data: {
              ...data,
              subtasks: data.subtasks?.map((st) =>
                st.id === subtaskId ? { ...st, status: currentStatus } : st
              ),
            },
          };
        });
      });
  };

  const handleUpdatePriority = async (priority: TaskPriority | null) => {
    if (!canUpdateManage) return;
    const snapshot = patchTaskCache((data) => ({
      ...data,
      priority,
    }));
    try {
      await updateTaskAsync({ id: taskId, data: { priority } });
    } catch {
      queryClient.setQueryData(taskKeys.detail(taskId), snapshot);
      toast.error("Failed to update priority. Please try again.");
    }
  };

  const handleUpdateDueDate = async (date: Date | null | undefined) => {
    if (!canUpdateManage) return;
    const due_date = date ? date.toISOString() : null;
    const snapshot = patchTaskCache((data) => ({
      ...data,
      due_date,
    }));
    try {
      await updateTaskAsync({ id: taskId, data: { due_date } });
    } catch {
      queryClient.setQueryData(taskKeys.detail(taskId), snapshot);
      toast.error("Failed to update due date. Please try again.");
    }
  };

  const assignUser = async (variables: { id: string; data: { user_id: string } }) => {
    if (!canUpdateManage) return;
    const isParent = variables.id === taskId;
    const member = channelMembers?.find(m => m.user_id === variables.data.user_id);
    if (!member) return;
    
    let snapshot: unknown = null;
    if (isParent) {
      const newAssignment = {
        user_id: variables.data.user_id,
        role: member.role,
        user: {
          id: member.user_id,
          name: member.name,
          avatar_url: member.avatar_url,
          email: member.email,
        }
      };
      snapshot = patchTaskCache((data) => ({
        ...data,
        assignments: [...(data.assignments ?? []), newAssignment],
      }));
    } else {
      snapshot = patchTaskCache((data) => ({
        ...data,
        subtasks: data.subtasks?.map((st: { id: string; assignments?: unknown[] }) =>
          st.id === variables.id
            ? {
                ...st,
                assignments: [
                  {
                    user_id: variables.data.user_id,
                    role: member.role,
                    user: {
                      id: member.user_id,
                      name: member.name,
                      avatar_url: member.avatar_url,
                      email: member.email,
                    }
                  }
                ]
              }
            : st
        )
      }));
    }

    try {
      await assignUserAsync(variables);
    } catch {
      queryClient.setQueryData(taskKeys.detail(taskId), snapshot);
      toast.error("Failed to assign member. Please try again.");
    }
  };

  const unassignUser = async (variables: { id: string; userId: string }) => {
    if (!canUpdateManage) return;
    const isParent = variables.id === taskId;
    let snapshot: unknown = null;
    if (isParent) {
      snapshot = patchTaskCache((data) => ({
        ...data,
        assignments: data.assignments?.filter((a: { user_id: string }) => a.user_id !== variables.userId),
      }));
    } else {
      snapshot = patchTaskCache((data) => ({
        ...data,
        subtasks: data.subtasks?.map((st: { id: string; assignments?: unknown[] }) =>
          st.id === variables.id
            ? { ...st, assignments: [] }
            : st
        )
      }));
    }

    try {
      await unassignUserAsync(variables);
    } catch {
      queryClient.setQueryData(taskKeys.detail(taskId), snapshot);
      toast.error("Failed to unassign member. Please try again.");
    }
  };

  const assignLabel = async (variables: { id: string; data: { label_id: string } }) => {
    if (!canUpdateManage) return;
    const label = allOrgLabels?.find(l => l.id === variables.data.label_id);
    if (!label) return;
    const newLabel = {
      label: {
        id: variables.data.label_id,
        name: label.name,
        color: label.color,
      }
    };
    const snapshot = patchTaskCache((data) => ({
      ...data,
      labels: [...(data.labels ?? []), newLabel],
    }));
    try {
      await assignLabelAsync(variables);
    } catch {
      queryClient.setQueryData(taskKeys.detail(taskId), snapshot);
      toast.error("Failed to assign label. Please try again.");
    }
  };

  const unassignLabel = async (variables: { id: string; labelId: string }) => {
    if (!canUpdateManage) return;
    const snapshot = patchTaskCache((data) => ({
      ...data,
      labels: data.labels?.filter((tl: { label: { id: string } }) => tl.label.id !== variables.labelId),
    }));
    try {
      await unassignLabelAsync(variables);
    } catch {
      queryClient.setQueryData(taskKeys.detail(taskId), snapshot);
      toast.error("Failed to unassign label. Please try again.");
    }
  };

  const handleCreateNewChecklist = async (title: string) => {
    setIsAddChecklistDialogOpen(false);
    const tempChecklist = {
      id: `__temp_cl_${Date.now()}`,
      title,
      name: title,
      assignee_id: null,
      assignee: null,
      items: [],
    };
    const snapshot = patchTaskCache((data) => ({
      ...data,
      checklists: [...(data.checklists ?? []), tempChecklist],
    }));
    try {
      await createChecklistAsync({ id: taskId, data: { title } });
    } catch {
      queryClient.setQueryData(taskKeys.detail(taskId), snapshot);
      toast.error("Failed to create checklist. Please try again.");
    }
  };

  const updateChecklist = async (variables: { id: string; data: { title?: string; assignee_id?: string | null } }) => {
    const snapshot = patchTaskCache((data) => ({
      ...data,
      checklists: data.checklists?.map((cl: { id: string; name?: string; title?: string; assignee_id?: string | null; assignee?: unknown }) => {
        if (cl.id !== variables.id) return cl;
        const nextCl = { ...cl };
        if (variables.data.title !== undefined) {
          nextCl.title = variables.data.title;
          nextCl.name = variables.data.title;
        }
        if (variables.data.assignee_id !== undefined) {
          const assignee = variables.data.assignee_id ? channelMembers?.find(m => m.user_id === variables.data.assignee_id) : null;
          nextCl.assignee_id = variables.data.assignee_id;
          nextCl.assignee = assignee
            ? {
                id: assignee.user_id,
                name: assignee.name,
                avatar_url: assignee.avatar_url,
              }
            : null;
        }
        return nextCl;
      }),
    }));
    try {
      await updateChecklistAsync(variables);
      if (variables.data.title !== undefined) {
        setChecklistDrafts((prev) => ({
          ...prev,
          [variables.id]: {
            ...(prev[variables.id] ?? createDraftState(variables.data.title!)),
            value: variables.data.title!,
            lastServerValue: variables.data.title!,
            baseValue: variables.data.title!,
            isEditing: false,
            isDirty: false,
          },
        }));
      }
    } catch {
      queryClient.setQueryData(taskKeys.detail(taskId), snapshot);
      toast.error("Failed to update checklist. Please try again.");
    }
  };

  const deleteChecklist = async (id: string) => {
    const snapshot = patchTaskCache((data) => ({
      ...data,
      checklists: data.checklists?.filter((cl: { id: string }) => cl.id !== id),
    }));
    try {
      await deleteChecklistAsync(id);
    } catch {
      queryClient.setQueryData(taskKeys.detail(taskId), snapshot);
      toast.error("Failed to delete checklist. Please try again.");
    }
  };

  const handleAssignUser = (userId: string) => assignUser({ id: taskId, data: { user_id: userId } });
  const handleUnassignUser = (userId: string) => unassignUser({ id: taskId, userId });
  const handleAssignLabel = (labelId: string) => assignLabel({ id: taskId, data: { label_id: labelId } });
  const handleUnassignLabel = (labelId: string) => unassignLabel({ id: taskId, labelId });
  const handleUpdateChecklistAssignee = (checklistId: string, userId: string | null) => updateChecklist({ id: checklistId, data: { assignee_id: userId } });
  const handleDeleteChecklist = (checklistId: string) => deleteChecklist(checklistId);

  /* 
   * LOADING STATE
   * Displayed while the task data is initially being fetched.
   */
  if (isLoading || !task) {
    return (
      <Dialog open={open} onOpenChange={onOpenChange}>
        <DialogContent className="sm:max-w-[800px] h-[600px] flex items-center justify-center bg-card border-border shadow-2xl rounded-2xl">
          <DialogTitle className="sr-only">Loading Task...</DialogTitle>
          <OrbitalLoader />
        </DialogContent>
      </Dialog>
    );
  }



  return (
    <>
      <Dialog open={open} onOpenChange={onOpenChange}>
        <DialogContent className="lg:max-w-11/12 xl:max-w-4/5 h-[90vh] max-h-[921px] p-0 bg-card flex flex-col border border-border shadow-2xl rounded-lg overflow-hidden gap-0">

          {/* Header */}
          <DialogHeader className="px-6 py-4 pr-12 border-b border-border bg-card shrink-0 text-left">
            <DialogTitle className="sr-only">Task: {task.title}</DialogTitle>
            <div className="flex-1">
              {isEditingTitle ? (
                <div className="flex items-center gap-2">
                  <input
                    autoFocus
                    value={titleDraft.value}
                    onChange={(e) =>
                      setTitleDraft((prev) => {
                        const nextValue = e.target.value;
                        return {
                          ...prev,
                          value: nextValue,
                          isDirty: markDirty("title", nextValue, prev.baseValue),
                        };
                      })
                    }
                    className="w-full bg-transparent border border-border rounded-md px-3 py-1 text-xl font-bold text-foreground focus:outline-none focus:ring-1 focus:ring-primary"
                  />
                  <Button variant="ghost" size="sm" className="h-8 text-xs" onClick={cancelTitleEdit}>
                    Cancel
                  </Button>
                  <Button size="sm" className="h-8 text-xs" onClick={handleUpdateTitle} disabled={!titleDraft.value.trim()}>
                    Save
                  </Button>
                </div>
              ) : (
                <h2
                  className={cn(
                    "text-xl font-bold text-foreground wrap-break-words",
                    canUpdateBasic ? "cursor-text" : "cursor-default"
                  )}
                  onClick={() => {
                    // if (!canUpdateBasic) return;
                    // beginTitleEdit();
                  }}
                >
                  {titleDraft.lastServerValue || task.title}
                </h2>
              )}
            </div>
          </DialogHeader>

          {/* Body Content Area (Two Columns) */}
          <div className="flex flex-1 overflow-hidden h-full">

            {/* 
             * LEFT COLUMN: Main Task Details
             * Includes Metadata, Description, Attachments, Subtasks, and Checklists.
             */}
            <main className="w-[65%] border-r border-border bg-card">
              <ScrollArea className="h-full">
                <div className="p-6 flex flex-col gap-6">
                  
                  {/* Metadata row (Priority, Due Date, etc., and empty states for Labels/Members) */}
                  <div className="flex flex-wrap gap-x-8 gap-y-4 pt-2">

                    {(!task.labels || task.labels.length === 0) && (
                      <div className="flex flex-col gap-1.5">
                        <span className="text-[11px] font-bold text-muted-foreground uppercase tracking-widest">Labels</span>
                        {canUpdateManage ? (
                          <Popover open={isLabelPopoverOpen} onOpenChange={setIsLabelPopoverOpen}>
                            <PopoverTrigger asChild>
                              <Button variant="outline" size="sm" className="h-7 px-2 border-dashed text-muted-foreground hover:text-primary hover:border-primary text-[11px] font-bold cursor-pointer">
                                <Plus size={14} className="mr-1" />
                                Add Label
                              </Button>
                            </PopoverTrigger>
                            <PopoverContent align="start" className="w-64 p-0 bg-card border-border shadow-xl">
                              <div className="p-3 border-b border-border">
                                <h4 className="text-xs font-bold uppercase tracking-wider mb-2">Labels</h4>
                                {!isCreatingLabel ? (
                                  <div className="space-y-2">
                                    <div className="max-h-48 overflow-y-auto space-y-1">
                                      {allOrgLabels?.map((label) => {
                                        const isAssigned = task.labels?.some(tl => tl.label.id === label.id);
                                        return (
                                          <div
                                            key={label.id}
                                            role="button"
                                            tabIndex={0}
                                            onClick={() => {
                                              if (isAssigned) {
                                                unassignLabel({ id: taskId, labelId: label.id });
                                              } else {
                                                assignLabel({ id: taskId, data: { label_id: label.id } });
                                              }
                                            }}
                                            className="w-full flex items-center gap-2 p-1.5 rounded-lg hover:bg-muted transition-colors text-left group cursor-pointer"
                                          >
                                            <div className="w-3 h-3 rounded-full" style={{ backgroundColor: label.color }} />
                                            <span className="text-xs font-medium flex-1">{label.name}</span>
                                            {isAssigned && <Check size={14} className="text-primary" />}
                                            <button
                                              onClick={(e) => {
                                                e.stopPropagation();
                                                setLabelToDelete({ id: label.id, name: label.name });
                                              }}
                                              className="p-1 opacity-0 group-hover:opacity-100 transition-opacity hover:text-red-500 rounded-md hover:bg-red-50"
                                            >
                                              <Trash2 size={12} />
                                            </button>
                                          </div>
                                        );
                                      })}
                                      {(!allOrgLabels || allOrgLabels.length === 0) && (
                                        <p className="text-[10px] text-muted-foreground text-center py-2 italic">No labels found</p>
                                      )}
                                    </div>
                                    <Button
                                      variant="ghost"
                                      className="w-full h-8 text-[11px] font-bold text-primary hover:text-primary/80 hover:bg-primary/5 p-0"
                                      onClick={() => setIsCreatingLabel(true)}
                                    >
                                      <Plus size={12} className="mr-1" />
                                      Create new label
                                    </Button>
                                  </div>
                                ) : (
                                  <CreateLabelForm
                                    onSubmit={(name, color) => {
                                      createLabel({ org_id: task.org_id, name, color }, {
                                        onSuccess: () => {
                                          setIsCreatingLabel(false);
                                        }
                                      });
                                    }}
                                    onBack={() => setIsCreatingLabel(false)}
                                  />
                                )}
                              </div>
                            </PopoverContent>
                          </Popover>
                        ) : (
                          <div className="h-7 px-2 border border-dashed border-border rounded flex items-center gap-1 text-muted-foreground cursor-not-allowed opacity-60 text-[11px] font-bold select-none w-fit">
                            <Plus size={14} className="mr-1" />
                            Add Label
                          </div>
                        )}
                      </div>
                    )}

                    {(!task.assignments || task.assignments.length === 0) && (
                      <div className="flex flex-col gap-1.5">
                        <span className="text-[11px] font-bold text-muted-foreground uppercase tracking-widest">Members</span>
                        {canUpdateManage ? (
                          <DropdownMenu>
                            <DropdownMenuTrigger asChild>
                              <Button variant="outline" size="sm" className="h-7 px-2 border-dashed text-muted-foreground hover:text-primary hover:border-primary text-[11px] font-bold cursor-pointer">
                                <Plus size={14} className="mr-1" />
                                Join
                              </Button>
                            </DropdownMenuTrigger>
                            <DropdownMenuContent align="start" className="w-56 rounded-xl bg-card border-border shadow-xl p-1">
                              <DropdownMenuLabel className="text-[10px] font-bold uppercase tracking-widest text-muted-foreground px-2 py-1.5">Channel Members</DropdownMenuLabel>
                              <DropdownMenuSeparator className="bg-border/50" />
                              <div className="max-h-60 overflow-y-auto">
                                {channelMembers?.map((member) => {
                                  const isAssigned = task.assignments?.some(a => a.user_id === member.user_id);
                                  return (
                                    <DropdownMenuItem
                                      key={member.user_id}
                                      onClick={() => isAssigned
                                        ? handleUnassignUser(member.user_id)
                                        : handleAssignUser(member.user_id)
                                      }
                                      className="flex items-center gap-2 p-2 rounded-lg cursor-pointer"
                                    >
                                      <Avatar className="w-6 h-6">
                                        <AvatarImage src={member.avatar_url ? buildAuthenticatedFileUrl(member.avatar_url) : undefined} />
                                        <AvatarFallback className="text-[10px] font-bold">{getInitials(member.name)}</AvatarFallback>
                                      </Avatar>
                                      <div className="flex flex-col flex-1 min-w-0">
                                        <span className="text-xs font-medium truncate">{member.name}</span>
                                        {member.email && (
                                          <span className="text-[10px] text-muted-foreground truncate">{member.email}</span>
                                        )}
                                      </div>
                                      {isAssigned && <Check size={14} className="text-primary" />}
                                    </DropdownMenuItem>
                                  );
                                })}
                              </div>
                            </DropdownMenuContent>
                          </DropdownMenu>
                        ) : (
                          <div className="h-7 px-2 border border-dashed border-border rounded flex items-center gap-1 text-muted-foreground cursor-not-allowed opacity-60 text-[11px] font-bold select-none w-fit">
                            <Plus size={14} className="mr-1" />
                            Join
                          </div>
                        )}
                      </div>
                    )}

                    <div className="flex flex-col gap-1.5">
                      <span className="text-[11px] font-bold text-muted-foreground uppercase tracking-widest">Priority</span>
                      {canUpdateManage ? (
                        <DropdownMenu>
                          <DropdownMenuTrigger asChild>
                            <Badge variant="outline" className={cn(
                              "flex items-center gap-1.5 px-2 h-7 rounded transition-colors w-fit text-[11px] font-bold uppercase tracking-wider cursor-pointer",
                              task.priority === 'URGENT' ? "bg-rose-500/10 border-rose-500/20 text-rose-500 hover:bg-rose-500/20" :
                                task.priority === 'HIGH' ? "bg-red-500/10 border-red-500/20 text-red-500 hover:bg-red-500/20" :
                                  task.priority === 'MEDIUM' ? "bg-amber-500/10 border-amber-500/20 text-amber-500 hover:bg-amber-500/20" :
                                    task.priority === 'LOW' ? "bg-blue-500/10 border-blue-500/20 text-blue-500 hover:bg-blue-500/20" :
                                      "bg-transparent border-dashed border-border text-muted-foreground hover:text-primary hover:border-primary"
                            )}>
                              {task.priority ? <ChevronsUp size={14} /> : <Plus size={14} />}
                              <span>{task.priority || 'NONE'}</span>
                            </Badge>
                          </DropdownMenuTrigger>
                          <DropdownMenuContent align="start" className="w-40 rounded-xl bg-card border-border shadow-xl">
                            <DropdownMenuItem onClick={() => handleUpdatePriority('URGENT')} className="flex items-center gap-2 cursor-pointer focus:bg-rose-500/10 text-rose-500 py-2">
                              <span className="text-xs font-bold uppercase tracking-wider">Urgent</span>
                            </DropdownMenuItem>
                            <DropdownMenuItem onClick={() => handleUpdatePriority('HIGH')} className="flex items-center gap-2 cursor-pointer focus:bg-red-500/10 text-red-500 py-2">
                              <span className="text-xs font-bold uppercase tracking-wider">High</span>
                            </DropdownMenuItem>
                            <DropdownMenuItem onClick={() => handleUpdatePriority('MEDIUM')} className="flex items-center gap-2 cursor-pointer focus:bg-amber-500/10 text-amber-500 py-2">
                              <span className="text-xs font-bold uppercase tracking-wider">Medium</span>
                            </DropdownMenuItem>
                            <DropdownMenuItem onClick={() => handleUpdatePriority('LOW')} className="flex items-center gap-2 cursor-pointer focus:bg-blue-500/10 text-blue-500 py-2">
                              <span className="text-xs font-bold uppercase tracking-wider">Low</span>
                            </DropdownMenuItem>
                            <DropdownMenuItem onClick={() => handleUpdatePriority(null)} className="flex items-center gap-2 cursor-pointer focus:bg-muted py-2">
                              <span className="text-xs font-bold uppercase tracking-wider text-muted-foreground">None</span>
                            </DropdownMenuItem>
                          </DropdownMenuContent>
                        </DropdownMenu>
                      ) : (
                        <Badge variant="outline" className={cn(
                          "flex items-center gap-1.5 px-2 h-7 rounded transition-colors w-fit text-[11px] font-bold uppercase tracking-wider cursor-not-allowed opacity-60",
                          task.priority === 'URGENT' ? "bg-rose-500/10 border-rose-500/20 text-rose-500" :
                            task.priority === 'HIGH' ? "bg-red-500/10 border-red-500/20 text-red-500" :
                              task.priority === 'MEDIUM' ? "bg-amber-500/10 border-amber-500/20 text-amber-500" :
                                task.priority === 'LOW' ? "bg-blue-500/10 border-blue-500/20 text-blue-500" :
                                  "bg-transparent border-dashed border-border text-muted-foreground"
                        )}>
                          {task.priority ? <ChevronsUp size={14} /> : <Plus size={14} />}
                          <span>{task.priority || 'NONE'}</span>
                        </Badge>
                      )}
                    </div>



                    {/* Add Checklist Option */}
                    <div className="flex flex-col gap-1.5">
                      <span className="text-[11px] font-bold text-muted-foreground uppercase tracking-widest">Checklist</span>
                      <Button
                        variant="outline"
                        size="sm"
                        disabled={!canUpdateBasic}
                        onClick={() => setIsAddChecklistDialogOpen(true)}
                        className="flex items-center gap-2 px-2 h-7 w-fit text-foreground hover:bg-muted border-dashed transition-colors text-[11px] font-bold"
                      >
                        <CheckSquare size={14} className="text-muted-foreground" />
                        <span>Add Checklist</span>
                      </Button>
                    </div>

                    {/* Due Date */}
                    <div className="flex flex-col gap-1.5">
                      <span className="text-[11px] font-bold text-muted-foreground uppercase tracking-widest">Due Date</span>
                      {canUpdateManage ? (
                        <Popover>
                          <PopoverTrigger asChild>
                            <Button
                              variant="outline"
                              size="sm"
                              className={cn(
                                "h-7 text-[11px] font-bold border-dashed flex items-center gap-2 w-fit px-2 cursor-pointer",
                                task.due_date ? "border-solid bg-blue-500/5 text-blue-600 border-blue-500/30" : "text-muted-foreground hover:text-primary hover:border-primary"
                              )}
                            >
                              <CalendarIcon size={14} className={task.due_date ? "text-blue-600" : ""} />
                              {task.due_date ? format(new Date(task.due_date), "MMM d, yyyy") : "Due Date"}
                            </Button>
                          </PopoverTrigger>
                          <PopoverContent className="w-auto p-0 z-150" align="start">
                            <Calendar
                              mode="single"
                              selected={task.due_date ? new Date(task.due_date) : undefined}
                              onSelect={(date) => {
                                handleUpdateDueDate(date);
                              }}
                              disabled={(date) => date < new Date(new Date().setHours(0, 0, 0, 0))}
                            />
                            {task.due_date && (
                              <div className="p-2 border-t border-border flex justify-end">
                                <Button
                                  variant="ghost"
                                  size="sm"
                                  className="text-[10px] h-6 text-red-500 hover:text-red-600 hover:bg-red-50"
                                  onClick={() => handleUpdateDueDate(null)}
                                >
                                  Clear Date
                                </Button>
                              </div>
                            )}
                          </PopoverContent>
                        </Popover>
                      ) : (
                        <div
                          className={cn(
                            "h-7 text-[11px] font-bold border border-dashed flex items-center gap-2 w-fit px-2 rounded-lg cursor-not-allowed opacity-60 select-none",
                            task.due_date ? "border-solid bg-blue-500/5 text-blue-600 border-blue-500/30" : "text-muted-foreground"
                          )}
                        >
                          <CalendarIcon size={14} className={task.due_date ? "text-blue-600" : ""} />
                          {task.due_date ? format(new Date(task.due_date), "MMM d, yyyy") : "Due Date"}
                        </div>
                      )}
                    </div>

                    <div className="flex flex-col gap-1.5">
                      <span className="text-[11px] font-bold text-muted-foreground uppercase tracking-widest">Attachment</span>
                      <input
                        type="file"
                        className="hidden"
                        ref={fileInputRef}
                        disabled={isAddingAttachment}
                        accept="image/*,application/pdf,.doc,.docx,.xls,.xlsx,.txt"
                        onChange={(e) => {
                          const file = e.target.files?.[0];
                          if (!file) return;

                          addAttachment(
                            { id: taskId, file },
                            {
                              onError: () => {
                                toast.error("Failed to upload attachment");
                              }
                            }
                          );
                        }}
                      />
                      <Button
                        variant="outline"
                        size="sm"
                        disabled={isAddingAttachment || !canAttachment}
                        onClick={() => fileInputRef.current?.click()}
                        className="flex items-center gap-2 px-2 h-7 w-fit text-foreground hover:bg-muted border-dashed transition-colors text-[11px] font-bold"
                      >
                        {isAddingAttachment ? <ButtonSpinner className="h-3 w-3" /> : <Paperclip size={14} className="text-muted-foreground" />}
                        <span>{isAddingAttachment ? "Uploading..." : "Attach"}</span>
                      </Button>
                    </div>

                  </div>

                  {/* Conditional Row for selected Labels and Members (Unified) */}
                  {(task.labels && task.labels.length > 0) || (task.assignments && task.assignments.length > 0) ? (
                    <div className="flex flex-wrap gap-x-8 gap-y-4 mt-2">
                      {task.labels && task.labels.length > 0 && (
                        <div className="flex flex-col gap-1.5">
                          <span className="text-[11px] font-bold text-muted-foreground uppercase tracking-widest">Labels</span>
                          <div className="flex flex-wrap gap-1.5 items-center">
                            {task.labels.map((tl) => (
                              <Badge
                                key={tl.label.id}
                                style={{ backgroundColor: tl.label.color + '20', borderColor: tl.label.color + '40', color: tl.label.color }}
                                className="px-2 h-7 rounded text-[11px] font-bold uppercase tracking-wider group relative"
                              >
                                {tl.label.name}
                                {canUpdateManage && (
                                  <button
                                    onClick={(e) => {
                                      e.stopPropagation();
                                      handleUnassignLabel(tl.label.id);
                                    }}
                                    className="ml-1 opacity-0 group-hover:opacity-100 transition-opacity hover:text-red-500"
                                  >
                                    <X size={14} />
                                  </button>
                                )}
                              </Badge>
                            ))}
                            {canUpdateManage ? (
                              <Popover open={isLabelPopoverOpen} onOpenChange={setIsLabelPopoverOpen}>
                                <PopoverTrigger asChild>
                                  <Button variant="outline" size="icon" className="w-7 h-7 border-dashed text-muted-foreground hover:text-primary hover:border-primary cursor-pointer">
                                    <Plus size={14} />
                                  </Button>
                                </PopoverTrigger>
                                <PopoverContent align="start" className="w-64 p-0 bg-card border-border shadow-xl">
                                  <div className="p-3 border-b border-border">
                                    <h4 className="text-xs font-bold uppercase tracking-wider mb-2">Labels</h4>
                                    {!isCreatingLabel ? (
                                      <div className="space-y-2">
                                        <div className="max-h-48 overflow-y-auto space-y-1">
                                          {allOrgLabels?.map((label) => {
                                            const isAssigned = task.labels?.some(tl => tl.label.id === label.id);
                                            return (
                                              <div
                                                key={label.id}
                                                role="button"
                                                tabIndex={0}
                                                onClick={() => {
                                                  if (isAssigned) {
                                                    handleUnassignLabel(label.id);
                                                  } else {
                                                    handleAssignLabel(label.id);
                                                  }
                                                }}
                                                onKeyDown={(e) => {
                                                  if (e.key === 'Enter' || e.key === ' ') {
                                                    e.preventDefault();
                                                    if (isAssigned) {
                                                      handleUnassignLabel(label.id);
                                                    } else {
                                                      handleAssignLabel(label.id);
                                                    }
                                                  }
                                                }}
                                                className="w-full flex items-center gap-2 p-1.5 rounded-lg hover:bg-muted transition-colors text-left group cursor-pointer"
                                              >
                                                <div className="w-3 h-3 rounded-full" style={{ backgroundColor: label.color }} />
                                                <span className="text-xs font-medium flex-1">{label.name}</span>
                                                {isAssigned && <Check size={14} className="text-primary" />}
                                                <button
                                                  onClick={(e) => {
                                                    e.stopPropagation();
                                                    if (confirm(`Are you sure you want to delete label "${label.name}"? This will remove it from all tasks.`)) {
                                                      deleteLabel(label.id);
                                                    }
                                                  }}
                                                  className="p-1 opacity-0 group-hover:opacity-100 transition-opacity hover:text-red-500 rounded-md hover:bg-red-50"
                                                >
                                                  <Trash2 size={12} />
                                                </button>
                                              </div>
                                            );
                                          })}
                                          {(!allOrgLabels || allOrgLabels.length === 0) && (
                                            <p className="text-[10px] text-muted-foreground text-center py-2 italic">No labels found</p>
                                          )}
                                        </div>
                                        <Button
                                          variant="ghost"
                                          className="w-full h-8 text-[11px] font-bold text-primary hover:text-primary/80 hover:bg-primary/5 p-0"
                                          onClick={() => setIsCreatingLabel(true)}
                                        >
                                          <Plus size={12} className="mr-1" />
                                          Create new label
                                        </Button>
                                      </div>
                                    ) : (
                                      <CreateLabelForm
                                        onSubmit={(name, color) => {
                                          createLabel({ org_id: task.org_id, name, color }, {
                                            onSuccess: () => {
                                              setIsCreatingLabel(false);
                                            }
                                          });
                                        }}
                                        onBack={() => setIsCreatingLabel(false)}
                                      />
                                    )}
                                  </div>
                                </PopoverContent>
                              </Popover>
                            ) : (
                              <div className="w-7 h-7 border border-dashed border-border rounded flex items-center justify-center text-muted-foreground cursor-not-allowed opacity-60 select-none">
                                <Plus size={14} />
                              </div>
                            )}
                          </div>
                        </div>
                      )}

                      {task.assignments && task.assignments.length > 0 && (
                        <div className="flex flex-col gap-1.5">
                          <span className="text-[11px] font-bold text-muted-foreground uppercase tracking-widest">Members</span>
                          <div className="flex items-center gap-2">
                            <TooltipProvider>
                              <div className="flex items-center -space-x-2">
                                {task.assignments.map((a) => {
                                  const avatarEl = (
                                    <div className={cn(
                                      "w-7 h-7 rounded-full border-2 border-card bg-muted overflow-hidden z-20 transition-all",
                                      canUpdateManage ? "cursor-pointer hover:border-red-500" : ""
                                    )}>
                                      <Avatar className="w-full h-full">
                                        <AvatarImage src={a.user?.avatar_url ? buildAuthenticatedFileUrl(a.user.avatar_url) : undefined} />
                                        <AvatarFallback className="text-[10px] font-bold">{getInitials(a.user?.name)}</AvatarFallback>
                                      </Avatar>
                                    </div>
                                  );

                                  if (!canUpdateManage) {
                                    return (
                                      <Tooltip key={a.user_id}>
                                        <TooltipTrigger asChild>
                                          {avatarEl}
                                        </TooltipTrigger>
                                        <TooltipContent side="bottom" className="text-[10px] font-bold">
                                          {a.user?.name}
                                        </TooltipContent>
                                      </Tooltip>
                                    );
                                  }

                                  return (
                                    <Tooltip key={a.user_id}>
                                      <Popover>
                                        <TooltipTrigger asChild>
                                          <PopoverTrigger asChild>
                                            {avatarEl}
                                          </PopoverTrigger>
                                        </TooltipTrigger>
                                        <PopoverContent className="w-48 p-3 bg-card border-border shadow-xl z-150" side="bottom">
                                          <div className="flex flex-col gap-3">
                                            <div className="flex items-center gap-2">
                                              <Avatar className="w-8 h-8">
                                                <AvatarImage src={a.user?.avatar_url ? buildAuthenticatedFileUrl(a.user.avatar_url) : undefined} />
                                                <AvatarFallback className="text-[10px] font-bold">{getInitials(a.user?.name)}</AvatarFallback>
                                              </Avatar>
                                              <div className="flex flex-col min-w-0">
                                                <span className="text-xs font-bold truncate">{a.user?.name}</span>
                                                <span className={cn(
                                                  "text-[10px] uppercase font-bold tracking-tight",
                                                  (() => {
                                                    const memberInfo = channelMembers?.find(m => m.user_id === a.user_id);
                                                    const orgRole = memberInfo?.org_role;
                                                    const channelRole = memberInfo?.role;

                                                    if (orgRole === 'OWNER') return "text-amber-500";
                                                    if (orgRole === 'ADMIN' || channelRole === 'MANAGER') return "text-blue-500";
                                                    return "text-muted-foreground";
                                                  })()
                                                )}>
                                                  {(() => {
                                                    const memberInfo = channelMembers?.find(m => m.user_id === a.user_id);
                                                    const orgRole = memberInfo?.org_role;
                                                    const channelRole = memberInfo?.role;

                                                    if (orgRole === 'OWNER') return "Owner";
                                                    if (orgRole === 'ADMIN') return "Admin";
                                                    if (channelRole === 'MANAGER') return "Manager";
                                                    return channelRole?.toLowerCase() || "Member";
                                                  })()}
                                                </span>
                                              </div>
                                            </div>
                                            <p className="text-[11px] text-muted-foreground leading-relaxed">Are you sure you want to remove this member from the task?</p>
                                            <div className="flex gap-2">
                                              <Button
                                                size="sm"
                                                variant="destructive"
                                                className="flex-1 h-8 text-[11px] font-bold rounded-md"
                                                onClick={() => handleUnassignUser(a.user_id)}
                                              >
                                                Remove
                                              </Button>
                                              <PopoverClose asChild>
                                                <Button
                                                  size="sm"
                                                  variant="ghost"
                                                  className="flex-1 h-8 text-[11px] font-bold rounded-md hover:bg-muted"
                                                >
                                                  Cancel
                                                </Button>
                                              </PopoverClose>
                                            </div>
                                          </div>
                                        </PopoverContent>
                                      </Popover>
                                      <TooltipContent side="bottom" className="text-[10px] font-bold">
                                        {a.user?.name} (Click to manage)
                                      </TooltipContent>
                                    </Tooltip>
                                  );
                                })}
                              </div>
                            </TooltipProvider>
                            {canUpdateManage ? (
                              <DropdownMenu>
                                <DropdownMenuTrigger asChild>
                                  <Button variant="outline" size="icon" className="w-7 h-7 rounded-full border-dashed text-muted-foreground hover:text-primary hover:border-primary cursor-pointer">
                                    <Plus size={14} />
                                  </Button>
                                </DropdownMenuTrigger>
                                <DropdownMenuContent align="start" className="w-56 rounded-xl bg-card border-border shadow-xl p-1">
                                  <DropdownMenuLabel className="text-[10px] font-bold uppercase tracking-widest text-muted-foreground px-2 py-1.5">Channel Members</DropdownMenuLabel>
                                  <DropdownMenuSeparator className="bg-border/50" />
                                  <div className="max-h-60 overflow-y-auto">
                                    {channelMembers?.map((member) => {
                                      const isAssigned = task.assignments?.some(a => a.user_id === member.user_id);
                                      return (
                                        <DropdownMenuItem
                                          key={member.user_id}
                                          onClick={() => isAssigned
                                            ? handleUnassignUser(member.user_id)
                                            : handleAssignUser(member.user_id)
                                          }
                                          className="flex items-center gap-2 p-2 rounded-lg cursor-pointer"
                                        >
                                          <Avatar className="w-6 h-6">
                                            <AvatarImage src={member.avatar_url ? buildAuthenticatedFileUrl(member.avatar_url) : undefined} />
                                            <AvatarFallback className="text-[10px] font-bold">{getInitials(member.name)}</AvatarFallback>
                                          </Avatar>
                                          <div className="flex flex-col flex-1 min-w-0">
                                            <span className="text-xs font-medium truncate">{member.name}</span>
                                            {member.email && (
                                              <span className="text-[10px] text-muted-foreground truncate">{member.email}</span>
                                            )}
                                          </div>
                                          {isAssigned && <Check size={14} className="text-primary" />}
                                        </DropdownMenuItem>
                                      );
                                    })}
                                  </div>
                                </DropdownMenuContent>
                              </DropdownMenu>
                            ) : (
                              <div className="w-7 h-7 rounded-full border border-dashed border-border flex items-center justify-center text-muted-foreground cursor-not-allowed opacity-60 select-none">
                                <Plus size={14} />
                              </div>
                            )}
                          </div>
                        </div>
                      )}
                    </div>
                  ) : null}

                  {/* Description Editor */}
                  <section className="flex flex-col gap-2 mt-4">
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-2 text-foreground font-bold">
                        <AlignLeft className="h-5 w-5 text-primary" />
                        <h3>Description</h3>
                      </div>
                      {descriptionDraft.isEditing && (
                        <div className="flex items-center gap-2">
                          <Button
                            variant="ghost"
                            size="sm"
                            className="h-7 text-xs"
                            onClick={() => {
                              dirtyFieldsRef.current.description = false;
                              setDescriptionDraft((prev) => ({
                                ...prev,
                                value: prev.lastServerValue,
                                baseValue: prev.lastServerValue,
                                isEditing: false,
                                isDirty: false,
                                serverVersionAtStart: task?.updated_at || null,
                              }));
                            }}
                          >
                            Cancel
                          </Button>
                          <Button
                            size="sm"
                            className="h-7 text-xs"
                            onClick={handleUpdateDescription}
                          >
                            Save
                          </Button>
                        </div>
                      )}
                    </div>

                    {descriptionDraft.isEditing ? (
                      <TiptapEditor
                        content={descriptionDraft.value}
                        onChange={(value) =>
                          setDescriptionDraft((prev) => ({
                            ...prev,
                            value,
                            isDirty: markDirty("description", value, prev.baseValue),
                          }))
                        }
                        placeholder="Add a more detailed description..."
                        autoFocus
                      />
                    ) : (
                      <div
                        onClick={() => {
                          if (!canUpdateBasic) return;
                          setDescriptionDraft((prev) => ({
                            ...prev,
                            value: prev.lastServerValue,
                            baseValue: prev.lastServerValue,
                            isEditing: true,
                            isDirty: false,
                            serverVersionAtStart: task.updated_at || null,
                          }));
                        }}
                        className={cn(
                          "p-3 min-h-[120px] text-sm text-foreground rounded-md border border-transparent transition-all prose prose-sm dark:prose-invert max-w-none [&_p]:my-0 [&_ul]:my-0 [&_ol]:my-0 [&_li::marker]:text-foreground wrap-anywhere [&_p]:wrap-anywhere [&_li]:wrap-anywhere [&_h1]:wrap-anywhere [&_h2]:wrap-anywhere [&_h3]:wrap-anywhere [&_pre]:max-w-full [&_pre]:overflow-x-auto [&_pre]:whitespace-pre-wrap [&_pre]:wrap-anywhere [&_pre_code]:whitespace-pre-wrap [&_pre_code]:wrap-anywhere",
                          canUpdateBasic ? "hover:border-border hover:bg-muted/5 cursor-text" : "cursor-default",
                          (!task.description || task.description.replace(/<[^>]*>/g, '').trim() === '') && "text-muted-foreground italic"
                        )}
                        dangerouslySetInnerHTML={{
                          __html: (descriptionDraft.lastServerValue && descriptionDraft.lastServerValue.replace(/<[^>]*>/g, '').trim() !== '')
                            ? descriptionDraft.lastServerValue
                            : "Add a more detailed description..."
                        }}
                      />
                    )}
                  </section>

                  {/* Attachments Section */}
                  {task.attachments && task.attachments.length > 0 && (
                    <section className="flex flex-col gap-3 mt-4">
                      <div className="flex items-center gap-2 text-foreground font-bold">
                        <Paperclip size={18} className="text-primary" />
                        <h3>Attachments</h3>
                      </div>
                      <div className="grid grid-cols-4 gap-3">
                        {task.attachments.map((file) => {
                          const isImage = file.mime_type?.startsWith('image/');
                          const isPdf = file.mime_type === 'application/pdf';
                          const fileUrl = buildAuthenticatedFileUrl(file.file_url);

                          return (
                            <div
                              key={file.id}
                              onClick={() => isImage ? setSelectedImage(fileUrl) : window.open(fileUrl, '_blank', 'noopener,noreferrer')}
                              className="flex flex-col rounded-lg border border-border bg-muted/20 overflow-hidden group hover:border-primary/40 transition-all cursor-pointer shadow-sm"
                            >
                              {isImage ? (
                                <div className="h-16 w-full relative bg-muted overflow-hidden">
                                  <Image
                                    src={fileUrl}
                                    alt={file.file_name}
                                    fill
                                    unoptimized
                                    className="object-cover transition-transform duration-500 group-hover:scale-110"
                                  />
                                  <div className="absolute inset-0 bg-black/0 group-hover:bg-black/20 transition-colors" />
                                </div>
                              ) : (
                                <div className="h-16 w-full flex items-center justify-center bg-muted/50 border-b border-border">
                                  <div className={cn(
                                    "w-7 h-7 rounded flex items-center justify-center transition-transform group-hover:scale-110 shadow-sm",
                                    isPdf ? "bg-red-500/10 text-red-500" : "bg-primary/10 text-primary"
                                  )}>
                                    {isPdf ? <FileText size={16} /> : <Paperclip size={16} />}
                                  </div>
                                </div>
                              )}
                              <div className="p-1.5 flex items-center justify-between min-w-0">
                                <div className="flex flex-col min-w-0">
                                  <span className="text-[9px] font-bold truncate group-hover:text-primary transition-colors">{file.file_name}</span>
                                  <span className="text-[8px] text-muted-foreground uppercase font-bold tracking-tight">{(file.file_size / 1024).toFixed(1)} KB</span>
                                </div>
                                {canAttachment && (
                                  <Button
                                    variant="ghost"
                                    size="icon"
                                    className="h-6 w-6 rounded-full text-muted-foreground hover:text-red-500 hover:bg-red-500/10 opacity-0 group-hover:opacity-100 transition-all"
                                    onClick={(e) => {
                                      e.stopPropagation();
                                      deleteAttachment(file.id);
                                    }}
                                  >
                                    <Trash2 size={12} />
                                  </Button>
                                )}
                              </div>
                            </div>
                          );
                        })}
                      </div>
                    </section>
                  )}

                  {/* Image Lightbox Dialog */}
                  <Dialog open={!!selectedImage} onOpenChange={(open) => !open && setSelectedImage(null)}>
                    <DialogContent
                      showCloseButton={false}
                      overlayClassName="bg-gray-950/20 backdrop-blur-md"
                      className="max-w-none w-screen h-screen p-0 overflow-hidden bg-transparent border-none shadow-none flex items-center justify-center z-100"
                    >
                      <div className="sr-only">
                        <DialogTitle>Image Preview</DialogTitle>
                        <DialogDescription>Full screen view of the selected attachment</DialogDescription>
                      </div>

                      <Button
                        variant="ghost"
                        size="icon"
                        onClick={() => setSelectedImage(null)}
                        className="absolute top-6 right-6 z-130 h-12 w-12 rounded-full bg-black/20 hover:bg-black/40 text-white/80 hover:text-white backdrop-blur-sm border border-white/10 transition-all shadow-xl group"
                      >
                        <X size={28} className="transition-transform group-hover:rotate-90 duration-300" />
                      </Button>

                      {selectedImage && (
                        <div className="flex flex-col w-full h-full">
                          {/* Toolbar */}
                          <div className="absolute top-6 left-1/2 -translate-x-1/2 z-120 flex items-center gap-2 p-1.5 rounded-full bg-black/40 backdrop-blur-md border border-white/10 shadow-2xl">
                            <Button
                              variant="ghost" size="icon"
                              className="h-9 w-9 text-white/70 hover:text-white hover:bg-white/10 rounded-full"
                              onClick={() => setZoomLevel(prev => Math.max(0.5, prev - 0.25))}
                            >
                              <ZoomOut size={18} />
                            </Button>
                            <div className="px-2 text-[11px] font-bold text-white/60 min-w-[45px] text-center">
                              {Math.round(zoomLevel * 100)}%
                            </div>
                            <Button
                              variant="ghost" size="icon"
                              className="h-9 w-9 text-white/70 hover:text-white hover:bg-white/10 rounded-full"
                              onClick={() => setZoomLevel(prev => Math.min(3, prev + 0.25))}
                            >
                              <ZoomIn size={18} />
                            </Button>
                            <div className="w-px h-4 bg-white/10 mx-1" />
                            <Button
                              variant="ghost" size="icon"
                              className="h-9 w-9 text-white/70 hover:text-white hover:bg-white/10 rounded-full"
                              onClick={() => setZoomLevel(1)}
                              title="Reset Zoom"
                            >
                              <RotateCcw size={18} />
                            </Button>
                            <Button
                              variant="ghost" size="icon"
                              className="h-9 w-9 text-white/70 hover:text-white hover:bg-white/10 rounded-full"
                              onClick={() => window.open(selectedImage, '_blank', 'noopener,noreferrer')}
                              title="Open in New Tab"
                            >
                              <ExternalLink size={18} />
                            </Button>
                            <a
                              href={buildAuthenticatedDownloadUrl(selectedImage)}
                              download
                              target="_blank"
                              rel="noopener noreferrer"
                              className="h-9 w-9 flex items-center justify-center text-white/70 hover:text-white hover:bg-white/10 rounded-full transition-colors"
                              title="Download"
                            >
                              <Download size={18} />
                            </a>
                          </div>

                          {/* Image Area */}
                          <div className="flex-1 flex items-center justify-center p-4 md:p-12 overflow-auto">
                            <div
                              className="transition-transform duration-200 ease-out flex items-center justify-center"
                              style={{ transform: `scale(${zoomLevel})` }}
                            >
                              <Image
                                src={selectedImage}
                                alt="Preview"
                                width={2000}
                                height={1500}
                                unoptimized
                                className="w-auto h-auto max-w-full max-h-[85vh] object-contain shadow-2xl rounded-sm"
                              />
                            </div>
                          </div>
                        </div>
                      )}
                    </DialogContent>
                  </Dialog>


                  {/* Subtasks Section (Nested Tasks) */}
                  <section className="flex flex-col gap-3 mt-4">
                    <div className="flex items-center gap-2 text-foreground font-bold">
                      <List className="h-5 w-5 text-primary" />
                      <h3>Subtasks</h3>
                    </div>

                    <div className="flex flex-col gap-2">
                      {task.subtasks?.map((subtask) => (
                        editingSubtaskId === subtask.id ? (
                          <ControlledInlineTextareaEditor
                            key={subtask.id}
                            value={subtaskDrafts[subtask.id]?.value ?? subtask.title}
                            onChange={(value) =>
                              setSubtaskDrafts((prev) => {
                                const current = prev[subtask.id] ?? createDraftState(subtask.title, task.updated_at || null);
                                return {
                                  ...prev,
                                  [subtask.id]: {
                                    ...current,
                                    value,
                                    isEditing: true,
                                    isDirty: markDirty(`subtask:${subtask.id}`, value, current.baseValue),
                                  },
                                };
                              })
                            }
                            onSubmit={() => handleUpdateSubtaskTitle(subtask.id, (subtaskDrafts[subtask.id]?.value ?? subtask.title).trim())}
                            onCancel={() => {
                              dirtyFieldsRef.current[`subtask:${subtask.id}`] = false;
                              setEditingSubtaskId(null);
                              setSubtaskDrafts((prev) => ({
                                ...prev,
                                [subtask.id]: {
                                    ...(prev[subtask.id] ?? createDraftState(subtask.title, task?.updated_at || null)),
                                  value: prev[subtask.id]?.lastServerValue ?? subtask.title,
                                  baseValue: prev[subtask.id]?.lastServerValue ?? subtask.title,
                                  isEditing: false,
                                  isDirty: false,
                                },
                              }));
                            }}
                            placeholder="What needs to be done?"
                            isLoading={!!savingSubtaskIds[subtask.id]}
                          />
                        ) : (
                          <div key={subtask.id} className="flex items-center gap-2 px-2 bg-transparent hover:bg-muted/5 rounded-lg transition-all group">
                            <button
                              onClick={() => handleToggleSubtaskStatus(subtask.id, subtask.status)}
                              aria-label={(optimisticSubtaskStatus[subtask.id] ?? subtask.status) === 'COMPLETED' ? "Mark incomplete" : "Mark complete"}
                              disabled={!canUpdateBasic}
                              className={cn(
                                "w-4 h-4 rounded border flex items-center justify-center shrink-0 transition-colors",
                                !canUpdateBasic && "pointer-events-none opacity-60",
                                (optimisticSubtaskStatus[subtask.id] ?? subtask.status) === 'COMPLETED' ? "border-primary bg-primary text-primary-foreground" : "border-border hover:border-primary"
                              )}
                            >
                              {(optimisticSubtaskStatus[subtask.id] ?? subtask.status) === 'COMPLETED' && <Check size={12} strokeWidth={3} />}
                            </button>

                            <span
                              onClick={() => {
                                if (!canUpdateManage) return;
                                const serverValue = subtaskDrafts[subtask.id]?.lastServerValue ?? subtask.title;
                                setSubtaskDrafts((prev) => ({
                                  ...prev,
                                  [subtask.id]: {
                                    ...(prev[subtask.id] ?? createDraftState(serverValue, task?.updated_at || null)),
                                    value: serverValue,
                                    baseValue: serverValue,
                                    lastServerValue: serverValue,
                                    isEditing: true,
                                    isDirty: false,
                                    serverVersionAtStart: task?.updated_at || null,
                                  },
                                }));
                                setEditingSubtaskId(subtask.id);
                              }}
                              className={cn(
                                "text-sm font-medium flex-1 whitespace-pre-wrap wrap-break-words transition-all",
                                canUpdateManage ? "cursor-text" : "cursor-default"
                              )}
                            >
                              {subtask.title}
                            </span>

                            <div className="flex items-center gap-2">
                              <SingleAssigneeSelector
                                size="xs"
                                currentAssignee={subtask.assignments?.[0]?.user}
                                members={channelMembers}
                                disabled={!canUpdateManage}
                                onSelect={(userId) => {
                                  const currentAssignment = subtask.assignments?.[0];
                                  if (currentAssignment) {
                                    unassignUser({ id: subtask.id, userId: currentAssignment.user_id });
                                  }
                                  if (userId && (!currentAssignment || currentAssignment.user_id !== userId)) {
                                    assignUser({ id: subtask.id, data: { user_id: userId } });
                                  }
                                }}
                              />
                              {canDeleteTask && (
                                <div className={cn(
                                  "overflow-hidden transition-all duration-200 ease-in-out",
                                  deletingSubtaskIds[subtask.id] ? "max-w-8" : "max-w-0 group-hover:max-w-8"
                                )}>
                                  <Button
                                    variant="ghost"
                                    size="icon"
                                    className={cn(
                                      "h-8 w-8 text-muted-foreground hover:text-red-500 hover:bg-red-500/10",
                                      deletingSubtaskIds[subtask.id] && "text-red-500 bg-red-500/10 disabled:opacity-100"
                                    )}
                                    disabled={deletingSubtaskIds[subtask.id]}
                                    onClick={() => handleDeleteSubtask(subtask.id)}
                                  >
                                    {deletingSubtaskIds[subtask.id] ? (
                                      <ButtonSpinner className="h-3 w-3" />
                                    ) : (
                                      <Trash2 size={16} />
                                    )}
                                  </Button>
                                </div>
                              )}
                            </div>
                          </div>
                        )
                      ))}
                    </div>

                    {canUpdateBasic && (
                      isAddingSubtaskMode ? (
                        <AddSubtaskForm
                          onSubmit={handleAddSubtask}
                          onCancel={() => setIsAddingSubtaskMode(false)}
                        />
                      ) : (
                        <Button
                          variant="ghost"
                          onClick={() => setIsAddingSubtaskMode(true)}
                          className="w-full justify-start gap-2 h-10 px-3 text-muted-foreground hover:text-primary border border-dashed border-border group mt-1 rounded-lg bg-muted/5 hover:bg-muted/10 transition-all"
                        >
                          <Plus size={14} className="group-hover:scale-110 transition-transform" />
                          <span className="text-sm font-medium">Add a subtask</span>
                        </Button>
                      )
                    )}
                  </section>

                  {/* Checklists Section */}
                  {task.checklists?.map((checklist) => {
                    const completedItems = checklist.items?.filter(i => i.is_completed).length || 0;
                    const totalItems = checklist.items?.length || 0;
                    const progress = totalItems > 0 ? (completedItems / totalItems) * 100 : 0;

                    return (
                      <section key={checklist.id} className="flex flex-col gap-4 mt-4">
                        <div className="flex items-center justify-between gap-4">
                          <div className="flex items-center gap-2 text-foreground font-bold flex-1">
                            <CheckSquare className="h-5 w-5 text-primary shrink-0" />
                            {editingChecklistId === checklist.id ? (
                              <ControlledInlineInputEditor
                                value={checklistDrafts[checklist.id]?.value ?? checklist.name}
                                onChange={(value) =>
                                  setChecklistDrafts((prev) => {
                                    const current = prev[checklist.id] ?? createDraftState(checklist.name, task?.updated_at || null);
                                    return {
                                      ...prev,
                                      [checklist.id]: {
                                        ...current,
                                        value,
                                        isEditing: true,
                                        isDirty: markDirty(`checklist:${checklist.id}`, value, current.baseValue),
                                      },
                                    };
                                  })
                                }
                                onSubmit={() => handleUpdateChecklistTitle(checklist.id, (checklistDrafts[checklist.id]?.value ?? checklist.name).trim())}
                                onCancel={() => {
                                  dirtyFieldsRef.current[`checklist:${checklist.id}`] = false;
                                  setEditingChecklistId(null);
                                  setChecklistDrafts((prev) => ({
                                    ...prev,
                                    [checklist.id]: {
                                      ...(prev[checklist.id] ?? createDraftState(checklist.name, task?.updated_at || null)),
                                      value: prev[checklist.id]?.lastServerValue ?? checklist.name,
                                      baseValue: prev[checklist.id]?.lastServerValue ?? checklist.name,
                                      isEditing: false,
                                      isDirty: false,
                                    },
                                  }));
                                }}
                                className="text-sm bg-transparent border-none p-0 focus:ring-0 text-foreground focus:outline-none font-bold flex-1 w-full"
                              />
                            ) : (
                              <h3
                                className={cn("flex-1 py-1", canUpdateManage ? "cursor-text" : "cursor-default")}
                                onClick={() => {
                                  if (!canUpdateManage) return;
                                  const serverValue = checklistDrafts[checklist.id]?.lastServerValue ?? checklist.name;
                                  setChecklistDrafts((prev) => ({
                                    ...prev,
                                    [checklist.id]: {
                                      ...(prev[checklist.id] ?? createDraftState(serverValue, task?.updated_at || null)),
                                      value: serverValue,
                                      baseValue: serverValue,
                                      lastServerValue: serverValue,
                                      isEditing: true,
                                      isDirty: false,
                                      serverVersionAtStart: task?.updated_at || null,
                                    },
                                  }));
                                  setEditingChecklistId(checklist.id);
                                }}
                              >
                                {checklist.name}
                              </h3>
                            )}
                          </div>
                          <div className="flex items-center gap-2 justify-end">
                            <SingleAssigneeSelector
                              size="sm"
                              currentAssignee={checklist.assignee}
                              members={channelMembers}
                              disabled={!canUpdateManage}
                              onSelect={(userId) => handleUpdateChecklistAssignee(checklist.id, userId)}
                              alwaysVisible
                            />
                            <motion.div>
                              <Badge variant="secondary" className="px-1.5 py-0.5 text-[11px] font-bold shrink-0 min-w-[32px] justify-center">{`${completedItems}/${totalItems}`}</Badge>
                            </motion.div>
                            {canUpdateManage && (
                              <Popover>
                                <PopoverTrigger asChild>
                                  <Button
                                    variant="ghost"
                                    size="icon"
                                    className="h-8 w-8 text-muted-foreground hover:text-red-500 hover:bg-red-500/10 transition-colors"
                                  >
                                    <Trash2 size={16} />
                                  </Button>
                                </PopoverTrigger>
                                <PopoverContent className="w-56 p-3 bg-card border border-border shadow-xl z-50 rounded-xl" side="bottom" align="end">
                                  <div className="flex flex-col gap-3">
                                    <div className="flex items-center gap-2 text-red-500">
                                      <Trash2 size={16} />
                                      <span className="text-xs font-bold">Delete Checklist</span>
                                    </div>
                                    <p className="text-[11px] text-muted-foreground leading-relaxed">
                                      Are you sure you want to delete this checklist? This action cannot be undone.
                                    </p>
                                    <div className="flex gap-2">
                                      <Button
                                        size="sm"
                                        variant="destructive"
                                        className="flex-1 h-8 text-[11px] font-bold rounded-md"
                                        onClick={() => handleDeleteChecklist(checklist.id)}
                                      >
                                        Delete
                                      </Button>
                                      <PopoverClose asChild>
                                        <Button
                                          size="sm"
                                          variant="ghost"
                                          className="flex-1 h-8 text-[11px] font-bold rounded-md hover:bg-muted"
                                        >
                                          Cancel
                                        </Button>
                                      </PopoverClose>
                                    </div>
                                  </div>
                                </PopoverContent>
                              </Popover>
                            )}
                          </div>
                        </div>

                        <div className="w-full bg-secondary rounded-full h-1.5 mb-1">
                          <div className="bg-primary h-1.5 rounded-full transition-all" style={{ width: `${progress}%` }}></div>
                        </div>

                        <div className="flex flex-col gap-2">
                          {checklist.items?.map((item) => (
                            editingItemId === item.id ? (
                              <ControlledInlineTextareaEditor
                                key={item.id}
                                value={itemDrafts[item.id]?.value ?? item.text}
                                onChange={(value) =>
                                  setItemDrafts((prev) => {
                                    const current = prev[item.id] ?? createDraftState(item.text, task?.updated_at || null);
                                    return {
                                      ...prev,
                                      [item.id]: {
                                        ...current,
                                        value,
                                        isEditing: true,
                                        isDirty: markDirty(`item:${item.id}`, value, current.baseValue),
                                      },
                                    };
                                  })
                                }
                                onSubmit={() => handleUpdateItemTitle(item.id, (itemDrafts[item.id]?.value ?? item.text).trim())}
                                onCancel={() => {
                                  dirtyFieldsRef.current[`item:${item.id}`] = false;
                                  setEditingItemId(null);
                                  setItemDrafts((prev) => ({
                                    ...prev,
                                    [item.id]: {
                                      ...(prev[item.id] ?? createDraftState(item.text, task?.updated_at || null)),
                                      value: prev[item.id]?.lastServerValue ?? item.text,
                                      baseValue: prev[item.id]?.lastServerValue ?? item.text,
                                      isEditing: false,
                                      isDirty: false,
                                    },
                                  }));
                                }}
                                placeholder="What needs to be done?"
                                isLoading={!!savingChecklistItemIds[item.id]}
                              />
                            ) : (
                              <div key={item.id} className="flex items-center gap-2 py-1.5 px-2 bg-transparent hover:bg-muted/5 rounded-lg transition-all group">
                                <button
                                  onClick={() => handleToggleChecklistItem(item.id, item.is_completed)}
                                  aria-label={(optimisticChecklistItems[item.id] ?? item.is_completed) ? "Mark incomplete" : "Mark complete"}
                                  disabled={!canUpdateBasic}
                                  className={cn(
                                    "w-4 h-4 rounded border flex items-center justify-center shrink-0 transition-colors",
                                    !canUpdateBasic && "pointer-events-none opacity-60",
                                    (optimisticChecklistItems[item.id] ?? item.is_completed) ? "border-primary bg-primary text-primary-foreground" : "border-border hover:border-primary"
                                  )}
                                >
                                  {(optimisticChecklistItems[item.id] ?? item.is_completed) && <Check size={12} strokeWidth={3} />}
                                </button>

                                 <span
                                  onClick={() => {
                                    if (!canUpdateManage) return;
                                    const serverValue = itemDrafts[item.id]?.lastServerValue ?? item.text;
                                    setItemDrafts((prev) => ({
                                      ...prev,
                                      [item.id]: {
                                      ...(prev[item.id] ?? createDraftState(serverValue, task?.updated_at || null)),
                                        value: serverValue,
                                        baseValue: serverValue,
                                        lastServerValue: serverValue,
                                        isEditing: true,
                                        isDirty: false,
                                        serverVersionAtStart: task?.updated_at || null,
                                      },
                                    }));
                                    setEditingItemId(item.id);
                                  }}
                                  className={cn(
                                    "text-sm flex-1 whitespace-pre-wrap wrap-break-words transition-all",
                                    canUpdateManage ? "cursor-text" : "cursor-default",
                                    (optimisticChecklistItems[item.id] ?? item.is_completed) ? "text-muted-foreground line-through" : "text-foreground"
                                  )}
                                >
                                  {item.text}
                                </span>

                                <div className="flex items-center gap-1.5 shrink-0">
                                  <SingleAssigneeSelector
                                    size="xs"
                                    currentAssignee={item.assignee}
                                    members={channelMembers}
                                    disabled={!canUpdateManage}
                                    onSelect={(userId) => updateChecklistItem({ itemId: item.id, data: { assignee_id: userId } })}
                                  />
                                  {canUpdateManage && (
                                    <div className={cn(
                                      "transition-all duration-300 ease-out overflow-hidden flex items-center justify-center shrink-0",
                                      deletingChecklistItemIds[item.id] ? "w-8 opacity-100" : "w-0 opacity-0 group-hover:w-8 group-hover:opacity-100"
                                    )}>
                                      <Button
                                        variant="ghost"
                                        size="icon"
                                        className={cn(
                                          "h-8 w-8 text-muted-foreground hover:text-red-500 hover:bg-red-500/10 shrink-0",
                                          deletingChecklistItemIds[item.id] && "text-red-500 bg-red-500/10 disabled:opacity-100"
                                        )}
                                        disabled={deletingChecklistItemIds[item.id]}
                                        onClick={() => handleDeleteChecklistItem(item.id)}
                                      >
                                        {deletingChecklistItemIds[item.id] ? (
                                          <ButtonSpinner className="h-3 w-3" />
                                        ) : (
                                          <Trash2 size={16} />
                                        )}
                                      </Button>
                                    </div>
                                  )}
                                </div>
                              </div>
                            )
                          ))}
                        </div>

                        {canUpdateBasic && (
                          addingChecklistId === checklist.id ? (
                            <AddChecklistItemForm
                              onSubmit={(text) => handleAddChecklistItem(checklist.id, text)}
                              onCancel={() => setAddingChecklistId(null)}
                            />
                          ) : (
                            <Button
                              variant="ghost"
                              onClick={() => setAddingChecklistId(checklist.id)}
                              className="w-full justify-start gap-2 h-10 px-3 text-muted-foreground hover:text-primary border border-dashed border-border group mt-1 rounded-lg bg-muted/5 hover:bg-muted/10 transition-all"
                            >
                              <Plus size={14} className="group-hover:scale-110 transition-transform" />
                              <span className="text-sm font-medium">Add an item</span>
                            </Button>
                          )
                        )}
                      </section>
                    );
                  })}
                </div>
              </ScrollArea>
            </main>

            {/* 
             * RIGHT COLUMN: Sidebar (Comments & Activity)
             * Tab-based sidebar: default tab is "Comments", second tab is "Activity".
             */}
            <aside className="w-[35%] bg-muted/10 flex flex-col border-l border-border h-full">
              <Tabs defaultValue="comments" className="flex flex-col h-full gap-0">
                {/* Tab header */}
                <div className="px-4 pt-3 pb-0 border-b border-border bg-card shrink-0">
                  <TabsList variant="line" className="w-full justify-start gap-0 h-auto pb-0 rounded-none">
                    <TabsTrigger
                      value="comments"
                      className="flex items-center gap-1.5 pb-2.5 px-3 text-xs font-semibold rounded-none border-b-2 border-transparent data-[state=active]:border-transparent data-[state=active]:text-primary"
                    >
                      <MessageSquare className="h-3.5 w-3.5" />
                      Comments
                    </TabsTrigger>
                    <TabsTrigger
                      value="activity"
                      className="flex items-center gap-1.5 pb-2.5 px-3 text-xs font-semibold rounded-none data-[state=active]:border-transparent data-[state=active]:text-primary"
                    >
                      <History className="h-3.5 w-3.5" />
                      Activity
                    </TabsTrigger>
                  </TabsList>
                </div>

                {/* ── COMMENTS TAB ── */}
                <TabsContent value="comments" className="flex flex-col flex-1 overflow-hidden mt-0">
                  {canComment && (
                    <div className="p-4 border-b border-border bg-card shrink-0">
                      <CommentInput onSubmit={handleAddComment} />
                    </div>
                  )}
                  <ScrollArea className="flex-1 p-4">
                    <div className="flex flex-col gap-4 pb-4">
                      {comments.map((comment) => (
                        <div key={comment.id} className="flex gap-2">
                          <div className="w-8 h-8 rounded-full bg-muted overflow-hidden border border-background shrink-0">
                            <Avatar className="w-full h-full">
                              <AvatarImage src={comment.user?.avatar_url ? buildAuthenticatedFileUrl(comment.user.avatar_url) : undefined} />
                              <AvatarFallback className="text-[10px] font-bold uppercase">
                                {getInitials(comment.user?.name, "U")}
                              </AvatarFallback>
                            </Avatar>
                          </div>
                          <div className="flex flex-col gap-1 flex-1">
                            <div className="flex items-center justify-between w-full">
                              <span className="text-[13px] font-medium text-foreground">{comment.user?.name || "User"}</span>
                              <span className="text-[11px] text-muted-foreground opacity-70">{format(new Date(comment.created_at), 'MMM d, p')}</span>
                            </div>
                            <div className="bg-card border border-border p-2.5 rounded-lg rounded-tl-none text-sm text-foreground shadow-sm whitespace-pre-wrap wrap-anywhere">
                              {comment.text}
                            </div>
                          </div>
                        </div>
                      ))}
                      {comments.length === 0 && (
                        <div className="flex flex-col items-center justify-center gap-2 pt-10 text-center">
                          <MessageSquare className="h-8 w-8 text-muted-foreground/40" />
                          <p className="text-sm text-muted-foreground">No comments yet.</p>
                          <p className="text-xs text-muted-foreground/60">Be the first to leave a comment.</p>
                        </div>
                      )}
                    </div>
                  </ScrollArea>
                </TabsContent>

                {/* ── ACTIVITY TAB ── */}
                <TabsContent value="activity" className="flex flex-col flex-1 overflow-hidden mt-0">
                  <ActivityFeed taskId={task.id} />
                </TabsContent>
              </Tabs>
           </aside>
          </div>
        </DialogContent>
      </Dialog>

      {/* 
       * ADD CHECKLIST DIALOG
       * Secondary dialog used to prompt the user for a new checklist title.
       */}
      <AddChecklistDialog
        open={isAddChecklistDialogOpen}
        onOpenChange={setIsAddChecklistDialogOpen}
        onCreate={handleCreateNewChecklist}
      />

      <ConfirmDeleteLabelDialog
        open={labelToDelete !== null}
        onOpenChange={(open) => {
          if (!open) setLabelToDelete(null);
        }}
        onConfirm={() => {
          if (labelToDelete) {
            deleteLabel(labelToDelete.id);
            setLabelToDelete(null);
          }
        }}
        labelName={labelToDelete?.name || ""}
      />
    </>
  );
}
