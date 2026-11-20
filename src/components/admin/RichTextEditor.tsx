"use client";

import { useState } from "react";
import { useEditor, EditorContent, type Editor } from "@tiptap/react";
import StarterKit from "@tiptap/starter-kit";
import Image from "@tiptap/extension-image";
import Link from "@tiptap/extension-link";
import { Bold, Italic, Heading2, Heading3, List, ListOrdered, Quote, Link2, ImagePlus, Undo2, Redo2, Minus } from "lucide-react";
import { MediaPicker } from "./MediaPicker";
import { cn } from "@/lib/utils";

function Tool({ on, active, label, children }: { on: () => void; active?: boolean; label: string; children: React.ReactNode }) {
  return (
    <button type="button" onClick={on} aria-label={label} aria-pressed={active} title={label} className={cn("inline-flex size-9 items-center justify-center rounded-md hover:bg-canopy/8", active && "bg-canopy text-white hover:bg-canopy")}>
      {children}
    </button>
  );
}

function Toolbar({ editor, onImage }: { editor: Editor; onImage: () => void }) {
  const link = () => {
    const prev = editor.getAttributes("link").href as string | undefined;
    const url = window.prompt("Link URL (https://…, /page, or mailto:)", prev ?? "https://");
    if (url === null) return;
    if (!url) return editor.chain().focus().unsetLink().run();
    if (!/^(https?:\/\/|\/|mailto:|tel:|#)/.test(url)) return window.alert("Use a full https:// link or a site path starting with /");
    editor.chain().focus().extendMarkRange("link").setLink({ href: url }).run();
  };
  return (
    <div role="toolbar" aria-label="Formatting" className="flex flex-wrap gap-0.5 border-b border-canopy/10 p-1.5">
      <Tool label="Bold" on={() => editor.chain().focus().toggleBold().run()} active={editor.isActive("bold")}><Bold className="size-4" /></Tool>
      <Tool label="Italic" on={() => editor.chain().focus().toggleItalic().run()} active={editor.isActive("italic")}><Italic className="size-4" /></Tool>
      <Tool label="Heading" on={() => editor.chain().focus().toggleHeading({ level: 2 }).run()} active={editor.isActive("heading", { level: 2 })}><Heading2 className="size-4" /></Tool>
      <Tool label="Subheading" on={() => editor.chain().focus().toggleHeading({ level: 3 }).run()} active={editor.isActive("heading", { level: 3 })}><Heading3 className="size-4" /></Tool>
      <Tool label="Bulleted list" on={() => editor.chain().focus().toggleBulletList().run()} active={editor.isActive("bulletList")}><List className="size-4" /></Tool>
      <Tool label="Numbered list" on={() => editor.chain().focus().toggleOrderedList().run()} active={editor.isActive("orderedList")}><ListOrdered className="size-4" /></Tool>
      <Tool label="Quote" on={() => editor.chain().focus().toggleBlockquote().run()} active={editor.isActive("blockquote")}><Quote className="size-4" /></Tool>
      <Tool label="Divider" on={() => editor.chain().focus().setHorizontalRule().run()}><Minus className="size-4" /></Tool>
      <Tool label="Link" on={link} active={editor.isActive("link")}><Link2 className="size-4" /></Tool>
      <Tool label="Image from media library" on={onImage}><ImagePlus className="size-4" /></Tool>
      <span className="mx-1 w-px bg-canopy/10" />
      <Tool label="Undo" on={() => editor.chain().focus().undo().run()}><Undo2 className="size-4" /></Tool>
      <Tool label="Redo" on={() => editor.chain().focus().redo().run()}><Redo2 className="size-4" /></Tool>
    </div>
  );
}

/** Editorial rich text. Output is sanitised again on the server before rendering. */
export default function RichTextEditor({ value, onChange, labelledBy }: { value: string; onChange: (html: string) => void; labelledBy?: string }) {
  const [picker, setPicker] = useState(false);
  const editor = useEditor({
    immediatelyRender: false,
    extensions: [StarterKit.configure({ heading: { levels: [2, 3] }, link: false }), Link.configure({ openOnClick: false, autolink: true }), Image.configure({ inline: false })],
    content: value || "",
    editorProps: { attributes: { class: "sv-prose min-h-48 max-w-none p-4 focus:outline-none", "aria-labelledby": labelledBy ?? "", role: "textbox", "aria-multiline": "true" } },
    onUpdate: ({ editor }) => onChange(editor.getHTML()),
  });
  if (!editor) return <div className="min-h-48 animate-pulse rounded-lg bg-canopy/5" />;
  return (
    <div className="rounded-lg border border-canopy/20 bg-white">
      <Toolbar editor={editor} onImage={() => setPicker(true)} />
      <EditorContent editor={editor} />
      <MediaPicker open={picker} kind="image" onClose={() => setPicker(false)} onPick={(m) => editor.chain().focus().setImage({ src: m.url, alt: m.alt, title: m.caption ?? undefined }).run()} />
    </div>
  );
}
