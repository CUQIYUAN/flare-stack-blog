import { useTheme } from "@/components/common/theme-provider";
import { MermaidDiagram } from "@/components/content/mermaid-diagram";
import { MERMAID } from "@/lib/code-languages";
import { CodeBlockFrame, CodeHtml } from "./code-block";

/**
 * A published Mermaid code block: the snapshot's highlighted source until the
 * diagram renders in the visitor's browser. Not folded like long code; wide
 * diagrams scroll instead. Loaded only for posts that contain one.
 */
export default function MermaidCodeBlock({
  code,
  highlightedHtml,
}: {
  code: string;
  highlightedHtml?: string;
}) {
  const { appTheme } = useTheme();

  return (
    <CodeBlockFrame code={code} language={MERMAID}>
      <MermaidDiagram
        source={code}
        theme={appTheme}
        fallback={<CodeHtml code={code} highlightedHtml={highlightedHtml} />}
        className="custom-scrollbar [&>svg]:my-4"
      />
    </CodeBlockFrame>
  );
}
