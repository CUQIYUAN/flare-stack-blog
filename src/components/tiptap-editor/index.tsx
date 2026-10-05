import "@fontsource-variable/jetbrains-mono/wght.css";
import "katex/dist/katex.min.css";
import type {
  Extensions,
  JSONContent,
  Editor as TiptapEditor,
} from "@tiptap/react";
import { EditorContent, useEditor } from "@tiptap/react";
import { memo, useCallback, useEffect, useRef, useState } from "react";
import type { ReactNode } from "react";
import { setSlashMenuModalOpener } from "@/features/posts/editor/extensions/slash-menu";
import { SlashMenuView } from "@/features/posts/editor/extensions/slash-menu/slash-menu-view";
import { cn } from "@/lib/utils";
import type { FormulaModalPayload } from "./formula-modal-store";
import {
  addFormulaModalOpener,
  removeFormulaModalOpener,
  setActiveFormulaModalOpenerKey,
} from "./formula-modal-store";
import EditorToolbar from "./ui/editor-toolbar";
import type { FormulaMode } from "./ui/formula-modal";
import { FormulaModal } from "./ui/formula-modal";
import { ImagePickerPopover } from "./ui/image-picker-popover";
import { LinkEditorPopover } from "./ui/link-editor-popover";
import { LinkHoverCard } from "./ui/link-hover-card";
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
  const formulaOpenerKeyRef = useRef(Symbol("formula-modal-opener"));
  const [formulaModalOpen, setFormulaModalOpen] = useState(false);
  const [formulaPayload, setFormulaPayload] = useState<{
    mode: FormulaMode;
    initialLatex: string;
    editContext: { pos: number; type: FormulaMode } | null;
  }>({ mode: "inline", initialLatex: "", editContext: null });

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

  const openFormulaModal = useCallback((mode: FormulaMode) => {
    setFormulaPayload({
      mode,
      initialLatex: mode === "inline" ? "x^2+y^2=z^2" : "E = mc^2",
      editContext: null,
    });
    setFormulaModalOpen(true);
  }, []);

  // The slash menu's formula item opens the formula modal for now.
  useEffect(() => {
    if (!editor || !editable) return;
    return setSlashMenuModalOpener(editor, (modal) => {
      switch (modal) {
        case "blockMath":
          openFormulaModal("block");
          return;
        default:
          modal satisfies never;
      }
    });
  }, [editor, editable, openFormulaModal]);

  useEffect(() => {
    if (!editable) return;

    const opener = (payload: FormulaModalPayload) => {
      setFormulaPayload({
        mode: payload.type,
        initialLatex: payload.latex,
        editContext: { pos: payload.pos, type: payload.type },
      });
      setFormulaModalOpen(true);
    };
    addFormulaModalOpener(formulaOpenerKeyRef.current, opener);
    return () => removeFormulaModalOpener(formulaOpenerKeyRef.current);
  }, [editable]);

  const markActiveFormulaOpener = useCallback(() => {
    if (!editable) return;
    setActiveFormulaModalOpenerKey(formulaOpenerKeyRef.current);
  }, [editable]);

  const handleFormulaApply = useCallback(
    (
      latex: string,
      mode: FormulaMode,
      editContext: { pos: number; type: FormulaMode } | null,
    ) => {
      if (!editor) return;
      if (editContext && editContext.type !== mode) {
        const chain = editor
          .chain()
          .setNodeSelection(editContext.pos)
          .deleteSelection();
        if (mode === "inline") {
          chain.insertInlineMath({ latex }).focus().run();
        } else {
          chain.insertBlockMath({ latex }).focus().run();
        }
      } else if (editContext) {
        if (editContext.type === "inline") {
          editor
            .chain()
            .setNodeSelection(editContext.pos)
            .updateInlineMath({ latex })
            .focus()
            .run();
        } else {
          editor
            .chain()
            .setNodeSelection(editContext.pos)
            .updateBlockMath({ latex })
            .focus()
            .run();
        }
      } else {
        if (mode === "inline") {
          editor.chain().focus().insertInlineMath({ latex }).run();
        } else {
          editor.chain().focus().insertBlockMath({ latex }).run();
        }
      }
      setFormulaModalOpen(false);
    },
    [editor],
  );

  return (
    <div className={cn("relative flex flex-col group", className)}>
      {editable && (
        <EditorToolbar
          editor={editor}
          className={toolbarClassName}
          onLinkClick={() => editor?.commands.openLinkEditor()}
          onImageClick={() => editor?.commands.insertImagePlaceholder()}
          onFormulaInlineClick={() => openFormulaModal("inline")}
          onFormulaBlockClick={() => openFormulaModal("block")}
        />
      )}

      {editable && <TableBubbleMenu editor={editor} />}
      {editable && <TableMobileBar editor={editor} />}
      {editable && <SlashMenuView editor={editor} />}
      {editable && <LinkEditorPopover editor={editor} />}
      {editable && <LinkHoverCard editor={editor} />}
      {editable && <ImagePickerPopover editor={editor} />}

      <div
        id={scrollContainerId}
        className={cn("relative", documentClassName ?? "min-h-125")}
        onMouseDownCapture={markActiveFormulaOpener}
        onFocusCapture={markActiveFormulaOpener}
      >
        {documentHeader}
        <EditorContent editor={editor} />
      </div>

      {editable && (
        <FormulaModal
          returnFocus={() => editor?.view.dom ?? null}
          isOpen={formulaModalOpen}
          mode={formulaPayload.mode}
          initialLatex={formulaPayload.initialLatex}
          editContext={formulaPayload.editContext}
          onClose={() => setFormulaModalOpen(false)}
          onApply={handleFormulaApply}
        />
      )}
    </div>
  );
});
