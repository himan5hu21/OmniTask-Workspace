"use client";

import { useEffect, useMemo, useState, useRef, useCallback, type SyntheticEvent } from "react";
import { useParams, useRouter } from "next/navigation";
import { MessageSquareText, ArrowLeft, MoreHorizontal, Pencil, Trash2, ChevronDown, Copy } from "lucide-react";
import Spinner from "@/components/Loading";
import Link from "next/link";
import { useQueryClient } from "@tanstack/react-query";

import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { useAuthProfile } from "@/api/auth";
import { useDirectMessages, useCreateDirectMessage, useConversations, messageService, type Message, type Attachment } from "@/api/messages";
import { getSocket } from "@/socket/socket";
import ChatInputBox from "@/components/ChatInputBox";
import { DeleteMessageDialog } from "@/components/DeleteMessageDialog";
import { FilePreviewDialog } from "@/components/FilePreviewDialog";
import { FileText, Download, Play } from "lucide-react";
import { ScrollArea } from "@/components/ui/scroll-area";
import { getInitials, cn } from "@/lib/utils";
import { buildAuthenticatedFileUrl } from "@/lib/file-url";
import { renderMentionTokens } from "@/lib/mentions";
import { toast } from "sonner";
import { useUnreadStore } from "@/store/unread.store";
import {
  ContextMenu,
  ContextMenuContent,
  ContextMenuItem,
  ContextMenuSeparator,
  ContextMenuTrigger,
} from "@/components/ui/context-menu";

const COLLAPSED_MAX_HEIGHT = 320;
const LONG_MESSAGE_TEXT_LENGTH = 420;

const stripHtml = (html: string) => html.replace(/<[^>]+>/g, " ").replace(/\s+/g, " ").trim();

function FileAttachment({
  attachment,
  isOwnMessage,
  onPreviewFile,
  onDelete,
  isDeletable
}: {
  attachment: Attachment;
  isOwnMessage: boolean;
  onPreviewFile?: (file: { fileName: string; fileUrl: string; fileSize: number }) => void;
  onDelete?: (attachmentId: string) => void;
  isDeletable?: boolean;
}) {
  const isImage = attachment.type === "IMAGE" || attachment.file_type?.startsWith("image/") || /\.(jpg|jpeg|png|gif|webp)$/i.test(attachment.file_name);
  const isVideo = attachment.file_type?.startsWith("video/") || /\.(mp4|webm|ogg|mov)$/i.test(attachment.file_name);
  const fileUrl = buildAuthenticatedFileUrl(attachment.file_url);

  if (isImage) {
    return (
      <div className="relative group w-fit max-w-full select-none">
        {/* eslint-disable-next-line @next/next/no-img-element */}
        <img
          src={fileUrl}
          alt={attachment.file_name}
          loading="lazy"
          onClick={() => {
            if (onPreviewFile) {
              onPreviewFile({
                fileName: attachment.file_name,
                fileUrl: fileUrl,
                fileSize: attachment.file_size,
              });
            }
          }}
          className="mt-2 rounded-lg border border-border/50 max-h-96 w-auto object-contain bg-background/50 animate-in fade-in duration-200 cursor-zoom-in"
        />
        {isOwnMessage && isDeletable && onDelete && (
          <button
            type="button"
            onClick={(e) => {
              e.stopPropagation();
              onDelete(attachment.id);
            }}
            className="absolute top-4 right-2 h-7 w-7 rounded-full bg-black/60 hover:bg-destructive text-white backdrop-blur-md flex items-center justify-center shadow-lg transition-all duration-200 border border-white/20 hover:scale-110 opacity-0 group-hover:opacity-100 z-20 cursor-pointer"
            title="Delete Image"
          >
            <Trash2 className="h-3.5 w-3.5" />
          </button>
        )}
      </div>
    );
  }

  if (isVideo) {
    return (
      <div className="relative group max-w-[450px] mt-2 rounded-lg overflow-hidden border border-border/50 bg-background/50 select-none">
        <div
          onClick={() => {
            if (onPreviewFile) {
              onPreviewFile({
                fileName: attachment.file_name,
                fileUrl: fileUrl,
                fileSize: attachment.file_size,
              });
            }
          }}
          className="cursor-pointer"
        >
          <video
            src={fileUrl}
            preload="metadata"
            className="max-h-96 w-full object-contain pointer-events-none"
          />
          {/* Play Glassmorphic Overlay */}
          <div className="absolute inset-0 bg-black/30 group-hover:bg-black/45 flex items-center justify-center transition-all duration-200">
            <div className="h-14 w-14 rounded-full bg-white/20 hover:bg-white/35 backdrop-blur-md flex items-center justify-center text-white shadow-2xl transform group-hover:scale-110 transition-all duration-200 border border-white/30">
              <Play className="h-6 w-6 fill-current translate-x-0.5" />
            </div>
            <span className="absolute bottom-3 left-3 bg-black/60 text-white text-[10px] px-2.5 py-1 rounded-md font-bold backdrop-blur-sm border border-white/10 select-none">
              Watch Preview
            </span>
          </div>
        </div>
        {isOwnMessage && isDeletable && onDelete && (
          <button
            type="button"
            onClick={(e) => {
              e.stopPropagation();
              onDelete(attachment.id);
            }}
            className="absolute top-2 right-2 h-7 w-7 rounded-full bg-black/60 hover:bg-destructive text-white backdrop-blur-md flex items-center justify-center shadow-lg transition-all duration-200 border border-white/20 hover:scale-110 opacity-0 group-hover:opacity-100 z-20 cursor-pointer"
            title="Delete Video"
          >
            <Trash2 className="h-3.5 w-3.5" />
          </button>
        )}
      </div>
    );
  }

  return (
    <div className="mt-2 flex items-center gap-3 rounded-xl border border-border/80 bg-background/60 hover:bg-background/90 p-3 shadow-sm hover:shadow-md transition-all duration-200 min-w-[240px] max-w-[320px] group/file">
      <a
        href={fileUrl}
        target="_blank"
        rel="noopener noreferrer"
        onClick={(e) => {
          if (onPreviewFile) {
            e.preventDefault();
            onPreviewFile({
              fileName: attachment.file_name,
              fileUrl: fileUrl,
              fileSize: attachment.file_size,
            });
          }
        }}
        className="flex items-center gap-3 min-w-0 flex-1 cursor-pointer select-none"
        title="Click to view file"
      >
        <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-lg bg-primary/10 text-primary transition-colors group-hover/file:bg-primary/20">
          <FileText className="h-5 w-5" />
        </div>
        <div className="min-w-0 flex-1">
          <div className="truncate text-xs font-semibold text-foreground group-hover/file:text-primary transition-colors" title={attachment.file_name}>
            {attachment.file_name}
          </div>
          <div className="text-[10px] text-muted-foreground/80 mt-0.5">
            {(attachment.file_size / 1024).toFixed(1)} KB
          </div>
        </div>
      </a>

      {/* Download Action */}
      <div className="flex items-center gap-1 shrink-0">
        <a
          href={fileUrl}
          download={attachment.file_name}
          className="flex h-8 w-8 items-center justify-center rounded-md hover:bg-muted text-muted-foreground hover:text-primary transition-all duration-150 cursor-pointer"
          title="Download File"
          onClick={(e) => e.stopPropagation()}
        >
          <Download className="h-4 w-4" />
        </a>

        {isOwnMessage && isDeletable && onDelete && (
          <button
            type="button"
            onClick={(e) => {
              e.stopPropagation();
              onDelete(attachment.id);
            }}
            className="flex h-8 w-8 items-center justify-center rounded-md hover:bg-destructive/10 text-muted-foreground hover:text-destructive transition-all duration-150 cursor-pointer"
            title="Delete File"
          >
            <Trash2 className="h-4 w-4" />
          </button>
        )}
      </div>
    </div>
  );
}

function MessageContent({
  content,
  isOwnMessage,
  attachments,
  onPreviewFile,
  onDeleteAttachment,
  isDeletable
}: {
  content: string;
  isOwnMessage: boolean;
  attachments?: Attachment[];
  onPreviewFile?: (file: { fileName: string; fileUrl: string; fileSize: number }) => void;
  onDeleteAttachment?: (attachmentId: string) => void;
  isDeletable?: boolean;
}) {
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

  const setupCodeBlocks = useCallback((element: HTMLDivElement | null) => {
    if (!element) return;

    const preElements = element.querySelectorAll("pre");
    preElements.forEach((pre) => {
      if (pre.dataset.copyCodeReady === "true") return;

      pre.dataset.copyCodeReady = "true";

      const wrapper = document.createElement("div");
      wrapper.className = "code-block-wrapper relative w-full my-3";

      pre.parentNode?.insertBefore(wrapper, pre);
      wrapper.appendChild(pre);

      pre.style.margin = "0";
      pre.style.paddingTop = "3rem";
      pre.style.paddingRight = "3.25rem";

      const button = document.createElement("button");
      button.type = "button";
      button.dataset.copyCodeButton = "true";
      button.className = "code-copy-btn absolute top-3 right-3 h-8 w-8 rounded-md transition-all z-30 cursor-pointer flex items-center justify-center shadow-sm";
      button.title = "Copy code";
      button.setAttribute("aria-label", "Copy code");
      button.style.border = "1px solid color-mix(in oklab, var(--code-block-border) 80%, white 10%)";
      button.style.background = "color-mix(in oklab, var(--code-block-bg) 84%, black 16%)";
      button.style.color = "var(--code-block-foreground)";
      button.style.backdropFilter = "blur(8px)";
      button.style.opacity = "1";
      button.style.pointerEvents = "auto";

      button.innerHTML = `
        <svg xmlns="http://www.w3.org/2000/svg" width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round" class="h-3.5 w-3.5">
          <rect width="14" height="14" x="8" y="8" rx="2" ry="2"/><path d="M4 16c-1.1 0-2-.9-2-2V4c0-1.1.9-2 2-2h10c1.1 0 2 .9 2 2"/>
        </svg>
      `;

      button.addEventListener("mouseenter", () => {
        button.style.background = "color-mix(in oklab, var(--code-block-bg) 72%, black 28%)";
      });

      button.addEventListener("mouseleave", () => {
        button.style.background = "color-mix(in oklab, var(--code-block-bg) 84%, black 16%)";
      });

      button.addEventListener("click", (e) => {
        e.stopPropagation();
        e.preventDefault();
        const codeText = pre.querySelector("code")?.innerText || pre.innerText;
        navigator.clipboard.writeText(codeText).then(() => {
          button.innerHTML = `
            <svg xmlns="http://www.w3.org/2000/svg" width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round" class="h-3.5 w-3.5 text-emerald-400">
              <polyline points="20 6 9 17 4 12"/>
            </svg>
          `;
          setTimeout(() => {
            button.innerHTML = `
              <svg xmlns="http://www.w3.org/2000/svg" width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round" class="h-3.5 w-3.5">
                <rect width="14" height="14" x="8" y="8" rx="2" ry="2"/><path d="M4 16c-1.1 0-2-.9-2-2V4c0-1.1.9-2 2-2h10c1.1 0 2 .9 2 2"/>
              </svg>
            `;
          }, 2000);
        });
      });

      wrapper.appendChild(button);
    });
  }, []);

  const setContentRef = useCallback(
    (element: HTMLDivElement | null) => {
      contentRef.current = element;
      updateLongMessageState(element);
      setupCodeBlocks(element);
    },
    [updateLongMessageState, setupCodeBlocks]
  );

  useEffect(() => {
    const element = contentRef.current;
    if (!element) return;

    const observer = new ResizeObserver(() => {
      updateLongMessageState(element);
    });
    observer.observe(element);

    return () => {
      observer.disconnect();
    };
  }, [updateLongMessageState]);

  useEffect(() => {
    setupCodeBlocks(contentRef.current);
  }, [content, isExpanded, isLongMessage, isCollapsed, attachments, setupCodeBlocks]);

  return (
    <div className="space-y-2">
      <div
        ref={setContentRef}
        style={
          isCollapsed
            ? {
              maxHeight: `${COLLAPSED_MAX_HEIGHT}px`,
              overflow: "hidden",
              WebkitMaskImage: "linear-gradient(to bottom, black 0%, black 65%, transparent 100%)",
              maskImage: "linear-gradient(to bottom, black 0%, black 65%, transparent 100%)",
            }
            : undefined
        }
        className={`chat-rich-text whitespace-pre-wrap wrap-anywhere text-sm leading-relaxed max-w-none transition-[max-height] duration-200
          [&_b]:font-bold [&_strong]:font-bold [&_i]:italic [&_em]:italic [&_u]:underline [&_ul]:ml-5 [&_ol]:ml-5 [&_p]:m-0 [&_blockquote]:pl-4
          text-foreground ${isOwnMessage ? "chat-rich-text--own" : ""}`}
        dangerouslySetInnerHTML={{ __html: renderMentionTokens(content) }}
      />

      {isLongMessage ? (
        <button
          type="button"
          onClick={() => setIsExpanded((prev) => !prev)}
          className="flex items-center gap-1.5 text-xs font-semibold text-primary hover:text-primary/80 transition-colors mt-2 group"
        >
          <span>{isExpanded ? "Read less" : "Read more"}</span>
          <ChevronDown size={13} className={`transition-transform duration-200 ${isExpanded ? "rotate-180" : ""}`} />
        </button>
      ) : null}

      {attachments && attachments.length > 0 && (
        <div className="mt-1 flex flex-col gap-1">
          {attachments.map((att) => (
            <FileAttachment
              key={att.id}
              attachment={att}
              isOwnMessage={isOwnMessage}
              onPreviewFile={onPreviewFile}
              onDelete={onDeleteAttachment}
              isDeletable={isDeletable}
            />
          ))}
        </div>
      )}
    </div>
  );
}

export default function DirectMessagePage() {
  const params = useParams();
  const router = useRouter();
  const conversationId = params.id as string;

  const { user, isLoading: isLoadingUser } = useAuthProfile({ enabled: true });
  const {
    messages,
    isLoading: isLoadingMessages,
    hasNextPage,
    fetchNextPage,
    isFetchingNextPage,
    refetch,
  } = useDirectMessages(conversationId);

  const [socketMessages, setSocketMessages] = useState<Message[]>([]);
  const { data: conversationsData } = useConversations();
  const activeConversation = useMemo(() => {
    return conversationsData?.data?.find((c) => c.id === conversationId);
  }, [conversationsData, conversationId]);

  const otherUser = activeConversation?.otherUser;
  const otherUserId = otherUser?.id;

  const [onlineUsers, setOnlineUsers] = useState<Set<string>>(new Set());
  const { clearDm } = useUnreadStore();
  const queryClient = useQueryClient();
  const lastReadConversationIdRef = useRef<string | null>(null);
  const [editingMessageId, setEditingMessageId] = useState<string | null>(null);
  const [localOverrides, setLocalOverrides] = useState<Record<string, { content?: string; isDeleted?: boolean; updated_at?: string; attachments?: Attachment[] }>>({});

  const [prevConversationId, setPrevConversationId] = useState(conversationId);
  if (conversationId !== prevConversationId) {
    setPrevConversationId(conversationId);
    setSocketMessages([]);
    setLocalOverrides({});
    setEditingMessageId(null);
  }

  // Clear unread badge for this conversation the moment the user opens it
  // and force a refetch if there were new messages waiting
  useEffect(() => {
    if (!conversationId || lastReadConversationIdRef.current === conversationId) return;

    lastReadConversationIdRef.current = conversationId;
    const hadUnread = (useUnreadStore.getState().dmUnread[conversationId] ?? 0) > 0;

    clearDm(conversationId);
    void messageService.markConversationRead(conversationId);

    if (hadUnread) {
      void refetch();
      void queryClient.invalidateQueries({ queryKey: ["messages", "direct", conversationId] });
      void queryClient.invalidateQueries({ queryKey: ["conversations"] });
    }
  }, [conversationId, clearDm, queryClient, refetch]);
  const [menuOpenMessageId, setMenuOpenMessageId] = useState<string | null>(null);
  const [deleteConfirmOpen, setDeleteConfirmOpen] = useState(false);
  const [messageIdToDelete, setMessageIdToDelete] = useState<string | null>(null);

  // File Preview Modal State
  const [previewFile, setPreviewFile] = useState<{ fileName: string; fileUrl: string; fileSize: number } | null>(null);

  const handleStartEdit = useCallback((message: Message) => {
    setEditingMessageId(message.id);
  }, []);

  const handleCancelEdit = useCallback(() => {
    setEditingMessageId(null);
  }, []);

  const handleUpdateMessage = useCallback(async (messageId: string, content: string): Promise<boolean> => {
    if (!content.trim()) return false;

    // Optimistic UI Update
    setLocalOverrides((prev) => ({
      ...prev,
      [messageId]: {
        content: content,
        updated_at: new Date().toISOString(),
      },
    }));

    try {
      await messageService.editDirectMessage(messageId, content);
      setEditingMessageId(null);
      return true;
    } catch (err: unknown) {
      console.error("Failed to edit message:", err);
      toast.error("Failed to edit message.");
      // Rollback optimistic update
      setLocalOverrides((prev) => {
        const copy = { ...prev };
        delete copy[messageId];
        return copy;
      });
      return false;
    }
  }, []);

  const handleDeleteMessage = useCallback((messageId: string) => {
    setMessageIdToDelete(messageId);
    setDeleteConfirmOpen(true);
  }, []);

  const handleDeleteMessageConfirm = useCallback(() => {
    if (!messageIdToDelete) return;
    const messageId = messageIdToDelete;

    setDeleteConfirmOpen(false);
    setMessageIdToDelete(null);

    // Optimistic UI Update
    setLocalOverrides((prev) => ({
      ...prev,
      [messageId]: {
        isDeleted: true,
      },
    }));

    messageService.deleteDirectMessage(messageId)
      .then(() => {
        toast.success("Message deleted");
      })
      .catch((err) => {
        console.error("Failed to delete message:", err);
        toast.error("Failed to delete message");
        // Rollback optimistic update
        setLocalOverrides((prev) => {
          const copy = { ...prev };
          delete copy[messageId];
          return copy;
        });
      });
  }, [messageIdToDelete]);

  const handleThreeDotClick = useCallback((e: React.MouseEvent) => {
    e.preventDefault();
    e.stopPropagation();

    const customEvent = new MouseEvent("contextmenu", {
      bubbles: true,
      cancelable: true,
      view: window,
      clientX: e.clientX,
      clientY: e.clientY,
    });

    e.currentTarget.dispatchEvent(customEvent);
  }, []);

  const scrollContainerRef = useRef<HTMLDivElement>(null);
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const hasInitializedScrollRef = useRef(false);
  const pendingHistoryLoadRef = useRef(false);
  const previousScrollHeightRef = useRef(0);
  const previousScrollTopRef = useRef(0);
  const previousMessageCountRef = useRef(0);
  const shouldSmoothScrollRef = useRef(false);
  const stickToBottomRef = useRef(true);

  const createMessage = useCreateDirectMessage(conversationId);

  useEffect(() => {
    if (!isLoadingUser && !user) {
      router.push("/login");
    }
  }, [user, isLoadingUser, router]);

  // SOCKET LOGIC - Listen to global socket connections
  useEffect(() => {
    if (!user?.id || !conversationId) return;

    const socket = getSocket();
    if (!socket) return;

    const handleMessageCreated = (message: Message & { conversation_id?: string }) => {
      if (message.conversation_id !== conversationId) return;
      setSocketMessages((prev) => {
        if (prev.some((item) => item.id === message.id)) {
          return prev;
        }
        return [...prev, message];
      });
    };

    const handleMessageUpdated = (message: Message & { conversation_id?: string }) => {
      if (message.conversation_id !== conversationId) return;
      setSocketMessages((prev) => {
        return prev.map(m => m.id === message.id ? message : m);
      });
      setLocalOverrides((prev) => ({
        ...prev,
        [message.id]: {
          content: message.content,
          updated_at: message.updated_at,
          isDeleted: false,
          attachments: message.attachments
        }
      }));
    };

    const handleMessageDeleted = (data: { id: string; conversation_id: string }) => {
      if (data.conversation_id !== conversationId) return;
      setLocalOverrides((prev) => ({
        ...prev,
        [data.id]: {
          isDeleted: true
        }
      }));
    };

    socket.on("dm:message_created", handleMessageCreated);
    socket.on("dm:message_updated", handleMessageUpdated);
    socket.on("dm:message_deleted", handleMessageDeleted);

    return () => {
      socket.off("dm:message_created", handleMessageCreated);
      socket.off("dm:message_updated", handleMessageUpdated);
      socket.off("dm:message_deleted", handleMessageDeleted);
    };
  }, [conversationId, user?.id]);

  useEffect(() => {
    const socket = getSocket();
    if (!socket) return;

    const handleOnlineList = (userIds: string[]) => {
      setOnlineUsers(new Set(userIds));
    };

    const handleStatusChanged = ({ userId, status }: { userId: string; status: "online" | "offline" }) => {
      setOnlineUsers((prev) => {
        const next = new Set(prev);
        if (status === "online") {
          next.add(userId);
        } else {
          next.delete(userId);
        }
        return next;
      });
    };

    socket.on("user:online_list", handleOnlineList);
    socket.on("user:status_changed", handleStatusChanged);

    return () => {
      socket.off("user:online_list", handleOnlineList);
      socket.off("user:status_changed", handleStatusChanged);
    };
  }, []);

  const allMessages = useMemo(() => {
    const uniqueMessages = new Map<string, Message>();

    messages?.forEach((msg: Message) => uniqueMessages.set(msg.id, msg));
    socketMessages?.forEach((msg: Message) => uniqueMessages.set(msg.id, msg));

    return Array.from(uniqueMessages.values())
      .map((msg) => {
        const override = localOverrides[msg.id];
        if (override) {
          return {
            ...msg,
            content: override.content ?? msg.content,
            updated_at: override.updated_at ?? msg.updated_at,
            isDeleted: override.isDeleted ?? false,
            attachments: override.attachments ?? msg.attachments,
          } as Message;
        }
        return msg;
      })
      .filter((msg: Message & { isDeleted?: boolean }) => !msg.isDeleted)
      .sort((a, b) => new Date(a.created_at).getTime() - new Date(b.created_at).getTime());
  }, [messages, socketMessages, localOverrides]);

  const handleDeleteAttachment = useCallback((attachmentId: string) => {
    const parentMessage = allMessages.find(m => m.attachments?.some(a => a.id === attachmentId));
    if (!parentMessage) return;

    const remainingAttachments = parentMessage.attachments?.filter(a => a.id !== attachmentId) || [];

    // Optimistic UI Update
    setLocalOverrides((prev) => ({
      ...prev,
      [parentMessage.id]: {
        ...prev[parentMessage.id],
        attachments: remainingAttachments,
      },
    }));

    messageService.deleteAttachment(attachmentId)
      .then(() => {
        toast.success("Attachment deleted successfully");
      })
      .catch((err) => {
        console.error("Failed to delete attachment:", err);
        toast.error("Failed to delete attachment");
        // Rollback optimistic update
        setLocalOverrides((prev) => {
          const copy = { ...prev };
          delete copy[parentMessage.id];
          return copy;
        });
      });
  }, [allMessages]);

  const editingMessage = useMemo(() => {
    return allMessages.find((m) => m.id === editingMessageId) || null;
  }, [editingMessageId, allMessages]);

  const scrollToBottom = useCallback((behavior: ScrollBehavior) => {
    const container = scrollContainerRef.current;
    if (!container) return;

    const performScroll = () => {
      container.scrollTo({
        top: container.scrollHeight,
        behavior,
      });
    };

    performScroll();
    if (behavior === "auto") {
      setTimeout(performScroll, 50);
    }
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

    if (!(target instanceof HTMLImageElement)) return;

    if (!hasInitializedScrollRef.current || stickToBottomRef.current) {
      scrollToBottom("auto");
    }
  }, [scrollToBottom]);

  const handleSendMessage = async (content: string, attachments: File[]): Promise<boolean> => {
    shouldSmoothScrollRef.current = true;
    stickToBottomRef.current = true;

    try {
      let uploadedAttachments: Attachment[] | undefined = undefined;
      if (attachments && attachments.length > 0) {
        uploadedAttachments = await messageService.uploadFiles(conversationId, attachments);
      }
      await createMessage.mutateAsync({ content, attachments: uploadedAttachments });
      return true;
    } catch (error) {
      console.error("Failed to send direct message:", error);
      toast.error("Failed to send message.");
      return false;
    }
  };

  const otherUserName = useMemo(() => {
    if (otherUser?.name) return otherUser.name;
    if (messages && messages.length > 0) {
      const messageSender = messages.find((m) => m.user_id !== user?.id);
      if (messageSender) {
        return messageSender.user_name;
      }
    }
    return "Conversation";
  }, [otherUser, messages, user?.id]);

  if (isLoadingUser || (conversationId && isLoadingMessages)) {
    return <Spinner size="lg" />;
  }

  return (
    <div className="flex min-h-0 flex-1 overflow-hidden bg-background">
      <section className="flex h-full min-h-0 flex-1 flex-col">
        {/* Chat header area */}
        <header className="flex h-16 shrink-0 items-center justify-between border-b border-border bg-card px-6 lg:px-8 shadow-xs select-none">
          <div className="flex items-center gap-3">
            <Link href="/dashboard" className="text-muted-foreground hover:text-foreground transition-colors md:hidden">
              <ArrowLeft className="h-5 w-5" />
            </Link>
            <Avatar className="h-8 w-8 rounded-lg border border-primary/20 bg-primary/10 select-none">
              <AvatarImage src={otherUser?.avatar_url ? buildAuthenticatedFileUrl(otherUser.avatar_url) : undefined} />
              <AvatarFallback className="bg-transparent text-primary font-bold text-xs uppercase">
                {getInitials(otherUserName)}
              </AvatarFallback>
            </Avatar>
            <div>
              <h1 className="text-base font-bold text-foreground truncate max-w-[180px] sm:max-w-xs">{otherUserName}</h1>
              {otherUserId && onlineUsers.has(otherUserId) ? (
                <p className="text-[10px] font-bold text-emerald-500 uppercase tracking-wider mt-0.5 flex items-center gap-1.5 select-none">
                  <span className="h-1.5 w-1.5 rounded-full bg-emerald-500 animate-pulse" />
                  Online
                </p>
              ) : (
                <p className="text-[10px] font-bold text-slate-400 uppercase tracking-wider mt-0.5 flex items-center gap-1.5 select-none">
                  <span className="h-1.5 w-1.5 rounded-full bg-slate-400" />
                  Offline
                </p>
              )}
            </div>
          </div>
        </header>

        {/* Message logs region */}
        <ScrollArea
          viewportRef={scrollContainerRef}
          onScroll={handleScroll}
          className="h-full flex-1"
        >
          <div
            onLoadCapture={handleMessageMediaLoad}
            className="flex min-h-full flex-col justify-end px-6 py-5 lg:px-8"
          >
            {allMessages.length === 0 ? (
              <div className="my-auto flex flex-col items-center justify-center rounded-3xl border border-dashed border-border bg-muted/20 p-10 text-center">
                <MessageSquareText className="mb-4 h-12 w-12 text-primary/60" />
                <h2 className="text-lg font-semibold text-foreground">No conversation yet</h2>
                <p className="mt-2 max-w-md text-sm text-muted-foreground">
                  Direct Messages are secure and end-to-end authenticated. Start by saying hello!
                </p>
              </div>
            ) : (
              <div className="space-y-4">
                {isFetchingNextPage ? (
                  <div className="flex items-center justify-center py-2 text-muted-foreground">
                    <Spinner size="sm" />
                  </div>
                ) : null}
                {allMessages.map((msg) => {
                  const isOwnMessage = msg.user_id === user?.id;
                  const isEditable = isOwnMessage && (new Date().getTime() - new Date(msg.created_at).getTime() < 5 * 60 * 1000);
                  const isDeletable = isOwnMessage && (new Date().getTime() - new Date(msg.created_at).getTime() < 5 * 60 * 1000);

                  return (
                    <div
                      key={msg.id}
                      className={`flex gap-3 items-start ${isOwnMessage ? "flex-row-reverse" : ""}`}
                    >
                      <ContextMenu
                        onOpenChange={(open) => {
                          if (open) {
                            setMenuOpenMessageId(msg.id);
                          } else if (menuOpenMessageId === msg.id) {
                            setMenuOpenMessageId(null);
                          }
                        }}
                      >
                        <ContextMenuTrigger asChild>
                          <div
                            className={`min-w-0 max-w-[85%] px-4 py-2.5 pr-4 transition-all relative group ${isOwnMessage
                              ? "rounded-2xl rounded-tr-none bg-primary/10 text-foreground cursor-context-menu"
                              : "rounded-2xl rounded-tl-none bg-muted/95 text-foreground"
                            }`}
                          >
                            {/* WhatsApp Speech Bubble Tail */}
                            {isOwnMessage ? (
                              <div className="absolute top-0 right-[-8px] text-primary/10 w-2 h-[13px] fill-current pointer-events-none">
                                <svg viewBox="0 0 8 13" className="w-full h-full">
                                  <path d="M5.188 0H0v11.193l6.467-6.467C7.523 3.67 6.947 0 5.188 0z" />
                                </svg>
                              </div>
                            ) : (
                              <div className="absolute top-0 left-[-8px] text-muted/95 w-2 h-[13px] fill-current pointer-events-none">
                                <svg viewBox="0 0 8 13" className="w-full h-full">
                                  <path d="M2.812 0H8v11.193L1.533 4.726C.477 3.67 1.053 0 2.812 0z" />
                                </svg>
                              </div>
                            )}

                            {editingMessageId !== msg.id && (
                              <button
                                onClick={handleThreeDotClick}
                                className={`hidden md:flex absolute top-1/2 -translate-y-1/2 h-7 w-7 rounded-lg text-muted-foreground hover:text-foreground items-center justify-center hover:bg-black/5 dark:hover:bg-white/10 transition-all duration-150 z-20 cursor-pointer ${menuOpenMessageId === msg.id
                                  ? "md:opacity-100 text-foreground bg-black/5 dark:bg-white/10"
                                  : "md:opacity-0 md:group-hover:opacity-100"
                                } ${isOwnMessage ? "left-[-36px]" : "right-[-36px]"
                                }`}
                                title="Message actions"
                              >
                                <MoreHorizontal size={14} />
                              </button>
                            )}

                            <div className="flex flex-col">
                              <MessageContent
                                content={msg.content}
                                isOwnMessage={isOwnMessage}
                                attachments={msg.attachments}
                                onPreviewFile={setPreviewFile}
                                onDeleteAttachment={handleDeleteAttachment}
                                isDeletable={isDeletable}
                              />
                              <div className="flex items-center justify-end gap-1 mt-1.5 self-end select-none">
                                <span className="text-[9.5px] text-muted-foreground/80 font-medium">
                                  {new Date(msg.created_at).toLocaleTimeString([], {
                                    hour: "2-digit",
                                    minute: "2-digit",
                                  })}
                                </span>
                                {msg.updated_at && new Date(msg.updated_at).getTime() > new Date(msg.created_at).getTime() + 1000 && (
                                  <span className="text-[9.5px] text-muted-foreground/60">(edited)</span>
                                )}
                              </div>
                            </div>
                          </div>
                        </ContextMenuTrigger>
                        <ContextMenuContent className="w-[170px]">
                          <ContextMenuItem
                            onClick={() => {
                              const parser = new DOMParser();
                              const doc = parser.parseFromString(msg.content, "text/html");
                              const text = doc.body.textContent || "";
                              navigator.clipboard.writeText(text);
                              toast.success("Message copied");
                            }}
                          >
                            <Copy className="mr-2 h-4 w-4 text-muted-foreground" />
                            <span>Copy Message</span>
                          </ContextMenuItem>
                          {msg.content.includes("<pre>") && (
                            <ContextMenuItem
                              onClick={() => {
                                const parser = new DOMParser();
                                const doc = parser.parseFromString(msg.content, "text/html");
                                const codeElements = doc.querySelectorAll("pre code");
                                if (codeElements.length > 0) {
                                  const codeText = Array.from(codeElements).map(el => el.textContent || "").join("\n\n---\n\n");
                                  navigator.clipboard.writeText(codeText);
                                } else {
                                  const preElements = doc.querySelectorAll("pre");
                                  const preText = Array.from(preElements).map(el => el.textContent || "").join("\n\n---\n\n");
                                  navigator.clipboard.writeText(preText);
                                }
                                toast.success("Code copied");
                              }}
                            >
                              <Copy className="mr-2 h-4 w-4 text-muted-foreground" />
                              <span>Copy Code Block</span>
                            </ContextMenuItem>
                          )}
                          {isEditable && (
                            <ContextMenuItem
                              onClick={() => handleStartEdit(msg)}
                            >
                              <Pencil className="mr-2 h-4 w-4 text-muted-foreground" />
                              <span>Edit Message</span>
                            </ContextMenuItem>
                          )}
                          {isDeletable && (
                            <>
                              <ContextMenuSeparator />
                              <ContextMenuItem
                                variant="destructive"
                                onClick={() => handleDeleteMessage(msg.id)}
                              >
                                <Trash2 className="mr-2 h-4 w-4" />
                                <span>Delete Message</span>
                              </ContextMenuItem>
                            </>
                          )}
                        </ContextMenuContent>
                      </ContextMenu>
                    </div>
                  );
                })}
                <div ref={messagesEndRef} />
              </div>
            )}
          </div>
        </ScrollArea>

        {/* Input box */}
        <div className="border-t border-border bg-background/85 px-6 py-4 backdrop-blur-md lg:px-8">
          <ChatInputBox
            key={conversationId}
            channelName={otherUserName}
            onSendMessage={handleSendMessage}
            isPending={createMessage.isPending}
            editingMessage={editingMessage}
            onUpdateMessage={handleUpdateMessage}
            onCancelEdit={handleCancelEdit}
          />
        </div>
      </section>

      {/* Delete Confirmation Modal */}
      <DeleteMessageDialog
        open={deleteConfirmOpen}
        onOpenChange={setDeleteConfirmOpen}
        onConfirm={handleDeleteMessageConfirm}
      />

      {/* File Previewer dialog */}
      <FilePreviewDialog
        open={!!previewFile}
        onOpenChange={(open) => {
          if (!open) setPreviewFile(null);
        }}
        fileName={previewFile?.fileName || ""}
        fileUrl={previewFile?.fileUrl || ""}
        fileSize={previewFile?.fileSize || 0}
      />
    </div>
  );
}
