'use client';

// @ts-ignore
import * as React from 'react';
import {Editor, EditorContent, useEditor} from '@tiptap/react';
import StarterKit from '@tiptap/starter-kit';
import { Button } from '@/components/ui/button';
import { Separator } from '@/components/ui/separator';
import { Toggle } from '@/components/ui/toggle';
import {
  Bold,
  Italic,
  Strikethrough,
  Code,
  Heading1,
  Heading2,
  Heading3,
  List,
  ListOrdered,
  Quote,
  Minus,
  Undo,
  Redo,
} from 'lucide-react';
import { cn } from '@/lib/utils';
import {type RefObject, useEffect} from "react";

interface MinimalTiptapProps {
  content?: string;
  onChange?: (content: string) => void;
  placeholder?: string;
  editable?: boolean;
  className?: string;
  onBlur?: () => void;
  onSubmit?: () => void,
  editorRef?: RefObject<Editor | null>;
}

function MinimalTiptap({
  content = '',
  onChange,
  placeholder = 'Start typing...',
  editable = true,
  className,
  onBlur,
  onSubmit,
  editorRef,
}: MinimalTiptapProps) {
  const editor = useEditor({
    extensions: [
      StarterKit.configure({
        bulletList: {
          keepMarks: true,
          keepAttributes: false,
        },
        orderedList: {
          keepMarks: true,
          keepAttributes: false,
        },
      }),
    ],
    content,
    editable,
    onUpdate: ({ editor }) => {
      onChange?.(editor.getHTML());
    },
    editorProps: {
      attributes: {
        class: cn(
          'prose prose-sm sm:prose-base lg:prose-lg xl:prose-2xl mx-auto focus:outline-none',
          'min-h-[200px] p-4 border-0'
        ),
      },
    },
  });

  useEffect(() => {
    if (editorRef){
      editorRef.current = editor
    }
  }, [editor]);

  useEffect(() => {
    if (!onBlur || !editor){
      return
    }
    const handleKeyDown = (event: KeyboardEvent) => {
      if (editor.isFocused && event.key === 'Escape') {
        onBlur()
      }

      if ((event.metaKey || event.ctrlKey) && event.key === 'Enter') {
        event.preventDefault()
        event.stopPropagation()
        onSubmit?.()
      }
    }

    document.addEventListener('keydown', handleKeyDown)
    return () => document.removeEventListener('keydown', handleKeyDown)
  }, [onBlur, editor]);

  if (!editor) {
    return null;
  }

  return (
    <div className={cn('border rounded-lg overflow-hidden', className)}>
      <div className={cn('p-2 flex flex-wrap items-center gap-1', (editable === undefined || editable) ? 'border-b' : null)}>
        <Toggle type={"button"}
          size="sm"
          pressed={editor.isActive('bold')}
          onPressedChange={() => editor.chain().focus().toggleBold().run()}
          disabled={!editor.can().chain().focus().toggleBold().run()}
        >
          <Bold className="h-4 w-4" />
        </Toggle>
        
        <Toggle type={"button"}
          size="sm"
          pressed={editor.isActive('italic')}
          onPressedChange={() => editor.chain().focus().toggleItalic().run()}
          disabled={!editor.can().chain().focus().toggleItalic().run()}
        >
          <Italic className="h-4 w-4" />
        </Toggle>
        
        <Toggle type={"button"}
          size="sm"
          pressed={editor.isActive('strike')}
          onPressedChange={() => editor.chain().focus().toggleStrike().run()}
          disabled={!editor.can().chain().focus().toggleStrike().run()}
        >
          <Strikethrough className="h-4 w-4" />
        </Toggle>
        
        <Toggle type={"button"}
          size="sm"
          pressed={editor.isActive('code')}
          onPressedChange={() => editor.chain().focus().toggleCode().run()}
          disabled={!editor.can().chain().focus().toggleCode().run()}
        >
          <Code className="h-4 w-4" />
        </Toggle>

        <Separator orientation="vertical" className="h-6" />

        <Toggle type={"button"}
          size="sm"
          pressed={editor.isActive('heading', { level: 1 })}
          onPressedChange={() => editor.chain().focus().toggleHeading({ level: 1 }).run()}
        >
          <Heading1 className="h-4 w-4" />
        </Toggle>
        
        <Toggle type={"button"}
          size="sm"
          pressed={editor.isActive('heading', { level: 2 })}
          onPressedChange={() => editor.chain().focus().toggleHeading({ level: 2 }).run()}
        >
          <Heading2 className="h-4 w-4" />
        </Toggle>
        
        <Toggle type={"button"}
          size="sm"
          pressed={editor.isActive('heading', { level: 3 })}
          onPressedChange={() => editor.chain().focus().toggleHeading({ level: 3 }).run()}
        >
          <Heading3 className="h-4 w-4" />
        </Toggle>

        <Separator orientation="vertical" className="h-6" />

        <Toggle type={"button"}
          size="sm"
          pressed={editor.isActive('bulletList')}
          onPressedChange={() => editor.chain().focus().toggleBulletList().run()}
        >
          <List className="h-4 w-4" />
        </Toggle>
        
        <Toggle type={"button"}
          size="sm"
          pressed={editor.isActive('orderedList')}
          onPressedChange={() => editor.chain().focus().toggleOrderedList().run()}
        >
          <ListOrdered className="h-4 w-4" />
        </Toggle>
        
        <Toggle type={"button"}
          size="sm"
          pressed={editor.isActive('blockquote')}
          onPressedChange={() => editor.chain().focus().toggleBlockquote().run()}
        >
          <Quote className="h-4 w-4" />
        </Toggle>

        <Separator orientation="vertical" className="h-6" />

        <Button
          variant="ghost"
          size="sm"
          onClick={() => editor.chain().focus().setHorizontalRule().run()}
        >
          <Minus className="h-4 w-4" />
        </Button>

        <Separator orientation="vertical" className="h-6" />

        <Button
          variant="ghost"
          size="sm"
          onClick={() => editor.chain().focus().undo().run()}
          disabled={!editor.can().chain().focus().undo().run()}
        >
          <Undo className="h-4 w-4" />
        </Button>
        
        <Button
          variant="ghost"
          size="sm"
          onClick={() => editor.chain().focus().redo().run()}
          disabled={!editor.can().chain().focus().redo().run()}
        >
          <Redo className="h-4 w-4" />
        </Button>
      </div>
      
      <EditorContent
        editor={editor} 
        placeholder={placeholder}
      />
    </div>
  );
}

export { MinimalTiptap, type MinimalTiptapProps };