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
import { useBoard, useMoveTask, useReorderLists, useUpdateTask, useDeleteTask, BoardList, Task } from "@/api/tasks";
import { OrbitalLoader } from "@/components/ui/orbital-loader";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { ScrollArea, ScrollBar } from "@/components/ui/scroll-area";
import { CreateListDialog } from "./create-list-dialog";
import { CreateTaskDialog } from "./create-task-dialog";
import { DeleteTaskDialog } from "./delete-task-dialog";
import { TaskDetailDialog } from "./task-detail-dialog";

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
  const { mutate: deleteTask } = useDeleteTask(channelId);
  
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
  const isDone = task.status === "DONE";

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
      <div className="absolute top-2 right-2 flex items-center gap-1.5 opacity-0 group-hover:opacity-100 transition-all transform translate-y-[-4px] group-hover:translate-y-0 z-20">
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
        {/* Top Row: Checkbox and Priority */}
        <div className="flex items-center h-5 mb-1.5 relative">
          {/* Toggle Checkbox Button - Absolute and animated */}
          <button
            onClick={(e) => {
              e.stopPropagation();
              updateTask({ 
                id: task.id, 
                data: { status: task.status === "DONE" ? "TODO" : "DONE" } 
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
            "transition-all duration-300",
            !isDone ? "group-hover:translate-x-6" : "translate-x-6"
          )}>
            {task.priority && task.priority !== "NONE" && (
              <span className={cn("px-2 py-0.5 rounded-md text-[9px] tracking-wider uppercase font-bold", pStyle.badgeBg, pStyle.text)}>
                {task.priority}
              </span>
            )}
          </div>
        </div>

        {/* Title - Stays stationary */}
        <h3 className={cn("text-[13px] font-medium leading-tight mb-2 pr-4", isDone ? "line-through text-kanban-text-secondary" : "text-kanban-text-primary")}>
          {task.title}
        </h3>
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
              <Avatar key={assignment.id} className="w-5.5 h-5.5 border-2 border-kanban-card ring-offset-background">
                <AvatarImage src={assignment.user?.avatar_url || ""} />
                <AvatarFallback className="text-[8px] font-bold bg-secondary">
                  {assignment.user?.name?.substring(0, 2).toUpperCase() || "U"}
                </AvatarFallback>
              </Avatar>
            ))}
          </div>
        </div>
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
  onOpenTaskDetail
}: { 
  list: BoardList; 
  tasks: Task[]; 
  orgId: string; 
  channelId: string;
  onDeleteTask: (task: Task) => void;
  onOpenTaskDetail: (task: Task) => void;
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
        <button className="text-kanban-text-secondary hover:text-kanban-text-primary transition-colors">
          <MoreHorizontal size={18} />
        </button>
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

  const [localLists, setLocalLists] = useState<BoardList[]>(lists || []);
  const [prevServerLists, setPrevServerLists] = useState<BoardList[] | undefined>(lists);

  const [activeColumn, setActiveColumn] = useState<BoardList | null>(null);
  const [activeTask, setActiveTask] = useState<Task | null>(null);

  const [taskToDelete, setTaskToDelete] = useState<Task | null>(null);
  const [isDeleteModalOpen, setIsDeleteModalOpen] = useState(false);

  const [taskForDetail, setTaskForDetail] = useState<Task | null>(null);
  const [isDetailModalOpen, setIsDetailModalOpen] = useState(false);

  const handleDeleteRequest = (task: Task) => {
    setTaskToDelete(task);
    setIsDeleteModalOpen(true);
  };

  const handleOpenDetail = (task: Task) => {
    setTaskForDetail(task);
    setIsDetailModalOpen(true);
  };

  if (lists !== prevServerLists) {
    setPrevServerLists(lists);
    setLocalLists(lists || []);
  }

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

    const activeId = active.id;
    const overId = over.id;

    if (activeId === overId) return;

    const activeType = active.data.current?.type;
    const overType = over.data.current?.type;

    if (activeType === "Task" && overType === "Task") {
      const activeListId = localLists.find((l) => (l.tasks || []).some((t) => t.id === activeId))?.id;
      const overListId = localLists.find((l) => (l.tasks || []).some((t) => t.id === overId))?.id;

      if (activeListId && overListId && activeListId !== overListId) {
        setLocalLists((prev) => {
          const activeListIndex = prev.findIndex((l) => l.id === activeListId);
          const overListIndex = prev.findIndex((l) => l.id === overListId);

          const activeList = prev[activeListIndex];
          const overList = prev[overListIndex];

          const activeTasks = activeList.tasks || [];
          const overTasks = overList.tasks || [];

          const activeTaskIndex = activeTasks.findIndex((t) => t.id === activeId);
          const overTaskIndex = overTasks.findIndex((t) => t.id === overId);

          const newActiveTasks = [...activeTasks];
          const [movedTask] = newActiveTasks.splice(activeTaskIndex, 1);

          const newOverTasks = [...overTasks];
          newOverTasks.splice(overTaskIndex, 0, movedTask);

          const newLists = [...prev];
          newLists[activeListIndex] = { ...activeList, tasks: newActiveTasks };
          newLists[overListIndex] = { ...overList, tasks: newOverTasks };

          return newLists;
        });
      }
    } else if (activeType === "Task" && overType === "Column") {
      const activeListId = localLists.find((l) => (l.tasks || []).some((t) => t.id === activeId))?.id;
      const overListId = overId as string;

      if (activeListId && activeListId !== overListId) {
        setLocalLists((prev) => {
          const activeListIndex = prev.findIndex((l) => l.id === activeListId);
          const overListIndex = prev.findIndex((l) => l.id === overListId);

          const activeList = prev[activeListIndex];
          const overList = prev[overListIndex];

          const activeTasks = activeList.tasks || [];
          const overTasks = overList.tasks || [];

          const activeTaskIndex = activeTasks.findIndex((t) => t.id === activeId);

          const newActiveTasks = [...activeTasks];
          const [movedTask] = newActiveTasks.splice(activeTaskIndex, 1);

          const newOverTasks = [...overTasks, movedTask];

          const newLists = [...prev];
          newLists[activeListIndex] = { ...activeList, tasks: newActiveTasks };
          newLists[overListIndex] = { ...overList, tasks: newOverTasks };

          return newLists;
        });
      }
    }
  };

  const onDragEnd = (event: DragEndEvent) => {
    const { active, over } = event;
    setActiveColumn(null);
    setActiveTask(null);

    if (!over) return;

    const activeId = active.id;
    const overId = over.id;

    if (active.data.current?.type === "Column") {
      if (activeId !== overId) {
        setLocalLists((prev) => {
          const oldIndex = prev.findIndex((l) => l.id === activeId);
          const newIndex = prev.findIndex((l) => l.id === overId);
          const newLists = arrayMove(prev, oldIndex, newIndex);

          reorderLists({
            channel_id: channelId,
            items: newLists.map((l, i) => ({ id: l.id, position: i * 1000 })),
          });

          return newLists;
        });
      }
    } else if (active.data.current?.type === "Task") {
      const activeList = localLists.find((l) => (l.tasks || []).some((t) => t.id === activeId));
      const overList = localLists.find((l) => l.id === overId) || localLists.find((l) => (l.tasks || []).some((t) => t.id === overId));

      if (activeList && overList) {
        const activeTasks = activeList.tasks || [];
        const overTasks = overList.tasks || [];

        const activeTaskIndex = activeTasks.findIndex((t) => t.id === activeId);
        const overTaskIndex = overList.id === overId
          ? overTasks.length
          : overTasks.findIndex((t) => t.id === overId);

        moveTask({
          id: activeId as string,
          data: {
            target_list_id: overList.id,
            position: overTaskIndex * 1000,
          },
        });
      }
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
  </main>
  );
}
