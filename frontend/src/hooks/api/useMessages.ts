// src/hooks/useMessages.ts
import { useChannelMessagesInfiniteQuery, useCreateMessageMutation } from "@/services/message.service";
import type { Message } from "@/services/message.service";

export const useMessages = (channelId: string) => {
  const query = useChannelMessagesInfiniteQuery(channelId);
  const pages = query.data?.pages ?? [];
  const messages = [...pages]
    .reverse()
    .flatMap((page) => (page.success ? page.data.messages : []));
  const latestPage = pages[0];
  
  return {
    ...query,
    messages,
    channelName:
      latestPage?.success ? latestPage.data.channelName : "Channel",
    pagination:
      latestPage?.success ? latestPage.data.pagination : null,
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
