import type { JSONContent } from "@tiptap/react";
import { describe, expect, it } from "vitest";
import { CODE_LANGUAGES } from "@/lib/code-languages";
import { highlightSnapshotContent } from "./highlight-code-blocks";

// One snippet per supported language; each must contain several token kinds.
const SAMPLES: Record<string, string> = {
  c: "#include <stdio.h>\nint main(void) { return 0; }",
  cpp: "#include <vector>\nclass A { public: int x = 1; };",
  csharp: 'public class A { string s = "x"; }',
  css: ".a { color: red; }",
  dockerfile: "FROM node:22\nRUN npm ci",
  go: 'package main\nfunc main() { s := "x" }',
  html: '<div class="a">hi</div>',
  java: 'public class A { String s = "x"; }',
  javascript: 'const a = "x"; function f() { return 1; }',
  json: '{ "a": 1, "b": true }',
  jsx: 'const el = <div className="a">{1}</div>;',
  kotlin: 'fun main() { val s = "x" }',
  markdown: "# Title\n\n**bold** and `code`",
  php: '<?php $a = "x"; echo $a;',
  python: 'def f(x):\n    return "x"',
  ruby: 'def f\n  "x"\nend',
  rust: 'fn main() { let s = "x"; }',
  shell: 'echo "hi" | grep h\nexport A=1',
  sql: "SELECT id FROM posts WHERE id = 1;",
  swift: 'func f() { let s = "x" }',
  tsx: 'const el: JSX.Element = <div className="a" />;',
  typescript: 'const a: number = 1; function f(): string { return "x"; }',
  xml: '<?xml version="1.0"?><a b="c">d</a>',
  yaml: "key: value\nlist:\n  - 1",
};

async function highlightBlock(language: string, code: string) {
  const draft: JSONContent = {
    type: "doc",
    content: [
      {
        type: "codeBlock",
        attrs: { language },
        content: [{ type: "text", text: code }],
      },
    ],
  };
  const result = await highlightSnapshotContent(draft, null);
  return result?.content?.[0]?.attrs?.highlightedHtml as string;
}

function tokenColors(html: string) {
  return new Set(
    Array.from(html.matchAll(/<span style="color:(#[0-9A-Fa-f]+)/g), (match) =>
      match[1].toLowerCase(),
    ),
  );
}

describe("highlightSnapshotContent", () => {
  it("reuses snapshot HTML and highlights missing blocks", async () => {
    const result = await highlightSnapshotContent(
      {
        type: "doc",
        content: [
          {
            type: "codeBlock",
            attrs: { language: "ts" },
            content: [{ type: "text", text: "const x = 1;" }],
          },
          {
            type: "codeBlock",
            attrs: { language: "ts" },
            content: [{ type: "text", text: "const y = 2;" }],
          },
        ],
      },
      {
        type: "doc",
        content: [
          {
            type: "codeBlock",
            attrs: {
              language: "ts",
              highlightedHtml: "<pre>kept</pre>",
            },
            content: [{ type: "text", text: "const x = 1;" }],
          },
        ],
      },
    );

    expect(result?.content?.[0]?.attrs?.highlightedHtml).toBe(
      "<pre>kept</pre>",
    );
    expect(result?.content?.[1]?.attrs?.highlightedHtml).toEqual(
      expect.stringContaining("shiki"),
    );
  });

  it.each(CODE_LANGUAGES.map((language) => language.id))(
    "highlights %s code with grammar token colors",
    async (id) => {
      const sample = SAMPLES[id];
      expect(sample, `missing test sample for ${id}`).toBeDefined();

      const html = await highlightBlock(id, sample);

      expect(html).toContain('class="shiki');
      expect(tokenColors(html).size).toBeGreaterThan(1);
    },
  );

  it.each(
    CODE_LANGUAGES.flatMap((language) =>
      [...language.aliases, language.id.toUpperCase()].map(
        (alias) => [alias, language.id] as const,
      ),
    ),
  )("highlights %s exactly like %s", async (alias, id) => {
    const sample = SAMPLES[id];

    expect(await highlightBlock(alias, sample)).toBe(
      await highlightBlock(id, sample),
    );
  });

  it("highlights common Markdown fence names", async () => {
    const sample = 'echo "hi" | grep h';
    const shell = await highlightBlock("shell", sample);

    for (const fence of ["sh", "bash", "zsh"]) {
      expect(await highlightBlock(fence, sample)).toBe(shell);
    }
    expect(tokenColors(shell).size).toBeGreaterThan(1);
  });

  it("renders unknown languages as plain text without throwing", async () => {
    const sample = 'const a = "x";';
    const plain = await highlightBlock("text", sample);

    const html = await highlightBlock("not-a-language", sample);

    expect(html).toBe(plain);
    expect(html).toContain('class="shiki');
    expect(tokenColors(html).size).toBe(0);
  });
});
