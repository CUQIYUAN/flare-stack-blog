import type { LanguageRegistration } from "shiki/core";

/**
 * The single list of code block languages the blog supports. The publish-time
 * highlighter, the editor's language dropdown and the public code block badge
 * all read from here. Importing this module loads no grammar; each grammar is
 * fetched only when its `load` is called.
 */

// Shiki language modules export `default` as an array of LanguageRegistration
export type CodeLanguageModule = { default: Array<LanguageRegistration> };

export interface CodeLanguage {
  /** Shiki grammar id; also the value stored on code blocks picked in the editor. */
  id: string;
  /** Human-readable name shown in the dropdown and the public badge. */
  label: string;
  /** Other names that resolve to this language (e.g. Markdown fence names). */
  aliases: ReadonlyArray<string>;
  load: () => Promise<CodeLanguageModule>;
}

export const CODE_LANGUAGES: ReadonlyArray<CodeLanguage> = [
  {
    id: "typescript",
    label: "TypeScript",
    aliases: ["ts"],
    load: () => import("shiki/langs/typescript.mjs"),
  },
  {
    id: "javascript",
    label: "JavaScript",
    aliases: ["js"],
    load: () => import("shiki/langs/javascript.mjs"),
  },
  {
    id: "jsx",
    label: "JSX",
    aliases: [],
    load: () => import("shiki/langs/jsx.mjs"),
  },
  {
    id: "tsx",
    label: "TSX",
    aliases: [],
    load: () => import("shiki/langs/tsx.mjs"),
  },
  {
    id: "python",
    label: "Python",
    aliases: ["py"],
    load: () => import("shiki/langs/python.mjs"),
  },
  {
    id: "java",
    label: "Java",
    aliases: [],
    load: () => import("shiki/langs/java.mjs"),
  },
  {
    id: "c",
    label: "C",
    aliases: [],
    load: () => import("shiki/langs/c.mjs"),
  },
  {
    id: "cpp",
    label: "C++",
    aliases: [],
    load: () => import("shiki/langs/cpp.mjs"),
  },
  {
    id: "csharp",
    label: "C#",
    aliases: [],
    load: () => import("shiki/langs/csharp.mjs"),
  },
  {
    id: "go",
    label: "Go",
    aliases: [],
    load: () => import("shiki/langs/go.mjs"),
  },
  {
    id: "rust",
    label: "Rust",
    aliases: ["rs"],
    load: () => import("shiki/langs/rust.mjs"),
  },
  {
    id: "php",
    label: "PHP",
    aliases: [],
    load: () => import("shiki/langs/php.mjs"),
  },
  {
    id: "ruby",
    label: "Ruby",
    aliases: ["rb"],
    load: () => import("shiki/langs/ruby.mjs"),
  },
  {
    id: "swift",
    label: "Swift",
    aliases: [],
    load: () => import("shiki/langs/swift.mjs"),
  },
  {
    id: "kotlin",
    label: "Kotlin",
    aliases: [],
    load: () => import("shiki/langs/kotlin.mjs"),
  },
  {
    id: "shell",
    label: "Shell",
    aliases: ["sh", "bash", "zsh"],
    load: () => import("shiki/langs/shell.mjs"),
  },
  {
    id: "sql",
    label: "SQL",
    aliases: [],
    load: () => import("shiki/langs/sql.mjs"),
  },
  {
    id: "html",
    label: "HTML",
    aliases: [],
    load: () => import("shiki/langs/html.mjs"),
  },
  {
    id: "css",
    label: "CSS",
    aliases: [],
    load: () => import("shiki/langs/css.mjs"),
  },
  {
    id: "json",
    label: "JSON",
    aliases: [],
    load: () => import("shiki/langs/json.mjs"),
  },
  {
    id: "yaml",
    label: "YAML",
    aliases: ["yml"],
    load: () => import("shiki/langs/yaml.mjs"),
  },
  {
    id: "xml",
    label: "XML",
    aliases: [],
    load: () => import("shiki/langs/xml.mjs"),
  },
  {
    id: "markdown",
    label: "Markdown",
    aliases: ["md"],
    load: () => import("shiki/langs/markdown.mjs"),
  },
  {
    id: "dockerfile",
    label: "Dockerfile",
    aliases: [],
    load: () => import("shiki/langs/dockerfile.mjs"),
  },
];

const byName = new Map<string, CodeLanguage>();
for (const language of CODE_LANGUAGES) {
  byName.set(language.id, language);
  for (const alias of language.aliases) byName.set(alias, language);
}

/**
 * Resolves a code block's language string (id or alias, any case) to its
 * supported language. Returns `undefined` for unsupported or empty strings,
 * which callers render as plain text.
 */
export function resolveCodeLanguage(
  name: string | null | undefined,
): CodeLanguage | undefined {
  if (!name) return undefined;
  return byName.get(name.trim().toLowerCase());
}
