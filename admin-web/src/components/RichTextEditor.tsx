import Color from '@tiptap/extension-color';
import Link from '@tiptap/extension-link';
import { TextStyle } from '@tiptap/extension-text-style';
import Underline from '@tiptap/extension-underline';
import { EditorContent, useEditor } from '@tiptap/react';
import StarterKit from '@tiptap/starter-kit';
import {
    Bold,
    Heading2,
    Italic,
    Link2,
    List,
    ListOrdered,
    Palette,
    Quote,
    Redo2,
    RemoveFormatting,
    Strikethrough,
    Underline as UnderlineIcon,
    Undo2,
} from 'lucide-react';
import { useEffect, useRef } from 'react';

interface RichTextEditorProps {
  value: string;
  onChange: (value: string) => void;
  placeholder?: string;
  minHeight?: number;
  variant?: 'body' | 'title';
  maxWords?: number;
}

const WORD_PATTERN = /[\p{L}\p{N}]+(?:['’][\p{L}\p{N}]+)*/gu;

export function RichTextEditor({ value, onChange, placeholder, minHeight = 260, variant = 'body', maxWords }: RichTextEditorProps) {
  const lastAcceptedHtml = useRef(value);
  const maxWordsRef = useRef(maxWords);
  const editor = useEditor({
    extensions: [
      StarterKit.configure({ heading: { levels: [2, 3] }, link: false, underline: false }),
      TextStyle,
      Color,
      Underline,
      Link.configure({ openOnClick: false, autolink: true, defaultProtocol: 'https' }),
    ],
    content: value,
    editorProps: {
      attributes: {
        class: `rich-text-surface ${variant === 'title' ? 'rich-title-surface' : ''}`,
        'data-placeholder': placeholder ?? 'Write the article body...',
        style: `min-height: ${minHeight}px`,
      },
    },
    onUpdate: ({ editor: currentEditor }) => {
      const nextHtml = currentEditor.isEmpty ? '' : currentEditor.getHTML();
      const wordCount = currentEditor.getText().match(WORD_PATTERN)?.length ?? 0;
      if (maxWordsRef.current && wordCount > maxWordsRef.current) {
        currentEditor.commands.setContent(lastAcceptedHtml.current, { emitUpdate: false });
        return;
      }
      lastAcceptedHtml.current = nextHtml;
      onChange(nextHtml);
    },
  });

  useEffect(() => {
    maxWordsRef.current = maxWords;
  }, [maxWords]);

  useEffect(() => {
    if (!editor || editor.getHTML() === value) return;
    editor.commands.setContent(value, { emitUpdate: false });
    lastAcceptedHtml.current = value;
  }, [editor, value]);

  if (!editor) return null;

  function setLink() {
    const previousUrl = editor?.getAttributes('link').href as string | undefined;
    const url = window.prompt('Enter link URL', previousUrl ?? 'https://');
    if (url === null) return;
    if (!url.trim()) {
      editor?.chain().focus().extendMarkRange('link').unsetLink().run();
      return;
    }
    editor?.chain().focus().extendMarkRange('link').setLink({ href: url.trim() }).run();
  }

  const inlineTools = [
    { label: 'Bold', icon: Bold, active: editor.isActive('bold'), disabled: false, action: () => editor.chain().focus().toggleBold().run() },
    { label: 'Italic', icon: Italic, active: editor.isActive('italic'), disabled: false, action: () => editor.chain().focus().toggleItalic().run() },
  ];
  const bodyTools = [
    { label: 'Underline', icon: UnderlineIcon, active: editor.isActive('underline'), action: () => editor.chain().focus().toggleUnderline().run() },
    { label: 'Strikethrough', icon: Strikethrough, active: editor.isActive('strike'), action: () => editor.chain().focus().toggleStrike().run() },
    { label: 'Subheading', icon: Heading2, active: editor.isActive('heading', { level: 2 }), action: () => editor.chain().focus().toggleHeading({ level: 2 }).run() },
    { label: 'Bulleted list', icon: List, active: editor.isActive('bulletList'), action: () => editor.chain().focus().toggleBulletList().run() },
    { label: 'Numbered list', icon: ListOrdered, active: editor.isActive('orderedList'), action: () => editor.chain().focus().toggleOrderedList().run() },
    { label: 'Quote', icon: Quote, active: editor.isActive('blockquote'), action: () => editor.chain().focus().toggleBlockquote().run() },
    { label: 'Link', icon: Link2, active: editor.isActive('link'), action: setLink },
  ];
  const historyTools = [
    { label: 'Clear formatting', icon: RemoveFormatting, active: false, action: () => editor.chain().focus().unsetColor().unsetAllMarks().clearNodes().run() },
    { label: 'Undo', icon: Undo2, active: false, disabled: !editor.can().undo(), action: () => editor.chain().focus().undo().run() },
    { label: 'Redo', icon: Redo2, active: false, disabled: !editor.can().redo(), action: () => editor.chain().focus().redo().run() },
  ];

  return (
    <div className="rich-text-editor">
      <div className="rich-text-toolbar" role="toolbar" aria-label="Text formatting">
        {[...inlineTools, ...(variant === 'body' ? bodyTools : []), ...historyTools].map((tool) => {
          const Icon = tool.icon;
          return (
          <button
            key={tool.label}
            type="button"
            className={tool.active ? 'active' : ''}
            disabled={Boolean('disabled' in tool && tool.disabled)}
            onMouseDown={(event) => event.preventDefault()}
            onClick={tool.action}
            aria-label={tool.label}
            title={tool.label}
          >
            <Icon size={16} />
          </button>
          );
        })}
        <label className="rich-text-color" title="Text color" aria-label="Text color">
          <Palette size={16} />
          <input
            type="color"
            value={editor.getAttributes('textStyle').color ?? '#bd3029'}
            onInput={(event) => editor.chain().focus().setColor(event.currentTarget.value).run()}
          />
        </label>
      </div>
      <EditorContent editor={editor} />
    </div>
  );
}
