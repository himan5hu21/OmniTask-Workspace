"use client";

import { useState, useMemo } from "react";
import dynamic from "next/dynamic";
import {
  CheckSquare,
  ClipboardList,
  ListChecks,
  SquareCheck,
  AlertCircle,
  ChevronDown,
  ChevronRight,
  RefreshCw,
  ExternalLink,
  Circle,
  CheckCircle2,
  Clock,
  Ban,
  Loader2,
} from "lucide-react";
import { cn } from "@/lib/utils";
import {
  useMyTasks,
  MyTaskDirectCard,
  MyTaskSubtask,
  MyTaskChecklist,
  MyTaskChecklistItem,
  TaskStatus,
  TaskPriority,
} from "@/api/tasks";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";

const TaskDetailDialog = dynamic(
  () =>
    import("@/components/tasks/task-detail-dialog").then(
      (m) => m.TaskDetailDialog
    ),
  { ssr: false }
);

// ─── Constants ───────────────────────────────────────────────────────────────

const STATUS_CONFIG: Record<
  TaskStatus,
  { label: string; icon: React.ReactNode; color: string }
> = {
  OPEN: {
    label: "Open",
    icon: <Circle className="h-3.5 w-3.5" />,
    color: "text-slate-400",
  },
  IN_PROGRESS: {
    label: "In Progress",
    icon: <Loader2 className="h-3.5 w-3.5 animate-spin" />,
    color: "text-blue-400",
  },
  COMPLETED: {
    label: "Done",
    icon: <CheckCircle2 className="h-3.5 w-3.5" />,
    color: "text-emerald-400",
  },
  BLOCKED: {
    label: "Blocked",
    icon: <Ban className="h-3.5 w-3.5" />,
    color: "text-red-400",
  },
  CANCELLED: {
    label: "Cancelled",
    icon: <Ban className="h-3.5 w-3.5" />,
    color: "text-muted-foreground",
  },
};

const PRIORITY_CONFIG: Record<
  TaskPriority,
  { label: string; color: string; dot: string }
> = {
  LOW: { label: "Low", color: "text-slate-400", dot: "bg-slate-400" },
  MEDIUM: { label: "Medium", color: "text-yellow-400", dot: "bg-yellow-400" },
  HIGH: { label: "High", color: "text-orange-400", dot: "bg-orange-400" },
  URGENT: { label: "Urgent", color: "text-red-400", dot: "bg-red-400" },
};

// ─── Utility ─────────────────────────────────────────────────────────────────

function formatDate(date?: string): string | null {
  if (!date) return null;
  const d = new Date(date);
  const now = new Date();
  const diff = Math.ceil((d.getTime() - now.getTime()) / (1000 * 60 * 60 * 24));
  if (diff < 0) return `Overdue by ${Math.abs(diff)}d`;
  if (diff === 0) return "Due today";
  if (diff === 1) return "Due tomorrow";
  return `Due ${d.toLocaleDateString("en-US", { month: "short", day: "numeric" })}`;
}

function isOverdue(date?: string): boolean {
  if (!date) return false;
  return new Date(date) < new Date();
}

// ─── Section Header ───────────────────────────────────────────────────────────

function SectionHeader({
  icon,
  title,
  count,
  expanded,
  onToggle,
  accent,
}: {
  icon: React.ReactNode;
  title: string;
  count: number;
  expanded: boolean;
  onToggle: () => void;
  accent: string;
}) {
  return (
    <button
      onClick={onToggle}
      className="group flex w-full items-center gap-3 rounded-xl px-4 py-3 transition-all hover:bg-muted/40"
    >
      <div className={cn("flex h-8 w-8 items-center justify-center rounded-lg", accent)}>
        {icon}
      </div>
      <span className="flex-1 text-left text-sm font-semibold text-foreground">{title}</span>
      <Badge variant="secondary" className="rounded-full px-2 py-0.5 text-xs tabular-nums">
        {count}
      </Badge>
      <span className="text-muted-foreground transition-transform">
        {expanded ? (
          <ChevronDown className="h-4 w-4" />
        ) : (
          <ChevronRight className="h-4 w-4" />
        )}
      </span>
    </button>
  );
}

// ─── Task Row ─────────────────────────────────────────────────────────────────

function TaskRow({
  title,
  status,
  priority,
  dueDate,
  badge,
  badgeColor,
  onClick,
  strikethrough,
}: {
  title: string;
  status: TaskStatus;
  priority?: TaskPriority;
  dueDate?: string;
  badge?: string;
  badgeColor?: string;
  onClick?: () => void;
  strikethrough?: boolean;
}) {
  const statusCfg = STATUS_CONFIG[status];
  const priorityCfg = priority ? PRIORITY_CONFIG[priority] : null;
  const dateLabel = formatDate(dueDate);
  const overdue = isOverdue(dueDate) && status !== "COMPLETED" && status !== "CANCELLED";

  return (
    <div
      role={onClick ? "button" : undefined}
      tabIndex={onClick ? 0 : undefined}
      onClick={onClick}
      onKeyDown={(e) => e.key === "Enter" && onClick?.()}
      className={cn(
        "group flex items-center gap-3 rounded-lg border border-transparent px-4 py-3",
        "bg-card/60 backdrop-blur-sm",
        "transition-all duration-150",
        onClick && "cursor-pointer hover:border-border/60 hover:bg-muted/30 hover:shadow-sm active:scale-[0.995]"
      )}
    >
      <span className={cn("shrink-0", statusCfg.color)}>{statusCfg.icon}</span>

      <span
        className={cn(
          "flex-1 truncate text-sm text-foreground",
          strikethrough && "line-through text-muted-foreground"
        )}
      >
        {title}
      </span>

      <div className="flex shrink-0 items-center gap-2">
        {priorityCfg && (
          <span className={cn("flex items-center gap-1 text-xs", priorityCfg.color)}>
            <span className={cn("h-1.5 w-1.5 rounded-full", priorityCfg.dot)} />
            {priorityCfg.label}
          </span>
        )}
        {dateLabel && (
          <span
            className={cn(
              "flex items-center gap-1 text-xs",
              overdue ? "text-red-400" : "text-muted-foreground"
            )}
          >
            <Clock className="h-3 w-3" />
            {dateLabel}
          </span>
        )}
        {badge && (
          <Badge
            variant="outline"
            className={cn("max-w-[160px] truncate rounded-full px-2 py-0.5 text-xs", badgeColor)}
          >
            {badge}
          </Badge>
        )}
        {onClick && (
          <ExternalLink className="h-3.5 w-3.5 text-muted-foreground opacity-0 transition-opacity group-hover:opacity-100" />
        )}
      </div>
    </div>
  );
}

// ─── Empty Section ────────────────────────────────────────────────────────────

function EmptySection({ message }: { message: string }) {
  return <p className="px-4 py-3 text-sm text-muted-foreground">{message}</p>;
}

// ─── Loading Skeleton ─────────────────────────────────────────────────────────

function LoadingSkeleton() {
  return (
    <div className="space-y-6 p-4">
      {[1, 2, 3].map((i) => (
        <div key={i} className="space-y-2">
          <Skeleton className="h-10 w-48 rounded-xl" />
          {[1, 2, 3].map((j) => (
            <Skeleton key={j} className="h-12 w-full rounded-lg" />
          ))}
        </div>
      ))}
    </div>
  );
}

// ─── Stats Bar ────────────────────────────────────────────────────────────────

function StatPill({
  icon,
  label,
  count,
  color,
}: {
  icon: React.ReactNode;
  label: string;
  count: number;
  color: string;
}) {
  return (
    <div className={cn("flex items-center gap-2", color)}>
      {icon}
      <span className="text-sm font-medium text-foreground">{count}</span>
      <span className="text-xs text-muted-foreground">{label}</span>
    </div>
  );
}

function StatsBar({
  directTasks,
  subtasks,
  checklists,
  checklistItems,
}: {
  directTasks: number;
  subtasks: number;
  checklists: number;
  checklistItems: number;
}) {
  const total = directTasks + subtasks + checklists + checklistItems;
  return (
    <div className="flex flex-wrap items-center gap-4 rounded-2xl border border-border/60 bg-card/40 px-5 py-4 backdrop-blur-sm">
      <div className="flex flex-col items-center">
        <span className="text-2xl font-bold tracking-tight text-foreground">{total}</span>
        <span className="text-xs text-muted-foreground">Total</span>
      </div>
      <div className="h-8 w-px bg-border/60" />
      <StatPill icon={<ClipboardList className="h-4 w-4" />} label="Cards" count={directTasks} color="text-violet-400" />
      <StatPill icon={<ListChecks className="h-4 w-4" />} label="Subtasks" count={subtasks} color="text-blue-400" />
      <StatPill icon={<CheckSquare className="h-4 w-4" />} label="Checklists" count={checklists} color="text-emerald-400" />
      <StatPill icon={<SquareCheck className="h-4 w-4" />} label="Items" count={checklistItems} color="text-amber-400" />
    </div>
  );
}

// ─── Filter Bar ───────────────────────────────────────────────────────────────

type FilterStatus = "all" | "active" | "completed";

function FilterBar({
  value,
  onChange,
}: {
  value: FilterStatus;
  onChange: (v: FilterStatus) => void;
}) {
  const options: { value: FilterStatus; label: string }[] = [
    { value: "all", label: "All" },
    { value: "active", label: "Active" },
    { value: "completed", label: "Completed" },
  ];
  return (
    <div className="flex items-center gap-1 rounded-xl border border-border/60 bg-muted/30 p-1">
      {options.map((opt) => (
        <button
          key={opt.value}
          onClick={() => onChange(opt.value)}
          className={cn(
            "rounded-lg px-3 py-1.5 text-xs font-medium transition-all",
            value === opt.value
              ? "bg-background text-foreground shadow-sm"
              : "text-muted-foreground hover:text-foreground"
          )}
        >
          {opt.label}
        </button>
      ))}
    </div>
  );
}

// ─── Main Component ───────────────────────────────────────────────────────────

interface MyTasksViewProps {
  /** When provided, scopes tasks to that org workspace */
  orgId?: string;
  /** Title shown at the top of the page */
  title?: string;
}

export function MyTasksView({ orgId, title = "My Tasks" }: MyTasksViewProps) {
  const { directTasks, subtasks, checklists, checklistItems, isLoading, isError, refetch } =
    useMyTasks(orgId);

  const [expandedSections, setExpandedSections] = useState({
    cards: true,
    subtasks: true,
    checklists: true,
    checklistItems: true,
  });

  const [filter, setFilter] = useState<FilterStatus>("all");

  // Task detail dialog state
  const [dialogState, setDialogState] = useState<{
    open: boolean;
    taskId: string;
    channelId: string;
  }>({ open: false, taskId: "", channelId: "" });

  function openTask(taskId: string, channelId: string) {
    setDialogState({ open: true, taskId, channelId });
  }

  function toggleSection(key: keyof typeof expandedSections) {
    setExpandedSections((prev) => ({ ...prev, [key]: !prev[key] }));
  }

  // ── Filtering ──────────────────────────────────────────────────────────────

  const filterFn = useMemo(() => {
    if (filter === "all") return (_: TaskStatus) => true;
    if (filter === "completed")
      return (s: TaskStatus) => s === "COMPLETED" || s === "CANCELLED";
    return (s: TaskStatus) => s !== "COMPLETED" && s !== "CANCELLED";
  }, [filter]);

  const filteredCards = useMemo(
    () => directTasks.filter((t) => filterFn(t.status)),
    [directTasks, filterFn]
  );
  const filteredSubtasks = useMemo(
    () => subtasks.filter((t) => filterFn(t.status)),
    [subtasks, filterFn]
  );
  const filteredChecklists = useMemo(
    () => checklists.filter((c) => filterFn(c.task.status)),
    [checklists, filterFn]
  );
  const filteredChecklistItems = useMemo(
    () =>
      checklistItems.filter((i) => {
        const effectiveStatus: TaskStatus = i.is_completed
          ? "COMPLETED"
          : i.checklist.task.status;
        return filterFn(effectiveStatus);
      }),
    [checklistItems, filterFn]
  );

  if (isLoading) return <LoadingSkeleton />;

  if (isError) {
    return (
      <div className="flex min-h-[40vh] flex-col items-center justify-center gap-4 text-center">
        <AlertCircle className="h-10 w-10 text-destructive" />
        <div>
          <p className="font-semibold text-foreground">Failed to load tasks</p>
          <p className="text-sm text-muted-foreground">Something went wrong. Please try again.</p>
        </div>
        <Button variant="outline" size="sm" onClick={() => refetch()}>
          <RefreshCw className="mr-2 h-4 w-4" />
          Retry
        </Button>
      </div>
    );
  }

  const isEmpty =
    directTasks.length + subtasks.length + checklists.length + checklistItems.length === 0;

  return (
    <div className="flex h-full flex-col gap-6 overflow-y-auto p-6">
      {/* ── Header ── */}
      <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <div className="flex flex-col gap-1">
          <h1 className="text-2xl font-bold tracking-tight text-foreground">{title}</h1>
          <p className="text-sm text-muted-foreground">
            Tasks, subtasks, checklists &amp; items assigned to you
          </p>
        </div>
        <div className="flex items-center gap-2">
          <FilterBar value={filter} onChange={setFilter} />
          <Button
            variant="ghost"
            size="icon"
            className="h-8 w-8 rounded-lg"
            onClick={() => refetch()}
            title="Refresh"
          >
            <RefreshCw className="h-4 w-4" />
          </Button>
        </div>
      </div>

      {/* ── Stats ── */}
      {!isEmpty && (
        <StatsBar
          directTasks={directTasks.length}
          subtasks={subtasks.length}
          checklists={checklists.length}
          checklistItems={checklistItems.length}
        />
      )}

      {/* ── Empty State ── */}
      {isEmpty && (
        <div className="flex min-h-[40vh] flex-col items-center justify-center gap-4 text-center">
          <div className="flex h-20 w-20 items-center justify-center rounded-full bg-muted/40">
            <ClipboardList className="h-10 w-10 text-muted-foreground" />
          </div>
          <div>
            <p className="text-lg font-semibold text-foreground">Nothing assigned to you</p>
            <p className="mt-1 text-sm text-muted-foreground">
              When someone assigns you a task, checklist, or item, it will appear here.
            </p>
          </div>
        </div>
      )}

      {/* ── Sections ── */}
      {!isEmpty && (
        <div className="flex flex-col gap-3">
          {/* Section 1: Direct Task Cards */}
          <div className="rounded-2xl border border-border/60 bg-card/30 p-1">
            <SectionHeader
              icon={<ClipboardList className="h-4 w-4 text-violet-400" />}
              title="Task Cards"
              count={filteredCards.length}
              expanded={expandedSections.cards}
              onToggle={() => toggleSection("cards")}
              accent="bg-violet-500/10"
            />
            {expandedSections.cards && (
              <div className="flex flex-col gap-1 px-2 pb-2">
                {filteredCards.length === 0 ? (
                  <EmptySection message="No task cards match the current filter." />
                ) : (
                  filteredCards.map((task: MyTaskDirectCard) => (
                    <TaskRow
                      key={task.id}
                      title={task.title}
                      status={task.status}
                      priority={task.priority}
                      dueDate={task.due_date}
                      badge={
                        task._count.subtasks > 0
                          ? `${task._count.subtasks} subtask${task._count.subtasks > 1 ? "s" : ""}`
                          : undefined
                      }
                      badgeColor="text-muted-foreground"
                      onClick={() => openTask(task.id, task.channel_id)}
                      strikethrough={task.status === "COMPLETED" || task.status === "CANCELLED"}
                    />
                  ))
                )}
              </div>
            )}
          </div>

          {/* Section 2: Subtasks */}
          <div className="rounded-2xl border border-border/60 bg-card/30 p-1">
            <SectionHeader
              icon={<ListChecks className="h-4 w-4 text-blue-400" />}
              title="Subtasks"
              count={filteredSubtasks.length}
              expanded={expandedSections.subtasks}
              onToggle={() => toggleSection("subtasks")}
              accent="bg-blue-500/10"
            />
            {expandedSections.subtasks && (
              <div className="flex flex-col gap-1 px-2 pb-2">
                {filteredSubtasks.length === 0 ? (
                  <EmptySection message="No subtasks match the current filter." />
                ) : (
                  filteredSubtasks.map((subtask: MyTaskSubtask) => (
                    <TaskRow
                      key={subtask.id}
                      title={subtask.title}
                      status={subtask.status}
                      priority={subtask.priority}
                      dueDate={subtask.due_date}
                      badge={subtask.parent_task.title}
                      badgeColor="text-blue-400/80 border-blue-400/30"
                      onClick={() =>
                        openTask(subtask.parent_task.id, subtask.parent_task.channel_id)
                      }
                      strikethrough={subtask.status === "COMPLETED" || subtask.status === "CANCELLED"}
                    />
                  ))
                )}
              </div>
            )}
          </div>

          {/* Section 3: Checklists */}
          <div className="rounded-2xl border border-border/60 bg-card/30 p-1">
            <SectionHeader
              icon={<CheckSquare className="h-4 w-4 text-emerald-400" />}
              title="Checklists"
              count={filteredChecklists.length}
              expanded={expandedSections.checklists}
              onToggle={() => toggleSection("checklists")}
              accent="bg-emerald-500/10"
            />
            {expandedSections.checklists && (
              <div className="flex flex-col gap-1 px-2 pb-2">
                {filteredChecklists.length === 0 ? (
                  <EmptySection message="No checklists match the current filter." />
                ) : (
                  filteredChecklists.map((cl: MyTaskChecklist) => (
                    <TaskRow
                      key={cl.id}
                      title={cl.name}
                      status={cl.task.status}
                      priority={cl.task.priority}
                      dueDate={cl.task.due_date}
                      badge={`in "${cl.task.title}"`}
                      badgeColor="text-emerald-400/80 border-emerald-400/30"
                      onClick={() => openTask(cl.task.id, cl.task.channel_id)}
                    />
                  ))
                )}
              </div>
            )}
          </div>

          {/* Section 4: Checklist Items */}
          <div className="rounded-2xl border border-border/60 bg-card/30 p-1">
            <SectionHeader
              icon={<SquareCheck className="h-4 w-4 text-amber-400" />}
              title="Checklist Items"
              count={filteredChecklistItems.length}
              expanded={expandedSections.checklistItems}
              onToggle={() => toggleSection("checklistItems")}
              accent="bg-amber-500/10"
            />
            {expandedSections.checklistItems && (
              <div className="flex flex-col gap-1 px-2 pb-2">
                {filteredChecklistItems.length === 0 ? (
                  <EmptySection message="No checklist items match the current filter." />
                ) : (
                  filteredChecklistItems.map((item: MyTaskChecklistItem) => (
                    <TaskRow
                      key={item.id}
                      title={item.text}
                      status={item.is_completed ? "COMPLETED" : item.checklist.task.status}
                      priority={item.checklist.task.priority}
                      dueDate={item.checklist.task.due_date}
                      badge={`${item.checklist.name} → "${item.checklist.task.title}"`}
                      badgeColor="text-amber-400/80 border-amber-400/30"
                      onClick={() =>
                        openTask(item.checklist.task.id, item.checklist.task.channel_id)
                      }
                      strikethrough={item.is_completed}
                    />
                  ))
                )}
              </div>
            )}
          </div>
        </div>
      )}

      {/* ── Task Detail Dialog ── */}
      {dialogState.taskId && dialogState.channelId && (
        <TaskDetailDialog
          taskId={dialogState.taskId}
          channelId={dialogState.channelId}
          open={dialogState.open}
          onOpenChange={(open) =>
            setDialogState((prev) => ({ ...prev, open }))
          }
        />
      )}
    </div>
  );
}
