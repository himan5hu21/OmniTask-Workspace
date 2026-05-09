import { useEditor, EditorContent } from '@tiptap/react';
import StarterKit from '@tiptap/starter-kit';
import Placeholder from '@tiptap/extension-placeholder';
import { Bold, Italic, List, ListOrdered, Code, Strikethrough, Quote, ChevronDown, Check } from 'lucide-react';
import { cn } from '@/lib/utils';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";




interface TiptapEditorProps {
  content: string;
  onChange: (html: string) => void;
  onBlur?: () => void;
  placeholder?: string;
  className?: string;
  autoFocus?: boolean;
}

export function TiptapEditor({ 
  content, 
  onChange, 
  onBlur, 
  placeholder = "Write something...", 
  className,
  autoFocus = false
}: TiptapEditorProps) {
  const editor = useEditor({
    immediatelyRender: false,
    extensions: [
      StarterKit,
      Placeholder.configure({
        placeholder,
        emptyEditorClass: 'cursor-text before:content-[attr(data-placeholder)] before:text-muted-foreground before:float-left before:h-0 before:pointer-events-none',
      }),
    ],
    content,
    autofocus: autoFocus ? 'end' : false,
    onUpdate: ({ editor }) => {
      onChange(editor.getHTML());
    },
    onBlur: () => {
      onBlur?.();
    },
    editorProps: {
      attributes: {
        class: cn(
          'prose prose-sm dark:prose-invert max-w-none focus:outline-none min-h-[120px] p-3 text-sm text-foreground custom-scrollbar [&_p]:my-0',
          className
        ),
      },
    },
  });

  if (!editor) return null;

  return (
    <div className="border border-border rounded bg-muted/10 overflow-hidden focus-within:border-primary transition-colors">
      {/* Toolbar */}
      <div className="flex items-center gap-1 px-2 py-1.5 border-b border-border bg-muted/30 overflow-x-auto no-scrollbar">
        <DropdownMenu>
          <DropdownMenuTrigger asChild>
            <button
              type="button"
              className="flex items-center gap-1 px-2 py-1 rounded text-xs font-medium text-muted-foreground hover:text-foreground hover:bg-muted transition-colors outline-none"
            >
              <span className="min-w-[45px] text-left">
                {editor.isActive('heading', { level: 1 }) ? 'H1' :
                 editor.isActive('heading', { level: 2 }) ? 'H2' :
                 editor.isActive('heading', { level: 3 }) ? 'H3' : 'Normal'}
              </span>
              <ChevronDown size={14} className="opacity-50" />
            </button>
          </DropdownMenuTrigger>
          <DropdownMenuContent align="start" className="w-40">
            <DropdownMenuItem 
              onClick={() => editor.chain().focus().setParagraph().run()}
              className={cn("flex items-center justify-between", !editor.isActive('heading') && "bg-muted font-medium")}
            >
              Normal Text
              {!editor.isActive('heading') && <Check size={14} className="text-primary" />}
            </DropdownMenuItem>
            <DropdownMenuItem 
              onClick={() => editor.chain().focus().toggleHeading({ level: 1 }).run()}
              className={cn("flex items-center justify-between font-bold text-lg", editor.isActive('heading', { level: 1 }) && "bg-muted")}
            >
              Heading 1
              {editor.isActive('heading', { level: 1 }) && <Check size={14} className="text-primary" />}
            </DropdownMenuItem>
            <DropdownMenuItem 
              onClick={() => editor.chain().focus().toggleHeading({ level: 2 }).run()}
              className={cn("flex items-center justify-between font-semibold text-base", editor.isActive('heading', { level: 2 }) && "bg-muted")}
            >
              Heading 2
              {editor.isActive('heading', { level: 2 }) && <Check size={14} className="text-primary" />}
            </DropdownMenuItem>
            <DropdownMenuItem 
              onClick={() => editor.chain().focus().toggleHeading({ level: 3 }).run()}
              className={cn("flex items-center justify-between font-medium text-sm", editor.isActive('heading', { level: 3 }) && "bg-muted")}
            >
              Heading 3
              {editor.isActive('heading', { level: 3 }) && <Check size={14} className="text-primary" />}
            </DropdownMenuItem>
          </DropdownMenuContent>
        </DropdownMenu>

        <div className="w-px h-4 bg-border mx-1"></div>



        <button
          type="button"
          onClick={() => editor.chain().focus().toggleBold().run()}
          className={cn(
            "p-1 rounded transition-colors hover:bg-muted",
            editor.isActive('bold') ? "bg-muted text-primary" : "text-muted-foreground hover:text-foreground"
          )}
        >
          <Bold size={16} />
        </button>
        <button
          type="button"
          onClick={() => editor.chain().focus().toggleItalic().run()}
          className={cn(
            "p-1 rounded transition-colors hover:bg-muted",
            editor.isActive('italic') ? "bg-muted text-primary" : "text-muted-foreground hover:text-foreground"
          )}
        >
          <Italic size={16} />
        </button>
        <button
          type="button"
          onClick={() => editor.chain().focus().toggleStrike().run()}
          className={cn(
            "p-1 rounded transition-colors hover:bg-muted",
            editor.isActive('strike') ? "bg-muted text-primary" : "text-muted-foreground hover:text-foreground"
          )}
        >
          <Strikethrough size={16} />
        </button>
        
        <div className="w-px h-3 bg-border mx-1"></div>
        
        <button
          type="button"
          onClick={() => editor.chain().focus().toggleBulletList().run()}
          className={cn(
            "p-1 rounded transition-colors hover:bg-muted",
            editor.isActive('bulletList') ? "bg-muted text-primary" : "text-muted-foreground hover:text-foreground"
          )}
        >
          <List size={16} />
        </button>
        <button
          type="button"
          onClick={() => editor.chain().focus().toggleOrderedList().run()}
          className={cn(
            "p-1 rounded transition-colors hover:bg-muted",
            editor.isActive('orderedList') ? "bg-muted text-primary" : "text-muted-foreground hover:text-foreground"
          )}
        >
          <ListOrdered size={16} />
        </button>
        
        <div className="w-px h-3 bg-border mx-1"></div>
        
        <button
          type="button"
          onClick={() => editor.chain().focus().toggleCodeBlock().run()}
          className={cn(
            "p-1 rounded transition-colors hover:bg-muted",
            editor.isActive('codeBlock') ? "bg-muted text-primary" : "text-muted-foreground hover:text-foreground"
          )}
        >
          <Code size={16} />
        </button>
        <button
          type="button"
          onClick={() => editor.chain().focus().toggleBlockquote().run()}
          className={cn(
            "p-1 rounded transition-colors hover:bg-muted",
            editor.isActive('blockquote') ? "bg-muted text-primary" : "text-muted-foreground hover:text-foreground"
          )}
        >
          <Quote size={16} />
        </button>
      </div>

      <EditorContent editor={editor} />
    </div>
  );
}
