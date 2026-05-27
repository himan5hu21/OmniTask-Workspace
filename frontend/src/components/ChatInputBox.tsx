import { useRef, useState, useEffect, useMemo } from "react";
import dynamic from "next/dynamic";
import { useEditor, EditorContent } from '@tiptap/react';
import StarterKit from '@tiptap/starter-kit';
import Placeholder from '@tiptap/extension-placeholder';
import {
  Paperclip, Code, Bold, Italic, Send, Image as ImageIcon,
  List, ListOrdered, Strikethrough, X, FileText, Smile, Check, Loader2
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { ButtonSpinner } from "@/components/ui/orbital-loader";
import { toast } from "sonner";
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover";
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from "@/components/ui/tooltip";
import type { Message } from "@/api/messages";
import { extractMentionTokens, renderMentionTokens, replaceMentionLabelsWithTokens, stripMentionTokens } from "@/lib/mentions";

const EmojiPicker = dynamic(() => import("emoji-picker-react"), { ssr: false });

type MentionCandidate = {
  id: string;
  name: string;
  avatar_url?: string | null;
};

export default function ChatInputBox({
  channelName,
  onSendMessage,
  isPending,
  editingMessage,
  onUpdateMessage,
  onCancelEdit,
  mentionCandidates = [],
}: {
  channelName: string;
  onSendMessage: (text: string, attachments: File[]) => Promise<boolean>;
  isPending: boolean;
  editingMessage?: Message | null;
  onUpdateMessage?: (messageId: string, text: string) => Promise<boolean>;
  onCancelEdit?: () => void;
  mentionCandidates?: MentionCandidate[];
}) {
  const [attachments, setAttachments] = useState<File[]>([]);
  const [, forceUpdate] = useState({});
  const [isEmojiOpen, setIsEmojiOpen] = useState(false);
  const [mentionState, setMentionState] = useState<{ query: string; from: number; to: number } | null>(null);
  const [activeMentionIndex, setActiveMentionIndex] = useState(0);
  const [selectedMentions, setSelectedMentions] = useState<Array<{ id: string; name: string }>>([]);
  const [prevEditingMessage, setPrevEditingMessage] = useState<Message | null>(null);
  const [isSending, setIsSending] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const filteredMentionCandidates = useMemo(() => {
    if (!mentionState) return [];
    const normalizedQuery = mentionState.query.trim().toLowerCase();
    const candidates = normalizedQuery
      ? mentionCandidates.filter((candidate) => candidate.name.toLowerCase().includes(normalizedQuery))
      : mentionCandidates;
    return candidates.slice(0, 6);
  }, [mentionCandidates, mentionState]);

  const insertMention = (candidate: MentionCandidate) => {
    if (!editor || !mentionState) return;

    editor
      .chain()
      .focus()
      .deleteRange({ from: mentionState.from, to: mentionState.to })
      .insertContent(`@${candidate.name} `)
      .run();

    setSelectedMentions((prev) =>
      prev.some((mention) => mention.id === candidate.id) ? prev : [...prev, { id: candidate.id, name: candidate.name }]
    );
    setMentionState(null);
    setActiveMentionIndex(0);
  };

  // TipTap Editor Setup
  const editor = useEditor({
    immediatelyRender: false,
    extensions: [
      StarterKit,
      Placeholder.configure({
        placeholder: `Message ${channelName || "channel"}...`,
        // 🟢 FIX: Back to float-left but combined with h-0 to collapse the physical space and fix the cursor bug.
        emptyEditorClass: 'cursor-text before:content-[attr(data-placeholder)] before:text-muted-foreground before:float-left before:h-0 before:pointer-events-none',
      }),
    ],
    content: '',
    onTransaction: () => {
      const { selection, doc } = editor?.state ?? {};
      if (selection && doc) {
        const textBefore = doc.textBetween(Math.max(0, selection.from - 80), selection.from, "\n", "\0");
        const match = textBefore.match(/(?:^|\s)@([a-zA-Z0-9._-]*)$/);

        if (match) {
          const query = match[1] ?? "";
          const triggerLength = query.length + 1;
          const from = selection.from - triggerLength;
          setMentionState((prev) => {
            if (prev?.query === query && prev.from === from && prev.to === selection.from) return prev;
            return { query, from, to: selection.from };
          });
        } else {
          setMentionState(null);
          setActiveMentionIndex(0);
        }
      }
      forceUpdate({});
    },

    editorProps: {
      attributes: {
        class: 'chat-editor relative max-h-[220px] w-full min-w-0 resize-none bg-transparent px-2 py-1 text-base outline-none overflow-y-auto custom-scrollbar max-w-none focus:outline-none whitespace-pre-wrap wrap-anywhere [&_p]:m-0 [&_p]:wrap-anywhere [&_ol]:m-0 [&_ul]:m-0 [&_li]:wrap-anywhere [&_pre]:max-w-full [&_pre]:overflow-x-auto [&_pre]:whitespace-pre-wrap [&_pre]:wrap-anywhere [&_pre]:break-words [&_pre_code]:whitespace-pre-wrap [&_pre_code]:wrap-anywhere [&_pre_code]:break-words',
      },
      handleKeyDown: (view, event) => {
        if (mentionState && filteredMentionCandidates.length > 0) {
          if (event.key === "ArrowDown") {
            event.preventDefault();
            setActiveMentionIndex((prev) => {
              const safePrev = prev >= filteredMentionCandidates.length ? 0 : prev;
              return (safePrev + 1) % filteredMentionCandidates.length;
            });
            return true;
          }
          if (event.key === "ArrowUp") {
            event.preventDefault();
            setActiveMentionIndex((prev) => {
              const safePrev = prev >= filteredMentionCandidates.length ? 0 : prev;
              return (safePrev - 1 + filteredMentionCandidates.length) % filteredMentionCandidates.length;
            });
            return true;
          }
          if (event.key === "Enter" || event.key === "Tab") {
            event.preventDefault();
            const safeIndex = activeMentionIndex >= filteredMentionCandidates.length ? 0 : activeMentionIndex;
            insertMention(filteredMentionCandidates[safeIndex]);
            return true;
          }
          if (event.key === "Escape") {
            event.preventDefault();
            setMentionState(null);
            setActiveMentionIndex(0);
            return true;
          }
        }

        // 1. ENTER (Without Shift) -> Send/Update Message
        if (event.key === 'Enter' && !event.shiftKey) {
          event.preventDefault();
          if (isPending || isSending) return true;

          const htmlContent = view.state.doc.textContent.trim()
            ? replaceMentionLabelsWithTokens(editor?.getHTML() ?? "", selectedMentions)
            : "";

          setIsSending(true);
          (async () => {
            try {
              if (editingMessage && onUpdateMessage) {
                if (htmlContent) {
                  const success = await onUpdateMessage(editingMessage.id, htmlContent);
                  if (success) {
                    editor?.commands.clearContent();
                    setSelectedMentions([]);
                  }
                }
              } else {
                if (htmlContent || attachments.length > 0) {
                  const success = await onSendMessage(htmlContent || "", attachments);
                  if (success) {
                    editor?.commands.clearContent();
                    setAttachments([]);
                    setSelectedMentions([]);
                  }
                }
              }
            } finally {
              setIsSending(false);
            }
          })();
          return true;
        }

        // 2. SHIFT + ENTER -> Navi line ke navo list item banavva
        if (event.key === 'Enter' && event.shiftKey) {
          event.preventDefault();

          if (editor?.isActive('codeBlock')) {
            editor.commands.first(({ commands }) => [
              () => commands.newlineInCode(),
              () => commands.insertContent('\n'),
            ]);
            return true;
          }

          if (editor?.isActive('bulletList') || editor?.isActive('orderedList')) {
            const { $from } = view.state.selection;
            // Jo cursor khali (empty) list item par hoy, toh list mathi bahar nikalva:
            if ($from.parent.textContent.trim().length === 0) {
              editor?.commands.liftListItem('listItem');
            } else {
              editor?.commands.splitListItem('listItem');
            }
          } else {
            editor?.commands.splitBlock();
          }
          return true;
        }

        // 3. BACKSPACE -> Khali list item ne normal text ma convert karva mate
        if (event.key === 'Backspace') {
          if (editor?.isActive('bulletList') || editor?.isActive('orderedList')) {
            const { selection } = view.state;
            const { $from, empty } = selection;

            // Jo tame khali list item par backspace dabavo chho:
            if (empty && $from.parent.textContent.length === 0) {
              event.preventDefault();
              editor?.commands.liftListItem('listItem');
              return true;
            }
          }
        }

        return false;
      },
    },
  });

  // Derived state to check if the editor is empty (React Best Practice!)
  const isEditorEmpty = !editor || editor.getText().trim() === "";

  // Derived state to safely clamp active index within candidate bounds (React Best Practice!)
  const safeActiveMentionIndex = activeMentionIndex >= filteredMentionCandidates.length ? 0 : activeMentionIndex;

  // Synchronize editingMessage state changes during render to avoid cascading renders (React Best Practice!)
  if (editingMessage !== prevEditingMessage) {
    setPrevEditingMessage(editingMessage || null);
    setSelectedMentions(editingMessage ? extractMentionTokens(editingMessage.content) : []);
  }

  // Synchronize editingMessage with editor content (external system)
  useEffect(() => {
    if (editor) {
      if (editingMessage) {
        editor.commands.setContent(stripMentionTokens(editingMessage.content));
        editor.commands.focus('end');
      } else {
        editor.commands.setContent('');
      }
    }
  }, [editingMessage, editor]);

  const handleFileSelect = async (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files.length > 0) {
      const selectedFiles = Array.from(e.target.files);
      const DISALLOWED_EXTENSIONS = /\.(exe|bat|cmd|sh|msi|vbs|vbe|wsf|wsh|lnk|com|pif|scr)$/i;
      const DISALLOWED_MIME_TYPES = new Set([
        'application/x-msdownload',
        'application/x-sh',
      ]);
      const MAX_FILE_SIZE = 50 * 1024 * 1024; // 50MB

      const allowedFiles: File[] = [];

      for (const file of selectedFiles) {
        if (file.size > MAX_FILE_SIZE) {
          toast.error(`File "${file.name}" is too large. Maximum size allowed is 50MB.`);
          continue;
        }

        if (DISALLOWED_MIME_TYPES.has(file.type) || DISALLOWED_EXTENSIONS.test(file.name)) {
          toast.error(`File type for "${file.name}" is not allowed for security reasons.`);
          continue;
        }

        // Compress image client-side to make upload 10x faster (React/performance best practice!)
        if (file.type.startsWith('image/') && file.type !== 'image/gif') {
          try {
            const compressed = await compressImage(file);
            allowedFiles.push(compressed);
          } catch {
            allowedFiles.push(file); // fallback to original on compression failure
          }
        } else {
          allowedFiles.push(file);
        }
      }

      if (allowedFiles.length > 0) {
        setAttachments((prev) => [...prev, ...allowedFiles]);
      }
    }
    if (fileInputRef.current) fileInputRef.current.value = "";
  };

  const removeAttachment = (indexToRemove: number) => {
    setAttachments((prev) => prev.filter((_, index) => index !== indexToRemove));
  };

  const handleSend = async () => {
    if (isPending || isSending) return;

    const htmlContent = editor?.getText().trim()
      ? replaceMentionLabelsWithTokens(editor.getHTML(), selectedMentions)
      : "";
    
    setIsSending(true);
    try {
      if (editingMessage && onUpdateMessage) {
        if (!htmlContent) return;
        const success = await onUpdateMessage(editingMessage.id, htmlContent);
        if (success) {
          editor?.commands.clearContent();
          setSelectedMentions([]);
        }
      } else {
        if (!htmlContent && attachments.length === 0) return;
        const success = await onSendMessage(htmlContent, attachments);
        if (success) {
          editor?.commands.clearContent();
          setAttachments([]);
          setSelectedMentions([]);
        }
      }
    } finally {
      setIsSending(false);
    }
  };

  if (!editor) return null;

  return (
    <div className="flex flex-col rounded-2xl border border-input bg-background overflow-hidden shadow-sm transition-all focus-within:border-ring/50 focus-within:ring-4 focus-within:ring-ring/15">

      {editingMessage && (
        <div className="flex items-center justify-between px-4 py-2 bg-primary/5 border-b border-border/40 text-xs text-primary font-medium animate-in slide-in-from-top-2 duration-200">
          <div className="flex items-center gap-2 min-w-0">
            <span className="shrink-0 font-bold uppercase tracking-wider text-[9px] bg-primary/15 text-primary px-1.5 py-0.5 rounded">Editing Message</span>
            <span className="truncate opacity-80" dangerouslySetInnerHTML={{ __html: renderMentionTokens(editingMessage.content) }} />
          </div>
          <button 
            onClick={onCancelEdit}
            className="text-muted-foreground hover:text-foreground transition-colors p-0.5"
            title="Cancel Edit"
          >
            <X className="h-3.5 w-3.5" />
          </button>
        </div>
      )}

      <div className="flex items-center justify-between border-b border-border/40 px-3 py-1.5">
        <div className="flex flex-wrap items-center gap-0.5 text-muted-foreground">

          {!editingMessage && (
            <Button
              variant="ghost"
              size="icon"
              className="h-8 w-8 rounded-full hover:text-foreground"
              onClick={() => fileInputRef.current?.click()}
              title="Attach file"
              disabled={isPending || isSending}
            >
              {isPending || isSending ? (
                <Loader2 className="h-4 w-4 animate-spin text-muted-foreground" />
              ) : (
                <Paperclip className="h-4 w-4" />
              )}
            </Button>
          )}

          <Popover open={isEmojiOpen} onOpenChange={setIsEmojiOpen}>
            <PopoverTrigger asChild>
              <Button
                variant="ghost"
                size="icon"
                className="emoji-popover h-8 w-8 rounded-full hover:text-amber-500 hover:bg-amber-500/10"
                title="Add Emoji"
              >
                <Smile className="h-4 w-4" />
              </Button>
            </PopoverTrigger>
            <PopoverContent
              align="start"
              role="none"
              className="emoji-popover p-0 rounded-md bg-card border-none z-50 w-[350px] min-w-[350px]"
              onFocusOutside={(e) => e.preventDefault()}
            >
              <div className="h-[350px] w-full overflow-hidden">
                <EmojiPicker
                  onEmojiClick={(emojiData) => {
                    editor?.chain().focus().insertContent(emojiData.emoji).run();
                  }}
                  width="100%"
                  height="100%"
                  lazyLoadEmojis={true}
                  previewConfig={{ showPreview: false }}
                />
              </div>
            </PopoverContent>
          </Popover>

          <div className="mx-1 h-4 w-px bg-border/60" />

          <Button
            variant="ghost" size="icon"
            className={`h-8 w-8 rounded-full ${editor.isActive('bold') ? 'bg-primary/15 text-primary font-bold' : 'hover:text-foreground hover:bg-muted'}`}
            onClick={() => editor.chain().focus().toggleBold().run()}
          >
            <Bold className="h-4 w-4" />
          </Button>

          <Button
            variant="ghost" size="icon"
            className={`h-8 w-8 rounded-full ${editor.isActive('italic') ? 'bg-primary/15 text-primary' : 'hover:text-foreground hover:bg-muted'}`}
            onClick={() => editor.chain().focus().toggleItalic().run()}
          >
            <Italic className="h-4 w-4" />
          </Button>

          <Button
            variant="ghost" size="icon"
            className={`h-8 w-8 rounded-full ${editor.isActive('strike') ? 'bg-primary/15 text-primary' : 'hover:text-foreground hover:bg-muted'}`}
            onClick={() => editor.chain().focus().toggleStrike().run()}
          >
            <Strikethrough className="h-4 w-4" />
          </Button>

          <Button
            variant="ghost" size="icon"
            className={`h-8 w-8 rounded-full ${editor.isActive('codeBlock') ? 'bg-primary/15 text-primary' : 'hover:text-foreground hover:bg-muted'}`}
            onClick={() => editor.chain().focus().toggleCodeBlock().run()}
          >
            <Code className="h-4 w-4" />
          </Button>

          <div className="mx-1 h-4 w-px bg-border/60" />

          <Button
            variant="ghost" size="icon"
            className={`h-8 w-8 rounded-full ${editor.isActive('bulletList') ? 'bg-primary/15 text-primary' : 'hover:text-foreground hover:bg-muted'}`}
            onClick={() => editor.chain().focus().toggleBulletList().run()}
          >
            <List className="h-4 w-4" />
          </Button>

          <Button
            variant="ghost" size="icon"
            className={`h-8 w-8 rounded-full ${editor.isActive('orderedList') ? 'bg-primary/15 text-primary' : 'hover:text-foreground hover:bg-muted'}`}
            onClick={() => editor.chain().focus().toggleOrderedList().run()}
          >
            <ListOrdered className="h-4 w-4" />
          </Button>
        </div>

        <Button
          onClick={handleSend}
          disabled={(isEditorEmpty && !editingMessage && attachments.length === 0) || isPending || isSending}
          className="h-8 rounded-xl px-4 font-semibold shrink-0"
        >
          {isPending || isSending ? <ButtonSpinner /> : editingMessage ? <Check className="h-4 w-4" /> : <Send className="h-4 w-4" />}
        </Button>
      </div>

      {attachments.length > 0 && (
        <div className="mb-3 flex flex-wrap gap-2 border-b border-border/40 pb-3">
          {attachments.map((file, index) => (
            <div key={index} className="relative flex items-center gap-2 rounded-lg border border-border bg-muted/30 px-3 py-2 text-sm">
              {file.type.startsWith("image/") ? (
                <ImageIcon className="h-4 w-4 text-primary" />
              ) : (
                <FileText className="h-4 w-4 text-primary" />
              )}
              <TooltipProvider>
                <Tooltip>
                  <TooltipTrigger asChild>
                    <span className="max-w-[120px] truncate font-medium text-foreground cursor-help">{file.name}</span>
                  </TooltipTrigger>
                  <TooltipContent>
                    <p className="font-semibold text-[11px]">{file.name}</p>
                  </TooltipContent>
                </Tooltip>
              </TooltipProvider>
              <button
                onClick={() => removeAttachment(index)}
                className="ml-1 rounded-full bg-background p-0.5 text-muted-foreground hover:text-destructive shadow-sm border border-border/50"
              >
                <X className="h-3 w-3" />
              </button>
            </div>
          ))}
        </div>
      )}

      <EditorContent editor={editor} className="chat-editor min-h-[80px]" />
      {mentionState && filteredMentionCandidates.length > 0 && (
        <div className="border-t border-border/40 bg-card/95 px-2 py-2">
          <div className="mb-1 px-2 text-[10px] font-semibold uppercase tracking-[0.16em] text-muted-foreground">
            Mention someone
          </div>
          <div className="space-y-1">
            {filteredMentionCandidates.map((candidate, index) => (
              <button
                key={candidate.id}
                type="button"
                onClick={() => insertMention(candidate)}
                className={`flex w-full items-center gap-2 rounded-lg px-3 py-2 text-left text-sm transition-colors ${
                  index === safeActiveMentionIndex
                    ? "bg-primary/10 text-primary"
                    : "hover:bg-muted text-foreground"
                }`}
              >
                <div className="flex h-7 w-7 items-center justify-center rounded-full bg-primary/10 text-[11px] font-bold uppercase text-primary">
                  {candidate.name.slice(0, 2)}
                </div>
                <span className="truncate font-medium">{candidate.name}</span>
              </button>
            ))}
          </div>
        </div>
      )}
      <input type="file" multiple hidden ref={fileInputRef} onChange={handleFileSelect} />

    </div>
  );
}

// Client-side image compressor utility (React & performance best practice!)
const compressImage = (file: File, maxWidth = 1200, quality = 0.75): Promise<File> => {
  return new Promise((resolve) => {
    if (!file.type.startsWith("image/") || file.type === "image/gif") {
      return resolve(file);
    }

    const reader = new FileReader();
    reader.readAsDataURL(file);
    reader.onload = (event) => {
      const img = new Image();
      img.src = event.target?.result as string;
      img.onload = () => {
        const canvas = document.createElement("canvas");
        let width = img.width;
        let height = img.height;

        if (width > maxWidth) {
          height = Math.round((height * maxWidth) / width);
          width = maxWidth;
        }

        canvas.width = width;
        canvas.height = height;

        const ctx = canvas.getContext("2d");
        if (!ctx) return resolve(file);

        ctx.drawImage(img, 0, 0, width, height);

        canvas.toBlob(
          (blob) => {
            if (!blob) return resolve(file);
            const dotIndex = file.name.lastIndexOf('.');
            const nameWithoutExt = dotIndex !== -1 ? file.name.substring(0, dotIndex) : file.name;
            const compressedFile = new File([blob], `${nameWithoutExt}.jpg`, {
              type: "image/jpeg",
              lastModified: Date.now(),
            });
            if (compressedFile.size > file.size) {
              resolve(file);
            } else {
              resolve(compressedFile);
            }
          },
          "image/jpeg",
          quality
        );
      };
      img.onerror = () => resolve(file);
    };
    reader.onerror = () => resolve(file);
  });
};
