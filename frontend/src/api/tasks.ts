import {
  useMutation,
  useQuery,
  useQueryClient,
} from "@tanstack/react-query";
import { apiRequest } from "@/api/api";
import type { ApiSuccess } from "@/types/api";

// --- TYPES ---

export type TaskUser = {
  id: string;
  name: string;
  avatar_url?: string;
};

export type TaskAssignment = {
  id: string;
  user_id: string;
  user?: TaskUser;
};

export type TaskLabel = {
  id: string;
  name: string;
  color: string;
};

export type TaskChecklistItem = {
  id: string;
  title: string;
  is_completed: boolean;
  position: number;
};

export type TaskChecklist = {
  id: string;
  name: string;
  position: number;
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
  status: string;
  priority: string;
  due_date?: string;
  position: number;
  list_id: string;
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
export type UpdateTaskInput = { title?: string; description?: string; status?: string; priority?: string; due_date?: string; cover_color?: string };
export type MoveTaskInput = { target_list_id: string; position: number };
export type AssignUserInput = { user_id: string };
export type CreateCommentInput = { content: string };
export type CreateChecklistInput = { title: string };
export type AddChecklistItemInput = { title: string; position?: number };
export type UpdateChecklistItemInput = { title?: string; is_completed?: boolean; position?: number };
export type CreateLabelInput = { org_id: string; name: string; color: string };
export type AssignLabelInput = { label_id: string };
export type AddAttachmentInput = { name: string; url: string; file_type: string; file_size: number };
export type CreateSubtaskInput = { title: string };

// --- KEYS ---

export const taskKeys = {
  all: ["tasks"] as const,
  boards: () => [...taskKeys.all, "boards"] as const,
  board: (channelId: string) => [...taskKeys.boards(), channelId] as const,
  details: () => [...taskKeys.all, "detail"] as const,
  detail: (taskId: string) => [...taskKeys.details(), taskId] as const,
  comments: (taskId: string) => [...taskKeys.detail(taskId), "comments"] as const,
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

  // Tasks
  createTask: async (data: CreateTaskInput): Promise<TaskResponse> => {
    return apiRequest.post<TaskResponse>('/tasks', data);
  },
  getTask: async (id: string): Promise<TaskResponse> => {
    return apiRequest.get<TaskResponse>(`/tasks/${id}`);
  },
  updateTask: async (id: string, data: UpdateTaskInput): Promise<TaskResponse> => {
    return apiRequest.patch<TaskResponse>(`/tasks/${id}`, data);
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
  updateChecklist: async (id: string, data: { title: string }): Promise<ApiSuccess<TaskChecklist>> => {
    return apiRequest.patch<ApiSuccess<TaskChecklist>>(`/checklists/${id}`, data);
  },
  deleteChecklist: async (id: string): Promise<ApiSuccess<{ success: true }>> => {
    return apiRequest.delete<ApiSuccess<{ success: true }>>(`/checklists/${id}`);
  },
  addChecklistItem: async (checklistId: string, data: AddChecklistItemInput): Promise<ApiSuccess<TaskChecklistItem>> => {
    return apiRequest.post<ApiSuccess<TaskChecklistItem>>(`/checklists/${checklistId}/items`, data);
  },
  updateChecklistItem: async (itemId: string, data: UpdateChecklistItemInput): Promise<ApiSuccess<TaskChecklistItem>> => {
    return apiRequest.patch<ApiSuccess<TaskChecklistItem>>(`/checklist-items/${itemId}`, data);
  },
  deleteChecklistItem: async (itemId: string): Promise<ApiSuccess<{ success: true }>> => {
    return apiRequest.delete<ApiSuccess<{ success: true }>>(`/checklist-items/${itemId}`);
  },

  // Labels
  createLabel: async (data: CreateLabelInput): Promise<ApiSuccess<TaskLabel>> => {
    return apiRequest.post<ApiSuccess<TaskLabel>>('/labels', data);
  },
  assignLabel: async (id: string, data: AssignLabelInput): Promise<ApiSuccess<unknown>> => {
    return apiRequest.post<ApiSuccess<unknown>>(`/tasks/${id}/labels`, data);
  },

  // Attachments
  addAttachment: async (id: string, data: AddAttachmentInput): Promise<ApiSuccess<TaskAttachment>> => {
    return apiRequest.post<ApiSuccess<TaskAttachment>>(`/tasks/${id}/attachments`, data);
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

  return {
    ...query,
    lists: query.data?.success ? query.data.data.lists : [],
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

export const useUpdateTask = (channelId: string) => {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: ({ id, data }: { id: string; data: UpdateTaskInput }) => taskService.updateTask(id, data),
    onSuccess: (data, variables) => {
      queryClient.invalidateQueries({ queryKey: taskKeys.detail(variables.id) });
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

export const useDeleteTask = (channelId: string) => {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: taskService.deleteTask,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: taskKeys.board(channelId) });
    },
  });
};

export const useTaskComments = (taskId: string, options?: { enabled?: boolean }) => {
  const query = useQuery({
    queryKey: taskKeys.comments(taskId),
    queryFn: () => taskService.getComments(taskId),
    enabled: (options?.enabled ?? true) && !!taskId,
  });

  return {
    ...query,
    comments: query.data?.success ? query.data.data : [],
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
    mutationFn: ({ id, data }: { id: string; data: { title: string } }) => taskService.updateChecklist(id, data),
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

export const useCreateSubtask = (taskId: string) => {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: ({ parentId, data }: { parentId: string; data: CreateSubtaskInput }) => taskService.createSubtask(parentId, data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: taskKeys.detail(taskId) });
    },
  });
};


