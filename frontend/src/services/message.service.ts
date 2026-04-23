// src/services/message.service.ts
"use client";

import {
  useInfiniteQuery,
  useMutation,
  useQueryClient,
  type InfiniteData,
  type UseMutationOptions,
} from "@tanstack/react-query";

import { api } from "@/lib/api";
import type { ApiSuccess } from "@/types/api";

export type Message = {
  id: string;
  attachments?: any[];
  content: string;
  user_id: string;
  user_name: string;
  created_at: string;
};

export type CreateMessageInput = {
  attachments?: any[];
  content: string;
};

export type MessagesResponse = ApiSuccess<{
  messages: Message[];
  channelName: string;
  pagination: {
    total: number;
    page: number;
    limit: number;
    totalPages: number;
    hasMore: boolean;
  };
}>;

export type MessageResponse = ApiSuccess<{
  message: Message;
}>;

export const messageKeys = {
  all: ["messages"] as const,
  byChannel: (channelId: string) => [...messageKeys.all, "channel", channelId] as const,
};

export async function getChannelMessages(
  channelId: string,
  page = 1,
  limit = 20
): Promise<MessagesResponse> {
  const response = await api.get<MessagesResponse>(`/channels/${channelId}/messages`, {
    params: { page, limit },
  });
  return response.data;
}

export async function uploadFiles(files: File[]): Promise<{ files: any[] }> {
  const formData = new FormData();
  files.forEach((file) => formData.append("files", file));

  const response = await api.post<ApiSuccess<{ files: any[] }>>("/upload", formData, {
    headers: {
      "Content-Type": "multipart/form-data",
    },
  });
  return response.data.data;
}

export async function createChannelMessage(
  channelId: string,
  data: CreateMessageInput
): Promise<MessageResponse> {
  const response = await api.post<MessageResponse>(`/channels/${channelId}/messages`, data);
  return response.data;
}

export function useChannelMessagesInfiniteQuery(channelId: string) {
  return useInfiniteQuery({
    queryKey: messageKeys.byChannel(channelId),
    queryFn: ({ pageParam }) => getChannelMessages(channelId, Number(pageParam), 20),
    enabled: !!channelId,
    initialPageParam: 1,
    getNextPageParam: (lastPage) =>
      lastPage.data.pagination.hasMore
        ? lastPage.data.pagination.page + 1
        : undefined,
    staleTime: 1000 * 30, // 30 sec cache (real-time data)
  });
}

export function useCreateMessageMutation(
  channelId: string,
  options?: UseMutationOptions<MessageResponse, unknown, CreateMessageInput>
) {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (data: CreateMessageInput) => createChannelMessage(channelId, data),
    ...options,
    onSuccess: async (data, variables, onMutateResult, context) => {
      await queryClient.setQueryData<InfiniteData<MessagesResponse>>(
        messageKeys.byChannel(channelId),
        (existing) => {
          if (!existing) {
            return existing;
          }

          const message = data.data.message;
          const pages = existing.pages.map((page, index) => {
            if (index !== 0) {
              return page;
            }

            const alreadyExists = page.data.messages.some((item) => item.id === message.id);
            if (alreadyExists) {
              return page;
            }

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

          return {
            ...existing,
            pages,
          };
        }
      );

      await options?.onSuccess?.(data, variables, onMutateResult, context);
    },
  });
}
