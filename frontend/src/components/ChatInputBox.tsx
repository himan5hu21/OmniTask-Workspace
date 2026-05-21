import { useRef, useState, useEffect } from "react";
import dynamic from "next/dynamic";
import { useEditor, EditorContent } from '@tiptap/react';
import StarterKit from '@tiptap/starter-kit';
import Placeholder from '@tiptap/extension-placeholder';
import {
  Paperclip, Code, Bold, Italic, Send, Image as ImageIcon,
  List, ListOrdered, Strikethrough, X, FileText, Smile, Check
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

const EmojiPicker = dynamic(() => import("emoji-picker-react"), { ssr: false });

export default function ChatInputBox({
  channelName,
  onSendMessage,
  isPending,
  editingMessage,
  onUpdateMessage,
  onCancelEdit,
}: {
  channelName: string;
  onSendMessage: (text: string, attachments: File[]) => Promise<boolean>;
  isPending: boolean;
  editingMessage?: Message | null;
  onUpdateMessage?: (messageId: string, text: string) => Promise<boolean>;
  onCancelEdit?: () => void;
}) {
  const [attachments, setAttachments] = useState<File[]>([]);
  const [, forceUpdate] = useState({});
  const [isEmojiOpen, setIsEmojiOpen] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);

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
      forceUpdate({});
    },

    editorProps: {
      attributes: {
        class: 'chat-editor relative max-h-[220px] w-full min-w-0 resize-none bg-transparent px-2 py-1 text-base outline-none overflow-y-auto custom-scrollbar max-w-none focus:outline-none whitespace-pre-wrap wrap-anywhere [&_p]:m-0 [&_p]:wrap-anywhere [&_ol]:m-0 [&_ul]:m-0 [&_li]:wrap-anywhere [&_pre]:max-w-full [&_pre]:overflow-x-auto [&_pre]:whitespace-pre-wrap [&_pre]:wrap-anywhere [&_pre]:break-words [&_pre_code]:whitespace-pre-wrap [&_pre_code]:wrap-anywhere [&_pre_code]:break-words',
      },
      handleKeyDown: (view, event) => {
        // 1. ENTER (Without Shift) -> Send/Update Message
        if (event.key === 'Enter' && !event.shiftKey) {
          event.preventDefault();
          const htmlContent = view.state.doc.textContent.trim() ? editor?.getHTML() : "";

          if (editingMessage && onUpdateMessage) {
            if (htmlContent) {
              Promise.resolve(onUpdateMessage(editingMessage.id, htmlContent)).then((success) => {
                if (success) {
                  editor?.commands.clearContent();
                }
              });
            }
          } else {
            if (htmlContent || attachments.length > 0) {
              Promise.resolve(onSendMessage(htmlContent || "", attachments)).then((success) => {
                if (success) {
                  editor?.commands.clearContent();
                  setAttachments([]);
                }
              });
            }
          }
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

  // Synchronize editingMessage with editor content
  useEffect(() => {
    if (editor) {
      if (editingMessage) {
        editor.commands.setContent(editingMessage.content);
        editor.commands.focus('end');
      } else {
        editor.commands.setContent('');
      }
    }
  }, [editingMessage, editor]);

  const handleFileSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
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

        allowedFiles.push(file);
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

  const handleSend = () => {
    const htmlContent = editor?.getText().trim() ? editor.getHTML() : "";
    
    if (editingMessage && onUpdateMessage) {
      if (!htmlContent) return;
      Promise.resolve(onUpdateMessage(editingMessage.id, htmlContent)).then((success) => {
        if (success) {
          editor?.commands.clearContent();
        }
      });
    } else {
      if (!htmlContent && attachments.length === 0) return;
      Promise.resolve(onSendMessage(htmlContent, attachments)).then((success) => {
        if (success) {
          editor?.commands.clearContent();
          setAttachments([]);
        }
      });
    }
  };

  if (!editor) return null;

  return (
    <div className="flex flex-col rounded-2xl border border-input bg-background overflow-hidden shadow-sm transition-all focus-within:border-ring/50 focus-within:ring-4 focus-within:ring-ring/15">

      {editingMessage && (
        <div className="flex items-center justify-between px-4 py-2 bg-primary/5 border-b border-border/40 text-xs text-primary font-medium animate-in slide-in-from-top-2 duration-200">
          <div className="flex items-center gap-2 min-w-0">
            <span className="shrink-0 font-bold uppercase tracking-wider text-[9px] bg-primary/15 text-primary px-1.5 py-0.5 rounded">Editing Message</span>
            <span className="truncate opacity-80" dangerouslySetInnerHTML={{ __html: editingMessage.content }} />
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
            <Button variant="ghost" size="icon" className="h-8 w-8 rounded-full hover:text-foreground" onClick={() => fileInputRef.current?.click()} title="Attach file">
              <Paperclip className="h-4 w-4" />
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
          disabled={(isEditorEmpty && !editingMessage && attachments.length === 0) || isPending}
          className="h-8 rounded-xl px-4 font-semibold shrink-0"
        >
          {isPending ? <ButtonSpinner /> : editingMessage ? <Check className="h-4 w-4" /> : <Send className="h-4 w-4" />}
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
      <input type="file" multiple hidden ref={fileInputRef} onChange={handleFileSelect} />

    </div>
  );
}
