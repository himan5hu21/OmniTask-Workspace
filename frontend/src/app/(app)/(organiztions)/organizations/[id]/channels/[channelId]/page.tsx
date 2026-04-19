"use client";

import { useEffect, useMemo, useState } from "react";
import { useParams, useRouter, useSearchParams } from "next/navigation";
import { Loader2, MessageSquareText, Send, Sparkles } from "lucide-react";

import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { useAuthProfile } from "@/services/auth.service";
import { useMessages, useCreateMessage } from "@/hooks/api/useMessages";
import { leaveChannelRoom, joinChannelRoom } from "@/lib/socket";
import type { Message } from "@/services/message.service";

export default function ChannelDetailPage() {
  const params = useParams();
  const router = useRouter();
  const searchParams = useSearchParams();
  const channelId = params.channelId as string;

  const activeTab = searchParams.get("tab") === "tasks" ? "tasks" : "chat";
  const { user, isLoading: isLoadingUser } = useAuthProfile({ enabled: true });
  const { messages, channelName, isLoading: isLoadingMessages } = useMessages(channelId);
  const [newMessage, setNewMessage] = useState("");
  const [socketMessages, setSocketMessages] = useState<Message[]>([]);

  const createMessage = useCreateMessage(channelId, {
    onSuccess: () => {
      setNewMessage("");
    },
    onError: (error) => {
      console.error("Failed to send message:", error);
    },
  });

  useEffect(() => {
    if (!isLoadingUser && !user) {
      router.push("/login");
    }
  }, [user, isLoadingUser, router]);

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

  const allMessages = useMemo(
    () =>
      [...messages, ...socketMessages].reduce((acc, message) => {
        if (!acc.some((item) => item.id === message.id)) {
          acc.push(message);
        }
        return acc;
      }, [] as Message[]),
    [messages, socketMessages]
  );

  const handleSendMessage = () => {
    if (!newMessage.trim()) return;
    createMessage.mutate({ content: newMessage.trim() });
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
            <div className="flex-1 overflow-y-auto px-6 py-5 lg:px-8">
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
                          className={`max-w-[78%] rounded-3xl px-4 py-3 shadow-sm ${
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
                          <p className="whitespace-pre-wrap text-sm leading-6">{message.content}</p>
                        </div>
                      </div>
                    );
                  })}
                </div>
              )}
            </div>

            <div className="border-t border-border bg-background/85 px-6 py-4 backdrop-blur-md lg:px-8">
              <div className="flex gap-3">
                <Input
                  value={newMessage}
                  onChange={(e) => setNewMessage(e.target.value)}
                  onKeyDown={(e) => {
                    if (e.key === "Enter" && !e.shiftKey) {
                      e.preventDefault();
                      handleSendMessage();
                    }
                  }}
                  placeholder={`Message ${channelName || "channel"}...`}
                  className="h-12 rounded-2xl border-input bg-background px-4 text-base shadow-sm transition-all hover:border-ring/50 focus-visible:ring-4 focus-visible:ring-ring/15"
                />
                <Button
                  onClick={handleSendMessage}
                  disabled={!newMessage.trim() || createMessage.isPending}
                  className="h-12 rounded-2xl px-5 font-semibold"
                >
                  {createMessage.isPending ? <Loader2 className="h-4 w-4 animate-spin" /> : <Send className="h-4 w-4" />}
                </Button>
              </div>
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
