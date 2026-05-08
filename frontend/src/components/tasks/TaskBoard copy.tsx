"use client";

import { useState } from "react";
import { useParams } from "next/navigation";
import { useIsMounted } from "@/hooks/useIsMounted";
import { DragDropContext, Droppable, Draggable, DropResult } from "@hello-pangea/dnd";
import { 
  MoreHorizontal, 
  Calendar, 
  MessageSquare, 
  CheckSquare, 
  Paperclip, 
  Plus 
} from "lucide-react";
import { cn } from "@/lib/utils";
import { useBoard, useMoveTask, useReorderLists, BoardList } from "@/api/tasks";
import { OrbitalLoader } from "@/components/ui/orbital-loader";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { CreateListDialog } from "./create-list-dialog";
import { CreateTaskDialog } from "./create-task-dialog";

// --- Helper for Priority Colors ---
const getPriorityStyles = (priority: string) => {
  switch (priority?.toLowerCase()) {
    case "high":
      return { bg: "bg-priority-high", text: "text-priority-high", badgeBg: "bg-priority-high/15" };
    case "medium":
      return { bg: "bg-priority-medium", text: "text-priority-medium", badgeBg: "bg-priority-medium/15" };
    case "low":
    default:
      return { bg: "bg-priority-low", text: "text-priority-low", badgeBg: "bg-priority-low/15" };
  }
};

export default function TaskBoard() {
  const isMounted = useIsMounted();
  const params = useParams();
  const channelId = params.channelId as string;
  const orgId = params.id as string;

  // Real Data Hooks
  const { lists, isLoading, isError } = useBoard(channelId);
  const { mutate: moveTask } = useMoveTask(channelId);
  const { mutate: reorderLists } = useReorderLists();

  // Optimistic State synced during render (Avoids useEffect cascading render anti-pattern)
  const [localLists, setLocalLists] = useState<BoardList[]>(lists || []);
  const [prevServerLists, setPrevServerLists] = useState<BoardList[] | undefined>(lists);

  if (lists !== prevServerLists) {
    setPrevServerLists(lists);
    setLocalLists(lists || []);
  }

  if (!isMounted) return null;

  // --- Drag & Drop Handler ---
  const onDragEnd = (result: DropResult) => {
    const { destination, source, draggableId, type } = result;

    if (!destination) return; // Dropped outside
    if (destination.droppableId === source.droppableId && destination.index === source.index) return; // Unchanged

    // Handling Column Reordering (If we make lists draggable later)
    if (type === "list") {
      const newLists = Array.from(localLists);
      const [movedList] = newLists.splice(source.index, 1);
      newLists.splice(destination.index, 0, movedList);

      // Re-assign positions
      const reorderedItems = newLists.map((list, index) => ({
        id: list.id,
        position: index * 1000,
      }));

      setLocalLists(newLists);
      reorderLists({ channel_id: channelId, items: reorderedItems });
      return;
    }

    // Handling Task Reordering
    const startListIndex = localLists.findIndex(l => l.id === source.droppableId);
    const finishListIndex = localLists.findIndex(l => l.id === destination.droppableId);

    const startList = localLists[startListIndex];
    const finishList = localLists[finishListIndex];

    const startTasks = Array.from(startList.tasks || []);
    const [movedTask] = startTasks.splice(source.index, 1);

    // Same Column Move
    if (startList.id === finishList.id) {
      startTasks.splice(destination.index, 0, movedTask);
      
      const newLists = [...localLists];
      newLists[startListIndex] = { ...startList, tasks: startTasks };
      
      setLocalLists(newLists);
      moveTask({ 
        id: draggableId, 
        data: { target_list_id: finishList.id, position: destination.index * 1000 } 
      });
      return;
    }

    // Different Column Move
    const finishTasks = Array.from(finishList.tasks || []);
    finishTasks.splice(destination.index, 0, movedTask);

    const newLists = [...localLists];
    newLists[startListIndex] = { ...startList, tasks: startTasks };
    newLists[finishListIndex] = { ...finishList, tasks: finishTasks };

    setLocalLists(newLists);
    moveTask({ 
      id: draggableId, 
      data: { target_list_id: finishList.id, position: destination.index * 1000 } 
    });
  };

  if (isLoading) {
    return (
      <div className="flex h-full items-center justify-center p-8 bg-kanban-board">
        <OrbitalLoader />
      </div>
    );
  }

  if (isError) {
    return (
      <div className="flex h-full items-center justify-center p-8 text-destructive">
        Error loading board data.
      </div>
    );
  }

  return (
    <main className="flex-1 overflow-x-auto p-6 flex items-start gap-4 min-h-[calc(100vh-64px)] bg-kanban-board">
      <DragDropContext onDragEnd={onDragEnd}>
        <Droppable droppableId="board" type="list" direction="horizontal">
          {(provided) => (
            <div 
              {...provided.droppableProps}
              ref={provided.innerRef}
              className="flex items-start gap-4 h-full"
            >
              {localLists.map((list, index) => {
                const listTasks = list.tasks || [];

                return (
                  <Draggable key={list.id} draggableId={list.id} index={index}>
                    {(provided) => (
                      <div 
                        ref={provided.innerRef}
                        {...provided.draggableProps}
                        className="bg-kanban-column border border-kanban-border rounded-[10px] w-[300px] shrink-0 flex flex-col max-h-full"
                      >
                        {/* Column Header */}
                        <div 
                          {...provided.dragHandleProps}
                          className="p-4 flex justify-between items-center border-b border-kanban-border cursor-grab active:cursor-grabbing"
                        >
                          <div className="flex items-center gap-2">
                            <h2 className="text-[14px] font-semibold text-kanban-text-primary">{list.name}</h2>
                            <span className="bg-kanban-badge text-kanban-text-tertiary px-2 py-0.5 rounded-full text-[11px] font-semibold">
                              {listTasks.length}
                            </span>
                          </div>
                          <button className="text-kanban-text-secondary hover:text-kanban-text-primary transition-colors">
                            <MoreHorizontal size={18} />
                          </button>
                        </div>

                        {/* Droppable Task Area */}
                        <Droppable droppableId={list.id} type="task">
                          {(provided, snapshot) => (
                            <div
                              ref={provided.innerRef}
                              {...provided.droppableProps}
                              className={cn(
                                "p-3 flex flex-col gap-2 overflow-y-auto min-h-[50px] transition-colors",
                                snapshot.isDraggingOver ? "bg-kanban-card-hover/50" : ""
                              )}
                            >
                              {listTasks.map((task, index) => {
                                const pStyle = getPriorityStyles(task.priority);
                                const isDone = task.status === "DONE";

                                return (
                                  <Draggable key={task.id} draggableId={task.id} index={index}>
                                    {(provided, snapshot) => (
                                      <div
                                        ref={provided.innerRef}
                                        {...provided.draggableProps}
                                        {...provided.dragHandleProps}
                                        className={cn(
                                          "bg-kanban-card border rounded-lg p-3 transition-all group relative",
                                          snapshot.isDragging ? "border-kanban-border-hover shadow-lg shadow-kanban-border-hover/20 rotate-2" : "border-kanban-border hover:border-kanban-border-hover hover:bg-kanban-card-hover",
                                          isDone && "opacity-70 hover:opacity-100"
                                        )}
                                      >
                                        {/* Left Priority Bar */}
                                        <div className={cn("absolute left-0 top-0 bottom-0 w-1 rounded-l-lg opacity-80 group-hover:opacity-100", pStyle.bg)} />
                                        
                                        <div className="pl-2">
                                          <div className="flex items-center gap-1 mb-2">
                                            {task.priority && task.priority !== "NONE" && (
                                              <span className={cn("px-2 py-1 rounded-full text-[11px] tracking-wider uppercase font-semibold", pStyle.badgeBg, pStyle.text)}>
                                                {task.priority}
                                              </span>
                                            )}
                                          </div>
                                          <h3 className={cn("text-[14px] mb-2", isDone ? "line-through text-kanban-text-secondary" : "text-kanban-text-primary")}>
                                            {task.title}
                                          </h3>
                                          
                                          {/* Card Footer Data */}
                                          <div className="flex justify-between items-end mt-2">
                                            <div className="flex items-center gap-3 text-kanban-text-secondary">
                                              {task.due_date && (
                                                <div className="flex items-center gap-1 text-[11px]">
                                                  <Calendar size={14} />
                                                  <span>{new Date(task.due_date).toLocaleDateString(undefined, { month: 'short', day: 'numeric' })}</span>
                                                </div>
                                              )}
                                              {task._count?.comments ? (
                                                <div className="flex items-center gap-1 text-[11px]">
                                                  <MessageSquare size={14} />
                                                  <span>{task._count.comments}</span>
                                                </div>
                                              ) : null}
                                              {task.checklists && task.checklists.length > 0 && (
                                                <div className="flex items-center gap-1 text-[11px]">
                                                  <CheckSquare size={14} />
                                                  <span>{task.checklists.length}</span>
                                                </div>
                                              )}
                                              {task.attachments && task.attachments.length > 0 && (
                                                <div className="flex items-center gap-1 text-[11px]">
                                                  <Paperclip size={14} />
                                                  <span>{task.attachments.length}</span>
                                                </div>
                                              )}
                                            </div>
                                            
                                            {/* User Avatars */}
                                            <div className="flex -space-x-2">
                                              {task.assignments?.map((assignment) => (
                                                <Avatar key={assignment.id} className="w-6 h-6 border-2 border-kanban-card bg-muted">
                                                  <AvatarImage src={assignment.user?.avatar_url || ""} />
                                                  <AvatarFallback className="text-[9px] uppercase">
                                                    {assignment.user?.name?.substring(0, 2) || "U"}
                                                  </AvatarFallback>
                                                </Avatar>
                                              ))}
                                            </div>
                                          </div>
                                        </div>
                                      </div>
                                    )}
                                  </Draggable>
                                );
                              })}
                              {provided.placeholder}
                            </div>
                          )}
                        </Droppable>

                        {/* Add Card Footer */}
                        <div className="p-3 pt-0">
                          <CreateTaskDialog
                            orgId={orgId}
                            channelId={channelId}
                            listId={list.id}
                            trigger={
                              <button 
                                className="w-full flex items-center gap-2 text-[#8B91B3] hover:text-kanban-text-primary hover:bg-kanban-card-hover transition-colors rounded-lg py-1.5 px-2 text-[12px] font-medium"
                              >
                                <Plus size={16} />
                                Add a card
                              </button>
                            }
                          />
                        </div>
                      </div>
                    )}
                  </Draggable>
                );
              })}
              {provided.placeholder}
            </div>
          )}
        </Droppable>
      </DragDropContext>

      {/* Ghost Column for adding new lists */}
      <CreateListDialog
        channelId={channelId}
        position={localLists.length * 1000}
        trigger={
          <button 
            className="bg-kanban-column/50 border border-dashed border-kanban-border rounded-[10px] w-[300px] shrink-0 p-4 flex items-center gap-2 text-kanban-text-secondary hover:text-kanban-text-primary hover:bg-kanban-card-hover/50 hover:border-kanban-border-hover/50 transition-all text-[14px] font-semibold"
          >
            <Plus size={20} />
            Add another list
          </button>
        }
      />
    </main>
  );
}
