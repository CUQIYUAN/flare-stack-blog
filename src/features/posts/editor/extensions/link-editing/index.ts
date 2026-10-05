import type { Editor } from "@tiptap/core";
import { Extension, getMarkRange } from "@tiptap/core";
import type { EditorState } from "@tiptap/pm/state";
import { normalizeLinkHref } from "@/lib/links/normalize-link-href";

/** The open link input: the text it links and the link's current address. */
export interface LinkEditorState {
  /** The linked text; empty when applying inserts the URL as new text. */
  from: number;
  to: number;
  /** The link's address, or "" for a new link. */
  href: string;
}

interface LinkEditingStorage {
  state: LinkEditorState | null;
  listeners: Set<() => void>;
}

declare module "@tiptap/core" {
  interface Storage {
    linkEditing: LinkEditingStorage;
  }

  interface Commands<ReturnType> {
    linkEditing: {
      /**
       * Opens the link input for the selected text, or, with the cursor in a
       * link, for that link. Otherwise applying inserts the URL as linked
       * text at the cursor.
       */
      openLinkEditor: () => ReturnType;
      /**
       * Applies the open input: links its text to the normalised `url`,
       * removes the link when `url` is empty, and closes the input.
       */
      applyLink: (url: string) => ReturnType;
      /** Closes the link input without changing the document. */
      closeLinkEditor: () => ReturnType;
    };
  }
}

function storageOf(editor: Editor): LinkEditingStorage | undefined {
  return editor.storage.linkEditing as LinkEditingStorage | undefined;
}

/**
 * What the link input edits: the whole link when the selection lies inside
 * one, otherwise the selection itself.
 */
function linkTarget(
  state: Pick<EditorState, "selection" | "schema">,
): LinkEditorState {
  const { from, to, $from } = state.selection;
  const type = state.schema.marks.link;
  const range = type ? getMarkRange($from, type) : undefined;
  if (range && range.from <= from && to <= range.to) {
    const mark = $from.doc
      .nodeAt(range.from)
      ?.marks.find((candidate) => candidate.type === type);
    return { ...range, href: String(mark?.attrs.href ?? "") };
  }
  return { from, to, href: "" };
}

function setState(storage: LinkEditingStorage, state: LinkEditorState | null) {
  storage.state = state;
  for (const listener of storage.listeners) listener();
}

/**
 * Edits links in place: Mod-k or the toolbar opens a link input beside the
 * selection, which the `Editor` component renders. Never opens in a
 * read-only editor.
 */
export const LinkEditing = Extension.create<
  Record<string, never>,
  LinkEditingStorage
>({
  name: "linkEditing",

  addStorage() {
    return { state: null, listeners: new Set() };
  },

  addKeyboardShortcuts() {
    return {
      "Mod-k": () => this.editor.commands.openLinkEditor(),
    };
  },

  addCommands() {
    return {
      openLinkEditor:
        () =>
        ({ editor, state, dispatch }) => {
          const storage = storageOf(editor);
          if (!editor.isEditable || !storage) return false;
          if (dispatch) setState(storage, linkTarget(state));
          return true;
        },
      applyLink:
        (url) =>
        ({ editor, chain, dispatch }) => {
          const storage = storageOf(editor);
          const target = storage?.state;
          if (!storage || !target) return false;
          if (!dispatch) return true;
          setState(storage, null);
          const text = url.trim();
          const href = normalizeLinkHref(text);
          const { from, to } = target;
          if (from === to) {
            if (!href) return chain().focus().run();
            return (
              chain()
                .insertContentAt(from, {
                  type: "text",
                  text,
                  marks: [{ type: "link", attrs: { href } }],
                })
                .focus()
                // Typing on after the new link is plain text.
                .unsetMark("link")
                .run()
            );
          }
          const linked = chain().setTextSelection({ from, to });
          if (!href) return linked.unsetLink().focus().run();
          return linked.setLink({ href }).focus().run();
        },
      closeLinkEditor:
        () =>
        ({ editor, dispatch }) => {
          const storage = storageOf(editor);
          if (!storage?.state) return false;
          if (dispatch) setState(storage, null);
          return true;
        },
    };
  },
});

/** The open link input, or `null` when it is closed. */
export function getLinkEditor(editor: Editor): LinkEditorState | null {
  return storageOf(editor)?.state ?? null;
}

/** Calls `listener` whenever the link input opens, moves or closes. */
export function subscribeLinkEditor(editor: Editor, listener: () => void) {
  const storage = storageOf(editor);
  storage?.listeners.add(listener);
  return () => {
    storage?.listeners.delete(listener);
  };
}
