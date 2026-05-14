"use client";

import { useState, useMemo } from "react";
import { useParams } from "next/navigation";
import { useIsMounted } from "@/hooks/useIsMounted";
import {
  DndContext,
  DragOverlay,
  closestCorners,
  KeyboardSensor,
  PointerSensor,
  useSensor,
  useSensors,
  DragStartEvent,
  DragOverEvent,
  DragEndEvent,
  defaultDropAnimationSideEffects,
  DropAnimation,
} from "@dnd-kit/core";
import {
  arrayMove,
  SortableContext,
  sortableKeyboardCoordinates,
  verticalListSortingStrategy,
  horizontalListSortingStrategy,
  useSortable,
} from "@dnd-kit/sortable";
import { CSS } from "@dnd-kit/utilities";
import {
  CheckSquare,
  Plus,
  Pencil,
  Trash2,
  Check,
  Calendar,
  MessageSquare,
  MoreHorizontal
} from "lucide-react";
import { cn } from "@/lib/utils";
import { useSyncedState } from "@/hooks/useSyncedState";
import { useBoard, useMoveTask, useReorderLists, useUpdateTask, useDeleteTask, BoardList, Task } from "@/api/tasks";
import Spinner from "@/components/Loading";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { ScrollArea, ScrollBar } from "@/components/ui/scroll-area";
import { CreateListDialog } from "./create-list-dialog";
import { CreateTaskDialog } from "./create-task-dialog";
import { DeleteTaskDialog } from "./delete-task-dialog";
import { TaskDetailDialog } from "./task-detail-dialog";
import { EditListDialog } from "./edit-list-dialog";
import { DeleteListDialog } from "./delete-list-dialog";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";

// --- Helper for Priority Colors ---
const getPriorityStyles = (priority?: string | null) => {
  switch (priority?.toLowerCase()) {
    case "urgent":
      return { bg: "bg-rose-500", text: "text-rose-500", badgeBg: "bg-rose-500/15" };
    case "high":
      return { bg: "bg-red-500", text: "text-red-500", badgeBg: "bg-red-500/15" };
    case "medium":
      return { bg: "bg-amber-500", text: "text-amber-500", badgeBg: "bg-amber-500/15" };
    case "low":
      return { bg: "bg-blue-500", text: "text-blue-500", badgeBg: "bg-blue-500/15" };
    default:
      return { bg: "bg-muted/20", text: "text-muted-foreground", badgeBg: "bg-muted/10" };
  }
};

// --- Sub-components ---

function TaskCard({ 
  task, 
  isOverlay, 
  channelId,
  onDeleteRequest,
  onOpenDetail
}: { 
  task: Task; 
  isOverlay?: boolean; 
  channelId: string;
  onDeleteRequest?: (task: Task) => void;
  onOpenDetail?: (task: Task) => void;
}) {
  const { mutate: updateTask } = useUpdateTask(channelId);
  
  const {
    setNodeRef,
    attributes,
    listeners,
    transform,
    transition,
    isDragging,
  } = useSortable({
    id: task.id,
    data: {
      type: "Task",
      task,
    },
    disabled: isOverlay,
  });

  const style = {
    transition,
    transform: CSS.Translate.toString(transform),
  };

  const pStyle = getPriorityStyles(task.priority);
  const isDone = task.status === "COMPLETED";
  const hasFooterContent = !!(task.due_date || task._count?.comments || (task.checklists?.length ?? 0) > 0 || (task.assignments?.length ?? 0) > 0);

  const cardContent = (
    <div
      onClick={() => !isOverlay && onOpenDetail && onOpenDetail(task)}
      className={cn(
        "bg-kanban-card border rounded-lg p-2.5 transition-all group relative overflow-hidden cursor-pointer",
        isDragging && !isOverlay ? "opacity-30" : "opacity-100",
        isOverlay ? "border-primary shadow-2xl scale-[1.02] rotate-1" : "border-kanban-border hover:border-kanban-border-hover hover:bg-kanban-card-hover",
        isDone && "opacity-70"
      )}
    >
      {/* Top Action Buttons (Edit/Delete) */}
      <div className="absolute top-1.5 right-2 flex items-center gap-1.5 opacity-0 group-hover:opacity-100 transition-all transform translate-y-[-4px] group-hover:translate-y-0 z-20">
        <button 
          onClick={(e) => {
            e.stopPropagation();
            if (onOpenDetail) onOpenDetail(task);
          }}
          className="p-1.5 rounded-md bg-kanban-card border border-kanban-border hover:border-kanban-border-hover text-kanban-text-secondary hover:text-primary transition-all shadow-sm"
          title="Edit task"
        >
          <Pencil size={12} />
        </button>
        <button 
          onClick={(e) => {
            e.stopPropagation();
            if (onDeleteRequest) onDeleteRequest(task);
          }}
          className="p-1.5 rounded-md bg-kanban-card border border-kanban-border hover:border-red-500/50 text-kanban-text-secondary hover:text-red-500 transition-all shadow-sm"
          title="Delete task"
        >
          <Trash2 size={12} />
        </button>
      </div>

      <div className={cn("absolute left-0 top-0 bottom-0 w-1.5 rounded-l-lg opacity-60 group-hover:opacity-100", pStyle.bg)} />
      
      <div className="pl-1 pr-1">
        {/* Top Row: Checkbox and Priority (or Title if no priority) */}
        <div className={cn("flex items-center h-5 relative", (task.priority || hasFooterContent) && "mb-1.5")}>
          {/* Toggle Checkbox Button - Absolute and animated */}
          <button
            onClick={(e) => {
              e.stopPropagation();
              updateTask({ 
                id: task.id, 
                data: { status: task.status === "COMPLETED" ? "OPEN" : "COMPLETED" } 
              });
            }}
            className={cn(
              "absolute left-0 shrink-0 w-4.5 h-4.5 rounded-full border flex items-center justify-center transition-all duration-300 z-10",
              isDone 
                ? "bg-green-500 border-green-500 text-white opacity-100" 
                : "border-kanban-border hover:border-primary text-transparent hover:text-primary/50 bg-kanban-card opacity-0 group-hover:opacity-100 transform -translate-x-1 group-hover:translate-x-0"
            )}
          >
            <Check size={10} strokeWidth={4} className={cn(isDone ? "scale-100" : "scale-0 hover:scale-100 transition-transform")} />
          </button>

          {/* Priority Badge - Moves right on hover if checkbox appears */}
          <div className={cn(
            "transition-all duration-300 flex-1 min-w-0",
            !isDone ? "group-hover:translate-x-6" : "translate-x-6"
          )}>
            {task.priority ? (
              <span className={cn("px-2 py-0.5 rounded-md text-[9px] tracking-wider uppercase font-bold shrink-0", pStyle.badgeBg, pStyle.text)}>
                {task.priority}
              </span>
            ) : (
              <h3 className={cn("text-[13px] font-medium leading-tight truncate pr-4", isDone ? "line-through text-kanban-text-secondary" : "text-kanban-text-primary")}>
                {task.title}
              </h3>
            )}
          </div>
        </div>

        {/* Title Below Priority (only if priority exists) */}
        {task.priority && (
          <h3 className={cn("text-[13px] font-medium leading-tight mb-2 pr-4", isDone ? "line-through text-kanban-text-secondary" : "text-kanban-text-primary")}>
            {task.title}
          </h3>
        )}


        {hasFooterContent && (
          <div className="flex justify-between items-center mt-auto pt-0.5">
            <div className="flex items-center gap-2.5 text-kanban-text-secondary">
              {task.due_date && (
                <div className="flex items-center gap-1.5 text-[11px] font-medium">
                  <Calendar size={13} className="opacity-70" />
                  <span>{new Date(task.due_date).toLocaleDateString(undefined, { month: 'short', day: 'numeric' })}</span>
                </div>
              )}
              {task._count?.comments ? (
                <div className="flex items-center gap-1.5 text-[11px] font-medium">
                  <MessageSquare size={13} className="opacity-70" />
                  <span>{task._count.comments}</span>
                </div>
              ) : null}
              {(task.checklists?.length ?? 0) > 0 && (
                <div className="flex items-center gap-1.5 text-[11px] font-medium">
                  <CheckSquare size={13} className="opacity-70" />
                  <span>{task.checklists?.length}</span>
                </div>
              )}
            </div>
            <div className="flex -space-x-1.5">
              {task.assignments?.map((assignment) => (
                <Avatar key={assignment.user_id} className="w-5.5 h-5.5 border-2 border-kanban-card ring-offset-background">
                  <AvatarImage src={assignment.user?.avatar_url || ""} />
                  <AvatarFallback className="text-[8px] font-bold bg-secondary">
                    {assignment.user?.name?.substring(0, 2).toUpperCase() || "U"}
                  </AvatarFallback>
                </Avatar>
              ))}
            </div>
          </div>
        )}
      </div>
    </div>
  );

  if (isOverlay) return cardContent;

  return (
    <div ref={setNodeRef} style={style} {...attributes} {...listeners}>
      {cardContent}
    </div>
  );
}

function BoardColumn({ 
  list, 
  tasks, 
  orgId, 
  channelId,
  onDeleteTask,
  onOpenTaskDetail,
  onEditList,
  onDeleteList
}: { 
  list: BoardList; 
  tasks: Task[]; 
  orgId: string; 
  channelId: string;
  onDeleteTask: (task: Task) => void;
  onOpenTaskDetail: (task: Task) => void;
  onEditList: (list: BoardList) => void;
  onDeleteList: (list: BoardList) => void;
}) {
  const {
    setNodeRef,
    attributes,
    listeners,
    transform,
    transition,
    isDragging,
  } = useSortable({
    id: list.id,
    data: {
      type: "Column",
      list,
    },
  });

  const style = {
    transition,
    transform: CSS.Translate.toString(transform),
  };

  const taskIds = useMemo(() => (tasks || []).map((t) => t.id), [tasks]);

  return (
    <div
      ref={setNodeRef}
      style={style}
      className={cn(
        "bg-kanban-column border border-kanban-border rounded-[10px] w-[300px] shrink-0 grid grid-rows-[auto_minmax(0,1fr)_auto] max-h-[calc(100vh-120px)] shadow-sm transition-shadow",
        isDragging ? "opacity-50" : "opacity-100"
      )}
    >
      {/* Column Header */}
      <div
        {...attributes}
        {...listeners}
        className="p-4 flex justify-between items-center border-b border-kanban-border cursor-grab active:cursor-grabbing shrink-0"
      >
        <div className="flex items-center gap-2 text-kanban-text-primary">
          <h2 className="text-[14px] font-bold tracking-tight">{list.name}</h2>
          <span className="bg-kanban-badge text-kanban-text-tertiary px-2 py-0.5 rounded-full text-[11px] font-bold">
            {tasks.length}
          </span>
        </div>
        <DropdownMenu>
          <DropdownMenuTrigger asChild>
            <button className="text-kanban-text-secondary hover:text-kanban-text-primary transition-colors focus:outline-none">
              <MoreHorizontal size={18} />
            </button>
          </DropdownMenuTrigger>
          <DropdownMenuContent align="end" className="w-40 rounded-xl bg-card border-border shadow-xl">
            <DropdownMenuItem 
              className="flex items-center gap-2 cursor-pointer focus:bg-muted py-2"
              onClick={() => onEditList(list)}
            >
              <Pencil size={14} className="text-muted-foreground" />
              <span className="text-sm font-medium">Edit List</span>
            </DropdownMenuItem>
            <DropdownMenuItem 
              className="flex items-center gap-2 cursor-pointer focus:bg-destructive/10 text-destructive py-2"
              onClick={() => onDeleteList(list)}
            >
              <Trash2 size={14} />
              <span className="text-sm font-medium">Delete List</span>
            </DropdownMenuItem>
          </DropdownMenuContent>
        </DropdownMenu>
      </div>

      {/* Task List with ScrollArea */}
      <ScrollArea className="min-h-0 w-full overflow-hidden">
        <SortableContext items={taskIds} strategy={verticalListSortingStrategy}>
          <div className="p-3 flex flex-col gap-2.5 min-h-[100px] pb-4">
            {tasks.map((task) => (
              <TaskCard 
                key={task.id} 
                task={task} 
                channelId={channelId} 
                onDeleteRequest={onDeleteTask}
                onOpenDetail={onOpenTaskDetail}
              />
            ))}
          </div>
        </SortableContext>
        <ScrollBar orientation="vertical" />
      </ScrollArea>

      {/* Add Card Footer */}
      <div className="p-3 pt-2 shrink-0 border-t border-kanban-border/50">
        <CreateTaskDialog
          orgId={orgId}
          channelId={channelId}
          listId={list.id}
          trigger={
            <button
              className="w-full flex items-center gap-2 text-kanban-text-secondary hover:text-kanban-text-primary hover:bg-kanban-card-hover transition-all rounded-md py-2 px-2.5 text-[12px] font-semibold group"
            >
              <Plus size={16} className="text-kanban-text-secondary group-hover:text-primary transition-colors" />
              Add a card
            </button>
          }
        />
      </div>
    </div>
  );
}

// --- Main Component ---

export default function TaskBoard() {
  const isMounted = useIsMounted();
  const params = useParams();
  const channelId = params.channelId as string;
  const orgId = params.id as string;

  const { lists, isLoading, isError } = useBoard(channelId);
  const { mutate: moveTask } = useMoveTask(channelId);
  const { mutate: reorderLists } = useReorderLists();

  const [localLists, setLocalLists] = useSyncedState<BoardList[]>(lists || []);
  const [activeColumn, setActiveColumn] = useState<BoardList | null>(null);
  const [activeTask, setActiveTask] = useState<Task | null>(null);

  const [taskToDelete, setTaskToDelete] = useState<Task | null>(null);
  const [isDeleteModalOpen, setIsDeleteModalOpen] = useState(false);

  const [taskForDetail, setTaskForDetail] = useState<Task | null>(null);
  const [isDetailModalOpen, setIsDetailModalOpen] = useState(false);

  const [listToEdit, setListToEdit] = useState<BoardList | null>(null);
  const [isEditListModalOpen, setIsEditListModalOpen] = useState(false);

  const [listToDelete, setListToDelete] = useState<BoardList | null>(null);
  const [isDeleteListModalOpen, setIsDeleteListModalOpen] = useState(false);

  const handleDeleteRequest = (task: Task) => {
    setTaskToDelete(task);
    setIsDeleteModalOpen(true);
  };

  const handleOpenDetail = (task: Task) => {
    setTaskForDetail(task);
    setIsDetailModalOpen(true);
  };


  const sensors = useSensors(
    useSensor(PointerSensor, {
      activationConstraint: {
        distance: 5,
      },
    }),
    useSensor(KeyboardSensor, {
      coordinateGetter: sortableKeyboardCoordinates,
    })
  );

  const listIds = useMemo(() => localLists.map((l) => l.id), [localLists]);

  const onDragStart = (event: DragStartEvent) => {
    const { active } = event;
    const data = active.data.current;

    if (data?.type === "Column") {
      setActiveColumn(data.list);
    } else if (data?.type === "Task") {
      setActiveTask(data.task);
    }
  };

  const onDragOver = (event: DragOverEvent) => {
    const { active, over } = event;
    if (!over) return;

    const activeId = String(active.id);
    const overId = String(over.id);
    if (activeId === overId) return;

    const isActiveTask = active.data.current?.type === "Task";
    const isOverColumn = over.data.current?.type === "Column";

    if (!isActiveTask) return;

    setLocalLists((prev) => {
      // Find the columns
      const activeListIndex = prev.findIndex((l) => l.tasks?.some((t) => t.id === activeId));
      const overListIndex = isOverColumn
        ? prev.findIndex((l) => l.id === overId)
        : prev.findIndex((l) => l.tasks?.some((t) => t.id === overId));

      // If missing or same list, let onDragEnd handle the sorting
      if (activeListIndex === -1 || overListIndex === -1 || activeListIndex === overListIndex) {
        return prev;
      }

      // Different lists: Move optimistically
      const newLists = [...prev];
      const activeTasks = [...(newLists[activeListIndex].tasks || [])];
      const overTasks = [...(newLists[overListIndex].tasks || [])];

      const activeTaskIndex = activeTasks.findIndex((t) => t.id === activeId);
      const [movedTask] = activeTasks.splice(activeTaskIndex, 1);
      
      // Optimistic reference update
      movedTask.list_id = newLists[overListIndex].id; 

      if (over.data.current?.type === "Task") {
        const overTaskIndex = overTasks.findIndex((t) => t.id === overId);
        // Optional: Logic to drop above/below based on mouse position
        const isBelowOverItem = over && active.rect.current.translated && active.rect.current.translated.top > over.rect.top + over.rect.height;
        const modifier = isBelowOverItem ? 1 : 0;
        overTasks.splice(overTaskIndex >= 0 ? overTaskIndex + modifier : overTasks.length, 0, movedTask);
      } else {
        overTasks.push(movedTask);
      }

      newLists[activeListIndex] = { ...newLists[activeListIndex], tasks: activeTasks };
      newLists[overListIndex] = { ...newLists[overListIndex], tasks: overTasks };

      return newLists;
    });
  };

  const onDragEnd = (event: DragEndEvent) => {
    setActiveColumn(null);
    setActiveTask(null);

    const { active, over } = event;
    if (!over) return;

    const activeId = String(active.id);
    const overId = String(over.id);

    const isActiveColumn = active.data.current?.type === "Column";
    const isActiveTask = active.data.current?.type === "Task";

    // 1. Handle Board List Reordering
    if (isActiveColumn) {
      if (activeId !== overId) {
        setLocalLists((prev) => {
          const oldIndex = prev.findIndex((l) => l.id === activeId);
          const newIndex = prev.findIndex((l) => l.id === overId);
          if (oldIndex === -1 || newIndex === -1) return prev;

          const newLists = arrayMove(prev, oldIndex, newIndex);

          // Safe mapped array
          reorderLists({
            channel_id: channelId,
            items: newLists.map((l, i) => ({ id: l.id, position: i * 1000 })),
          });

          return newLists;
        });
      }
      return;
    }

    // 2. Handle Task Ordering (Same List & Cross List Drop)
    if (isActiveTask) {
      setLocalLists((prev) => {
        // Because onDragOver already moved items across lists optimistically,
        // the active item is already in the target list in local state.
        const currentListIndex = prev.findIndex((l) => l.tasks?.some((t) => t.id === activeId));
        if (currentListIndex === -1) return prev;

        const newLists = [...prev];
        const currentTasks = [...(newLists[currentListIndex].tasks || [])];
        const targetListId = newLists[currentListIndex].id;

        const oldIndex = currentTasks.findIndex((t) => t.id === activeId);

        let newIndex = oldIndex;
        if (over.data.current?.type === "Task") {
            newIndex = currentTasks.findIndex((t) => t.id === overId);
        } else if (over.data.current?.type === "Column" && overId === targetListId) {
            newIndex = currentTasks.length - 1; // Dropped on empty space in column, move to bottom
        }

        let finalTasks = currentTasks;
        if (oldIndex !== -1 && newIndex !== -1 && oldIndex !== newIndex) {
            finalTasks = arrayMove(currentTasks, oldIndex, newIndex);
        }

        newLists[currentListIndex] = { ...newLists[currentListIndex], tasks: finalTasks };

        // Helper for calculating absolute fractional position gaps
        const calculatePosition = (tasks: Task[], idx: number) => {
            // 1. If it's the only task in the list
            if (tasks.length <= 1) return 1000;

            // 2. If moved to the very top
            if (idx === 0) {
                const nextPos = tasks[1]?.position || 1000;
                // FIX: Halve the space instead of subtracting 1000.
                // This prevents the position from ever going negative!
                return Math.floor(nextPos / 2);
            }

            // 3. If moved to the very bottom
            if (idx === tasks.length - 1) {
                const prevPos = tasks[idx - 1]?.position || 0;
                return prevPos + 1000;
            }

            // 4. If moved right between two existing tasks
            const prevPos = tasks[idx - 1]?.position || 0;
            const nextPos = tasks[idx + 1]?.position || 0;
            return Math.floor((prevPos + nextPos) / 2);
        };

        const newPos = calculatePosition(finalTasks, newIndex !== -1 ? newIndex : oldIndex);

        // Fire the API call
        moveTask({
            id: activeId,
            data: { target_list_id: targetListId, position: newPos },
        });

        return newLists;
      });
    }
  };

  const dropAnimation: DropAnimation = {
    sideEffects: defaultDropAnimationSideEffects({
      styles: {
        active: {
          opacity: "0.5",
        },
      },
    }),
  };

  if (!isMounted) return null;

  if (isLoading) {
    return <Spinner size="lg" className="bg-kanban-board p-8" />;
  }

  if (isError) {
    return (
      <div className="flex h-full items-center justify-center p-8 text-destructive">
        Error loading board data.
      </div>
    );
  }

  return (
    <main className="flex-1 h-[calc(100vh-64px)] bg-kanban-board overflow-hidden">
      <ScrollArea className="w-full h-full">
        <DndContext
        sensors={sensors}
        collisionDetection={closestCorners}
        onDragStart={onDragStart}
        onDragOver={onDragOver}
        onDragEnd={onDragEnd}
      >
        <div className="flex items-start gap-4 p-6 h-full min-w-max">
          <SortableContext items={listIds} strategy={horizontalListSortingStrategy}>
            {localLists.map((list) => (
              <BoardColumn
                key={list.id}
                list={list}
                tasks={list.tasks || []}
                orgId={orgId}
                channelId={channelId}
                onDeleteTask={handleDeleteRequest}
                onOpenTaskDetail={handleOpenDetail}
                onEditList={(list) => {
                  setListToEdit(list);
                  setIsEditListModalOpen(true);
                }}
                onDeleteList={(list) => {
                  setListToDelete(list);
                  setIsDeleteListModalOpen(true);
                }}
              />
            ))}
          </SortableContext>

          {/* Ghost Column for adding new lists */}
          <CreateListDialog
            channelId={channelId}
            position={localLists.length * 1000}
            trigger={
              <button
                className="bg-kanban-column/50 border border-dashed border-kanban-border rounded-[10px] w-[300px] shrink-0 p-4 flex items-center gap-2 text-kanban-text-secondary hover:text-kanban-text-primary hover:bg-kanban-card-hover/50 hover:border-kanban-border-hover/50 transition-all text-[14px] font-semibold h-fit mt-0"
              >
                <Plus size={20} />
                Add another list
              </button>
            }
          />
        </div>

        <DragOverlay dropAnimation={dropAnimation}>
          {activeColumn ? (
            <BoardColumn
              list={activeColumn}
              tasks={activeColumn.tasks || []}
              orgId={orgId}
              channelId={channelId}
              onDeleteTask={() => {}}
              onOpenTaskDetail={() => {}}
              onEditList={() => {}}
              onDeleteList={() => {}}
            />
          ) : null}
          {activeTask ? (
            <TaskCard 
              task={activeTask} 
              isOverlay 
              channelId={channelId} 
              onDeleteRequest={() => {}}
            />
          ) : null}
        </DragOverlay>
      </DndContext>
      <ScrollBar orientation="horizontal" />
    </ScrollArea>

    {/* Delete Task Dialog */}
    {taskToDelete && (
      <DeleteTaskDialog
        open={isDeleteModalOpen}
        onOpenChange={setIsDeleteModalOpen}
        taskId={taskToDelete.id}
        taskTitle={taskToDelete.title}
        channelId={channelId}
        onSuccess={() => setTaskToDelete(null)}
      />
    )}

    {/* Task Detail Dialog */}
    {taskForDetail && (
      <TaskDetailDialog
        open={isDetailModalOpen}
        onOpenChange={setIsDetailModalOpen}
        taskId={taskForDetail.id}
        channelId={channelId}
      />
    )}

    {listToEdit && (
      <EditListDialog
        key={`${listToEdit.id}-${isEditListModalOpen}`}
        channelId={channelId}
        listId={listToEdit.id}
        initialName={listToEdit.name}
        open={isEditListModalOpen}
        onOpenChange={setIsEditListModalOpen}
      />
    )}

    {listToDelete && (
      <DeleteListDialog
        key={listToDelete.id}
        channelId={channelId}
        listId={listToDelete.id}
        listName={listToDelete.name}
        open={isDeleteListModalOpen}
        onOpenChange={setIsDeleteListModalOpen}
      />
    )}
  </main>
  );
}
