"use client";

import { useEffect, useMemo, useState, useRef, useCallback, type SyntheticEvent } from "react";
import { useParams, useRouter, useSearchParams } from "next/navigation";
import { Loader2, MessageSquareText, Sparkles } from "lucide-react";

import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { useAuthProfile } from "@/services/auth.service";
import { useMessages, useCreateMessage } from "@/hooks/api/useMessages";
import { useChannel } from "@/hooks/api/useChannels";
import { leaveChannelRoom, joinChannelRoom } from "@/lib/socket";
import type { Message } from "@/services/message.service";
import ChatInputBox from "@/components/ChatInputBox";
import { Button } from "@/components/ui/button";
import { ChannelManagementSheet } from "@/components/organizations/channel-management-sheet";

const COLLAPSED_MAX_HEIGHT = 320;
const LONG_MESSAGE_TEXT_LENGTH = 420;

const stripHtml = (html: string) => html.replace(/<[^>]+>/g, " ").replace(/\s+/g, " ").trim();

function MessageContent({ content, isOwnMessage }: { content: string; isOwnMessage: boolean }) {
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
        className={`chat-rich-text whitespace-pre-wrap wrap-anywhere text-sm leading-6 max-w-none transition-[max-height] duration-200
          [&_a]:no-underline hover:[&_a]:underline [&_b]:font-bold [&_strong]:font-bold [&_i]:italic [&_em]:italic [&_u]:underline [&_ul]:ml-5 [&_ol]:ml-5 [&_p]:m-0 [&_blockquote]:pl-4
          ${isOwnMessage ? "chat-rich-text--own text-primary-foreground" : "text-card-foreground"}`}
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
    channelName,
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

  const createMessage = useCreateMessage(channelId, {
    onError: (error) => {
      console.error("Failed to send message:", error);
    },
  });

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

    messages?.forEach((msg) => uniqueMessages.set(msg.id, msg));
    socketMessages?.forEach((msg) => uniqueMessages.set(msg.id, msg));

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

  const handleSendMessage = (content: string) => {
    shouldSmoothScrollRef.current = true;
    stickToBottomRef.current = true;
    createMessage.mutate({ content });
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
            <div className="border-b border-border/60 bg-background/80 px-6 py-3 backdrop-blur-sm lg:px-8">
              <div className="flex flex-col gap-3 md:flex-row md:items-center md:justify-between">
                <div>
                  <p className="text-sm font-semibold text-foreground">Channel operations</p>
                  <p className="text-xs text-muted-foreground">
                    Manage channel details and membership without leaving the conversation.
                  </p>
                </div>
                <ChannelManagementSheet
                  channelId={channelId}
                  orgId={params.id as string}
                  trigger={
                    <Button className="rounded-2xl">
                      Manage channel
                    </Button>
                  }
                />
              </div>
            </div>
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
                          className={`min-w-0 max-w-[78%] rounded-3xl px-4 py-3 shadow-sm ${
                            isOwnMessage
                              ? "bg-primary text-primary-foreground"
                              : "border border-border bg-card text-card-foreground"
                          }`}
                        >
                          <div className="mb-1 flex items-center gap-2">
                            <span className="text-xs font-semibold">
                              {isOwnMessage ? "You" : message.user_name || "Unknown"}
                            </span>
                            <span className="text-[10px] opacity-70">
                              {new Date(message.created_at).toLocaleTimeString([], {
                                hour: "2-digit",
                                minute: "2-digit",
                              })}
                            </span>
                          </div>
                          
                          <MessageContent content={message.content} isOwnMessage={isOwnMessage} />
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
                channelName={channelName} 
                onSendMessage={handleSendMessage} 
                isPending={createMessage.isPending} 
              />
            </div>
          </section>

          <aside className="hidden w-80 shrink-0 border-l border-border bg-muted/20 xl:flex xl:flex-col">
            <div className="border-b border-border px-6 py-5">
              <p className="text-sm font-semibold text-foreground">Channel overview</p>
              <p className="mt-1 text-xs text-muted-foreground">Context and activity for {channelName || "this channel"}</p>
            </div>
            <div className="flex-1 space-y-4 overflow-y-auto p-6">
              <Card className="rounded-2xl border-border/80">
                <CardHeader>
                  <CardTitle className="text-base">Conversation stats</CardTitle>
                </CardHeader>
                <CardContent className="space-y-3 text-sm text-muted-foreground">
                  <div className="flex items-center justify-between">
                    <span>Channel role</span>
                    <span className="font-semibold text-foreground">{channel?.currentUserChannelRole ?? channel?.currentUserOrgRole ?? "Viewer"}</span>
                  </div>
                  <div className="flex items-center justify-between">
                    <span>Total messages</span>
                    <span className="font-semibold text-foreground">{allMessages.length}</span>
                  </div>
                  <div className="flex items-center justify-between">
                    <span>Active view</span>
                    <span className="font-semibold text-foreground">Chat</span>
                  </div>
                </CardContent>
              </Card>

              <Card className="rounded-2xl border-border/80">
                <CardHeader>
                  <CardTitle className="text-base">Next step</CardTitle>
                </CardHeader>
                <CardContent className="text-sm text-muted-foreground">
                  Convert important discussions into tasks from the task tab once backend task flows are finalized.
                </CardContent>
              </Card>
            </div>
          </aside>
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
