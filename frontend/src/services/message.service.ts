// src/services/message.service.ts
"use client";

import {
  useMutation,
  useQuery,
  useQueryClient,
  type UseMutationOptions,
} from "@tanstack/react-query";

import { api } from "@/lib/api";
import type { ApiSuccess } from "@/types/api";

export type Message = {
  id: string;
  content: string;
  user_id: string;
  user_name: string;
  created_at: string;
};

export type CreateMessageInput = {
  content: string;
};

export type MessagesResponse = ApiSuccess<{
  messages: Message[];
  channelName: string;
}>;

export type MessageResponse = ApiSuccess<{
  message: Message;
}>;

export const messageKeys = {
  all: ["messages"] as const,
  byChannel: (channelId: string) => [...messageKeys.all, "channel", channelId] as const,
};

export async function getChannelMessages(channelId: string): Promise<MessagesResponse> {
  const response = await api.get<MessagesResponse>(`/channels/${channelId}/messages`);
  return response.data;
}

export async function createChannelMessage(
  channelId: string,
  data: CreateMessageInput
): Promise<MessageResponse> {
  const response = await api.post<MessageResponse>(`/channels/${channelId}/messages`, data);
  return response.data;
}

export function useChannelMessagesQuery(channelId: string) {
  return useQuery({
    queryKey: messageKeys.byChannel(channelId),
    queryFn: () => getChannelMessages(channelId),
    enabled: !!channelId,
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
      await queryClient.invalidateQueries({ queryKey: messageKeys.byChannel(channelId) });
      await options?.onSuccess?.(data, variables, onMutateResult, context);
    },
  });
}
