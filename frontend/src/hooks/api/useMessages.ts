// src/hooks/useMessages.ts
import { useChannelMessagesQuery, useCreateMessageMutation } from "@/services/message.service";
import type { Message } from "@/services/message.service";

export const useMessages = (channelId: string) => {
  const query = useChannelMessagesQuery(channelId);
  
  return {
    ...query,
    messages: query.data?.success ? query.data.data.messages : [],
    channelName: query.data?.success ? query.data.data.channelName : "Channel",
  };
};

export const useCreateMessage = (
  channelId: string,
  options?: {
    onSuccess?: (message: Message) => void;
    onError?: (error: unknown) => void;
  }
) => {
  return useCreateMessageMutation(channelId, {
    onSuccess: (data) => {
      if (data.success && options?.onSuccess) {
        options.onSuccess(data.data.message);
      }
    },
    onError: options?.onError,
  });
};
