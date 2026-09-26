"use client";

import { useState, useMemo, useRef } from "react";
import { useParams } from "next/navigation";
import { useIsMounted } from "@/hooks/useIsMounted";
import { useQueryClient } from "@tanstack/react-query";
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
import { buildAuthenticatedFileUrl } from "@/lib/file-url";
import { useBoard, useBoardListTasks, useMoveTask, useReorderLists, useUpdateTask, BoardList, Task, taskKeys } from "@/api/tasks";
import { useAbility } from "@casl/react";
import { AbilityContext } from "@/lib/casl";
import Spinner from "@/components/Loading";
import { toast } from "sonner";
import { useAuthProfile } from "@/api/auth";
import { useTaskRealtime } from "@/hooks/useTaskRealtime";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from "@/components/ui/tooltip";
import { ScrollArea, ScrollBar } from "@/components/ui/scroll-area";
import { CreateListDialog } from "./create-list-dialog";
import { CreateTaskDialog } from "./create-task-dialog";
import { DeleteTaskDialog } from "./delete-task-dialog";
import { TaskDetailDialog } from "./task-detail-dialog";
import { EditListDialog } from "./edit-list-dialog";
import { DeleteListDialog } from "./delete-list-dialog";
import { EditTaskDialog } from "./edit-task-dialog";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";

const TASKS_PAGE_SIZE = 50;

type BoardPagination = {
  total: number;
  page: number;
  limit: number;
  totalPages: number;
  hasMore: boolean;
};

type BoardListState = BoardList & {
  task_count: number;
  tasks: Task[];
  pagination?: BoardPagination;
  isTasksLoading?: boolean;
  isTasksFetching?: boolean;
};

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

// --- Helper for Column Dot Colors ---
const getColumnCircleColor = (name: string) => {
  const lower = name.toLowerCase();
  if (lower.includes("todo") || lower.includes("to do")) return "bg-indigo-400/80 dark:bg-indigo-400";
  if (lower.includes("progress") || lower.includes("in progress")) return "bg-blue-500/80 dark:bg-blue-500";
  if (lower.includes("qa") || lower.includes("test")) return "bg-emerald-400/80 dark:bg-emerald-400";
  return "bg-slate-400/80 dark:bg-slate-400";
};

// --- Helper for Today Date Check ---
const isToday = (dateStr?: string | null) => {
  if (!dateStr) return false;
  const d = new Date(dateStr);
  const today = new Date();
  return d.getDate() === today.getDate() &&
         d.getMonth() === today.getMonth() &&
         d.getFullYear() === today.getFullYear();
};

function TaskCard({
  task,
  isOverlay,
  channelId,
  onDeleteRequest,
  onOpenDetail,
  onEditRequest,
  canDeleteTask = true,
  canUpdateTaskBasic = true,
  canEditTask = true,
  onToggleStatus,
}: {
  task: Task;
  isOverlay?: boolean;
  channelId: string;
  onDeleteRequest?: (task: Task) => void;
  onOpenDetail?: (task: Task) => void;
  onEditRequest?: (task: Task) => void;
  canDeleteTask?: boolean;
  canUpdateTaskBasic?: boolean;
  canEditTask?: boolean;
  onToggleStatus?: (taskId: string, currentStatus: string) => void;
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
    disabled: isOverlay || !canUpdateTaskBasic,
  });

  const style = {
    transition,
    transform: CSS.Translate.toString(transform),
  };

  const pStyle = getPriorityStyles(task.priority);
  const isDone = task.status === "COMPLETED";

  const totalChecklistItems = task.checklists?.reduce((sum, cl) => sum + (cl.items?.length ?? 0), 0) ?? 0;
  const completedChecklistItems = task.checklists?.reduce((sum, cl) => sum + (cl.items?.filter(item => item.is_completed).length ?? 0), 0) ?? 0;
  const checklistPercent = totalChecklistItems > 0 ? Math.round((completedChecklistItems / totalChecklistItems) * 100) : 0;

  const hasFooterContent = !!(task.due_date || task._count?.comments || (task.assignments?.length ?? 0) > 0);

  const cardContent = (
    <div
      onClick={() => !isOverlay && onOpenDetail && onOpenDetail(task)}
      className={cn(
        "bg-card border rounded-xl p-4 transition-all group relative overflow-hidden cursor-pointer",
        isDragging && !isOverlay ? "opacity-30" : "opacity-100",
        isOverlay
          ? "border-primary shadow-2xl scale-[1.02] rotate-1"
          : "border-border/80 hover:border-border/100 hover:shadow-md",
        isDone && "opacity-75"
      )}
    >
      {/* Top Action Buttons (Edit/Delete) */}
      <div className="absolute top-3 right-3 flex items-center gap-1.5 opacity-0 group-hover:opacity-100 transition-all transform translate-y-[-4px] group-hover:translate-y-0 z-20">
        {canEditTask && (
          <button
            onClick={(e) => {
              e.stopPropagation();
              if (onEditRequest) onEditRequest(task);
            }}
            className="p-1.5 rounded-md bg-card border border-border hover:bg-muted text-muted-foreground hover:text-foreground transition-all shadow-xs"
            title="Edit task"
          >
            <Pencil size={12} />
          </button>
        )}
        {canDeleteTask && (
          <button
            onClick={(e) => {
              e.stopPropagation();
              if (onDeleteRequest) onDeleteRequest(task);
            }}
            className="p-1.5 rounded-md bg-card border border-border hover:bg-destructive/10 text-muted-foreground hover:text-destructive transition-all shadow-xs"
            title="Delete task"
          >
            <Trash2 size={12} />
          </button>
        )}
      </div>

      {/* Priority colored indicator bar on the left */}
      <div className={cn(
        "absolute left-0 top-0 bottom-0 w-1 rounded-l-xl opacity-80 group-hover:opacity-100 transition-opacity",
        isDone ? "bg-emerald-500" : pStyle.bg
      )} />

      <div>
        {/* Toggle Checkbox Button - Subtly floats left in title row */}
        <div className="flex items-start gap-2.5">
          <button
            onClick={(e) => {
              e.stopPropagation();
              if (!canUpdateTaskBasic) return;
              if (onToggleStatus) {
                onToggleStatus(task.id, task.status);
              } else {
                updateTask({
                  id: task.id,
                  data: { status: task.status === "COMPLETED" ? "OPEN" : "COMPLETED" }
                });
              }
            }}
            disabled={!canUpdateTaskBasic}
            className={cn(
              "shrink-0 w-4 h-4 rounded-md border flex items-center justify-center transition-all duration-300 mt-1 cursor-pointer",
              !canUpdateTaskBasic && "pointer-events-none opacity-60",
              isDone
                ? "bg-emerald-500 border-emerald-500 text-white opacity-100"
                : "border-border/80 hover:border-[#4F6EF7] text-transparent hover:text-[#4F6EF7]/80 bg-background"
            )}
          >
            <Check size={9} strokeWidth={4} />
          </button>

          <div className="flex-1 min-w-0">
            {/* Labels and Priorities Header Row */}
            <div className="flex flex-wrap items-center gap-1.5 mb-2">
              {task.priority && (
                <span className={cn("px-2 py-0.5 rounded-md text-[9px] tracking-wider uppercase font-extrabold shrink-0 flex items-center gap-1", pStyle.badgeBg, pStyle.text)}>
                  {task.priority === "URGENT" && <span className="h-1.5 w-1.5 rounded-full bg-rose-500 animate-pulse shrink-0" />}
                  {task.priority}
                </span>
              )}
              {task.labels?.map(({ label }) => (
                <span
                  key={label.id}
                  className="px-2 py-0.5 rounded-md text-[9px] font-bold select-none uppercase tracking-wider"
                  style={{
                    backgroundColor: label.color ? `${label.color}15` : 'rgba(148, 163, 184, 0.1)',
                    color: label.color || '#64748b',
                  }}
                >
                  {label.name}
                </span>
              ))}
            </div>

            {/* Task Title */}
            <h3 className={cn("text-[13.5px] font-bold tracking-tight leading-snug mb-1 pr-6", isDone ? "line-through text-muted-foreground/80" : "text-foreground")}>
              {task.title}
            </h3>

            {/* Task Description */}
            {task.description && (
              <p className="text-[11px] text-muted-foreground/90 leading-relaxed line-clamp-2 mb-2 pr-2">
                {task.description}
              </p>
            )}

            {/* Checklist Progress Indicators */}
            {totalChecklistItems > 0 && (
              checklistPercent > 0 ? (
                <div className="mb-2.5 bg-muted/20 dark:bg-muted/10 p-2 rounded-lg border border-border/40 select-none max-w-[95%]">
                  <div className="flex justify-between items-center text-[10px] font-bold text-muted-foreground mb-1 select-none">
                    <span>Checklist progress</span>
                    <span>{checklistPercent}%</span>
                  </div>
                  <div className="h-1.5 w-full bg-muted dark:bg-muted/20 rounded-full overflow-hidden">
                    <div
                      className="h-full bg-[#4F6EF7] rounded-full transition-all duration-500"
                      style={{ width: `${checklistPercent}%` }}
                    />
                  </div>
                </div>
              ) : (
                <div className="flex items-center gap-1.5 text-[11.5px] font-bold text-muted-foreground mb-2.5 bg-muted/30 px-2 py-0.5 rounded-md border border-border/30 w-max select-none">
                  <CheckSquare size={13} className="text-muted-foreground/80" />
                  <span>{completedChecklistItems}/{totalChecklistItems}</span>
                </div>
              )
            )}

            {/* Footer Details: Date, Comments, Assignees */}
            {hasFooterContent && (
              <div className="flex justify-between items-center mt-3 pt-2.5 border-t border-border/30">
                <div className="flex items-center gap-3 text-muted-foreground">
                  {task.due_date && (
                    <div className={cn("flex items-center gap-1 text-[10.5px] font-bold select-none", isToday(task.due_date) ? "text-rose-500" : "text-muted-foreground")}>
                      <Calendar size={13} className="opacity-75 shrink-0" />
                      <span>{isToday(task.due_date) ? "Today" : new Date(task.due_date).toLocaleDateString(undefined, { month: 'short', day: 'numeric' })}</span>
                    </div>
                  )}
                  {task._count?.comments ? (
                    <div className="flex items-center gap-1 text-[10.5px] font-bold select-none">
                      <MessageSquare size={13} className="opacity-75 shrink-0" />
                      <span>{task._count.comments}</span>
                    </div>
                  ) : null}
                </div>
                <div className="flex -space-x-1.5 shrink-0">
                  <TooltipProvider>
                    {task.assignments?.map((assignment) => (
                      <Tooltip key={assignment.user_id}>
                        <TooltipTrigger asChild>
                          <Avatar className="w-5.5 h-5.5 border-2 border-card ring-offset-background shrink-0">
                            <AvatarImage src={assignment.user?.avatar_url ? buildAuthenticatedFileUrl(assignment.user.avatar_url) : ""} />
                            <AvatarFallback className="text-[8px] font-extrabold bg-muted text-foreground">
                              {assignment.user?.name?.substring(0, 2).toUpperCase() || "U"}
                            </AvatarFallback>
                          </Avatar>
                        </TooltipTrigger>
                        <TooltipContent side="bottom" className="text-[10px] font-bold">
                          {assignment.user?.name}
                        </TooltipContent>
                      </Tooltip>
                    ))}
                  </TooltipProvider>
                </div>
              </div>
            )}
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
  onOpenTaskDetail,
  onEditTask,
  onEditList,
  onDeleteList,
  canUpdateList = true,
  canDeleteList = true,
  canCreateTask = true,
  canDeleteTask = true,
  canUpdateTaskBasic = true,
  canEditTask = true,
  totalTaskCount = 0,
  hasMoreTasks = false,
  isLoadingTasks = false,
  isFetchingTasks = false,
  onLoadMore,
  onToggleStatus,
}: {
  list: BoardListState;
  tasks: Task[];
  orgId: string;
  channelId: string;
  onDeleteTask: (task: Task) => void;
  onOpenTaskDetail: (task: Task) => void;
  onEditTask: (task: Task) => void;
  onEditList: (list: BoardList) => void;
  onDeleteList: (list: BoardList) => void;
  canUpdateList?: boolean;
  canDeleteList?: boolean;
  canCreateTask?: boolean;
  canDeleteTask?: boolean;
  canUpdateTaskBasic?: boolean;
  canEditTask?: boolean;
  totalTaskCount?: number;
  hasMoreTasks?: boolean;
  isLoadingTasks?: boolean;
  isFetchingTasks?: boolean;
  onLoadMore?: (listId: string) => void;
  onToggleStatus?: (taskId: string, currentStatus: string) => void;
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
    disabled: !canUpdateList
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
        "bg-[#f8fafc]/55 dark:bg-[#0f172a]/20 border border-border/80 rounded-2xl w-[320px] shrink-0 grid grid-rows-[auto_minmax(0,1fr)_auto] max-h-[calc(100vh-120px)] shadow-[0_2px_12px_rgba(0,0,0,0.015)] transition-all duration-200",
        isDragging ? "opacity-50" : "opacity-100"
      )}
    >
      {/* Column Header */}
      <div
        {...attributes}
        {...listeners}
        className={cn(
          "p-4 flex justify-between items-center border-b border-border/50 shrink-0",
          canUpdateList ? "cursor-grab active:cursor-grabbing" : "cursor-default"
        )}
      >
        <div className="flex items-center gap-2.5 text-foreground select-none">
          <span className={cn("h-2.5 w-2.5 rounded-full shrink-0", getColumnCircleColor(list.name))} />
          <h2 className="text-[13.5px] font-extrabold tracking-tight">{list.name}</h2>
          <span className="bg-muted/60 text-muted-foreground px-2 py-0.5 rounded-full text-[10px] font-extrabold">
            {totalTaskCount}
          </span>
        </div>
        {(canUpdateList || canDeleteList) && (
          <DropdownMenu modal={false}>
            <DropdownMenuTrigger asChild>
              <button className="text-muted-foreground hover:text-foreground transition-colors focus:outline-none cursor-pointer">
                <MoreHorizontal size={18} />
              </button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end" className="w-40 rounded-xl bg-card border-border shadow-xl">
              {canUpdateList && (
                <DropdownMenuItem
                  className="flex items-center gap-2 cursor-pointer focus:bg-muted py-2"
                  onClick={() => onEditList(list)}
                >
                  <Pencil size={14} className="text-muted-foreground" />
                  <span className="text-sm font-medium">Edit List</span>
                </DropdownMenuItem>
              )}
              {canDeleteList && (
                <DropdownMenuItem
                  className="flex items-center gap-2 cursor-pointer focus:bg-destructive/10 text-destructive py-2"
                  onClick={() => onDeleteList(list)}
                >
                  <Trash2 size={14} />
                  <span className="text-sm font-medium">Delete List</span>
                </DropdownMenuItem>
              )}
            </DropdownMenuContent>
          </DropdownMenu>
        )}
      </div>

      {/* Task List with ScrollArea */}
      <ScrollArea className="min-h-0 w-full overflow-hidden">
        <SortableContext items={taskIds} strategy={verticalListSortingStrategy}>
          <div className="p-3.5 flex flex-col gap-3 min-h-25 pb-5">
            {isLoadingTasks && tasks.length === 0 ? (
              <div className="flex items-center justify-center py-8 text-muted-foreground">
                <Spinner size="sm" className="bg-transparent" />
              </div>
            ) : null}
            {tasks.map((task) => (
              <TaskCard
                key={task.id}
                task={task}
                channelId={channelId}
                onDeleteRequest={onDeleteTask}
                onOpenDetail={onOpenTaskDetail}
                onEditRequest={onEditTask}
                canDeleteTask={canDeleteTask}
                canUpdateTaskBasic={canUpdateTaskBasic}
                canEditTask={canEditTask}
                onToggleStatus={onToggleStatus}
              />
            ))}
            {!isLoadingTasks && tasks.length === 0 ? (
              <div className="flex flex-col items-center justify-center rounded-xl border border-dashed border-border/80 bg-background/30 px-4 py-8 text-center select-none">
                <div className="flex h-9 w-9 items-center justify-center rounded-lg bg-muted/40 text-muted-foreground mb-2">
                  <CheckSquare className="h-4.5 w-4.5 opacity-60" />
                </div>
                <p className="text-xs font-semibold text-muted-foreground">No tasks in {list.name.toLowerCase()}</p>
              </div>
            ) : null}
            {hasMoreTasks ? (
              <button
                type="button"
                onClick={() => onLoadMore?.(list.id)}
                disabled={isFetchingTasks}
                className="flex w-full items-center justify-center rounded-xl border border-dashed border-border/80 px-3 py-2 text-[12px] font-semibold text-muted-foreground transition-colors hover:border-border/100 hover:text-foreground disabled:cursor-not-allowed disabled:opacity-60 cursor-pointer"
              >
                {isFetchingTasks ? "Loading more..." : `Load more cards (${tasks.length}/${totalTaskCount})`}
              </button>
            ) : null}
          </div>
        </SortableContext>
        <ScrollBar orientation="vertical" />
      </ScrollArea>

      {/* Add Card Footer */}
      {canCreateTask && (
        <div className="p-3 pt-2 shrink-0 border-t border-border/40 bg-[#f8fafc]/30 dark:bg-transparent rounded-b-2xl">
          <CreateTaskDialog
            orgId={orgId}
            channelId={channelId}
            listId={list.id}
            trigger={
              <button
                className="w-full flex items-center justify-center gap-1.5 text-muted-foreground hover:text-foreground hover:bg-muted/40 transition-all rounded-lg py-2 px-2.5 text-xs font-bold border border-transparent hover:border-border/50 cursor-pointer group"
              >
                <Plus size={15} className="text-muted-foreground group-hover:text-primary transition-colors" />
                <span>Add Task</span>
              </button>
            }
          />
        </div>
      )}
    </div>
  );
}

// --- Main Component ---

export default function TaskBoard() {
  const isMounted = useIsMounted();
  const params = useParams();
  const channelId = params.channelId as string;
  const orgId = params.id as string;
  const { user } = useAuthProfile({ enabled: true });

  const { lists, isLoading, isError } = useBoard(channelId);
  const [taskPageSizes, setTaskPageSizes] = useState<Record<string, number>>({});
  const { mutate: moveTask } = useMoveTask(channelId);
  const { mutate: reorderLists } = useReorderLists();
  const { mutateAsync: updateTaskAsync } = useUpdateTask(channelId);
  const queryClient = useQueryClient();
  const listTaskQueries = useBoardListTasks(lists, taskPageSizes, { enabled: !!channelId });

  const mergedLists = useMemo<BoardListState[]>(() => {
    return lists.map((list, index) => {
      const query = listTaskQueries[index];
      const payload = query?.data?.success ? query.data.data : undefined;

      return {
        ...list,
        task_count: payload?.pagination.total ?? list.task_count ?? 0,
        tasks: payload?.tasks ?? [],
        pagination: payload?.pagination,
        isTasksLoading: query?.isLoading ?? false,
        isTasksFetching: query?.isFetching ?? false,
      };
    });
  }, [lists, listTaskQueries]);

  const serverBoardSignature = useMemo(
    () =>
      JSON.stringify(
        mergedLists.map((list) => ({
          id: list.id,
          task_count: list.task_count,
          task_ids: list.tasks.map((task) => task.id),
          page: list.pagination?.page ?? 1,
          limit: list.pagination?.limit ?? TASKS_PAGE_SIZE,
          total: list.pagination?.total ?? list.task_count,
          isLoading: list.isTasksLoading ?? false,
          isFetching: list.isTasksFetching ?? false,
        }))
      ),
    [mergedLists]
  );

  const [prevBoardSignature, setPrevBoardSignature] = useState(serverBoardSignature);
  const [localLists, setLocalLists] = useState<BoardListState[]>(() =>
    JSON.parse(JSON.stringify(mergedLists))
  );
  if (serverBoardSignature !== prevBoardSignature) {
    setPrevBoardSignature(serverBoardSignature);
    setLocalLists(JSON.parse(JSON.stringify(mergedLists)));
  }
  const [activeColumn, setActiveColumn] = useState<BoardListState | null>(null);
  const [activeTask, setActiveTask] = useState<Task | null>(null);

  const [taskToDelete, setTaskToDelete] = useState<Task | null>(null);
  const [isDeleteModalOpen, setIsDeleteModalOpen] = useState(false);

  const [taskForDetail, setTaskForDetail] = useState<Task | null>(null);
  const [isDetailModalOpen, setIsDetailModalOpen] = useState(false);

  const [taskToEdit, setTaskToEdit] = useState<Task | null>(null);
  const [isEditTaskModalOpen, setIsEditTaskModalOpen] = useState(false);

  const [listToEdit, setListToEdit] = useState<BoardList | null>(null);
  const [isEditListModalOpen, setIsEditListModalOpen] = useState(false);

  const [listToDelete, setListToDelete] = useState<BoardList | null>(null);
  const [isDeleteListModalOpen, setIsDeleteListModalOpen] = useState(false);
  const isDraggingRef = useRef(false);
  const pendingBoardRefreshRef = useRef(false);
  const pendingTaskRefreshRef = useRef(new Set<string>());

  const handleDeleteRequest = (task: Task) => {
    setTaskToDelete(task);
    setIsDeleteModalOpen(true);
  };

  const handleOpenDetail = (task: Task) => {
    setTaskForDetail(task);
    setIsDetailModalOpen(true);
  };

  const handleEditRequest = (task: Task) => {
    setTaskToEdit(task);
    setIsEditTaskModalOpen(true);
  };

  const handleToggleTaskStatus = async (taskId: string, currentStatus: string) => {
    if (!canUpdateTaskBasic) return;
    const newStatus = currentStatus === 'COMPLETED' ? 'OPEN' : 'COMPLETED';

    // 1. Snapshot for recovery
    const detailQueryKey = taskKeys.detail(taskId);
    const detailSnapshot = queryClient.getQueryData(detailQueryKey);

    const list = localLists.find(l => l.tasks?.some(t => t.id === taskId));
    const listId = list?.id;
    const limit = listId ? (taskPageSizes[listId] ?? TASKS_PAGE_SIZE) : TASKS_PAGE_SIZE;
    const listQueryKey = listId ? taskKeys.listTasks(listId, limit) : null;
    const listSnapshot = listQueryKey ? queryClient.getQueryData(listQueryKey) : null;

    // Save previous local state
    const previousLocalLists = localLists;

    // 2. Optimistically update local state
    setLocalLists(prev => prev.map(col => ({
      ...col,
      tasks: col.tasks?.map(t => t.id === taskId ? { ...t, status: newStatus } : t) ?? []
    })));

    // 3. Optimistically update query caches
    if (listQueryKey) {
      queryClient.setQueryData(listQueryKey, (old: unknown) => {
        const listData = old as { success?: boolean; data?: { tasks: Task[] } } | undefined;
        if (!listData || !listData.success || !listData.data) return old;
        return {
          ...listData,
          data: {
            ...listData.data,
            tasks: listData.data.tasks.map((t: Task) =>
              t.id === taskId ? { ...t, status: newStatus } : t
            ),
          },
        };
      });
    }

    queryClient.setQueryData(detailQueryKey, (old: unknown) => {
      const detailData = old as { success?: boolean; data?: Task } | undefined;
      if (!detailData || !detailData.success || !detailData.data) return old;
      return {
        ...detailData,
        data: {
          ...detailData.data,
          status: newStatus,
        },
      };
    });

    try {
      await updateTaskAsync({ id: taskId, data: { status: newStatus } });
    } catch {
      // Revert everything
      setLocalLists(previousLocalLists);
      if (listQueryKey) {
        queryClient.setQueryData(listQueryKey, listSnapshot);
      }
      queryClient.setQueryData(detailQueryKey, detailSnapshot);
      toast.error("Failed to update task status. Please try again.");
    }
  };

  const ability = useAbility(AbilityContext);
  const canCreateList = ability.can("create", "Board");
  const canUpdateList = ability.can("update", "Board");
  const canDeleteList = ability.can("delete", "Board");
  const canCreateTask = ability.can("create", "Task");
  const canDeleteTask = ability.can("delete", "Task");
  const canUpdateTaskBasic = ability.can("update-basic", "Task");
  const canEditTask = ability.can("update-manage", "Task");


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
  const { flushPendingRefreshes } = useTaskRealtime(channelId, {
    userId: user?.id,
    isDraggingRef,
    pendingBoardRefreshRef,
    pendingTaskRefreshRef,
  });

  const handleLoadMoreTasks = (listId: string) => {
    setTaskPageSizes((prev) => ({
      ...prev,
      [listId]: (prev[listId] ?? TASKS_PAGE_SIZE) + TASKS_PAGE_SIZE,
    }));
  };

  const onDragStart = (event: DragStartEvent) => {
    isDraggingRef.current = true;
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
    isDraggingRef.current = false;
    setActiveColumn(null);
    setActiveTask(null);

    const { active, over } = event;
    if (!over) {
      flushPendingRefreshes();
      return;
    }

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
      flushPendingRefreshes();
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
    flushPendingRefreshes();
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
                  onEditTask={handleEditRequest}
                  onEditList={(list) => {
                    setListToEdit(list);
                    setIsEditListModalOpen(true);
                  }}
                  onDeleteList={(list) => {
                    setListToDelete(list);
                    setIsDeleteListModalOpen(true);
                  }}
                  canUpdateList={canUpdateList}
                  canDeleteList={canDeleteList}
                  canCreateTask={canCreateTask}
                  canDeleteTask={canDeleteTask}
                  canUpdateTaskBasic={canUpdateTaskBasic}
                  canEditTask={canEditTask}
                  totalTaskCount={list.task_count ?? list.tasks.length}
                  hasMoreTasks={Boolean(list.pagination?.hasMore)}
                  isLoadingTasks={Boolean(list.isTasksLoading)}
                  isFetchingTasks={Boolean(list.isTasksFetching)}
                  onLoadMore={handleLoadMoreTasks}
                  onToggleStatus={handleToggleTaskStatus}
                />
              ))}
            </SortableContext>

            {/* Ghost Column for adding new lists */}
            {canCreateList && (
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
            )}
          </div>

          <DragOverlay dropAnimation={dropAnimation}>
            {activeColumn ? (
              <BoardColumn
                list={activeColumn}
                tasks={activeColumn.tasks || []}
                orgId={orgId}
                channelId={channelId}
                onDeleteTask={() => { }}
                onOpenTaskDetail={() => { }}
                onEditTask={() => { }}
                onEditList={() => { }}
                onDeleteList={() => { }}
                canUpdateList={canUpdateList}
                canDeleteList={canDeleteList}
                canCreateTask={canCreateTask}
                canDeleteTask={canDeleteTask}
                canUpdateTaskBasic={canUpdateTaskBasic}
                canEditTask={canEditTask}
                totalTaskCount={activeColumn.task_count ?? activeColumn.tasks?.length ?? 0}
              />
            ) : null}
            {activeTask ? (
              <TaskCard
                task={activeTask}
                isOverlay
                channelId={channelId}
                onDeleteRequest={() => { }}
                canDeleteTask={canDeleteTask}
                canUpdateTaskBasic={canUpdateTaskBasic}
                canEditTask={canEditTask}
              />
            ) : null}
          </DragOverlay>
        </DndContext>
        <ScrollBar orientation="horizontal" />
      </ScrollArea>

      {/* Delete Task Dialog */}
      {taskToDelete && (
        <DeleteTaskDialog
          key={`delete-task-${taskToDelete.id}`}
          open={isDeleteModalOpen}
          onOpenChange={setIsDeleteModalOpen}
          taskId={taskToDelete.id}
          taskTitle={taskToDelete.title}
          channelId={channelId}
          onSuccess={() => setTaskToDelete(null)}
        />
      )}

      {/* Edit Task Dialog */}
      {taskToEdit && (
        <EditTaskDialog
          key={`edit-task-${taskToEdit.id}-${isEditTaskModalOpen}`}
          channelId={channelId}
          taskId={taskToEdit.id}
          initialTitle={taskToEdit.title}
          open={isEditTaskModalOpen}
          onOpenChange={setIsEditTaskModalOpen}
        />
      )}

      {/* Task Detail Dialog */}
      {taskForDetail && (
        <TaskDetailDialog
          key={`detail-task-${taskForDetail.id}-${isDetailModalOpen}`}
          open={isDetailModalOpen}
          onOpenChange={setIsDetailModalOpen}
          taskId={taskForDetail.id}
          channelId={channelId}
        />
      )}

      {listToEdit && (
        <EditListDialog
          key={`edit-list-${listToEdit.id}-${isEditListModalOpen}`}
          channelId={channelId}
          listId={listToEdit.id}
          initialName={listToEdit.name}
          open={isEditListModalOpen}
          onOpenChange={setIsEditListModalOpen}
        />
      )}

      {listToDelete && (
        <DeleteListDialog
          key={`delete-list-${listToDelete.id}`}
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
