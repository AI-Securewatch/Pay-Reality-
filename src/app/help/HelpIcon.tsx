import { useEffect, useRef, useState } from "react";
import { HelpCircle } from "lucide-react";
import { LEARN_ARTICLES } from "./content";
import { useHelp } from "./HelpContext";

// A small inline "?" next to a complex concept label. Reads from the
// same LEARN_ARTICLES the full Help panel's Learn tab and search both
// use, so the popover's explanation can never drift from what the panel
// says about the same term.
export function HelpIcon({ articleId }: { articleId: string }) {
  const [open, setOpen] = useState(false);
  const containerRef = useRef<HTMLSpanElement>(null);
  const { openLearnArticle } = useHelp();

  const article = LEARN_ARTICLES.find((a) => a.id === articleId);

  useEffect(() => {
    if (!open) return;
    function handleClick(e: MouseEvent) {
      if (containerRef.current && !containerRef.current.contains(e.target as Node)) {
        setOpen(false);
      }
    }
    function handleKey(e: KeyboardEvent) {
      if (e.key === "Escape") setOpen(false);
    }
    document.addEventListener("mousedown", handleClick);
    document.addEventListener("keydown", handleKey);
    return () => {
      document.removeEventListener("mousedown", handleClick);
      document.removeEventListener("keydown", handleKey);
    };
  }, [open]);

  if (!article) return null;

  return (
    <span ref={containerRef} className="relative inline-flex items-center">
      <button
        type="button"
        onClick={() => setOpen((v) => !v)}
        aria-label={`What is ${article.term}?`}
        aria-expanded={open}
        className="inline-flex items-center justify-center rounded-full"
        style={{ color: "var(--pr-text-disabled)", width: 16, height: 16 }}
      >
        <HelpCircle className="w-4 h-4" />
      </button>

      {open && (
        <div
          role="dialog"
          aria-label={article.term}
          className="absolute z-50 top-full left-0 mt-2 p-3 rounded-xl text-left"
          style={{
            width: 260,
            backgroundColor: "var(--pr-bg-card)",
            border: "1px solid var(--pr-overlay-08)",
            boxShadow: "0 8px 24px var(--pr-backdrop)",
          }}
        >
          <p className="text-xs font-semibold mb-1" style={{ color: "var(--pr-text-primary)" }}>
            {article.term}
          </p>
          <p className="text-xs mb-2" style={{ color: "var(--pr-text-secondary)", lineHeight: 1.5 }}>
            {article.summary}
          </p>
          <button
            type="button"
            onClick={() => {
              setOpen(false);
              openLearnArticle(article.id);
            }}
            className="text-xs font-medium"
            style={{ color: "var(--pr-authority-blue)" }}
          >
            Learn more →
          </button>
        </div>
      )}
    </span>
  );
}
