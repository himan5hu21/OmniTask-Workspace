import { useRef, useState } from "react";
import { useEditor, EditorContent } from '@tiptap/react';
import StarterKit from '@tiptap/starter-kit';
import Placeholder from '@tiptap/extension-placeholder';
import { 
  Paperclip, Code, Bold, Italic, CheckSquare, Send, Image as ImageIcon, 
  List, ListOrdered, Strikethrough, X, FileText
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { OrbitalLoader } from "@/components/ui/orbital-loader";

export default function ChatInputBox({ 
  channelName, 
  onSendMessage, 
  isPending,
  onAddTask
}: { 
  channelName: string; 
  onSendMessage: (text: string, attachments: File[]) => void; 
  isPending: boolean;
  onAddTask?: () => void;
}) {
  const [attachments, setAttachments] = useState<File[]>([]);
  const [isEditorEmpty, setIsEditorEmpty] = useState(true);
  const [, forceUpdate] = useState({});
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
    onUpdate: ({ editor }) => {
      setIsEditorEmpty(editor.getText().trim() === "");
    },
    editorProps: {
      attributes: {
        class: 'chat-editor relative max-h-40 w-full resize-none bg-transparent px-2 py-1 text-base outline-none overflow-y-auto custom-scrollbar max-w-none focus:outline-none whitespace-pre-wrap wrap-anywhere [&_p]:m-0 [&_ol]:m-0 [&_ul]:m-0',
      },
      handleKeyDown: (view, event) => {
        // 1. ENTER (Without Shift) -> Send Message
        if (event.key === 'Enter' && !event.shiftKey) {
          event.preventDefault();
          const htmlContent = view.state.doc.textContent.trim() ? editor?.getHTML() : "";
          
          if (htmlContent || attachments.length > 0) {
            onSendMessage(htmlContent || "", attachments);
            editor?.commands.clearContent();
            setAttachments([]);
            setIsEditorEmpty(true);
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

  const handleFileSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files.length > 0) {
      const newFiles = Array.from(e.target.files);
      setAttachments((prev) => [...prev, ...newFiles]);
    }
    if (fileInputRef.current) fileInputRef.current.value = "";
  };

  const removeAttachment = (indexToRemove: number) => {
    setAttachments((prev) => prev.filter((_, index) => index !== indexToRemove));
  };

  const handleSend = () => {
    const htmlContent = editor?.getText().trim() ? editor.getHTML() : "";
    if (!htmlContent && attachments.length === 0) return;
    
    onSendMessage(htmlContent, attachments);
    editor?.commands.clearContent();
    setAttachments([]);
    setIsEditorEmpty(true);
  };

  if (!editor) return null;

  return (
    <div className="flex flex-col rounded-2xl border border-input bg-background p-3 shadow-sm transition-all focus-within:border-ring/50 focus-within:ring-4 focus-within:ring-ring/15">
      
      {attachments.length > 0 && (
        <div className="mb-3 flex flex-wrap gap-2 border-b border-border/40 pb-3">
          {attachments.map((file, index) => (
            <div key={index} className="relative flex items-center gap-2 rounded-lg border border-border bg-muted/30 px-3 py-2 text-sm">
              {file.type.startsWith("image/") ? (
                <ImageIcon className="h-4 w-4 text-primary" />
              ) : (
                <FileText className="h-4 w-4 text-primary" />
              )}
              <span className="max-w-[120px] truncate font-medium text-foreground">{file.name}</span>
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

      <EditorContent editor={editor} className="chat-editor min-h-[24px]" />
      <input type="file" multiple hidden ref={fileInputRef} onChange={handleFileSelect} />

      <div className="mt-2 flex items-center justify-between border-t border-border/40 pt-2">
        <div className="flex flex-wrap items-center gap-0.5 text-muted-foreground">
          
            <Button variant="ghost" size="icon" className="h-8 w-8 rounded-full hover:text-foreground" onClick={() => fileInputRef.current?.click()} title="Attach file">
              <Paperclip className="h-4 w-4" />
            </Button>

            <Button 
              variant="ghost" 
              size="icon" 
              className="h-8 w-8 rounded-full hover:text-primary hover:bg-primary/10" 
              onClick={onAddTask}
              title="Create Task"
            >
              <CheckSquare className="h-4 w-4" />
            </Button>
            
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
          disabled={(isEditorEmpty && attachments.length === 0) || isPending}
          className="h-8 rounded-xl px-4 font-semibold shrink-0"
        >
          {isPending ? <OrbitalLoader size="sm" variant="minimal" /> : <Send className="h-4 w-4" />}
        </Button>
      </div>
    </div>
  );
}
