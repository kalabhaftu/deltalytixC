"use client"

import { useCallback, useEffect, useState, useRef } from "react"
import { EditorContent, useEditor } from "@tiptap/react"
import StarterKit from "@tiptap/starter-kit"
import Underline from "@tiptap/extension-underline"
import Link from "@tiptap/extension-link"
import Image from "@tiptap/extension-image"
import Placeholder from "@tiptap/extension-placeholder"
import { useI18n } from "@/locales/client"
import {
  Bold,
  Italic,
  UnderlineIcon,
  Strikethrough,
  Code,
  LinkIcon,
  ImageIcon,
  List,
  ListOrdered,
  Heading1,
  Heading2,
  Heading3,
  X,
  Save,
} from "lucide-react"
import { Button } from "@/components/ui/button"
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from "@/components/ui/tooltip"
import { cn } from "@/lib/utils"
import { LinkPopup } from "./link-popup"
import { ImagePopup } from "./image-popup"

interface NoteEditorProps {
  initialContent?: string
  onChange?: (content: string) => void
  className?: string
  height?: string
  width?: string
}

export function NoteEditor({
  initialContent = "",
  onChange,
  className,
  height = "400px",
  width = "100%",
}: NoteEditorProps) {
  const t = useI18n()
  const [isMounted, setIsMounted] = useState(false)
  const [lastSaved, setLastSaved] = useState<Date | null>(null)
  const [isSaving, setIsSaving] = useState(false)
  const [linkPopupOpen, setLinkPopupOpen] = useState(false)
  const [imagePopupOpen, setImagePopupOpen] = useState(false)
  const [linkData, setLinkData] = useState({ url: '', text: '' })
  const debounceTimer = useRef<NodeJS.Timeout | null>(null)

  const debouncedOnChange = useCallback((content: string) => {
    if (debounceTimer.current) {
      clearTimeout(debounceTimer.current)
    }
    
    debounceTimer.current = setTimeout(() => {
      onChange?.(content)
    }, 500) // 500ms debounce
  }, [onChange])

  const editor = useEditor({
    extensions: [
      StarterKit,
      Underline,
      Link.configure({
        openOnClick: false,
      }),
      Image,
      Placeholder.configure({
        placeholder: t('mindset.journaling.editorPlaceholder'),
        emptyEditorClass: "cursor-text before:content-[attr(data-placeholder)] before:absolute before:opacity-50 before:pointer-events-none",
      }),
    ],
    content: initialContent,
    immediatelyRender: false,
    onUpdate: ({ editor }) => {
      const content = editor.getHTML()
      debouncedOnChange(content)
    },
  })

  // Cleanup debounce timer on unmount
  useEffect(() => {
    return () => {
      if (debounceTimer.current) {
        clearTimeout(debounceTimer.current)
      }
    }
  }, [])

  // Update editor content when initialContent changes
  useEffect(() => {
    if (editor && initialContent !== undefined && editor.getHTML() !== initialContent) {
      editor.commands.setContent(initialContent)
    }
  }, [editor, initialContent])

  // Add global Ctrl+V support for pasting images
  useEffect(() => {
    if (!editor) return

    const handleGlobalPaste = async (e: KeyboardEvent) => {
      // Only handle Ctrl+V (or Cmd+V on Mac) when editor is focused
      if (!(e.ctrlKey || e.metaKey) || e.key !== 'v') return
      
      // Check if the editor is focused
      if (!editor.isFocused) return

      try {
        // Get clipboard contents
        const clipboardItems = await navigator.clipboard.read()
        
        for (const clipboardItem of clipboardItems) {
          for (const type of clipboardItem.types) {
            if (type.startsWith('image/')) {
              e.preventDefault() // Prevent default paste behavior
              
              const blob = await clipboardItem.getType(type)
              const file = new File([blob], `pasted-image-${Date.now()}.png`, { type })
              
              // Create temporary URL for immediate display
              const tempUrl = URL.createObjectURL(file)
              
              // Insert image immediately
              editor.chain().focus().setImage({ src: tempUrl, alt: 'Pasted image' }).run()
              
              // TODO: Upload to storage in background and update URL
              // For now, the image will be embedded as blob URL
              return
            }
          }
        }
      } catch (error) {
        console.warn('Clipboard paste failed:', error)
        // Don't show error toast for failed paste attempts
      }
    }

    // Add event listener
    document.addEventListener('keydown', handleGlobalPaste)
    
    return () => {
      document.removeEventListener('keydown', handleGlobalPaste)
    }
  }, [editor])

  // Load content from localStorage on mount if storageKey is provided
  useEffect(() => {
    if (typeof window !== "undefined") {
      setIsMounted(true)
    }
  }, [])

  const handleManualSave = useCallback(() => {
    if (!editor) return

    const content = editor.getHTML()
    setIsSaving(true)
    setLastSaved(new Date())
    onChange?.(content)
    setTimeout(() => setIsSaving(false), 500)
  }, [editor, onChange])

  const setLink = useCallback(() => {
    if (!editor) return

    const previousUrl = editor.getAttributes("link").href
    const selectedText = editor.view.state.doc.textBetween(
      editor.view.state.selection.from,
      editor.view.state.selection.to
    )
    
    setLinkData({ url: previousUrl || '', text: selectedText || '' })
    setLinkPopupOpen(true)
  }, [editor])

  const handleLinkConfirm = useCallback((url: string, text?: string) => {
    if (!editor) return

    if (!url) {
      // Remove link if URL is empty
      editor.chain().focus().extendMarkRange("link").unsetLink().run()
      return
    }

    // If there's text and no selection, insert the text with link
    if (text && editor.view.state.selection.empty) {
      editor.chain().focus().insertContent(`<a href="${url}">${text}</a>`).run()
    } else {
      // Update existing selection or link
      editor.chain().focus().extendMarkRange("link").setLink({ href: url }).run()
    }
  }, [editor])

  const addImage = useCallback(() => {
    if (!editor) return
    setImagePopupOpen(true)
  }, [editor])

  const handleImageConfirm = useCallback((imageUrl: string, alt?: string) => {
    if (!editor) return
    editor.chain().focus().setImage({ src: imageUrl, alt: alt || 'Image' }).run()
  }, [editor])


  if (!isMounted) {
    return null
  }

  return (
    <div className={cn("flex flex-col border rounded-md bg-background h-full", className)} style={{ width }}>
      <div 
        className="flex-1 min-h-0 overflow-auto" 
        onClick={() => editor?.commands.focus()}
        style={{ 
          overscrollBehavior: 'contain'
        }}
      >
        <EditorContent 
          editor={editor} 
          className="h-full p-4 prose prose-sm max-w-none [&_.ProseMirror]:outline-none [&_.ProseMirror]:relative [&_.ProseMirror]:h-full" 
        />
      </div>

      {editor && (
        <div className="flex-none border-t flex flex-wrap items-center p-2 gap-1 bg-muted/20">
          <TooltipProvider delayDuration={300}>
            <Tooltip>
              <TooltipTrigger asChild>
                <Button
                  variant="ghost"
                  size="icon"
                  type="button"
                  onClick={() => editor.chain().focus().toggleHeading({ level: 1 }).run()}
                  className={cn("h-8 w-8", editor.isActive("heading", { level: 1 }) && "bg-muted")}
                >
                  <Heading1 className="h-4 w-4" />
                </Button>
              </TooltipTrigger>
              <TooltipContent>Heading 1</TooltipContent>
            </Tooltip>

            <Tooltip>
              <TooltipTrigger asChild>
                <Button
                  variant="ghost"
                  size="icon"
                  type="button"
                  onClick={() => editor.chain().focus().toggleHeading({ level: 2 }).run()}
                  className={cn("h-8 w-8", editor.isActive("heading", { level: 2 }) && "bg-muted")}
                >
                  <Heading2 className="h-4 w-4" />
                </Button>
              </TooltipTrigger>
              <TooltipContent>Heading 2</TooltipContent>
            </Tooltip>

            <Tooltip>
              <TooltipTrigger asChild>
                <Button
                  variant="ghost"
                  size="icon"
                  type="button"
                  onClick={() => editor.chain().focus().toggleHeading({ level: 3 }).run()}
                  className={cn("h-8 w-8", editor.isActive("heading", { level: 3 }) && "bg-muted")}
                >
                  <Heading3 className="h-4 w-4" />
                </Button>
              </TooltipTrigger>
              <TooltipContent>Heading 3</TooltipContent>
            </Tooltip>

            <Tooltip>
              <TooltipTrigger asChild>
                <Button
                  variant="ghost"
                  size="icon"
                  type="button"
                  onClick={() => editor.chain().focus().toggleBold().run()}
                  className={cn("h-8 w-8", editor.isActive("bold") && "bg-muted")}
                >
                  <Bold className="h-4 w-4" />
                </Button>
              </TooltipTrigger>
              <TooltipContent>Bold</TooltipContent>
            </Tooltip>

            <Tooltip>
              <TooltipTrigger asChild>
                <Button
                  variant="ghost"
                  size="icon"
                  type="button"
                  onClick={() => editor.chain().focus().toggleItalic().run()}
                  className={cn("h-8 w-8", editor.isActive("italic") && "bg-muted")}
                >
                  <Italic className="h-4 w-4" />
                </Button>
              </TooltipTrigger>
              <TooltipContent>Italic</TooltipContent>
            </Tooltip>

            <Tooltip>
              <TooltipTrigger asChild>
                <Button
                  variant="ghost"
                  size="icon"
                  type="button"
                  onClick={() => editor.chain().focus().toggleUnderline().run()}
                  className={cn("h-8 w-8", editor.isActive("underline") && "bg-muted")}
                >
                  <UnderlineIcon className="h-4 w-4" />
                </Button>
              </TooltipTrigger>
              <TooltipContent>Underline</TooltipContent>
            </Tooltip>

            <Tooltip>
              <TooltipTrigger asChild>
                <Button
                  variant="ghost"
                  size="icon"
                  type="button"
                  onClick={() => editor.chain().focus().toggleStrike().run()}
                  className={cn("h-8 w-8", editor.isActive("strike") && "bg-muted")}
                >
                  <Strikethrough className="h-4 w-4" />
                </Button>
              </TooltipTrigger>
              <TooltipContent>Strikethrough</TooltipContent>
            </Tooltip>

            <Tooltip>
              <TooltipTrigger asChild>
                <Button
                  variant="ghost"
                  size="icon"
                  type="button"
                  onClick={() => editor.chain().focus().toggleCode().run()}
                  className={cn("h-8 w-8", editor.isActive("code") && "bg-muted")}
                >
                  <Code className="h-4 w-4" />
                </Button>
              </TooltipTrigger>
              <TooltipContent>Code</TooltipContent>
            </Tooltip>

            <Tooltip>
              <TooltipTrigger asChild>
                <Button
                  variant="ghost"
                  size="icon"
                  type="button"
                  onClick={setLink}
                  className={cn("h-8 w-8", editor.isActive("link") && "bg-muted")}
                >
                  <LinkIcon className="h-4 w-4" />
                </Button>
              </TooltipTrigger>
              <TooltipContent>Link</TooltipContent>
            </Tooltip>

            <Tooltip>
              <TooltipTrigger asChild>
                <Button 
                  variant="ghost" 
                  size="icon" 
                  type="button"
                  onClick={addImage} 
                  className="h-8 w-8"
                >
                  <ImageIcon className="h-4 w-4" />
                </Button>
              </TooltipTrigger>
              <TooltipContent>Image</TooltipContent>
            </Tooltip>

            <Tooltip>
              <TooltipTrigger asChild>
                <Button
                  variant="ghost"
                  size="icon"
                  type="button"
                  onClick={() => editor.chain().focus().toggleBulletList().run()}
                  className={cn("h-8 w-8", editor.isActive("bulletList") && "bg-muted")}
                >
                  <List className="h-4 w-4" />
                </Button>
              </TooltipTrigger>
              <TooltipContent>Bullet List</TooltipContent>
            </Tooltip>

            <Tooltip>
              <TooltipTrigger asChild>
                <Button
                  variant="ghost"
                  size="icon"
                  type="button"
                  onClick={() => editor.chain().focus().toggleOrderedList().run()}
                  className={cn("h-8 w-8", editor.isActive("orderedList") && "bg-muted")}
                >
                  <ListOrdered className="h-4 w-4" />
                </Button>
              </TooltipTrigger>
              <TooltipContent>Ordered List</TooltipContent>
            </Tooltip>

            <Tooltip>
              <TooltipTrigger asChild>
                <Button
                  variant="ghost"
                  size="icon"
                  type="button"
                  onClick={() => editor.chain().focus().clearNodes().unsetAllMarks().run()}
                  className="h-8 w-8"
                >
                  <X className="h-4 w-4" />
                </Button>
              </TooltipTrigger>
              <TooltipContent>Clear formatting</TooltipContent>
            </Tooltip>
          </TooltipProvider>
        </div>
      )}

      {/* Link Popup */}
      <LinkPopup
        isOpen={linkPopupOpen}
        onClose={() => setLinkPopupOpen(false)}
        onConfirm={handleLinkConfirm}
        initialUrl={linkData.url}
        initialText={linkData.text}
      />

      {/* Image Popup */}
      <ImagePopup
        isOpen={imagePopupOpen}
        onClose={() => setImagePopupOpen(false)}
        onConfirm={handleImageConfirm}
      />
    </div>
  )
}
