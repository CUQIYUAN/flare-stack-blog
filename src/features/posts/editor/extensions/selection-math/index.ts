import { Extension } from "@tiptap/core";
import { TextSelection } from "@tiptap/pm/state";

declare module "@tiptap/core" {
  interface Commands<ReturnType> {
    selectionMath: {
      /**
       * Replaces the selected text with an inline formula whose LaTeX is that
       * text. Fails on an empty or blank selection, one spanning several
       * blocks or holding anything but text, or one inside a code block.
       */
      setInlineMathFromSelection: () => ReturnType;
    };
  }
}

/** Turns selected text into an inline formula, for the selection menu. */
export const SelectionMath = Extension.create({
  name: "selectionMath",

  addCommands() {
    return {
      setInlineMathFromSelection:
        () =>
        ({ state, tr, dispatch }) => {
          const { selection, schema } = state;
          const type = schema.nodes.inlineMath;
          if (!type || !(selection instanceof TextSelection)) return false;
          const { from, to, $from, $to } = selection;
          if (!$from.sameParent($to) || $from.parent.type.spec.code) {
            return false;
          }
          let onlyText = true;
          state.doc.nodesBetween(from, to, (node) => {
            if (node.isInline && !node.isText) onlyText = false;
          });
          if (!onlyText) return false;
          const text = state.doc.textBetween(from, to);
          const latex = text.trim();
          if (!latex) return false;
          // Whitespace at the edges stays text around the formula.
          const start = from + (text.length - text.trimStart().length);
          const end = to - (text.length - text.trimEnd().length);
          const math = type.create({ latex });
          if (dispatch) {
            tr.replaceWith(start, end, math);
            // Continue typing after the formula.
            tr.setSelection(
              TextSelection.create(tr.doc, start + math.nodeSize),
            );
          }
          return true;
        },
    };
  },
});
