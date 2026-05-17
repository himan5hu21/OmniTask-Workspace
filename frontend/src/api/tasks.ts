import {
  useMutation,
  useQuery,
  useQueryClient,
} from "@tanstack/react-query";
import { apiRequest } from "@/api/api";
import type { ApiSuccess } from "@/types/api";
import { useMemo } from "react";

// --- TYPES ---
export type TaskStatus = 'OPEN' | 'IN_PROGRESS' | 'COMPLETED' | 'BLOCKED' | 'CANCELLED';
export type TaskPriority = 'LOW' | 'MEDIUM' | 'HIGH' | 'URGENT';


export type TaskUser = {
  id: string;
  name: string;
  avatar_url?: string;
};

export type TaskAssignment = {
  user_id: string;
  user?: TaskUser;
  role: string;
};

export type TaskLabel = {
  id: string;
  name: string;
  color: string;
};

export type TaskChecklistItem = {
  id: string;
  text: string;
  is_completed: boolean;
  position: number;
  assignee?: TaskUser;
  subtask?: Task;
};

export type TaskChecklist = {
  id: string;
  name: string;
  position: number;
  assignee?: TaskUser;
  items?: TaskChecklistItem[];
};

export type TaskComment = {
  id: string;
  text: string;
  created_at: string;
  user?: TaskUser;
};

export type TaskAttachment = {
  id: string;
  file_name: string;
  file_url: string;
  file_size: number;
  mime_type: string;
  created_at: string;
  user?: TaskUser;
};

export type Task = {
  id: string;
  title: string;
  description?: string;
  status: TaskStatus;
  priority?: TaskPriority;
  start_date?: string;
  due_date?: string;
  completed_at?: string;
  position: number;
  list_id: string;
  parent_task_id?: string;
  channel_id: string;
  org_id: string;
  creator_id: string;
  cover_color?: string;
  created_at: string;
  updated_at: string;
  // Relations (simplified)
  creator?: TaskUser;
  assignments?: TaskAssignment[];
  labels?: { label: TaskLabel }[];
  checklists?: TaskChecklist[];
  attachments?: TaskAttachment[];
  comments?: TaskComment[];
  subtasks?: Task[];
  _count?: { comments: number };
};

export type BoardList = {
  id: string;
  name: string;
  position: number;
  channel_id: string;
  tasks?: Task[];
};

export type BoardResponse = ApiSuccess<{ lists: BoardList[] }>;
export type TaskResponse = ApiSuccess<Task>;
export type SuccessResponse = ApiSuccess<{ success: boolean }>;

// Input Types
export type CreateBoardListInput = { channel_id: string; name: string; position: number };
export type ReorderListsInput = { channel_id: string; items: { id: string; position: number }[] };
export type CreateTaskInput = { title: string; list_id: string; channel_id: string; org_id: string };
export type UpdateTaskInput = { title?: string; description?: string; status?: TaskStatus; priority?: TaskPriority | null; start_date?: string | null; due_date?: string | null; completed_at?: string | null; cover_color?: string };
export type MoveTaskInput = { target_list_id: string; position: number };
export type AssignUserInput = { user_id: string; role?: string };
export type CreateCommentInput = { content: string };
export type CreateChecklistInput = { title: string };
export type UpdateChecklistInput = {
  title?: string;
  assignee_id?: string | null;
};

export type AddChecklistItemInput = {
  text: string;
  position?: number;
};

export type UpdateChecklistItemInput = {
  text?: string;
  is_completed?: boolean;
  position?: number;
  assignee_id?: string | null;
};
export type CreateLabelInput = { org_id: string; name: string; color: string };
export type AssignLabelInput = { label_id: string };
export type CreateSubtaskInput = { title: string };

// --- KEYS ---

export const taskKeys = {
  all: ["tasks"] as const,
  boards: () => [...taskKeys.all, "boards"] as const,
  board: (channelId: string) => [...taskKeys.boards(), channelId] as const,
  details: () => [...taskKeys.all, "detail"] as const,
  detail: (taskId: string) => [...taskKeys.details(), taskId] as const,
  comments: (taskId: string) => [...taskKeys.detail(taskId), "comments"] as const,
  labels: (orgId: string) => ["labels", orgId] as const,
};

// --- SERVICE ---

export const taskService = {
  // Board & Lists
  getBoard: async (channelId: string): Promise<BoardResponse> => {
    return apiRequest.get<BoardResponse>(`/boards/${channelId}`);
  },
  createBoardList: async (data: CreateBoardListInput): Promise<ApiSuccess<BoardList>> => {
    return apiRequest.post<ApiSuccess<BoardList>>('/board-lists', data);
  },
  reorderLists: async (data: ReorderListsInput): Promise<SuccessResponse> => {
    return apiRequest.patch<SuccessResponse>('/board-lists/reorder', data);
  },
  updateBoardList: async (id: string, data: { name?: string; position?: number }): Promise<ApiSuccess<BoardList>> => {
    return apiRequest.patch<ApiSuccess<BoardList>>(`/board-lists/${id}`, data);
  },
  deleteBoardList: async (id: string): Promise<SuccessResponse> => {
    return apiRequest.delete<SuccessResponse>(`/board-lists/${id}`);
  },

  // Tasks
  createTask: async (data: CreateTaskInput): Promise<TaskResponse> => {
    return apiRequest.post<TaskResponse>('/tasks', data);
  },
  getTask: async (id: string): Promise<TaskResponse> => {
    return apiRequest.get<TaskResponse>(`/tasks/${id}`);
  },
  updateTask: async (id: string, data: UpdateTaskInput): Promise<TaskResponse> => {
    if ('title' in data || 'description' in data) {
      return apiRequest.patch<TaskResponse>(`/tasks/${id}/content`, {
        title: data.title,
        description: data.description,
      });
    }
    if ('status' in data) {
      return apiRequest.patch<TaskResponse>(`/tasks/${id}/status`, {
        status: data.status,
      });
    }
    return apiRequest.patch<TaskResponse>(`/tasks/${id}/manage`, {
      priority: data.priority,
      start_date: data.start_date,
      due_date: data.due_date,
      completed_at: data.completed_at,
      cover_color: data.cover_color,
    });
  },
  moveTask: async (id: string, data: MoveTaskInput): Promise<TaskResponse> => {
    return apiRequest.patch<TaskResponse>(`/tasks/${id}/move`, data);
  },
  deleteTask: async (id: string): Promise<SuccessResponse> => {
    return apiRequest.delete<SuccessResponse>(`/tasks/${id}`);
  },

  // Collaboration
  assignUser: async (id: string, data: AssignUserInput): Promise<ApiSuccess<TaskAssignment>> => {
    return apiRequest.post<ApiSuccess<TaskAssignment>>(`/tasks/${id}/assignments`, data);
  },
  unassignUser: async (id: string, userId: string): Promise<SuccessResponse> => {
    return apiRequest.delete<SuccessResponse>(`/tasks/${id}/assignments/${userId}`);
  },
  createComment: async (id: string, data: CreateCommentInput): Promise<ApiSuccess<TaskComment>> => {
    return apiRequest.post<ApiSuccess<TaskComment>>(`/tasks/${id}/comments`, data);
  },
  getComments: async (id: string): Promise<ApiSuccess<TaskComment[]>> => {
    return apiRequest.get<ApiSuccess<TaskComment[]>>(`/tasks/${id}/comments`);
  },

  // Checklists
  createChecklist: async (id: string, data: CreateChecklistInput): Promise<ApiSuccess<TaskChecklist>> => {
    return apiRequest.post<ApiSuccess<TaskChecklist>>(`/tasks/${id}/checklists`, data);
  },
  updateChecklist: async (id: string, data: { title?: string; assignee_id?: string | null }): Promise<ApiSuccess<TaskChecklist>> => {
    return apiRequest.patch<ApiSuccess<TaskChecklist>>(`/checklists/${id}`, data);
  },
  deleteChecklist: async (id: string): Promise<ApiSuccess<{ success: true }>> => {
    return apiRequest.delete<ApiSuccess<{ success: true }>>(`/checklists/${id}`);
  },
  addChecklistItem: async (checklistId: string, data: AddChecklistItemInput): Promise<ApiSuccess<TaskChecklistItem>> => {
    return apiRequest.post<ApiSuccess<TaskChecklistItem>>(`/checklists/${checklistId}/items`, data);
  },
  updateChecklistItem: async (itemId: string, data: UpdateChecklistItemInput & { assignee_id?: string | null }): Promise<ApiSuccess<TaskChecklistItem>> => {
    return apiRequest.patch<ApiSuccess<TaskChecklistItem>>(`/checklist-items/${itemId}`, data);
  },
  deleteChecklistItem: async (itemId: string): Promise<ApiSuccess<{ success: true }>> => {
    return apiRequest.delete<ApiSuccess<{ success: true }>>(`/checklist-items/${itemId}`);
  },

  // Labels
  createLabel: async (data: CreateLabelInput): Promise<ApiSuccess<TaskLabel>> => {
    return apiRequest.post<ApiSuccess<TaskLabel>>('/labels', data);
  },
  getOrgLabels: async (orgId: string): Promise<ApiSuccess<TaskLabel[]>> => {
    return apiRequest.get<ApiSuccess<TaskLabel[]>>(`/labels/${orgId}`);
  },
  deleteLabel: async (id: string): Promise<SuccessResponse> => {
    return apiRequest.delete<SuccessResponse>(`/labels/${id}`);
  },
  assignLabel: async (id: string, data: AssignLabelInput): Promise<ApiSuccess<unknown>> => {
    return apiRequest.post<ApiSuccess<unknown>>(`/tasks/${id}/labels`, data);
  },
  unassignLabel: async (id: string, labelId: string): Promise<SuccessResponse> => {
    return apiRequest.delete<SuccessResponse>(`/tasks/${id}/labels/${labelId}`);
  },

  // Attachments
  addAttachment: async (id: string, file: File): Promise<ApiSuccess<TaskAttachment>> => {
    const formData = new FormData();
    formData.append("files", file); // Backend expects 'files' or 'file'? 
    // Wait, in controller I used request.file(). request.file() handles the first file found.
    // multipart/form-data key doesn't strictly matter for request.file() usually, 
    // but often it's 'file' or 'files'.
    
    return apiRequest.post<ApiSuccess<TaskAttachment>>(`/tasks/${id}/attachments`, formData, {
      headers: { "Content-Type": "multipart/form-data" },
    });
  },
  deleteAttachment: async (id: string): Promise<SuccessResponse> => {
    return apiRequest.delete<SuccessResponse>(`/attachments/${id}`);
  },

  // Subtasks
  createSubtask: async (parentId: string, data: CreateSubtaskInput): Promise<TaskResponse> => {
    return apiRequest.post<TaskResponse>(`/tasks/${parentId}/subtasks`, data);
  },
};

// --- HOOKS ---

export const useBoard = (channelId: string, options?: { enabled?: boolean }) => {
  const query = useQuery({
    queryKey: taskKeys.board(channelId),
    queryFn: () => taskService.getBoard(channelId),
    enabled: (options?.enabled ?? true) && !!channelId,
    staleTime: 1000 * 60,
  });

  const lists = useMemo(() => query.data?.success ? query.data.data.lists : [], [query.data]);

  return {
    ...query,
    lists,
  };
};

export const useCreateBoardList = () => {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: taskService.createBoardList,
    onSuccess: (_, variables) => {
      queryClient.invalidateQueries({ queryKey: taskKeys.board(variables.channel_id) });
    },
  });
};

export const useReorderLists = () => {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: taskService.reorderLists,
    onSuccess: (_, variables) => {
      queryClient.invalidateQueries({ queryKey: taskKeys.board(variables.channel_id) });
    },
  });
};

export const useUpdateBoardList = (channelId: string) => {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: ({ id, data }: { id: string; data: { name?: string; position?: number } }) => 
      taskService.updateBoardList(id, data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: taskKeys.board(channelId) });
    },
  });
};

export const useDeleteBoardList = (channelId: string) => {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: taskService.deleteBoardList,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: taskKeys.board(channelId) });
    },
  });
};

export const useTask = (taskId: string, options?: { enabled?: boolean }) => {
  const query = useQuery({
    queryKey: taskKeys.detail(taskId),
    queryFn: () => taskService.getTask(taskId),
    enabled: (options?.enabled ?? true) && !!taskId,
    staleTime: 1000 * 30,
  });

  return {
    ...query,
    task: query.data?.success ? query.data.data : null,
  };
};

export const useCreateTask = (channelId: string) => {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: taskService.createTask,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: taskKeys.board(channelId) });
    },
  });
};

export const useUpdateTask = (channelId?: string, parentTaskId?: string) => {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: ({ id, data }: { id: string; data: UpdateTaskInput }) => taskService.updateTask(id, data),
    onSuccess: (data, variables) => {
      queryClient.invalidateQueries({ queryKey: taskKeys.detail(variables.id) });
      if (parentTaskId) queryClient.invalidateQueries({ queryKey: taskKeys.detail(parentTaskId) });
      if (channelId) queryClient.invalidateQueries({ queryKey: taskKeys.board(channelId) });
    },
  });
};

export const useMoveTask = (channelId: string) => {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: ({ id, data }: { id: string; data: MoveTaskInput }) => taskService.moveTask(id, data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: taskKeys.board(channelId) });
    },
  });
};

export const useDeleteTask = (channelId?: string, parentTaskId?: string) => {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: taskService.deleteTask,
    onSuccess: () => {
      if (parentTaskId) queryClient.invalidateQueries({ queryKey: taskKeys.detail(parentTaskId) });
      if (channelId) queryClient.invalidateQueries({ queryKey: taskKeys.board(channelId) });
    },
  });
};

export const useTaskComments = (taskId: string, options?: { enabled?: boolean }) => {
  const query = useQuery({
    queryKey: taskKeys.comments(taskId),
    queryFn: () => taskService.getComments(taskId),
    enabled: (options?.enabled ?? true) && !!taskId,
  });

  const comments = useMemo(() => query.data?.success ? query.data.data : [], [query.data]);

  return {
    ...query,
    comments,
  };
};

export const useCreateComment = () => {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: ({ id, data }: { id: string; data: CreateCommentInput }) => taskService.createComment(id, data),
    onSuccess: (_, variables) => {
      queryClient.invalidateQueries({ queryKey: taskKeys.comments(variables.id) });
      queryClient.invalidateQueries({ queryKey: taskKeys.detail(variables.id) }); // Update count
    },
  });
};

export const useCreateChecklist = () => {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: ({ id, data }: { id: string; data: CreateChecklistInput }) => taskService.createChecklist(id, data),
    onSuccess: (_, variables) => {
      queryClient.invalidateQueries({ queryKey: taskKeys.detail(variables.id) });
    },
  });
};

export const useUpdateChecklist = (taskId: string) => {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: ({ id, data }: { id: string; data: { title?: string; assignee_id?: string | null } }) => 
      taskService.updateChecklist(id, data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: taskKeys.detail(taskId) });
    },
  });
};

export const useDeleteChecklist = (taskId: string) => {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (id: string) => taskService.deleteChecklist(id),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: taskKeys.detail(taskId) });
    },
  });
};

export const useAddChecklistItem = (taskId: string) => {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: ({ checklistId, data }: { checklistId: string; data: AddChecklistItemInput }) => taskService.addChecklistItem(checklistId, data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: taskKeys.detail(taskId) });
    },
  });
};

export const useUpdateChecklistItem = (taskId: string) => {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: ({ itemId, data }: { itemId: string; data: UpdateChecklistItemInput }) => taskService.updateChecklistItem(itemId, data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: taskKeys.detail(taskId) });
    },
  });
};

export const useDeleteChecklistItem = (taskId: string) => {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (itemId: string) => taskService.deleteChecklistItem(itemId),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: taskKeys.detail(taskId) });
    },
  });
};

export const useAssignUser = (taskId: string) => {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: ({ id, data }: { id: string; data: AssignUserInput }) => taskService.assignUser(id, data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: taskKeys.detail(taskId) });
    },
  });
};

export const useUnassignUser = (taskId: string) => {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: ({ id, userId }: { id: string; userId: string }) => taskService.unassignUser(id, userId),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: taskKeys.detail(taskId) });
    },
  });
};

export const useAssignLabel = (taskId: string) => {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: ({ id, data }: { id: string; data: AssignLabelInput }) => taskService.assignLabel(id, data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: taskKeys.detail(taskId) });
    },
  });
};

export const useUnassignLabel = (taskId: string) => {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: ({ id, labelId }: { id: string; labelId: string }) => taskService.unassignLabel(id, labelId),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: taskKeys.detail(taskId) });
    },
  });
};

export const useLabels = (orgId: string, options?: { enabled?: boolean }) => {
  const query = useQuery({
    queryKey: taskKeys.labels(orgId),
    queryFn: () => taskService.getOrgLabels(orgId),
    enabled: (options?.enabled ?? true) && !!orgId,
  });

  const labels = useMemo(() => query.data?.success ? query.data.data : [], [query.data]);

  return {
    ...query,
    labels,
  };
};

export const useCreateLabel = (orgId: string) => {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: taskService.createLabel,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: taskKeys.labels(orgId) });
    },
  });
};

export const useDeleteLabel = (orgId: string) => {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: taskService.deleteLabel,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: taskKeys.labels(orgId) });
    },
  });
};

export const useCreateSubtask = (taskId: string) => {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: ({ parentId, data }: { parentId: string; data: CreateSubtaskInput }) => taskService.createSubtask(parentId, data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: taskKeys.detail(taskId) });
    },
  });
};

export const useAddAttachment = (taskId: string) => {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: ({ id, file }: { id: string; file: File }) => taskService.addAttachment(id, file),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: taskKeys.detail(taskId) });
    },
  });
};


export const useDeleteAttachment = (taskId: string) => {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (id: string) => taskService.deleteAttachment(id),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: taskKeys.detail(taskId) });
    },
  });
};
