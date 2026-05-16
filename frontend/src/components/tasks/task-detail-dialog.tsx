"use client";

/* 
 * UI Component & Icon Imports
 * Includes Lucide icons for visual representation and common utility components.
 */
import { useState, useRef } from "react";
import Image from "next/image";
import {
  AlignLeft,
  CheckSquare,
  MessageSquare,
  Calendar as CalendarIcon,
  Plus,
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
  RotateCcw
} from "lucide-react";
import { format } from "date-fns";
import { cn } from "@/lib/utils";
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
  TaskUser
} from "@/api/tasks";
import { useChannelMembers } from "@/api/channels";
import { toast } from "sonner";
import { motion } from "framer-motion";

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
}

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
  size = "sm"
}: {
  currentAssignee?: TaskUser | null;
  members: ChannelMember[];
  onSelect: (userId: string | null) => void;
  placeholder?: string;
  size?: "sm" | "xs" | "icon";
}) {
  return (
    <DropdownMenu>
      <DropdownMenuTrigger asChild>
        <div className={cn(
          "outline-none cursor-pointer transition-all duration-200",
          !currentAssignee && "opacity-0 group-hover:opacity-100 data-[state=open]:opacity-100"
        )}>
          {currentAssignee ? (
            <TooltipProvider>
              <Tooltip>
                <TooltipTrigger asChild>
                  <Avatar className={cn(
                    "hover:ring-2 hover:ring-primary transition-all",
                    size === "sm" ? "w-7 h-7" : size === "xs" ? "w-6 h-6" : "w-5 h-5"
                  )}>
                    <AvatarImage src={currentAssignee.avatar_url || ""} />
                    <AvatarFallback className="text-[10px] font-bold bg-primary/10 text-primary uppercase">
                      {currentAssignee.name?.substring(0, 2)}
                    </AvatarFallback>
                  </Avatar>
                </TooltipTrigger>
                <TooltipContent side="bottom" className="text-[10px] font-bold">
                  {currentAssignee.name} (Click to change)
                </TooltipContent>
              </Tooltip>
            </TooltipProvider>
          ) : (
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
          )}
        </div>
      </DropdownMenuTrigger>
      <DropdownMenuContent align="end" className="w-56 rounded-xl bg-card border-border shadow-xl p-1">
        <DropdownMenuLabel className="text-[10px] font-bold uppercase tracking-widest text-muted-foreground px-2 py-1.5">
          Assign to...
        </DropdownMenuLabel>
        <DropdownMenuSeparator className="bg-border/50" />
        <div className="max-h-60 overflow-y-auto">
          {currentAssignee && (
            <DropdownMenuItem
              onClick={() => onSelect(null)}
              className="flex items-center gap-2 px-2 py-1.5 cursor-pointer rounded-lg hover:bg-muted text-red-500"
            >
              <Avatar className="w-6 h-6 border border-red-500/20">
                <AvatarFallback className="text-[8px] font-bold bg-red-500/10"><X size={10} /></AvatarFallback>
              </Avatar>
              <span className="text-xs font-medium flex-1">Remove Assignee</span>
            </DropdownMenuItem>
          )}
          {members?.map((member) => (
            <DropdownMenuItem
              key={member.user_id}
              onClick={() => onSelect(member.user_id)}
              className="flex items-center gap-2 px-2 py-1.5 cursor-pointer rounded-lg hover:bg-muted"
            >
              <Avatar className="w-6 h-6">
                <AvatarImage src={member.avatar_url || undefined} />
                <AvatarFallback className="text-[8px] font-bold">
                  {member.name.substring(0, 2).toUpperCase()}
                </AvatarFallback>
              </Avatar>
              <span className="text-xs font-medium flex-1">{member.name}</span>
              {currentAssignee?.id === member.user_id && <Check size={14} className="text-primary" />}
            </DropdownMenuItem>
          ))}
        </div>
      </DropdownMenuContent>
    </DropdownMenu>
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
  /* 
   * DATA FETCHING & MUTATIONS
   * Hooks for real-time task data and actions to modify task state.
   */
  const { task, isLoading } = useTask(taskId, { enabled: open });
  const { comments } = useTaskComments(taskId, { enabled: open });
  const { mutate: updateTask } = useUpdateTask(channelId, taskId);
  const { mutate: createComment } = useCreateComment();
  const { mutate: deleteTask } = useDeleteTask(channelId, taskId);
  const { mutate: assignUser } = useAssignUser(taskId);
  const { mutate: unassignUser } = useUnassignUser(taskId);
  const { mutate: addAttachment, isPending: isAddingAttachment } = useAddAttachment(taskId);
  const { mutate: deleteAttachment } = useDeleteAttachment(taskId);
  const { members: channelMembers } = useChannelMembers(channelId);

  const fileInputRef = useRef<HTMLInputElement>(null);
  const { mutate: updateChecklistItem } = useUpdateChecklistItem(taskId);
  const { mutate: deleteChecklistItem } = useDeleteChecklistItem(taskId);
  const { mutate: updateChecklist } = useUpdateChecklist(taskId);
  const { mutate: deleteChecklist } = useDeleteChecklist(taskId);
  const { mutateAsync: addChecklistItemAsync } = useAddChecklistItem(taskId);
  const { mutateAsync: createChecklistAsync } = useCreateChecklist();
  const { mutateAsync: createSubtaskAsync } = useCreateSubtask(taskId);
  const { labels: allOrgLabels } = useLabels(task?.org_id || "", { enabled: !!task?.org_id });
  const { mutate: assignLabel } = useAssignLabel(taskId);
  const { mutate: unassignLabel } = useUnassignLabel(taskId);
  const { mutate: createLabel } = useCreateLabel(task?.org_id || "");
  const { mutate: deleteLabel } = useDeleteLabel(task?.org_id || "");

  /* 
   * LOCAL UI STATE
   * Manages inline editing modes, input values, and temporary visibility states.
   */
  const [newComment, setNewComment] = useState("");
  const [isEditingDescription, setIsEditingDescription] = useState(false);
  const [description, setDescription] = useState("");
  const [newSubtask, setNewSubtask] = useState("");
  const [newChecklistItems, setNewChecklistItems] = useState<Record<string, string>>({});
  const [addingChecklistId, setAddingChecklistId] = useState<string | null>(null);
  const [editingItemId, setEditingItemId] = useState<string | null>(null);
  const [editingChecklistId, setEditingChecklistId] = useState<string | null>(null);
  const [editingSubtaskId, setEditingSubtaskId] = useState<string | null>(null);
  const [editItemValue, setEditItemValue] = useState("");
  const [editChecklistValue, setEditChecklistValue] = useState("");
  const [editSubtaskValue, setEditSubtaskValue] = useState("");
  const [isAddChecklistDialogOpen, setIsAddChecklistDialogOpen] = useState(false);
  const [newChecklistTitle, setNewChecklistTitle] = useState("Checklist");
  const [isAddingSubtaskMode, setIsAddingSubtaskMode] = useState(false);
  const [selectedImage, setSelectedImage] = useState<string | null>(null);
  const [zoomLevel, setZoomLevel] = useState(1);
  const [isLabelPopoverOpen, setIsLabelPopoverOpen] = useState(false);
  const [newLabelName, setNewLabelName] = useState("");
  const [newLabelColor, setNewLabelColor] = useState("#3b82f6");
  const [isCreatingLabel, setIsCreatingLabel] = useState(false);

  const subtaskInputRef = useRef<HTMLTextAreaElement>(null);
  const checklistInputRefs = useRef<Record<string, HTMLTextAreaElement | null>>({});

  if (!open) return null;

  /* 
   * ACTION HANDLERS
   * Logic for processing user interactions and calling API mutations.
   */

  // Updates the task's rich text description
  const handleUpdateDescription = () => {
    updateTask({ id: taskId, data: { description } });
    setIsEditingDescription(false);
  };

  // Submits a new comment to the task activity feed
  const handleAddComment = () => {
    if (!newComment.trim()) return;
    createComment({ id: taskId, data: { content: newComment } });
    setNewComment("");
  };

  // Adds one or multiple subtasks (supports multi-line input)
  const handleAddSubtask = async () => {
    if (!newSubtask.trim()) return;
    const lines = newSubtask.split('\n').map(l => l.trim()).filter(l => l !== "");
    try {
      for (const line of lines) {
        await createSubtaskAsync({
          parentId: taskId,
          data: { title: line }
        });
      }
      setNewSubtask("");
      setTimeout(() => subtaskInputRef.current?.focus(), 0);
    } catch (error) {
      console.error("Failed to add subtask:", error);
    }
  };

  // Creates a new checklist container
  const handleCreateNewChecklist = async () => {
    if (!newChecklistTitle.trim()) return;
    try {
      await createChecklistAsync({ id: taskId, data: { title: newChecklistTitle } });
      setIsAddChecklistDialogOpen(false);
      setNewChecklistTitle("Checklist");
    } catch (error) {
      console.error("Failed to create checklist:", error);
    }
  };

  // Adds one or multiple items to a specific checklist
  const handleAddChecklistItem = async (checklistId: string) => {
    const text = newChecklistItems[checklistId];
    if (!text?.trim()) return;
    const lines = text.split('\n').map(l => l.trim()).filter(l => l !== "");
    try {
      for (const line of lines) {
        await addChecklistItemAsync({ checklistId, data: { text: line } });
      }
      setNewChecklistItems(prev => ({ ...prev, [checklistId]: "" }));
      setTimeout(() => checklistInputRefs.current[checklistId]?.focus(), 0);
    } catch (error) {
      console.error("Failed to add checklist item:", error);
    }
  };

  // Updates the title of an existing checklist
  const handleUpdateChecklistTitle = (checklistId: string) => {
    if (!editChecklistValue.trim()) {
      setEditingChecklistId(null);
      return;
    }
    updateChecklist({ id: checklistId, data: { title: editChecklistValue } });
    setEditingChecklistId(null);
  };

  // Updates the title of an existing subtask
  const handleUpdateSubtaskTitle = (subtaskId: string) => {
    if (!editSubtaskValue.trim()) {
      setEditingSubtaskId(null);
      return;
    }
    updateTask({ id: subtaskId, data: { title: editSubtaskValue } });
    setEditingSubtaskId(null);
  };

  // Updates the text of a checklist item
  const handleUpdateItemTitle = (itemId: string) => {
    if (!editItemValue.trim()) {
      setEditingItemId(null);
      return;
    }
    updateChecklistItem({ itemId, data: { text: editItemValue } });
    setEditingItemId(null);
  };

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
              <h2 className="text-xl font-bold text-foreground wrap-break-words">
                {task.title}
              </h2>
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
                        <Popover open={isLabelPopoverOpen} onOpenChange={setIsLabelPopoverOpen}>
                          <PopoverTrigger asChild>
                            <Button variant="outline" size="sm" className="h-7 px-2 border-dashed text-muted-foreground hover:text-primary hover:border-primary text-[11px] font-bold">
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
                                          onKeyDown={(e) => {
                                            if (e.key === 'Enter' || e.key === ' ') {
                                              e.preventDefault();
                                              if (isAssigned) {
                                                unassignLabel({ id: taskId, labelId: label.id });
                                              } else {
                                                assignLabel({ id: taskId, data: { label_id: label.id } });
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
                                <div className="space-y-3">
                                  <div className="space-y-1">
                                    <Label htmlFor="label-name" className="text-[10px] uppercase font-bold text-muted-foreground">Label Name</Label>
                                    <Input
                                      id="label-name"
                                      value={newLabelName}
                                      onChange={(e) => setNewLabelName(e.target.value)}
                                      placeholder="e.g. Urgent, Bug..."
                                      className="h-8 text-xs"
                                      autoFocus
                                    />
                                  </div>
                                  <div className="space-y-1">
                                    <Label className="text-[10px] uppercase font-bold text-muted-foreground">Color</Label>
                                    <div className="grid grid-cols-5 gap-1.5">
                                      {['#ef4444', '#f59e0b', '#10b981', '#3b82f6', '#6366f1', '#8b5cf6', '#ec4899', '#64748b', '#000000', '#f472b6'].map((color) => (
                                        <button
                                          key={color}
                                          className={cn(
                                            "w-full aspect-square rounded-md border border-border transition-transform hover:scale-110",
                                            newLabelColor === color && "ring-2 ring-primary ring-offset-2"
                                          )}
                                          style={{ backgroundColor: color }}
                                          onClick={() => setNewLabelColor(color)}
                                        />
                                      ))}
                                    </div>
                                  </div>
                                  <div className="flex items-center gap-2 pt-1">
                                    <Button
                                      size="sm"
                                      className="flex-1 h-8 text-xs font-bold"
                                      disabled={!newLabelName.trim()}
                                      onClick={() => {
                                        createLabel({ org_id: task.org_id, name: newLabelName, color: newLabelColor }, {
                                          onSuccess: () => {
                                            setNewLabelName("");
                                            setIsCreatingLabel(false);
                                          }
                                        });
                                      }}
                                    >
                                      Create
                                    </Button>
                                    <Button
                                      variant="ghost"
                                      size="sm"
                                      className="h-8 text-xs"
                                      onClick={() => setIsCreatingLabel(false)}
                                    >
                                      Back
                                    </Button>
                                  </div>
                                </div>
                              )}
                            </div>
                          </PopoverContent>
                        </Popover>
                      </div>
                    )}

                    {(!task.assignments || task.assignments.length === 0) && (
                      <div className="flex flex-col gap-1.5">
                        <span className="text-[11px] font-bold text-muted-foreground uppercase tracking-widest">Members</span>
                        <DropdownMenu>
                          <DropdownMenuTrigger asChild>
                            <Button variant="outline" size="sm" className="h-7 px-2 border-dashed text-muted-foreground hover:text-primary hover:border-primary text-[11px] font-bold">
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
                                      ? unassignUser({ id: taskId, userId: member.user_id })
                                      : assignUser({ id: taskId, data: { user_id: member.user_id } })
                                    }
                                    className="flex items-center gap-2 p-2 rounded-lg cursor-pointer"
                                  >
                                    <Avatar className="w-6 h-6">
                                      <AvatarImage src={member.avatar_url} />
                                      <AvatarFallback className="text-[10px] font-bold">{member.name.substring(0, 2).toUpperCase()}</AvatarFallback>
                                    </Avatar>
                                    <span className="text-xs font-medium flex-1">{member.name}</span>
                                    {isAssigned && <Check size={14} className="text-primary" />}
                                  </DropdownMenuItem>
                                );
                              })}
                            </div>
                          </DropdownMenuContent>
                        </DropdownMenu>
                      </div>
                    )}

                    <div className="flex flex-col gap-1.5">
                      <span className="text-[11px] font-bold text-muted-foreground uppercase tracking-widest">Priority</span>
                      <DropdownMenu>
                        <DropdownMenuTrigger asChild>
                          <Badge variant="outline" className={cn(
                            "flex items-center gap-1.5 px-2 h-7 rounded transition-colors w-fit cursor-pointer text-[11px] font-bold uppercase tracking-wider",
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
                          <DropdownMenuItem onClick={() => updateTask({ id: taskId, data: { priority: 'URGENT' } })} className="flex items-center gap-2 cursor-pointer focus:bg-rose-500/10 text-rose-500 py-2">
                            <span className="text-xs font-bold uppercase tracking-wider">Urgent</span>
                          </DropdownMenuItem>
                          <DropdownMenuItem onClick={() => updateTask({ id: taskId, data: { priority: 'HIGH' } })} className="flex items-center gap-2 cursor-pointer focus:bg-red-500/10 text-red-500 py-2">
                            <span className="text-xs font-bold uppercase tracking-wider">High</span>
                          </DropdownMenuItem>
                          <DropdownMenuItem onClick={() => updateTask({ id: taskId, data: { priority: 'MEDIUM' } })} className="flex items-center gap-2 cursor-pointer focus:bg-amber-500/10 text-amber-500 py-2">
                            <span className="text-xs font-bold uppercase tracking-wider">Medium</span>
                          </DropdownMenuItem>
                          <DropdownMenuItem onClick={() => updateTask({ id: taskId, data: { priority: 'LOW' } })} className="flex items-center gap-2 cursor-pointer focus:bg-blue-500/10 text-blue-500 py-2">
                            <span className="text-xs font-bold uppercase tracking-wider">Low</span>
                          </DropdownMenuItem>
                          <DropdownMenuItem onClick={() => updateTask({ id: taskId, data: { priority: null } })} className="flex items-center gap-2 cursor-pointer focus:bg-muted py-2">
                            <span className="text-xs font-bold uppercase tracking-wider text-muted-foreground">None</span>
                          </DropdownMenuItem>
                        </DropdownMenuContent>
                      </DropdownMenu>
                    </div>



                    {/* Add Checklist Option */}
                    <div className="flex flex-col gap-1.5">
                      <span className="text-[11px] font-bold text-muted-foreground uppercase tracking-widest">Checklist</span>
                      <Button
                        variant="outline"
                        size="sm"
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
                      <Popover>
                        <PopoverTrigger asChild>
                          <Button
                            variant="outline"
                            size="sm"
                            className={cn(
                              "h-7 text-[11px] font-bold border-dashed flex items-center gap-2 w-fit px-2",
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
                              updateTask({ id: taskId, data: { due_date: date ? date.toISOString() : null } });
                            }}
                            disabled={(date) => date < new Date(new Date().setHours(0, 0, 0, 0))}
                          />
                          {task.due_date && (
                            <div className="p-2 border-t border-border flex justify-end">
                              <Button
                                variant="ghost"
                                size="sm"
                                className="text-[10px] h-6 text-red-500 hover:text-red-600 hover:bg-red-50"
                                onClick={() => updateTask({ id: taskId, data: { due_date: null } })}
                              >
                                Clear Date
                              </Button>
                            </div>
                          )}
                        </PopoverContent>
                      </Popover>
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
                        disabled={isAddingAttachment}
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
                                <button
                                  onClick={(e) => {
                                    e.stopPropagation();
                                    unassignLabel({ id: taskId, labelId: tl.label.id });
                                  }}
                                  className="ml-1 opacity-0 group-hover:opacity-100 transition-opacity hover:text-red-500"
                                >
                                  <X size={14} />
                                </button>
                              </Badge>
                            ))}
                            <Popover open={isLabelPopoverOpen} onOpenChange={setIsLabelPopoverOpen}>
                              <PopoverTrigger asChild>
                                <Button variant="outline" size="icon" className="w-7 h-7 border-dashed text-muted-foreground hover:text-primary hover:border-primary">
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
                                                  unassignLabel({ id: taskId, labelId: label.id });
                                                } else {
                                                  assignLabel({ id: taskId, data: { label_id: label.id } });
                                                }
                                              }}
                                              onKeyDown={(e) => {
                                                if (e.key === 'Enter' || e.key === ' ') {
                                                  e.preventDefault();
                                                  if (isAssigned) {
                                                    unassignLabel({ id: taskId, labelId: label.id });
                                                  } else {
                                                    assignLabel({ id: taskId, data: { label_id: label.id } });
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
                                    <div className="space-y-3">
                                      <div className="space-y-1">
                                        <Label htmlFor="label-name-row" className="text-[10px] uppercase font-bold text-muted-foreground">Label Name</Label>
                                        <Input
                                          id="label-name-row"
                                          value={newLabelName}
                                          onChange={(e) => setNewLabelName(e.target.value)}
                                          placeholder="e.g. Urgent, Bug..."
                                          className="h-8 text-xs"
                                          autoFocus
                                        />
                                      </div>
                                      <div className="space-y-1">
                                        <Label className="text-[10px] uppercase font-bold text-muted-foreground">Color</Label>
                                        <div className="grid grid-cols-5 gap-1.5">
                                          {['#ef4444', '#f59e0b', '#10b981', '#3b82f6', '#6366f1', '#8b5cf6', '#ec4899', '#64748b', '#000000', '#f472b6'].map((color) => (
                                            <button
                                              key={color}
                                              className={cn(
                                                "w-full aspect-square rounded-md border border-border transition-transform hover:scale-110",
                                                newLabelColor === color && "ring-2 ring-primary ring-offset-2"
                                              )}
                                              style={{ backgroundColor: color }}
                                              onClick={() => setNewLabelColor(color)}
                                            />
                                          ))}
                                        </div>
                                      </div>
                                      <div className="flex items-center gap-2 pt-1">
                                        <Button
                                          size="sm"
                                          className="flex-1 h-8 text-xs font-bold"
                                          disabled={!newLabelName.trim()}
                                          onClick={() => {
                                            createLabel({ org_id: task.org_id, name: newLabelName, color: newLabelColor }, {
                                              onSuccess: () => {
                                                setNewLabelName("");
                                                setIsCreatingLabel(false);
                                              }
                                            });
                                          }}
                                        >
                                          Create
                                        </Button>
                                        <Button
                                          variant="ghost"
                                          size="sm"
                                          className="h-8 text-xs"
                                          onClick={() => setIsCreatingLabel(false)}
                                        >
                                          Back
                                        </Button>
                                      </div>
                                    </div>
                                  )}
                                </div>
                              </PopoverContent>
                            </Popover>
                          </div>
                        </div>
                      )}

                      {task.assignments && task.assignments.length > 0 && (
                        <div className="flex flex-col gap-1.5">
                          <span className="text-[11px] font-bold text-muted-foreground uppercase tracking-widest">Members</span>
                          <div className="flex items-center gap-2">
                            <TooltipProvider>
                              <div className="flex items-center -space-x-2">
                                {task.assignments.map((a) => (
                                  <Popover key={a.user_id}>
                                    <PopoverTrigger asChild>
                                      <div className="w-7 h-7 rounded-full border-2 border-card bg-muted overflow-hidden z-20 cursor-pointer hover:border-red-500 transition-colors">
                                        <Avatar className="w-full h-full">
                                          <AvatarImage src={a.user?.avatar_url} />
                                          <AvatarFallback className="text-[10px] font-bold">{a.user?.name?.substring(0, 2).toUpperCase()}</AvatarFallback>
                                        </Avatar>
                                      </div>
                                    </PopoverTrigger>
                                    <PopoverContent className="w-48 p-3 bg-card border-border shadow-xl z-150" side="bottom">
                                      <div className="flex flex-col gap-3">
                                        <div className="flex items-center gap-2">
                                          <Avatar className="w-8 h-8">
                                            <AvatarImage src={a.user?.avatar_url} />
                                            <AvatarFallback className="text-[10px] font-bold">{a.user?.name?.substring(0, 2).toUpperCase()}</AvatarFallback>
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
                                            onClick={() => unassignUser({ id: taskId, userId: a.user_id })}
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
                                ))}
                              </div>
                            </TooltipProvider>
                            <DropdownMenu>
                              <DropdownMenuTrigger asChild>
                                <Button variant="outline" size="icon" className="w-7 h-7 rounded-full border-dashed text-muted-foreground hover:text-primary hover:border-primary">
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
                                          ? unassignUser({ id: taskId, userId: member.user_id })
                                          : assignUser({ id: taskId, data: { user_id: member.user_id } })
                                        }
                                        className="flex items-center gap-2 p-2 rounded-lg cursor-pointer"
                                      >
                                        <Avatar className="w-6 h-6">
                                          <AvatarImage src={member.avatar_url} />
                                          <AvatarFallback className="text-[10px] font-bold">{member.name?.substring(0, 2).toUpperCase()}</AvatarFallback>
                                        </Avatar>
                                        <span className="text-xs font-medium flex-1">{member.name}</span>
                                        {isAssigned && <Check size={14} className="text-primary" />}
                                      </DropdownMenuItem>
                                    );
                                  })}
                                </div>
                              </DropdownMenuContent>
                            </DropdownMenu>
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
                      {isEditingDescription && (
                        <div className="flex items-center gap-2">
                          <Button
                            variant="ghost"
                            size="sm"
                            className="h-7 text-xs"
                            onClick={() => {
                              setIsEditingDescription(false);
                              setDescription(task.description || "");
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

                    {isEditingDescription ? (
                      <TiptapEditor
                        content={description || task.description || ""}
                        onChange={setDescription}
                        placeholder="Add a more detailed description..."
                        autoFocus
                      />
                    ) : (
                      <div
                        onClick={() => {
                          setDescription(task.description || "");
                          setIsEditingDescription(true);
                        }}
                        className={cn(
                          "p-3 min-h-[120px] text-sm text-foreground rounded-md border border-transparent hover:border-border hover:bg-muted/5 transition-all cursor-text prose prose-sm dark:prose-invert max-w-none [&_p]:my-0",
                          (!task.description || task.description.replace(/<[^>]*>/g, '').trim() === '') && "text-muted-foreground italic"
                        )}
                        dangerouslySetInnerHTML={{
                          __html: (task.description && task.description.replace(/<[^>]*>/g, '').trim() !== '')
                            ? task.description
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

                          return (
                            <div
                              key={file.id}
                              onClick={() => isImage ? setSelectedImage(file.file_url) : window.open(file.file_url, '_blank')}
                              className="flex flex-col rounded-lg border border-border bg-muted/20 overflow-hidden group hover:border-primary/40 transition-all cursor-pointer shadow-sm"
                            >
                              {isImage ? (
                                <div className="h-16 w-full relative bg-muted overflow-hidden">
                                  <Image
                                    src={file.file_url}
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
                              onClick={() => window.open(selectedImage, '_blank')}
                              title="Open in New Tab"
                            >
                              <ExternalLink size={18} />
                            </Button>
                            <a
                              href={selectedImage}
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
                          <div key={subtask.id} className="flex flex-col gap-2 p-2 border border-primary/40 rounded-lg bg-card animate-in fade-in slide-in-from-top-2 duration-200">
                            <Textarea
                              autoFocus
                              className="text-sm bg-transparent border-none px-1 py-0 focus:ring-0 focus:outline-none focus-visible:ring-0 focus-visible:border-none text-foreground placeholder-muted-foreground min-h-[60px] resize-none rounded-none"
                              value={editSubtaskValue}
                              onInput={(e) => {
                                const target = e.target as HTMLTextAreaElement;
                                target.style.height = 'auto';
                                target.style.height = `${target.scrollHeight}px`;
                              }}
                              onChange={(e) => setEditSubtaskValue(e.target.value)}
                              onKeyDown={(e) => {
                                if (e.key === 'Enter' && !e.shiftKey) {
                                  e.preventDefault();
                                  handleUpdateSubtaskTitle(subtask.id);
                                }
                                if (e.key === 'Escape') setEditingSubtaskId(null);
                              }}
                            />
                            <div className="flex items-center justify-end gap-2">
                              <Button
                                variant="ghost"
                                size="sm"
                                onClick={() => setEditingSubtaskId(null)}
                                className="h-8 text-xs text-muted-foreground hover:text-foreground"
                              >
                                Cancel
                              </Button>
                              <Button
                                size="sm"
                                onClick={() => handleUpdateSubtaskTitle(subtask.id)}
                                disabled={!editSubtaskValue.trim()}
                                className="h-8 text-xs px-4"
                              >
                                Save
                              </Button>
                            </div>
                          </div>
                        ) : (
                          <div key={subtask.id} className="flex items-center gap-2 py-1.5 px-3 border border-border rounded-lg bg-muted/5 hover:bg-muted/10 hover:border-primary/20 transition-all group">
                            <button
                              onClick={() => updateTask({
                                id: subtask.id,
                                data: { status: subtask.status === 'COMPLETED' ? 'OPEN' : 'COMPLETED' }
                              })}
                              aria-label={subtask.status === 'COMPLETED' ? "Mark incomplete" : "Mark complete"}
                              className={cn(
                                "w-4 h-4 rounded border flex items-center justify-center shrink-0 transition-colors",
                                subtask.status === 'COMPLETED' ? "border-primary bg-primary text-primary-foreground" : "border-border hover:border-primary"
                              )}
                            >
                              {subtask.status === 'COMPLETED' && <Check size={12} strokeWidth={3} />}
                            </button>

                            <span
                              onClick={() => {
                                setEditingSubtaskId(subtask.id);
                                setEditSubtaskValue(subtask.title);
                              }}
                              className={cn(
                                "text-sm font-medium flex-1 whitespace-pre-wrap wrap-break-words transition-all cursor-text",
                              )}
                            >
                              {subtask.title}
                            </span>

                            <div className="flex items-center gap-2">
                              <SingleAssigneeSelector
                                size="xs"
                                currentAssignee={subtask.assignments?.[0]?.user}
                                members={channelMembers}
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
                              <div className="overflow-hidden max-w-0 group-hover:max-w-8 transition-all duration-200 ease-in-out">
                                <Button
                                  variant="ghost"
                                  size="icon"
                                  className="h-8 w-8 text-muted-foreground hover:text-red-500 hover:bg-red-500/10"
                                  onClick={() => deleteTask(subtask.id)}
                                >
                                  <Trash2 size={16} />
                                </Button>
                              </div>
                            </div>
                          </div>
                        )
                      ))}
                    </div>

                    {isAddingSubtaskMode ? (
                      <div className="flex flex-col gap-2 p-2 border border-primary/40 rounded-lg bg-card animate-in fade-in slide-in-from-top-2 duration-200 mt-1">
                        <Textarea
                          ref={subtaskInputRef}
                          className="text-sm bg-transparent border-none px-1 py-0 focus:ring-0 focus:outline-none focus-visible:ring-0 focus-visible:border-none text-foreground placeholder-muted-foreground min-h-[60px] resize-none rounded-none"
                          placeholder="What needs to be done?"
                          value={newSubtask}
                          autoFocus
                          onInput={(e) => {
                            const target = e.target as HTMLTextAreaElement;
                            target.style.height = 'auto';
                            target.style.height = `${target.scrollHeight}px`;
                          }}
                          onChange={(e) => setNewSubtask(e.target.value)}
                          onKeyDown={(e) => {
                            if (e.key === 'Enter' && !e.shiftKey) {
                              e.preventDefault();
                              handleAddSubtask();
                            }
                            if (e.key === 'Escape') {
                              setIsAddingSubtaskMode(false);
                              setNewSubtask("");
                            }
                          }}
                        />
                        <div className="flex items-center justify-end gap-2">
                          <Button
                            variant="ghost"
                            size="sm"
                            onClick={() => {
                              setIsAddingSubtaskMode(false);
                              setNewSubtask("");
                            }}
                            className="h-8 text-xs text-muted-foreground hover:text-foreground"
                          >
                            Cancel
                          </Button>
                          <Button
                            size="sm"
                            onClick={handleAddSubtask}
                            disabled={!newSubtask.trim()}
                            className="h-8 text-xs px-4"
                          >
                            Add Subtask
                          </Button>
                        </div>
                      </div>
                    ) : (
                      <Button
                        variant="ghost"
                        size="sm"
                        onClick={() => setIsAddingSubtaskMode(true)}
                        className="w-full justify-start gap-2 h-9 text-muted-foreground hover:text-primary hover:bg-primary/5 border border-dashed border-border group mt-1"
                      >
                        <Plus size={14} className="group-hover:scale-110 transition-transform" />
                        <span className="text-xs font-medium">Add a subtask</span>
                      </Button>
                    )}
                  </section>

                  {/* Checklists Section */}
                  {task.checklists?.map((checklist) => {
                    const completedItems = checklist.items?.filter(i => i.is_completed).length || 0;
                    const totalItems = checklist.items?.length || 0;
                    const progress = totalItems > 0 ? (completedItems / totalItems) * 100 : 0;

                    return (
                      <section key={checklist.id} className="flex flex-col gap-4 mt-4 group">
                        <div className="flex items-center justify-between">
                          <div className="flex items-center gap-2 text-foreground font-bold">
                            <CheckSquare className="h-5 w-5 text-primary" />
                            {editingChecklistId === checklist.id ? (
                              <input
                                autoFocus
                                className="text-sm bg-transparent border-none p-0 focus:ring-0 text-foreground focus:outline-none font-bold"
                                value={editChecklistValue}
                                onChange={(e) => setEditChecklistValue(e.target.value)}
                                onBlur={() => handleUpdateChecklistTitle(checklist.id)}
                                onKeyDown={(e) => {
                                  if (e.key === 'Enter') handleUpdateChecklistTitle(checklist.id);
                                  if (e.key === 'Escape') setEditingChecklistId(null);
                                }}
                              />
                            ) : (
                              <h3
                                className="cursor-text"
                                onClick={() => {
                                  setEditingChecklistId(checklist.id);
                                  setEditChecklistValue(checklist.name);
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
                              onSelect={(userId) => updateChecklist({ id: checklist.id, data: { assignee_id: userId } })}
                            />
                            <motion.div>
                              <Badge variant="secondary" className="px-1.5 py-0.5 text-[11px] font-bold shrink-0 min-w-[32px] justify-center">{completedItems}/{totalItems}</Badge>
                            </motion.div>
                            <div className="overflow-hidden max-w-0 group-hover:max-w-8 transition-all duration-200 ease-in-out">
                              <Button
                                variant="ghost"
                                size="icon"
                                className="h-8 w-8 text-muted-foreground hover:text-red-500 hover:bg-red-500/10"
                                onClick={() => deleteChecklist(checklist.id)}
                              >
                                <Trash2 size={16} />
                              </Button>
                            </div>
                          </div>
                        </div>

                        <div className="w-full bg-secondary rounded-full h-1.5 mb-1">
                          <div className="bg-primary h-1.5 rounded-full transition-all" style={{ width: `${progress}%` }}></div>
                        </div>

                        <div className="flex flex-col gap-2">
                          {checklist.items?.map((item) => (
                            editingItemId === item.id ? (
                              <div key={item.id} className="flex flex-col gap-2 p-2 border border-primary/40 rounded-lg bg-card animate-in fade-in slide-in-from-top-2 duration-200">
                                <Textarea
                                  autoFocus
                                  className="text-sm bg-transparent border-none px-1 py-0 focus:ring-0 focus:outline-none focus-visible:ring-0 focus-visible:border-none text-foreground placeholder-muted-foreground min-h-[60px] resize-none rounded-none"
                                  value={editItemValue}
                                  onInput={(e) => {
                                    const target = e.target as HTMLTextAreaElement;
                                    target.style.height = 'auto';
                                    target.style.height = `${target.scrollHeight}px`;
                                  }}
                                  onChange={(e) => setEditItemValue(e.target.value)}
                                  onKeyDown={(e) => {
                                    if (e.key === 'Enter' && !e.shiftKey) {
                                      e.preventDefault();
                                      handleUpdateItemTitle(item.id);
                                    }
                                    if (e.key === 'Escape') setEditingItemId(null);
                                  }}
                                />
                                <div className="flex items-center justify-end gap-2">
                                  <Button
                                    variant="ghost"
                                    size="sm"
                                    onClick={() => setEditingItemId(null)}
                                    className="h-8 text-xs text-muted-foreground hover:text-foreground"
                                  >
                                    Cancel
                                  </Button>
                                  <Button
                                    size="sm"
                                    onClick={() => handleUpdateItemTitle(item.id)}
                                    disabled={!editItemValue.trim()}
                                    className="h-8 text-xs px-4"
                                  >
                                    Save
                                  </Button>
                                </div>
                              </div>
                            ) : (
                              <div key={item.id} className="flex items-center gap-2 py-1.5 px-3 border border-border rounded-lg bg-muted/5 hover:bg-muted/10 hover:border-primary/20 transition-all group">
                                <button
                                  onClick={() => updateChecklistItem({ itemId: item.id, data: { is_completed: !item.is_completed } })}
                                  aria-label={item.is_completed ? "Mark incomplete" : "Mark complete"}
                                  className={cn(
                                    "w-4 h-4 rounded border flex items-center justify-center shrink-0 transition-colors",
                                    item.is_completed ? "border-primary bg-primary text-primary-foreground" : "border-border hover:border-primary"
                                  )}
                                >
                                  {item.is_completed && <Check size={12} strokeWidth={3} />}
                                </button>

                                <span
                                  onClick={() => {
                                    setEditingItemId(item.id);
                                    setEditItemValue(item.text);
                                  }}
                                  className={cn(
                                    "text-sm flex-1 whitespace-pre-wrap wrap-break-words transition-all cursor-text",
                                    item.is_completed ? "text-muted-foreground line-through" : "text-foreground"
                                  )}
                                >
                                  {item.text}
                                </span>

                                <div className="flex items-center gap-1">
                                  <SingleAssigneeSelector
                                    size="xs"
                                    currentAssignee={item.assignee}
                                    members={channelMembers}
                                    onSelect={(userId) => updateChecklistItem({ itemId: item.id, data: { assignee_id: userId } })}
                                  />
                                  <div className="overflow-hidden max-w-0 group-hover:max-w-8 transition-all duration-200 ease-in-out">
                                    <Button
                                      variant="ghost"
                                      size="icon"
                                      className="h-8 w-8 text-muted-foreground hover:text-red-500 hover:bg-red-500/10"
                                      onClick={() => deleteChecklistItem(item.id)}
                                    >
                                      <Trash2 size={16} />
                                    </Button>
                                  </div>
                                </div>
                              </div>
                            )
                          ))}
                        </div>

                        {addingChecklistId === checklist.id ? (
                          <div className="flex flex-col gap-2 p-2 border border-primary/40 rounded-lg bg-card animate-in fade-in slide-in-from-top-2 duration-200 mt-1">
                            <Textarea
                              ref={(el) => { checklistInputRefs.current[checklist.id] = el; }}
                              className="text-sm bg-transparent border-none px-1 py-0 focus:ring-0 focus:outline-none focus-visible:ring-0 focus-visible:border-none text-foreground placeholder-muted-foreground min-h-[60px] resize-none rounded-none"
                              placeholder="What needs to be done?"
                              value={newChecklistItems[checklist.id] || ""}
                              autoFocus
                              onInput={(e) => {
                                const target = e.target as HTMLTextAreaElement;
                                target.style.height = 'auto';
                                target.style.height = `${target.scrollHeight}px`;
                              }}
                              onChange={(e) => setNewChecklistItems(prev => ({ ...prev, [checklist.id]: e.target.value }))}
                              onKeyDown={(e) => {
                                if (e.key === 'Enter' && !e.shiftKey) {
                                  e.preventDefault();
                                  handleAddChecklistItem(checklist.id);
                                }
                                if (e.key === 'Escape') {
                                  setAddingChecklistId(null);
                                  setNewChecklistItems(prev => ({ ...prev, [checklist.id]: "" }));
                                }
                              }}
                            />
                            <div className="flex items-center justify-end gap-2">
                              <Button
                                variant="ghost"
                                size="sm"
                                onClick={() => {
                                  setAddingChecklistId(null);
                                  setNewChecklistItems(prev => ({ ...prev, [checklist.id]: "" }));
                                }}
                                className="h-8 text-xs text-muted-foreground hover:text-foreground"
                              >
                                Cancel
                              </Button>
                              <Button
                                size="sm"
                                onClick={() => handleAddChecklistItem(checklist.id)}
                                disabled={!(newChecklistItems[checklist.id]?.trim())}
                                className="h-8 text-xs px-4"
                              >
                                Add Item
                              </Button>
                            </div>
                          </div>
                        ) : (
                          <Button
                            variant="ghost"
                            size="sm"
                            onClick={() => setAddingChecklistId(checklist.id)}
                            className="w-full justify-start gap-2 h-9 text-muted-foreground hover:text-primary hover:bg-primary/5 border border-dashed border-border group mt-1"
                          >
                            <Plus size={14} className="group-hover:scale-110 transition-transform" />
                            <span className="text-xs font-medium">Add an item</span>
                          </Button>
                        )}
                      </section>
                    );
                  })}
                </div>
              </ScrollArea>
            </main>

            {/* 
             * RIGHT COLUMN: Sidebar (Activity & Comments)
             * Displays the activity feed and allows users to post new comments.
             */}
            <aside className="w-[35%] bg-muted/10 flex flex-col border-l border-border h-full">
              <div className="p-4 border-b border-border bg-card shrink-0">
                <div className="flex items-center gap-2 text-foreground font-bold">
                  <MessageSquare className="h-5 w-5 text-primary" />
                  <h3>Activity & Comments</h3>
                </div>
              </div>

              {/* Comment Input Header */}
              <div className="p-4 border-b border-border bg-card shrink-0">
                <div className="flex flex-col gap-2">
                  <div className="bg-muted/10 border border-border rounded-lg focus-within:border-primary focus-within:ring-1 focus-within:ring-primary transition-all flex flex-col">
                    <textarea
                      value={newComment}
                      onChange={(e) => setNewComment(e.target.value)}
                      className="w-full bg-transparent border-none p-3 focus:ring-0 text-sm text-foreground placeholder-muted-foreground resize-none h-20 focus:outline-none"
                      placeholder="Write a comment..."
                    ></textarea>
                    <div className="flex items-center justify-between p-1 bg-card border-t border-border rounded-b-lg">
                      <div className="flex items-center gap-1">
                        <button aria-label="Attach File" className="p-1 text-muted-foreground hover:text-foreground hover:bg-muted rounded transition-colors">
                          <Paperclip size={16} />
                        </button>
                      </div>
                      <Button
                        onClick={handleAddComment}
                        disabled={!newComment.trim()}
                        size="sm"
                        className="text-[13px] font-medium px-4 py-1.5 h-auto flex items-center gap-1"
                      >
                        Comment
                      </Button>
                    </div>
                  </div>
                </div>
              </div>

              <ScrollArea className="flex-1 p-4">
                <div className="flex flex-col gap-4 relative pb-4">
                  {/* Comment Entries */}
                  {comments.map((comment) => (
                    <div key={comment.id} className="flex gap-2 relative z-10">
                      <div className="w-8 h-8 rounded-full bg-muted overflow-hidden border border-background shrink-0">
                        <Avatar className="w-full h-full">
                          <AvatarImage src={comment.user?.avatar_url} />
                          <AvatarFallback className="text-[10px] font-bold uppercase">{comment.user?.name?.substring(0, 2) || "U"}</AvatarFallback>
                        </Avatar>
                      </div>
                      <div className="flex flex-col gap-1 flex-1">
                        <div className="flex items-center justify-between w-full">
                          <span className="text-[13px] font-medium text-foreground">{comment.user?.name || "User"}</span>
                          <span className="text-[11px] text-muted-foreground opacity-70">{format(new Date(comment.created_at), 'MMM d, p')}</span>
                        </div>
                        <div className="bg-card border border-border p-2.5 rounded-lg rounded-tl-none text-sm text-foreground shadow-sm">
                          {comment.text}
                        </div>
                      </div>
                    </div>
                  ))}

                  {comments.length === 0 && (
                    <div className="text-sm text-muted-foreground relative z-10 pl-12 pt-2">No activity yet.</div>
                  )}
                </div>
              </ScrollArea>
           </aside>
          </div>
        </DialogContent>
      </Dialog>

      {/* 
       * ADD CHECKLIST DIALOG
       * Secondary dialog used to prompt the user for a new checklist title.
       */}
      <Dialog open={isAddChecklistDialogOpen} onOpenChange={setIsAddChecklistDialogOpen}>
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
                value={newChecklistTitle}
                onChange={(e) => setNewChecklistTitle(e.target.value)}
                onKeyDown={(e) => {
                  if (e.key === 'Enter') handleCreateNewChecklist();
                }}
              />
            </div>
          </div>
          <div className="flex justify-end gap-2">
            <Button variant="ghost" onClick={() => setIsAddChecklistDialogOpen(false)}>Cancel</Button>
            <Button onClick={handleCreateNewChecklist}>Add</Button>
          </div>
        </DialogContent>
      </Dialog>
    </>
  );
}
