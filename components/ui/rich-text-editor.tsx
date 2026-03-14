import { useEditor, EditorContent } from '@tiptap/react'
import StarterKit from '@tiptap/starter-kit'
import Placeholder from '@tiptap/extension-placeholder'
import Link from '@tiptap/extension-link'
import { Button } from '@/components/ui/button'
import { TextB, TextItalic, TextStrikethrough, TextUnderline, ListBullets, ListNumbers, TextHOne, TextHTwo, TextHThree } from '@phosphor-icons/react'
import Underline from '@tiptap/extension-underline'
import { cn } from '@/lib/utils'
import { useEffect } from 'react'

interface RichTextEditorProps {
    value: string
    onChange: (value: string) => void
    placeholder?: string
    className?: string
}

export function RichTextEditor({ value, onChange, placeholder = 'Write something...', className }: RichTextEditorProps) {
    const editor = useEditor({
        immediatelyRender: false,
        extensions: [
            StarterKit.configure({
                heading: {
                    levels: [1, 2, 3],
                },
            }),
            Underline,
            Placeholder.configure({
                placeholder,
                emptyEditorClass: 'is-editor-empty',
            }),
            Link.configure({
                openOnClick: false,
                HTMLAttributes: {
                    class: 'text-primary underline underline-offset-4',
                },
            }),
        ],
        content: value,
        editorProps: {
            attributes: {
                class: 'prose prose-sm dark:prose-invert max-w-none focus:outline-none min-h-[160px] p-4 text-sm leading-relaxed',
            },
        },
        onUpdate: ({ editor }) => {
            const html = editor.getHTML()
            onChange(html === '<p></p>' ? '' : html)
        },
    })

    // Update content when value prop changes internally
    useEffect(() => {
        if (editor && value !== editor.getHTML() && value !== undefined) {
            if ((value === '' || value === null) && editor.getHTML() === '<p></p>') return;
            editor.commands.setContent(value || '')
        }
    }, [value, editor])

    if (!editor) {
        return <div className="min-h-[160px] bg-muted/20 border-border/50 rounded-xl mt-1 mb-1"></div>
    }

    return (
        <div className={cn("border border-border/50 rounded-xl overflow-hidden bg-background focus-within:border-primary/50 transition-all flex flex-col shadow-sm", className)}>
            <div className="flex items-center gap-1 border-b border-border/50 bg-muted/10 p-1 flex-wrap">
                <Button
                    type="button"
                    variant="ghost"
                    size="icon"
                    onClick={() => editor.chain().focus().toggleBold().run()}
                    className={cn("h-8 w-8 rounded-md transition-all", editor.isActive('bold') && 'bg-primary/20 text-primary')}
                >
                    <TextB className="h-4 w-4" weight={editor.isActive('bold') ? "bold" : "regular"} />
                </Button>
                <Button
                    type="button"
                    variant="ghost"
                    size="icon"
                    onClick={() => editor.chain().focus().toggleItalic().run()}
                    className={cn("h-8 w-8 rounded-md transition-all", editor.isActive('italic') && 'bg-primary/20 text-primary')}
                >
                    <TextItalic className="h-4 w-4" weight={editor.isActive('italic') ? "bold" : "regular"} />
                </Button>
                <Button
                    type="button"
                    variant="ghost"
                    size="icon"
                    onClick={() => editor.chain().focus().toggleUnderline().run()}
                    className={cn("h-8 w-8 rounded-md transition-all", editor.isActive('underline') && 'bg-primary/20 text-primary')}
                >
                    <TextUnderline className="h-4 w-4" weight={editor.isActive('underline') ? "bold" : "regular"} />
                </Button>
                <Button
                    type="button"
                    variant="ghost"
                    size="icon"
                    onClick={() => editor.chain().focus().toggleStrike().run()}
                    className={cn("h-8 w-8 rounded-md transition-all", editor.isActive('strike') && 'bg-primary/20 text-primary')}
                >
                    <TextStrikethrough className="h-4 w-4" weight={editor.isActive('strike') ? "bold" : "regular"} />
                </Button>
                <div className="w-[1px] h-4 bg-border/50 mx-1" />
                <Button
                    type="button"
                    variant="ghost"
                    size="icon"
                    onClick={() => editor.chain().focus().toggleHeading({ level: 1 }).run()}
                    className={cn("h-8 w-8 rounded-md transition-all", editor.isActive('heading', { level: 1 }) && 'bg-primary/20 text-primary')}
                >
                    <TextHOne className="h-4 w-4" weight={editor.isActive('heading', { level: 1 }) ? "bold" : "regular"} />
                </Button>
                <Button
                    type="button"
                    variant="ghost"
                    size="icon"
                    onClick={() => editor.chain().focus().toggleHeading({ level: 2 }).run()}
                    className={cn("h-8 w-8 rounded-md transition-all", editor.isActive('heading', { level: 2 }) && 'bg-primary/20 text-primary')}
                >
                    <TextHTwo className="h-4 w-4" weight={editor.isActive('heading', { level: 2 }) ? "bold" : "regular"} />
                </Button>
                <Button
                    type="button"
                    variant="ghost"
                    size="icon"
                    onClick={() => editor.chain().focus().toggleHeading({ level: 3 }).run()}
                    className={cn("h-8 w-8 rounded-md transition-all", editor.isActive('heading', { level: 3 }) && 'bg-primary/20 text-primary')}
                >
                    <TextHThree className="h-4 w-4" weight={editor.isActive('heading', { level: 3 }) ? "bold" : "regular"} />
                </Button>
                <div className="w-[1px] h-4 bg-border/50 mx-1" />
                <Button
                    type="button"
                    variant="ghost"
                    size="icon"
                    onClick={() => editor.chain().focus().toggleBulletList().run()}
                    className={cn("h-8 w-8 rounded-md transition-all", editor.isActive('bulletList') && 'bg-primary/20 text-primary')}
                >
                    <ListBullets className="h-4 w-4" weight={editor.isActive('bulletList') ? "fill" : "regular"} />
                </Button>
                <Button
                    type="button"
                    variant="ghost"
                    size="icon"
                    onClick={() => editor.chain().focus().toggleOrderedList().run()}
                    className={cn("h-8 w-8 rounded-md transition-all", editor.isActive('orderedList') && 'bg-primary/20 text-primary')}
                >
                    <ListNumbers className="h-4 w-4" weight={editor.isActive('orderedList') ? "fill" : "regular"} />
                </Button>
            </div>
            
            <div className="bg-muted/5 flex-1 relative">
                <EditorContent editor={editor} className="cursor-text h-full" />
                <style jsx global>{`
                    .ProseMirror p.is-editor-empty:first-child::before {
                        color: hsl(var(--muted-foreground));
                        content: attr(data-placeholder);
                        float: left;
                        height: 0;
                        pointer-events: none;
                        opacity: 0.5;
                        font-style: italic;
                    }
                    .ProseMirror {
                        outline: none !important;
                    }
                `}</style>
            </div>
        </div>
    )
}
