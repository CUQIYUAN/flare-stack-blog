// @vitest-environment jsdom
import type { Editor, JSONContent } from "@tiptap/core";
import { afterEach, expect, it } from "vitest";
import { createPostEditor } from "@/features/posts/editor/test-utils";

let editor: Editor | undefined;

afterEach(() => {
  editor?.destroy();
  editor = undefined;
});

function open(content: string) {
  editor = createPostEditor({ content });
  return editor;
}

/** The first block's inline content as text runs and inline math nodes. */
function inlines(target: Editor) {
  const nodes: JSONContent[] = target.getJSON().content?.[0]?.content ?? [];
  return nodes.map((node) =>
    node.type === "inlineMath" ? { math: node.attrs?.latex } : node.text,
  );
}

it("turns the selected text into an inline formula with that LaTeX", () => {
  const target = open("<p>so E=mc^2 holds</p>");
  target.commands.setTextSelection({ from: 4, to: 10 });

  expect(target.commands.setInlineMathFromSelection()).toBe(true);

  expect(inlines(target)).toEqual(["so ", { math: "E=mc^2" }, " holds"]);
});

it("leaves whitespace at the selection's edges as text", () => {
  // A double-click selection often takes the following space with it.
  const target = open("<p>so E=mc^2 holds</p>");
  target.commands.setTextSelection({ from: 3, to: 11 });

  target.commands.setInlineMathFromSelection();

  expect(inlines(target)).toEqual(["so ", { math: "E=mc^2" }, " holds"]);
});

it.each([
  ["blank text", "<p>a b</p>", { from: 2, to: 3 }],
  ["text across paragraphs", "<p>ab</p><p>cd</p>", { from: 2, to: 6 }],
  ["code", "<pre><code>x^2</code></pre>", { from: 1, to: 4 }],
  [
    "a formula",
    '<p>a <span data-type="inline-math" data-latex="x"></span> b</p>',
    { from: 1, to: 6 },
  ],
])("leaves a selection of %s alone", (_, content, range) => {
  const target = open(content);
  target.commands.setTextSelection(range);
  const before = target.getJSON();

  expect(target.commands.setInlineMathFromSelection()).toBe(false);

  expect(target.getJSON()).toEqual(before);
});
