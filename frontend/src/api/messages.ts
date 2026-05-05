import {
  useInfiniteQuery,
  useMutation,
  useQueryClient,
  type InfiniteData,
} from "@tanstack/react-query";
import { apiRequest } from "@/api/api";
import type { ApiSuccess } from "@/types/api";

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
  attachmentIds?: string[];
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

    const response = await apiRequest.post<ApiSuccess<Attachment[]>>(`/channels/${channelId}/attachments`, formData, {
      headers: { "Content-Type": "multipart/form-data" },
    });
    return response.data;
  },

  createChannelMessage: async (channelId: string, data: CreateMessageInput): Promise<MessageResponse> => {
    return apiRequest.post<MessageResponse>(`/channels/${channelId}/messages`, data);
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

  return {
    ...query,
    messages: query.data?.pages.flatMap((page) => page.data.messages) ?? [],
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

