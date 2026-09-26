import {
  useInfiniteQuery,
  useMutation,
  useQueryClient,
  useQuery,
} from "@tanstack/react-query";
import type { InfiniteData } from "@tanstack/react-query";
import { apiRequest } from "@/api/api";
import type { ApiSuccess } from "@/types/api";
import { useMemo } from "react";

// --- TYPES ---

export type Attachment = {
  id: string;
  file_name: string;
  file_url: string;
  file_type: string;
  file_size: number;
  type: "IMAGE" | "FILE";
};

export type Message = {
  id: string;
  content: string;
  channel_id: string;
  user_id: string;
  user_name: string;
  user_avatar?: string;
  created_at: string;
  updated_at: string;
  attachments?: Attachment[];
};

export type MessageResponse = ApiSuccess<{
  message: Message;
}>;

export type MessagesResponse = ApiSuccess<{
  messages: Message[];
  pagination: {
    total: number;
    page: number;
    limit: number;
    totalPages: number;
    hasMore: boolean;
  };
}>;

export type CreateMessageInput = {
  content: string;
  attachments?: Attachment[];
};

// --- KEYS ---

export const messageKeys = {
  all: ["messages"] as const,
  byChannel: (channelId: string) => [...messageKeys.all, "channel", channelId] as const,
};

// --- SERVICE ---

export const messageService = {
  getChannelMessages: async (channelId: string, page = 1, limit = 20): Promise<MessagesResponse> => {
    return apiRequest.get<MessagesResponse>(`/channels/${channelId}/messages`, {
      params: { page, limit },
    });
  },

  uploadFiles: async (channelId: string, files: File[]): Promise<Attachment[]> => {
    const formData = new FormData();
    files.forEach((file) => formData.append("files", file));

    const response = await apiRequest.post<ApiSuccess<{ files: Attachment[] }>>("/upload?folder=message", formData, {
      headers: { "Content-Type": "multipart/form-data" },
    });
    return response.data.files;
  },

  createChannelMessage: async (channelId: string, data: CreateMessageInput): Promise<MessageResponse> => {
    return apiRequest.post<MessageResponse>(`/channels/${channelId}/messages`, data);
  },

  editMessage: async (messageId: string, content: string): Promise<MessageResponse> => {
    return apiRequest.put<MessageResponse>(`/messages/${messageId}`, { content });
  },

  deleteMessage: async (messageId: string): Promise<ApiSuccess<{ id: string }>> => {
    return apiRequest.delete<ApiSuccess<{ id: string }>>(`/messages/${messageId}`);
  },

  deleteAttachment: async (attachmentId: string): Promise<ApiSuccess<{ id: string }>> => {
    return apiRequest.delete<ApiSuccess<{ id: string }>>(`/messages/attachments/${attachmentId}`);
  },

  // ==========================================
  // DIRECT MESSAGING (DM) SERVICES
  // ==========================================
  getConversations: async (): Promise<ApiSuccess<Array<{
    id: string;
    unreadCount: number;
    otherUser: {
      id: string;
      name: string;
      email: string;
      avatar_url: string | null;
    };
    lastMessage: {
      id: string;
      content: string;
      sender_id: string;
      sender_name: string;
      created_at: string;
      is_read: boolean;
    } | null;
  }>>> => {
    return apiRequest.get("/conversations");
  },

  startConversation: async (recipientId: string): Promise<ApiSuccess<{
    id: string;
    otherUser: {
      id: string;
      name: string;
      email: string;
      avatar_url: string | null;
    };
  }>> => {
    return apiRequest.post("/conversations", { recipientId });
  },

  getDirectMessages: async (conversationId: string, page = 1, limit = 20): Promise<MessagesResponse> => {
    return apiRequest.get<MessagesResponse>(`/conversations/${conversationId}/messages`, {
      params: { page, limit },
    });
  },

  createDirectMessage: async (conversationId: string, data: CreateMessageInput): Promise<MessageResponse> => {
    return apiRequest.post<MessageResponse>(`/conversations/${conversationId}/messages`, data);
  },

  editDirectMessage: async (messageId: string, content: string): Promise<MessageResponse> => {
    return apiRequest.put<MessageResponse>(`/conversations/messages/${messageId}`, { content });
  },

  deleteDirectMessage: async (messageId: string): Promise<ApiSuccess<{ id: string }>> => {
    return apiRequest.delete<ApiSuccess<{ id: string }>>(`/conversations/messages/${messageId}`);
  },

  markConversationRead: async (conversationId: string): Promise<ApiSuccess<{ success: boolean }>> => {
    return apiRequest.get<ApiSuccess<{ success: boolean }>>(`/conversations/${conversationId}/messages`);
  },
};

// --- HOOKS ---

export const useMessages = (channelId: string) => {
  const query = useInfiniteQuery({
    queryKey: messageKeys.byChannel(channelId),
    queryFn: ({ pageParam }) => messageService.getChannelMessages(channelId, Number(pageParam), 20),
    enabled: !!channelId,
    initialPageParam: 1,
    getNextPageParam: (lastPage) =>
      lastPage.data.pagination.hasMore
        ? lastPage.data.pagination.page + 1
        : undefined,
    staleTime: 1000 * 30,
  });

  const messages = useMemo(() => query.data?.pages.flatMap((page) => page.data.messages) ?? [], [query.data]);

  return {
    ...query,
    messages,
  };
};

export const useCreateMessage = (channelId: string) => {
  const queryClient = useQueryClient();

  return useMutation({
    mutationKey: ["createMessage"],
    mutationFn: (data: CreateMessageInput) => messageService.createChannelMessage(channelId, data),
    onSuccess: async (data) => {
      await queryClient.setQueryData<InfiniteData<MessagesResponse>>(
        messageKeys.byChannel(channelId),
        (existing) => {
          if (!existing) return existing;

          const message = data.data.message;
          const pages = existing.pages.map((page, index) => {
            if (index !== 0) return page;

            const alreadyExists = page.data.messages.some((item) => item.id === message.id);
            if (alreadyExists) return page;

            return {
              ...page,
              data: {
                ...page.data,
                messages: [...page.data.messages, message],
                pagination: {
                  ...page.data.pagination,
                  total: page.data.pagination.total + 1,
                },
              },
            };
          });

          return { ...existing, pages };
        }
      );
    },
  });
};


export const useConversations = () => {
  return useQuery({
    queryKey: ["conversations"],
    queryFn: messageService.getConversations,
    staleTime: 1000 * 10,
  });
};

export const useDirectMessages = (conversationId: string) => {
  const query = useInfiniteQuery({
    queryKey: ["messages", "direct", conversationId],
    queryFn: ({ pageParam }) => messageService.getDirectMessages(conversationId, Number(pageParam), 20),
    enabled: !!conversationId,
    initialPageParam: 1,
    getNextPageParam: (lastPage) =>
      lastPage.data.pagination.hasMore
        ? lastPage.data.pagination.page + 1
        : undefined,
    staleTime: 1000 * 30,
  });

  const messages = useMemo(() => query.data?.pages.flatMap((page) => page.data.messages) ?? [], [query.data]);

  return {
    ...query,
    messages,
  };
};

export const useCreateDirectMessage = (conversationId: string) => {
  const queryClient = useQueryClient();

  return useMutation({
    mutationKey: ["createDirectMessage", conversationId],
    mutationFn: (data: CreateMessageInput) => messageService.createDirectMessage(conversationId, data),
    onSuccess: async (data) => {
      await queryClient.setQueryData<InfiniteData<MessagesResponse>>(
        ["messages", "direct", conversationId],
        (existing) => {
          if (!existing) return existing;

          const message = data.data.message;
          const pages = existing.pages.map((page, index) => {
            if (index !== 0) return page;

            const alreadyExists = page.data.messages.some((item) => item.id === message.id);
            if (alreadyExists) return page;

            return {
              ...page,
              data: {
                ...page.data,
                messages: [...page.data.messages, message],
                pagination: {
                  ...page.data.pagination,
                  total: page.data.pagination.total + 1,
                },
              },
            };
          });

          return { ...existing, pages };
        }
      );
      // Invalidate the conversations list so the sidebar previews update instantly!
      await queryClient.invalidateQueries({ queryKey: ["conversations"] });
    },
  });
};

export const useStartConversation = () => {
  const queryClient = useQueryClient();

  return useMutation({
    mutationKey: ["startConversation"],
    mutationFn: (recipientId: string) => messageService.startConversation(recipientId),
    onSuccess: async () => {
      await queryClient.invalidateQueries({ queryKey: ["conversations"] });
    },
  });
};

