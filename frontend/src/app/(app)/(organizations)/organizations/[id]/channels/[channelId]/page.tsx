"use client";

import { useEffect, useMemo, useState, useRef, useCallback, type SyntheticEvent } from "react";
import { useParams, useRouter, useSearchParams } from "next/navigation";
import { Loader2, MessageSquareText, Sparkles, MoreHorizontal, Settings } from "lucide-react";

import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { useAuthProfile } from "@/api/auth";
import { useMessages, useCreateMessage, messageService, type Message, type Attachment } from "@/api/messages";
import { useChannel } from "@/api/channels";
import { joinChannelRoom, leaveChannelRoom } from "@/socket/socket";
import ChatInputBox from "@/components/ChatInputBox";
import { Button } from "@/components/ui/button";
import { FileText, ImageIcon } from "lucide-react";
import Image from "next/image";

const COLLAPSED_MAX_HEIGHT = 320;
const LONG_MESSAGE_TEXT_LENGTH = 420;

const stripHtml = (html: string) => html.replace(/<[^>]+>/g, " ").replace(/\s+/g, " ").trim();



function FileAttachment({ attachment, isOwnMessage }: { attachment: Attachment, isOwnMessage: boolean }) {
  const isImage = attachment.type === "IMAGE";
  const apiUrl = process.env.NEXT_PUBLIC_API_URL || "http://localhost:8000/api/v1";
  
  // Robust URL construction: Strip /api/v1 and ensure we don't have double slashes
  const baseUrl = apiUrl.replace(/\/api\/v1\/?$/, "");
  const fileUrl = `${baseUrl}${attachment.file_url}`;

  if (isImage) {
    return (
      <Image 
        src={fileUrl} 
        alt={attachment.file_name} 
        width={500}
        height={500}
        className="mt-2 rounded-lg border border-border/50 max-h-96 w-auto object-contain bg-background/50"
        unoptimized={true}
      />
    );
  }

  return (
    <a 
      href={fileUrl} 
      target="_blank" 
      rel="noopener noreferrer"
      className={`mt-2 flex items-center gap-2 rounded-lg border p-2.5 transition-colors ${
        isOwnMessage 
          ? "border-primary-foreground/20 bg-primary-foreground/10 hover:bg-primary-foreground/20 text-primary-foreground" 
          : "border-border bg-background/50 hover:bg-muted text-foreground"
      }`}
    >
      <FileText className="h-4 w-4 shrink-0" />
      <div className="min-w-0 flex-1">
        <div className="truncate text-xs font-semibold">{attachment.file_name}</div>
        <div className="text-[10px] opacity-70">{(attachment.file_size / 1024).toFixed(1)} KB</div>
      </div>
    </a>
  );
}

function MessageContent({ content, isOwnMessage, attachments }: { content: string; isOwnMessage: boolean; attachments?: Attachment[] }) {
  const [isExpanded, setIsExpanded] = useState(false);
  const [isLongMessage, setIsLongMessage] = useState(false);
  const isCollapsed = isLongMessage && !isExpanded;
  const contentRef = useRef<HTMLDivElement | null>(null);
  const textIsLong = stripHtml(content).length > LONG_MESSAGE_TEXT_LENGTH;

  const updateLongMessageState = useCallback(
    (element: HTMLDivElement | null) => {
      if (!element) {
        setIsLongMessage(textIsLong);
        return;
      }

      const hasLargeRenderedContent = element.scrollHeight > COLLAPSED_MAX_HEIGHT;
      setIsLongMessage(hasLargeRenderedContent || textIsLong);
    },
    [textIsLong]
  );

  const setContentRef = useCallback(
    (element: HTMLDivElement | null) => {
      contentRef.current = element;
      updateLongMessageState(element);
    },
    [updateLongMessageState]
  );

  useEffect(() => {
    const element = contentRef.current;
    if (!element) {
      return;
    }

    const observer = new ResizeObserver(() => {
      updateLongMessageState(element);
    });

    observer.observe(element);

    return () => {
      observer.disconnect();
    };
  }, [updateLongMessageState]);

  return (
    <div className="space-y-2">
      <div
        ref={setContentRef}
        style={
          isCollapsed
            ? {
                maxHeight: `${COLLAPSED_MAX_HEIGHT}px`,
                overflow: "hidden",
                WebkitMaskImage: "linear-gradient(to bottom, black 0%, black 84%, transparent 100%)",
                maskImage: "linear-gradient(to bottom, black 0%, black 84%, transparent 100%)",
              }
            : undefined
        }
        className={`chat-rich-text whitespace-pre-wrap wrap-anywhere text-sm leading-relaxed max-w-none transition-[max-height] duration-200
          [&_b]:font-bold [&_strong]:font-bold [&_i]:italic [&_em]:italic [&_u]:underline [&_ul]:ml-5 [&_ol]:ml-5 [&_p]:m-0 [&_blockquote]:pl-4
          ${isOwnMessage ? "chat-rich-text--own text-primary-foreground" : "text-foreground"}`}
        dangerouslySetInnerHTML={{ __html: content }}
      />

      {isLongMessage ? (
        <button
          type="button"
          onClick={() => setIsExpanded((prev) => !prev)}
          className={`text-xs font-semibold transition-colors hover:opacity-80 ${
            isOwnMessage ? "text-primary-foreground/85" : "text-primary"
          }`}
        >
          {isExpanded ? "Read less" : "Read more"}
        </button>
      ) : null}

      {attachments && attachments.length > 0 && (
        <div className="mt-1 flex flex-col gap-1">
          {attachments.map((att) => (
            <FileAttachment key={att.id} attachment={att} isOwnMessage={isOwnMessage} />
          ))}
        </div>
      )}
    </div>
  );
}

// =========================================================================
// MAIN PAGE COMPONENT
// =========================================================================
export default function ChannelDetailPage() {
  const params = useParams();
  const router = useRouter();
  const searchParams = useSearchParams();
  const channelId = params.channelId as string;

  const activeTab = searchParams.get("tab") === "tasks" ? "tasks" : "chat";
  const { user, isLoading: isLoadingUser } = useAuthProfile({ enabled: true });
  const { channel } = useChannel(channelId, { enabled: !!channelId });
  const {
    messages,
    isLoading: isLoadingMessages,
    hasNextPage,
    fetchNextPage,
    isFetchingNextPage,
  } = useMessages(channelId);
  
  const [socketMessages, setSocketMessages] = useState<Message[]>([]);

  const scrollContainerRef = useRef<HTMLDivElement>(null);
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const hasInitializedScrollRef = useRef(false);
  const pendingHistoryLoadRef = useRef(false);
  const previousScrollHeightRef = useRef(0);
  const previousScrollTopRef = useRef(0);
  const previousMessageCountRef = useRef(0);
  const shouldSmoothScrollRef = useRef(false);
  const stickToBottomRef = useRef(true);

  const createMessage = useCreateMessage(channelId);

  useEffect(() => {
    if (!isLoadingUser && !user) {
      router.push("/login");
    }
  }, [user, isLoadingUser, router]);

  // SOCKET LOGIC - Untouched
  useEffect(() => {
    if (!user?.id || !channelId) return;

    const socket = joinChannelRoom(channelId, user.id);
    const handleMessageCreated = (message: Message) => {
      setSocketMessages((prev) => {
        if (prev.some((item) => item.id === message.id)) {
          return prev;
        }
        return [...prev, message];
      });
    };

    socket.on("channel:message_created", handleMessageCreated);

    return () => {
      socket.off("channel:message_created", handleMessageCreated);
      leaveChannelRoom(channelId, user.id);
    };
  }, [channelId, user?.id]);

  const allMessages = useMemo(() => {
    const uniqueMessages = new Map<string, Message>();

    messages?.forEach((msg: Message) => uniqueMessages.set(msg.id, msg));
    socketMessages?.forEach((msg: Message) => uniqueMessages.set(msg.id, msg));

    return Array.from(uniqueMessages.values()).sort(
      (a, b) => new Date(a.created_at).getTime() - new Date(b.created_at).getTime()
    );
  }, [messages, socketMessages]);

  const scrollToBottom = useCallback((behavior: ScrollBehavior) => {
    messagesEndRef.current?.scrollIntoView({ behavior, block: "end" });
  }, []);

  const isNearBottom = useCallback(() => {
    const container = scrollContainerRef.current;
    if (!container) return true;

    return container.scrollHeight - container.scrollTop - container.clientHeight < 120;
  }, []);

  useEffect(() => {
    const container = scrollContainerRef.current;
    const currentCount = allMessages.length;

    if (!container || currentCount === 0) {
      previousMessageCountRef.current = currentCount;
      return;
    }

    if (!hasInitializedScrollRef.current) {
      scrollToBottom("auto");
      hasInitializedScrollRef.current = true;
      stickToBottomRef.current = true;
      previousMessageCountRef.current = currentCount;
      return;
    }

    if (pendingHistoryLoadRef.current) {
      const scrollHeightDiff = container.scrollHeight - previousScrollHeightRef.current;
      container.scrollTop = previousScrollTopRef.current + scrollHeightDiff;
      pendingHistoryLoadRef.current = false;
      previousMessageCountRef.current = currentCount;
      return;
    }

    if (currentCount > previousMessageCountRef.current) {
      if (shouldSmoothScrollRef.current || stickToBottomRef.current) {
        scrollToBottom("smooth");
        stickToBottomRef.current = true;
      }

      shouldSmoothScrollRef.current = false;
    }

    previousMessageCountRef.current = currentCount;
  }, [allMessages.length, scrollToBottom]);

  const handleScroll = useCallback(() => {
    const container = scrollContainerRef.current;

    stickToBottomRef.current = isNearBottom();

    if (
      !container ||
      container.scrollTop > 80 ||
      !hasNextPage ||
      isFetchingNextPage ||
      pendingHistoryLoadRef.current
    ) {
      return;
    }

    pendingHistoryLoadRef.current = true;
    previousScrollHeightRef.current = container.scrollHeight;
    previousScrollTopRef.current = container.scrollTop;
    void fetchNextPage();
  }, [fetchNextPage, hasNextPage, isFetchingNextPage, isNearBottom]);

  const handleMessageMediaLoad = useCallback((event: SyntheticEvent<HTMLDivElement>) => {
    const target = event.target;

    if (!(target instanceof HTMLImageElement)) {
      return;
    }

    if (!hasInitializedScrollRef.current || stickToBottomRef.current) {
      scrollToBottom("auto");
    }
  }, [scrollToBottom]);

  const handleSendMessage = async (content: string, attachments: File[]) => {
    shouldSmoothScrollRef.current = true;
    stickToBottomRef.current = true;

    try {
      let attachmentIds: string[] | undefined = undefined;
      if (attachments && attachments.length > 0) {
        const uploadedAttachments = await messageService.uploadFiles(channelId, attachments);
        attachmentIds = uploadedAttachments.map(a => a.id);
      }
      createMessage.mutate({ content, attachmentIds });
    } catch (error) {
      console.error("Failed to send message with attachments:", error);
      // Fallback: send message without attachments if upload fails
      createMessage.mutate({ content });
    }
  };

  if (isLoadingUser || isLoadingMessages) {
    return (
      <div className="flex min-h-0 flex-1 items-center justify-center bg-background">
        <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
      </div>
    );
  }

  return (
    <div className="flex min-h-0 flex-1 overflow-hidden bg-background">
      {activeTab === "chat" ? (
        <>
          <section className="flex min-h-0 flex-1 flex-col">
            <div
              ref={scrollContainerRef}
              onScroll={handleScroll}
              onLoadCapture={handleMessageMediaLoad}
              className="flex-1 overflow-y-auto px-6 py-5 lg:px-8"
            >
              {allMessages.length === 0 ? (
                <div className="flex h-full flex-col items-center justify-center rounded-3xl border border-dashed border-border bg-muted/20 p-10 text-center">
                  <MessageSquareText className="mb-4 h-12 w-12 text-primary/60" />
                  <h2 className="text-lg font-semibold text-foreground">No conversation yet</h2>
                  <p className="mt-2 max-w-md text-sm text-muted-foreground">
                    Start the channel with a quick update, a blocker, or the next action item.
                  </p>
                </div>
              ) : (
                <div className="space-y-4">
                  {isFetchingNextPage ? (
                    <div className="flex items-center justify-center py-2 text-muted-foreground">
                      <Loader2 className="h-4 w-4 animate-spin" />
                    </div>
                  ) : null}

                  {allMessages.map((message) => {
                    const isOwnMessage = message.user_id === user?.id;

                    return (
                      <div
                        key={message.id}
                        className={`flex gap-3 ${isOwnMessage ? "flex-row-reverse" : ""}`}
                      >
                        <Avatar className="h-9 w-9 shrink-0 border border-border/60">
                          <AvatarFallback className={isOwnMessage ? "bg-primary text-primary-foreground" : "bg-muted text-foreground"}>
                            {(message.user_name || "User").charAt(0).toUpperCase()}
                          </AvatarFallback>
                        </Avatar>
                        <div
                          className={`min-w-0 max-w-[85%] rounded-2xl px-5 py-3.5 shadow-sm transition-all ${
                            isOwnMessage
                              ? "bg-primary text-primary-foreground shadow-primary/20"
                              : "border border-border bg-muted/30 text-foreground"
                          }`}
                        >
                          <div className={`mb-1.5 flex items-center gap-2 ${isOwnMessage ? "justify-end" : ""}`}>
                            <span className={`text-[10px] font-bold uppercase tracking-wider ${isOwnMessage ? "text-primary-foreground/70" : "text-muted-foreground"}`}>
                              {isOwnMessage ? "You" : message.user_name || "Unknown"}
                            </span>
                            <span className={`text-[10px] ${isOwnMessage ? "text-primary-foreground/50" : "text-muted-foreground/60"}`}>
                              {new Date(message.created_at).toLocaleTimeString([], {
                                hour: "2-digit",
                                minute: "2-digit",
                              })}
                            </span>
                          </div>
                          
                          <MessageContent 
                            content={message.content} 
                            isOwnMessage={isOwnMessage} 
                            attachments={message.attachments}
                          />
                        </div>
                      </div>
                    );
                  })}
                  <div ref={messagesEndRef} />
                </div>
              )}
            </div>

            <div className="border-t border-border bg-background/85 px-6 py-4 backdrop-blur-md lg:px-8">
              {/* Isolated Input Component used here */}
              <ChatInputBox 
                channelName={channel?.name || "Channel"} 
                onSendMessage={handleSendMessage} 
                isPending={createMessage.isPending} 
              />
            </div>
          </section>

        </>
      ) : (
        <section className="min-h-0 flex-1 overflow-y-auto px-6 py-5 lg:px-8">
          <div className="mx-auto max-w-5xl space-y-6">
            <Card className="rounded-3xl border-border/80 bg-card">
              <CardHeader>
                <CardTitle className="flex items-center gap-2 text-xl">
                  <Sparkles className="h-5 w-5 text-primary" />
                  Channel Tasks
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-4 text-sm text-muted-foreground">
                <p>
                  The channel task surface is now wired into the frontend layout, but the backend task endpoints are still stubbed and do not return real task records yet.
                </p>
                <div className="rounded-2xl border border-dashed border-border bg-muted/30 p-6">
                  <p className="font-medium text-foreground">Ready once backend task CRUD is completed</p>
                  <p className="mt-2">
                    This tab is the right place for channel-only tasks, assignments, and progress tracking. Right now it is intentionally a placeholder instead of showing fake data.
                  </p>
                </div>
              </CardContent>
            </Card>
          </div>
        </section>
      )}
    </div>
  );
}
