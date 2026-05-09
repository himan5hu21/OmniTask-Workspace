"use client";

import { useState } from "react";
import { 
  AlignLeft, 
  CheckSquare, 
  MessageSquare, 
  Calendar, 
  Plus,
  Code,
  FileText,
  Check,
  Paperclip,
  Bold,
  Italic,
  List,
  ListOrdered,
  ChevronsUp,
  Trash2
} from "lucide-react";
import { format } from "date-fns";
import { cn } from "@/lib/utils";
import { TiptapEditor } from "@/components/TiptapEditor";

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
  useDeleteTask
} from "@/api/tasks";
import { motion, AnimatePresence } from "framer-motion";

import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Badge } from "@/components/ui/badge";
import { OrbitalLoader } from "@/components/ui/orbital-loader";

interface TaskDetailDialogProps {
  taskId: string;
  channelId: string;
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

export function TaskDetailDialog({ 
  taskId, 
  channelId,
  open, 
  onOpenChange 
}: TaskDetailDialogProps) {
  const { task, isLoading } = useTask(taskId, { enabled: open });
  const { comments, isLoading: isCommentsLoading } = useTaskComments(taskId, { enabled: open });
  const { mutate: updateTask } = useUpdateTask(channelId);
  const { mutate: createComment } = useCreateComment();
  const { mutate: updateChecklistItem } = useUpdateChecklistItem(taskId);
  const { mutate: deleteChecklistItem } = useDeleteChecklistItem(taskId);
  const { mutate: updateChecklist } = useUpdateChecklist(taskId);
  const { mutate: deleteChecklist } = useDeleteChecklist(taskId);
  const { mutateAsync: addChecklistItemAsync } = useAddChecklistItem(taskId);
  const { mutateAsync: createChecklistAsync } = useCreateChecklist();
  const { mutateAsync: createSubtaskAsync } = useCreateSubtask(taskId);
  const { mutate: deleteTask } = useDeleteTask(channelId);
  
  const [newComment, setNewComment] = useState("");
  const [isEditingDescription, setIsEditingDescription] = useState(false);
  const [description, setDescription] = useState("");
  const [newSubtask, setNewSubtask] = useState("");
  const [newChecklistItems, setNewChecklistItems] = useState<Record<string, string>>({});
  const [isAddingSubtask, setIsAddingSubtask] = useState(false);
  const [addingChecklistId, setAddingChecklistId] = useState<string | null>(null);
  const [editingItemId, setEditingItemId] = useState<string | null>(null);
  const [editingChecklistId, setEditingChecklistId] = useState<string | null>(null);
  const [editingSubtaskId, setEditingSubtaskId] = useState<string | null>(null);
  const [editItemValue, setEditItemValue] = useState("");
  const [editChecklistValue, setEditChecklistValue] = useState("");
  const [editSubtaskValue, setEditSubtaskValue] = useState("");
  const [isAddChecklistDialogOpen, setIsAddChecklistDialogOpen] = useState(false);
  const [newChecklistTitle, setNewChecklistTitle] = useState("Checklist");

  if (!open) return null;

  const handleUpdateDescription = () => {
    updateTask({ id: taskId, data: { description } });
    setIsEditingDescription(false);
  };

  const handleAddComment = () => {
    if (!newComment.trim()) return;
    createComment({ id: taskId, data: { content: newComment } });
    setNewComment("");
  };

  const handleAddSubtask = async () => {
    if (!newSubtask.trim()) return;
    setIsAddingSubtask(true);
    try {
      await createSubtaskAsync({ 
        parentId: taskId, 
        data: { title: newSubtask } 
      });
      setNewSubtask("");
    } catch (error) {
      console.error("Failed to add subtask:", error);
    } finally {
      setIsAddingSubtask(false);
    }
  };

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

  const handleAddChecklistItem = async (checklistId: string) => {
    const title = newChecklistItems[checklistId];
    if (!title?.trim()) return;
    setAddingChecklistId(checklistId);
    try {
      await addChecklistItemAsync({ checklistId, data: { title } });
      setNewChecklistItems(prev => ({ ...prev, [checklistId]: "" }));
    } catch (error) {
      console.error("Failed to add checklist item:", error);
    } finally {
      setAddingChecklistId(null);
    }
  };

  const handleUpdateChecklistTitle = (checklistId: string) => {
    if (!editChecklistValue.trim()) {
      setEditingChecklistId(null);
      return;
    }
    updateChecklist({ id: checklistId, data: { title: editChecklistValue } });
    setEditingChecklistId(null);
  };

  const handleUpdateSubtaskTitle = (subtaskId: string) => {
    if (!editSubtaskValue.trim()) {
      setEditingSubtaskId(null);
      return;
    }
    updateTask({ id: subtaskId, data: { title: editSubtaskValue } });
    setEditingSubtaskId(null);
  };

  const handleUpdateItemTitle = (itemId: string) => {
    if (!editItemValue.trim()) {
      setEditingItemId(null);
      return;
    }
    updateChecklistItem({ itemId, data: { title: editItemValue } });
    setEditingItemId(null);
  };

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

  const checklist = task.checklists?.[0]; 
  const completedItems = checklist?.items?.filter(i => i.is_completed).length || 0;
  const totalItems = checklist?.items?.length || 0;
  const progress = totalItems > 0 ? (completedItems / totalItems) * 100 : 0;

  return (
    <>
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="lg:max-w-11/12 xl:max-w-4/5 h-[90vh] max-h-[921px] p-0 bg-card flex flex-col border border-border shadow-2xl rounded-lg overflow-hidden gap-0">
        
        {/* Header */}
        <DialogHeader className="px-6 py-4 pr-12 border-b border-border bg-card shrink-0 text-left">
          <DialogTitle className="text-xl font-bold">
            <input 
              className="w-full bg-transparent border-none p-0 focus:ring-0 text-foreground placeholder-muted-foreground focus:outline-none" 
              placeholder="Task Title" 
              type="text" 
              defaultValue={task.title}
              onBlur={(e) => updateTask({ id: taskId, data: { title: e.target.value } })}
            />
          </DialogTitle>
        </DialogHeader>

        {/* Body */}
        <div className="flex flex-1 overflow-hidden h-full">
          
          {/* Left Column (Main Content) */}
          <main className="w-[65%] border-r border-border bg-card">
            <ScrollArea className="h-full">
              <div className="p-6 flex flex-col gap-6">
              


              {/* Metadata row (Labels, Members, Priority, Due Date) */}
              <div className="flex flex-wrap gap-x-8 gap-y-4 pt-2">
                
                {/* Labels */}
                <div className="flex flex-col gap-1.5">
                  <span className="text-[11px] font-bold text-muted-foreground uppercase tracking-widest">Labels</span>
                  <div className="flex flex-wrap gap-1.5">
                    {task.labels?.map((l) => (
                      <Badge 
                        key={l.label.id}
                        variant="outline"
                        style={{ backgroundColor: `${l.label.color}15`, color: l.label.color, borderColor: `${l.label.color}30` }}
                        className="px-2 py-0.5 rounded text-[11px] font-bold"
                      >
                        {l.label.name}
                      </Badge>
                    ))}
                    {(!task.labels || task.labels.length === 0) && (
                      <span className="text-sm text-muted-foreground italic">None</span>
                    )}
                  </div>
                </div>

                {/* Assignees */}
                <div className="flex flex-col gap-1.5">
                  <span className="text-[11px] font-bold text-muted-foreground uppercase tracking-widest">Members</span>
                  <div className="flex items-center -space-x-2">
                    {task.assignments?.map((a) => (
                      <div key={a.id} className="w-7 h-7 rounded-full border border-card bg-muted overflow-hidden z-20">
                        <Avatar className="w-full h-full">
                          <AvatarImage src={a.user?.avatar_url} />
                          <AvatarFallback className="text-[10px] font-bold">{a.user?.name?.substring(0,2).toUpperCase()}</AvatarFallback>
                        </Avatar>
                      </div>
                    ))}
                    {(!task.assignments || task.assignments.length === 0) && (
                      <span className="text-sm text-muted-foreground italic pl-2">None</span>
                    )}
                    <Button variant="outline" size="icon" aria-label="Add Assignee" className="w-7 h-7 rounded-full border-dashed text-muted-foreground hover:text-primary hover:border-primary z-30 ml-2">
                      <Plus size={14} />
                    </Button>
                  </div>
                </div>

                {/* Priority */}
                <div className="flex flex-col gap-1.5">
                  <span className="text-[11px] font-bold text-muted-foreground uppercase tracking-widest">Priority</span>
                  <Badge variant="outline" className={cn(
                    "flex items-center gap-1 px-2 py-1 rounded transition-colors w-fit",
                    task.priority === 'HIGH' || task.priority === 'URGENT' ? "bg-red-500/10 border-red-500/20 text-red-500 hover:bg-red-500/20" : 
                    task.priority === 'MEDIUM' ? "bg-amber-500/10 border-amber-500/20 text-amber-500 hover:bg-amber-500/20" :
                    "bg-blue-500/10 border-blue-500/20 text-blue-500 hover:bg-blue-500/20"
                  )}>
                    <ChevronsUp size={14} className="text-current" />
                    <span className="text-[11px] uppercase font-bold tracking-wider">{task.priority || 'NONE'}</span>
                  </Badge>
                </div>

                {/* Add Checklist Option */}
                <div className="flex flex-col gap-1.5">
                  <span className="text-[11px] font-bold text-muted-foreground uppercase tracking-widest">Checklist</span>
                  <Button 
                    variant="outline" 
                    size="sm" 
                    onClick={() => setIsAddChecklistDialogOpen(true)}
                    className="flex items-center gap-2 px-2 py-1 h-auto w-fit text-foreground hover:bg-muted border-dashed transition-colors font-normal"
                  >
                    <CheckSquare size={14} className="text-muted-foreground" />
                    <span>Add Checklist</span>
                  </Button>
                </div>

                {/* Due Date */}
                <div className="flex flex-col gap-1.5">
                  <span className="text-[11px] font-bold text-muted-foreground uppercase tracking-widest">Due Date</span>
                  <Button variant="ghost" size="sm" className="flex items-center gap-2 px-2 py-1 h-auto w-full justify-start text-foreground hover:bg-muted group-hover:border-border border border-transparent transition-colors font-normal">
                    <Calendar size={16} className="text-muted-foreground group-hover:text-primary transition-colors" />
                    <span className="text-sm text-foreground">{task.due_date ? format(new Date(task.due_date), 'MMM d, yyyy') : 'Set date'}</span>
                  </Button>
                </div>

              </div>

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
                      "p-3 min-h-[120px] text-sm text-foreground rounded border border-transparent hover:border-border hover:bg-muted/5 transition-all cursor-text prose prose-sm dark:prose-invert max-w-none [&_p]:my-0",
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


              {/* Subtasks Section (Nested Tasks) */}
              <section className="flex flex-col gap-3 mt-4">
                <div className="flex items-center gap-2 text-foreground font-bold">
                  <List className="h-5 w-5 text-primary" />
                  <h3>Subtasks</h3>
                </div>

                <div className="flex flex-col gap-2">
                  {task.subtasks?.map((subtask) => (
                    <div key={subtask.id} className="flex items-center gap-2 p-2 border border-border rounded bg-muted/5 hover:bg-muted/20 transition-colors group">
                      <button 
                        onClick={() => updateTask({ 
                          id: subtask.id, 
                          data: { status: subtask.status === 'DONE' ? 'OPEN' : 'DONE' } 
                        })}
                        aria-label={subtask.status === 'DONE' ? "Mark incomplete" : "Mark complete"} 
                        className={cn(
                          "w-4 h-4 rounded border flex items-center justify-center shrink-0 transition-colors",
                          subtask.status === 'DONE' ? "border-primary bg-primary text-primary-foreground" : "border-border hover:border-primary"
                        )}
                      >
                        {subtask.status === 'DONE' && <Check size={12} strokeWidth={3} />}
                      </button>

                      {editingSubtaskId === subtask.id ? (
                        <input
                          autoFocus
                          className="text-sm bg-transparent border-none p-0 focus:ring-0 text-foreground focus:outline-none flex-1"
                          value={editSubtaskValue}
                          onChange={(e) => setEditSubtaskValue(e.target.value)}
                          onBlur={() => handleUpdateSubtaskTitle(subtask.id)}
                          onKeyDown={(e) => {
                            if (e.key === 'Enter') handleUpdateSubtaskTitle(subtask.id);
                            if (e.key === 'Escape') setEditingSubtaskId(null);
                          }}
                        />
                      ) : (
                        <span 
                          onClick={() => {
                            setEditingSubtaskId(subtask.id);
                            setEditSubtaskValue(subtask.title);
                          }}
                          className={cn(
                            "text-sm font-medium flex-1 truncate transition-all cursor-text", 
                            subtask.status === 'DONE' ? "text-muted-foreground line-through" : "text-foreground"
                          )}
                        >
                          {subtask.title}
                        </span>
                      )}

                      <div className="flex items-center gap-1.5 justify-end">
                        <motion.div layout transition={{ type: 'spring', stiffness: 400, damping: 30 }}>
                          <Badge variant="outline" className="text-[10px] uppercase font-bold opacity-0 group-hover:opacity-100 transition-opacity">
                            {subtask.status}
                          </Badge>
                        </motion.div>
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
                  ))}

                  <div className="flex items-center gap-2 p-2 border border-dashed border-border rounded bg-muted/5">
                    <Plus size={14} className="text-muted-foreground" />
                    <input 
                      className="text-sm bg-transparent border-none p-0 focus:ring-0 text-foreground placeholder-muted-foreground focus:outline-none flex-1" 
                      placeholder="Add a subtask..."
                      value={newSubtask}
                      onChange={(e) => setNewSubtask(e.target.value)}
                      onKeyDown={(e) => {
                        if (e.key === 'Enter') handleAddSubtask();
                      }}
                      disabled={isAddingSubtask}
                    />
                  </div>
                </div>
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
                      <div className="flex items-center gap-1.5 justify-end">
                        <motion.div layout transition={{ type: 'spring', stiffness: 400, damping: 30 }}>
                          <Badge variant="secondary" className="px-1.5 py-0.5 text-[11px] font-bold shrink-0">{completedItems}/{totalItems}</Badge>
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

                    <div className="flex flex-col border border-border rounded bg-muted/10 overflow-hidden">
                      {checklist.items?.map((item) => (
                        <div key={item.id} className="flex items-center gap-2 p-2 border-b border-border hover:bg-muted/50 transition-colors group">
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
                          
                          {editingItemId === item.id ? (
                            <input
                              autoFocus
                              className="text-sm bg-transparent border-none p-0 focus:ring-0 text-foreground focus:outline-none flex-1"
                              value={editItemValue}
                              onChange={(e) => setEditItemValue(e.target.value)}
                              onBlur={() => handleUpdateItemTitle(item.id)}
                              onKeyDown={(e) => {
                                if (e.key === 'Enter') handleUpdateItemTitle(item.id);
                                if (e.key === 'Escape') setEditingItemId(null);
                              }}
                            />
                          ) : (
                            <span 
                              onClick={() => {
                                setEditingItemId(item.id);
                                setEditItemValue(item.title);
                              }}
                              className={cn(
                                "text-sm flex-1 truncate transition-all cursor-text", 
                                item.is_completed ? "text-muted-foreground line-through" : "text-foreground"
                              )}
                            >
                              {item.title}
                            </span>
                          )}

                          <Button
                            variant="ghost"
                            size="icon"
                            className="h-8 w-8 text-muted-foreground hover:text-red-500 hover:bg-red-500/10 opacity-0 group-hover:opacity-100 transition-all"
                            onClick={() => deleteChecklistItem(item.id)}
                          >
                            <Trash2 size={16} />
                          </Button>
                        </div>
                      ))}
                      
                      {/* Add Checklist Item input area */}
                      <div className="flex items-center gap-2 p-2 hover:bg-muted/50 transition-colors group">
                         <button aria-label="Add item" className="w-4 h-4 rounded border border-border flex items-center justify-center shrink-0" disabled></button>
                         <input 
                           className="text-sm bg-transparent border-none p-0 focus:ring-0 text-foreground placeholder-muted-foreground focus:outline-none flex-1" 
                           placeholder="Add an item..."
                           value={newChecklistItems[checklist.id] || ""}
                           onChange={(e) => setNewChecklistItems(prev => ({ ...prev, [checklist.id]: e.target.value }))}
                           onKeyDown={(e) => {
                             if (e.key === 'Enter') handleAddChecklistItem(checklist.id);
                           }}
                           disabled={addingChecklistId === checklist.id}
                         />
                         {addingChecklistId === checklist.id && <span className="text-[10px] text-muted-foreground uppercase font-bold animate-pulse">Adding...</span>}
                      </div>
                    </div>
                    <Button 
                      variant="ghost" 
                      size="sm" 
                      onClick={() => handleAddChecklistItem(checklist.id)}
                      disabled={!(newChecklistItems[checklist.id]?.trim()) || addingChecklistId === checklist.id}
                      className="self-start text-muted-foreground hover:text-primary text-[13px] font-medium flex items-center gap-1 px-2 h-8"
                    >
                      <Plus size={16} /> Add Item
                    </Button>
                  </section>
                );
              })}

              {/* Attachments */}
              {task.attachments && task.attachments.length > 0 && (
              <section className="flex flex-col gap-2 mt-4">
                <div className="flex items-center justify-between">
                  <div className="text-[13px] font-medium text-muted-foreground">Attachments</div>
                  <Button variant="link" size="sm" className="p-0 h-auto text-[13px] font-medium">Add</Button>
                </div>
                <div className="grid grid-cols-2 gap-2">
                  {task.attachments.map(att => (
                    <div key={att.id} className="flex items-center gap-2 p-2 border border-border rounded bg-card hover:border-primary/50 transition-colors cursor-pointer group">
                      <div className="w-8 h-8 rounded bg-muted flex items-center justify-center text-primary group-hover:bg-primary/10 transition-colors">
                        <FileText size={18} />
                      </div>
                      <div className="flex flex-col min-w-0">
                        <span className="text-[13px] font-medium text-foreground truncate">{att.file_name}</span>
                        <span className="text-[12px] text-muted-foreground truncate">{(att.file_size / 1024).toFixed(1)} KB</span>
                      </div>
                    </div>
                  ))}
                </div>
              </section>
              )}
              </div>
            </ScrollArea>
          </main>

          {/* Right Column (Sidebar - Comments) */}
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
                        <AvatarFallback className="text-[10px] font-bold uppercase">{comment.user?.name?.substring(0,2) || "U"}</AvatarFallback>
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
