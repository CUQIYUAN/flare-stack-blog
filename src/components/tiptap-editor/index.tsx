import "@fontsource-variable/jetbrains-mono/wght.css";
import "katex/dist/katex.min.css";
import type {
  Extensions,
  JSONContent,
  Editor as TiptapEditor,
} from "@tiptap/react";
import { EditorContent, useEditor } from "@tiptap/react";
import { memo, useCallback, useEffect, useState } from "react";
import type { ReactNode } from "react";
import { setSlashMenuModalOpener } from "@/features/posts/editor/extensions/slash-menu";
import { SlashMenuView } from "@/features/posts/editor/extensions/slash-menu/slash-menu-view";
import { cn } from "@/lib/utils";
import EditorToolbar from "./ui/editor-toolbar";
import { ImageModal } from "./ui/image-modal";
import { LinkEditorPopover } from "./ui/link-editor-popover";
import { LinkHoverCard } from "./ui/link-hover-card";
import { MathEditorPopover } from "./ui/math-editor-popover";
import { TableBubbleMenu, TableMobileBar } from "./ui/table-bubble-menu";

interface EditorProps {
  content?: JSONContent | string;
  onUpdate?: (editor: TiptapEditor) => void;
  onCreated?: (editor: TiptapEditor | null) => void;
  extensions: Extensions;
  editable?: boolean;
  className?: string;
  contentClassName?: string;
  documentHeader?: ReactNode;
  documentClassName?: string;
  scrollContainerId?: string;
  toolbarClassName?: string;
}

export const Editor = memo(function Editor({
  content,
  onUpdate,
  onCreated,
  extensions,
  editable = true,
  className,
  contentClassName,
  documentHeader,
  documentClassName,
  scrollContainerId,
  toolbarClassName,
}: EditorProps) {
  const [imageModalOpen, setImageModalOpen] = useState(false);

  const editor = useEditor({
    extensions,
    content,
    editable,
    onCreate: ({ editor: currentEditor }) => {
      onCreated?.(currentEditor);
    },
    onUpdate: ({ editor: currentEditor }) => {
      onUpdate?.(currentEditor);
    },
    onDestroy: () => {
      onCreated?.(null);
    },
    editorProps: {
      attributes: {
        class: cn(
          "prose dark:prose-invert prose-base max-w-none! fuwari-custom-md focus:outline-none min-h-[500px]",
          !editable && "min-h-0",
          contentClassName,
        ),
      },
    },
    immediatelyRender: false,
  });

  const openImageModal = useCallback(() => {
    setImageModalOpen(true);
  }, []);

  // The slash menu's image item opens the image modal for now.
  useEffect(() => {
    if (!editor || !editable) return;
    return setSlashMenuModalOpener(editor, (modal) => {
      switch (modal) {
        case "image":
          openImageModal();
          return;
        default:
          modal satisfies never;
      }
    });
  }, [editor, editable, openImageModal]);

  return (
    <div className={cn("relative flex flex-col group", className)}>
      {editable && (
        <EditorToolbar
          editor={editor}
          className={toolbarClassName}
          onLinkClick={() => editor?.commands.openLinkEditor()}
          onImageClick={openImageModal}
          onFormulaInlineClick={() => editor?.commands.insertMath("inline")}
          onFormulaBlockClick={() => editor?.commands.insertMath("block")}
        />
      )}

      {editable && <TableBubbleMenu editor={editor} />}
      {editable && <TableMobileBar editor={editor} />}
      {editable && <SlashMenuView editor={editor} />}
      {editable && <LinkEditorPopover editor={editor} />}
      {editable && <LinkHoverCard editor={editor} />}
      {editable && <MathEditorPopover editor={editor} />}

      <div
        id={scrollContainerId}
        className={cn("relative", documentClassName ?? "min-h-125")}
      >
        {documentHeader}
        <EditorContent editor={editor} />
      </div>

      {editable && (
        <ImageModal
          open={imageModalOpen}
          returnFocus={() => editor?.view.dom ?? null}
          onClose={() => setImageModalOpen(false)}
          onSelect={(image) => {
            editor?.chain().focus().setImage(image).run();
          }}
        />
      )}
    </div>
  );
});
