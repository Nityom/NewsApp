import Link from '@tiptap/extension-link';
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
    Quote,
    Redo2,
    RemoveFormatting,
    Strikethrough,
    Underline as UnderlineIcon,
    Undo2,
} from 'lucide-react';
import { useEffect } from 'react';

interface RichTextEditorProps {
  value: string;
  onChange: (value: string) => void;
  placeholder?: string;
  minHeight?: number;
}

export function RichTextEditor({ value, onChange, placeholder, minHeight = 260 }: RichTextEditorProps) {
  const editor = useEditor({
    extensions: [
      StarterKit.configure({ heading: { levels: [2, 3] } }),
      Underline,
      Link.configure({ openOnClick: false, autolink: true, defaultProtocol: 'https' }),
    ],
    content: value,
    editorProps: {
      attributes: {
        class: 'rich-text-surface',
        'data-placeholder': placeholder ?? 'Write the article body...',
        style: `min-height: ${minHeight}px`,
      },
    },
    onUpdate: ({ editor: currentEditor }) => onChange(currentEditor.isEmpty ? '' : currentEditor.getHTML()),
  });

  useEffect(() => {
    if (!editor || editor.getHTML() === value) return;
    editor.commands.setContent(value, { emitUpdate: false });
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

  const tools = [
    { label: 'Bold', icon: Bold, active: editor.isActive('bold'), action: () => editor.chain().focus().toggleBold().run() },
    { label: 'Italic', icon: Italic, active: editor.isActive('italic'), action: () => editor.chain().focus().toggleItalic().run() },
    { label: 'Underline', icon: UnderlineIcon, active: editor.isActive('underline'), action: () => editor.chain().focus().toggleUnderline().run() },
    { label: 'Strikethrough', icon: Strikethrough, active: editor.isActive('strike'), action: () => editor.chain().focus().toggleStrike().run() },
    { label: 'Subheading', icon: Heading2, active: editor.isActive('heading', { level: 2 }), action: () => editor.chain().focus().toggleHeading({ level: 2 }).run() },
    { label: 'Bulleted list', icon: List, active: editor.isActive('bulletList'), action: () => editor.chain().focus().toggleBulletList().run() },
    { label: 'Numbered list', icon: ListOrdered, active: editor.isActive('orderedList'), action: () => editor.chain().focus().toggleOrderedList().run() },
    { label: 'Quote', icon: Quote, active: editor.isActive('blockquote'), action: () => editor.chain().focus().toggleBlockquote().run() },
    { label: 'Link', icon: Link2, active: editor.isActive('link'), action: setLink },
    { label: 'Clear formatting', icon: RemoveFormatting, active: false, action: () => editor.chain().focus().unsetAllMarks().clearNodes().run() },
    { label: 'Undo', icon: Undo2, active: false, disabled: !editor.can().undo(), action: () => editor.chain().focus().undo().run() },
    { label: 'Redo', icon: Redo2, active: false, disabled: !editor.can().redo(), action: () => editor.chain().focus().redo().run() },
  ];

  return (
    <div className="rich-text-editor">
      <div className="rich-text-toolbar" role="toolbar" aria-label="Text formatting">
        {tools.map(({ label, icon: Icon, active, disabled, action }) => (
          <button
            key={label}
            type="button"
            className={active ? 'active' : ''}
            disabled={disabled}
            onMouseDown={(event) => event.preventDefault()}
            onClick={action}
            aria-label={label}
            title={label}
          >
            <Icon size={16} />
          </button>
        ))}
      </div>
      <EditorContent editor={editor} />
    </div>
  );
}
