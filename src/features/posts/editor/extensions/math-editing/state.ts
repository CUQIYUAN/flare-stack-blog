import type { Editor } from "@tiptap/core";
import { useCallback, useSyncExternalStore } from "react";

export type MathType = "inline" | "block";

/** The formula open for editing. */
export interface MathEditorState {
  /** Where the formula node is. */
  pos: number;
  type: MathType;
  /** Its LaTeX as it was when editing opened. */
  latex: string;
  /** Whether it was just inserted; cancelling removes it then. */
  inserted: boolean;
}

export interface MathEditingStorage {
  state: MathEditorState | null;
  listeners: Set<() => void>;
}

declare module "@tiptap/core" {
  interface Storage {
    mathEditing: MathEditingStorage;
  }
}

export function storageOf(editor: Editor): MathEditingStorage | undefined {
  return editor.storage.mathEditing as MathEditingStorage | undefined;
}

/** The formula open for editing, or `null` when none is. */
export function getMathEditor(editor: Editor): MathEditorState | null {
  return storageOf(editor)?.state ?? null;
}

/** Calls `listener` whenever formula editing opens, moves or closes. */
export function subscribeMathEditor(editor: Editor, listener: () => void) {
  const storage = storageOf(editor);
  storage?.listeners.add(listener);
  return () => {
    storage?.listeners.delete(listener);
  };
}

/** The formula open for editing, re-rendering as it opens, moves or closes. */
export function useMathEditor(editor: Editor | null) {
  const subscribe = useCallback(
    (listener: () => void) =>
      editor ? subscribeMathEditor(editor, listener) : () => {},
    [editor],
  );
  return useSyncExternalStore(
    subscribe,
    () => (editor ? getMathEditor(editor) : null),
    () => null,
  );
}
