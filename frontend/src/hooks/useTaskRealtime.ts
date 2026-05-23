"use client";

import { useEffect, useMemo, useRef, type RefObject } from "react";
import { useQueryClient } from "@tanstack/react-query";
import { joinChannelRoom, leaveChannelRoom } from "@/socket/socket";
import { taskKeys, type TaskComment, type TaskActivity } from "@/api/tasks";

type TaskRefreshScope = "board" | "task" | "comments" | "task+comments";

type TaskRefreshPayload = {
  channelId: string;
  scope: TaskRefreshScope;
  taskId?: string;
  parentTaskId?: string;
  listId?: string;
  reason: string;
  actorUserId: string;
  timestamp: string;
};

type TaskCommentCreatedPayload = {
  channelId: string;
  taskId: string;
  actorUserId: string;
  timestamp: string;
  comment: TaskComment;
};

type TaskActivityCreatedPayload = {
  channelId: string;
  taskId: string;
  actorUserId: string;
  timestamp: string;
  activity: TaskActivity;
};

type TaskDeletedPayload = {
  channelId: string;
  taskId: string;
  listId?: string;
  parentTaskId?: string;
  actorUserId: string;
  timestamp: string;
};

type TaskMovedPayload = {
  channelId: string;
  taskId: string;
  sourceListId: string;
  targetListId: string;
  position: number;
  actorUserId: string;
  timestamp: string;
};

type BoardListsReorderedPayload = {
  channelId: string;
  actorUserId: string;
  timestamp: string;
  items: { id: string; position: number }[];
};

type UseTaskRealtimeOptions = {
  userId?: string;
  activeTaskIdRef?: RefObject<string | null>;
  openDialogRef?: RefObject<boolean>;
  isDraggingRef?: RefObject<boolean>;
  pendingBoardRefreshRef?: RefObject<boolean>;
  pendingTaskRefreshRef?: RefObject<Set<string>>;
  dirtyFieldsRef?: RefObject<Record<string, boolean>>;
  onTaskDeleted?: (payload: TaskDeletedPayload) => void;
};

export function useTaskRealtime(channelId: string, options: UseTaskRealtimeOptions = {}) {
  const {
    userId,
    activeTaskIdRef,
    openDialogRef,
    isDraggingRef,
    pendingBoardRefreshRef,
    pendingTaskRefreshRef,
    onTaskDeleted,
  } = options;
  const queryClient = useQueryClient();
  const boardTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const taskTimersRef = useRef<Map<string, ReturnType<typeof setTimeout>>>(new Map());

  const localIsDraggingRef = useRef(false);
  const effectiveIsDraggingRef = isDraggingRef ?? localIsDraggingRef;

  const localPendingBoardRefreshRef = useRef(false);
  const effectivePendingBoardRefreshRef = pendingBoardRefreshRef ?? localPendingBoardRefreshRef;

  const localPendingTaskRefreshRef = useRef(new Set<string>());
  const effectivePendingTaskRefreshRef = pendingTaskRefreshRef ?? localPendingTaskRefreshRef;

  const debouncedRefreshBoard = useMemo(
    () => () => {
      if (boardTimerRef.current) clearTimeout(boardTimerRef.current);
      boardTimerRef.current = setTimeout(() => {
        void queryClient.invalidateQueries({ queryKey: taskKeys.board(channelId) });
        void queryClient.invalidateQueries({ queryKey: [...taskKeys.all, "list"] });
      }, 300);
    },
    [channelId, queryClient]
  );

  const debouncedRefreshTask = useMemo(
    () => (taskId: string, includeComments = false) => {
      const existing = taskTimersRef.current.get(taskId);
      if (existing) clearTimeout(existing);
      const timer = setTimeout(() => {
        void queryClient.invalidateQueries({ queryKey: taskKeys.detail(taskId) });
        if (includeComments) {
          void queryClient.invalidateQueries({ queryKey: taskKeys.comments(taskId) });
        }
        taskTimersRef.current.delete(taskId);
      }, 200);
      taskTimersRef.current.set(taskId, timer);
    },
    [queryClient]
  );

  const flushPendingRefreshes = () => {
    if (effectivePendingBoardRefreshRef.current) {
      effectivePendingBoardRefreshRef.current = false;
      debouncedRefreshBoard();
    }

    if (effectivePendingTaskRefreshRef.current.size > 0) {
      Array.from(effectivePendingTaskRefreshRef.current).forEach((taskId) => debouncedRefreshTask(taskId));
      effectivePendingTaskRefreshRef.current.clear();
    }
  };

  useEffect(() => {
    if (!channelId || !userId) return;

    const socket = joinChannelRoom(channelId, userId);
    if (!socket) return;

    const handleRefresh = (payload: TaskRefreshPayload) => {
      if (payload.channelId !== channelId) return;
      if (payload.actorUserId === userId) return;

      if (payload.scope === "board") {
        if (effectiveIsDraggingRef.current) {
          effectivePendingBoardRefreshRef.current = true;
          return;
        }
        debouncedRefreshBoard();
        return;
      }

      if (payload.taskId) {
        if (effectiveIsDraggingRef.current && (payload.scope === "task" || payload.scope === "task+comments")) {
          effectivePendingTaskRefreshRef.current.add(payload.taskId);
          return;
        }

        const isActiveTask = activeTaskIdRef?.current === payload.taskId && openDialogRef?.current;
        if (isActiveTask || payload.scope === "task" || payload.scope === "task+comments") {
          debouncedRefreshTask(payload.taskId, payload.scope === "task+comments" || payload.scope === "comments");
        }
      }

      if (payload.parentTaskId && activeTaskIdRef?.current === payload.parentTaskId && openDialogRef?.current) {
        debouncedRefreshTask(payload.parentTaskId, payload.scope === "task+comments");
      }
    };

    const handleCommentCreated = (payload: TaskCommentCreatedPayload) => {
      if (payload.channelId !== channelId) return;
      if (payload.actorUserId === userId) return;

      queryClient.setQueryData(taskKeys.comments(payload.taskId), (existing: unknown) => {
        const current = existing as { success?: boolean; data?: TaskComment[] } | undefined;
        const currentComments = current?.data ?? [];
        if (currentComments.some((comment) => comment.id === payload.comment.id)) return existing;
        if (!current?.success) return existing;
        return {
          ...current,
          data: [...currentComments, payload.comment],
        };
      });

      queryClient.setQueryData(taskKeys.detail(payload.taskId), (existing: unknown) => {
        const current = existing as { success?: boolean; data?: { _count?: { comments: number } } } | undefined;
        if (!current?.success || !current.data) return existing;
        return {
          ...current,
          data: {
            ...current.data,
            _count: {
              comments: (current.data._count?.comments ?? 0) + 1,
            },
          },
        };
      });
    };

    const handleActivityCreated = (payload: TaskActivityCreatedPayload) => {
      if (payload.channelId !== channelId) return;
      if (payload.actorUserId === userId) return;

      queryClient.setQueryData(taskKeys.activities(payload.taskId), (existing: unknown) => {
        const current = existing as { success?: boolean; data?: { data: TaskActivity[] } } | undefined;
        if (!current?.success || !current.data) return existing;
        const currentActivities = current.data.data ?? [];
        if (currentActivities.some((act) => act.id === payload.activity.id)) return existing;
        return {
          ...current,
          data: {
            ...current.data,
            data: [payload.activity, ...currentActivities],
          },
        };
      });
    };

    const handleTaskDeleted = (payload: TaskDeletedPayload) => {
      if (payload.channelId !== channelId) return;
      if (payload.actorUserId === userId) return;
      onTaskDeleted?.(payload);
      void queryClient.invalidateQueries({ queryKey: taskKeys.board(channelId) });
      void queryClient.invalidateQueries({ queryKey: [...taskKeys.all, "list"] });
      if (payload.parentTaskId) {
        debouncedRefreshTask(payload.parentTaskId);
      }
    };

    const handleTaskMoved = (payload: TaskMovedPayload) => {
      if (payload.channelId !== channelId) return;
      if (payload.actorUserId === userId) return;
      if (effectiveIsDraggingRef.current) {
        effectivePendingBoardRefreshRef.current = true;
        return;
      }
      debouncedRefreshBoard();
    };

    const handleBoardListsReordered = (payload: BoardListsReorderedPayload) => {
      if (payload.channelId !== channelId) return;
      if (payload.actorUserId === userId) return;
      if (effectiveIsDraggingRef.current) {
        effectivePendingBoardRefreshRef.current = true;
        return;
      }
      debouncedRefreshBoard();
    };

    socket.on("channel:task_refresh", handleRefresh);
    socket.on("channel:task_comment_created", handleCommentCreated);
    socket.on("channel:task_activity_created", handleActivityCreated);
    socket.on("channel:task_deleted", handleTaskDeleted);
    socket.on("channel:task_moved", handleTaskMoved);
    socket.on("channel:board_lists_reordered", handleBoardListsReordered);

    const activeBoardTimer = boardTimerRef.current;
    const activeTaskTimers = taskTimersRef.current;

    return () => {
      socket.off("channel:task_refresh", handleRefresh);
      socket.off("channel:task_comment_created", handleCommentCreated);
      socket.off("channel:task_activity_created", handleActivityCreated);
      socket.off("channel:task_deleted", handleTaskDeleted);
      socket.off("channel:task_moved", handleTaskMoved);
      socket.off("channel:board_lists_reordered", handleBoardListsReordered);
      leaveChannelRoom(channelId, userId);

      if (activeBoardTimer) clearTimeout(activeBoardTimer);
      activeTaskTimers.forEach((timer) => clearTimeout(timer));
      activeTaskTimers.clear();
    };
  }, [
    channelId,
    debouncedRefreshBoard,
    debouncedRefreshTask,
    effectiveIsDraggingRef,
    effectivePendingBoardRefreshRef,
    effectivePendingTaskRefreshRef,
    queryClient,
    userId,
    activeTaskIdRef,
    openDialogRef,
    onTaskDeleted,
  ]);

  return {
    flushPendingRefreshes,
  };
}
