import { Check, ChevronDown, Search } from "lucide-react";
import {
  useEffect,
  useId,
  useLayoutEffect,
  useMemo,
  useRef,
  useState,
  type CSSProperties,
  type KeyboardEvent,
} from "react";
import { createPortal } from "react-dom";
import { MOTION, useMotionPresence } from "@/hooks/use-motion";
import { CODE_LANGUAGES, resolveCodeLanguage } from "@/lib/code-languages";
import { cn } from "@/lib/utils";
import { m } from "@/paraglide/messages";
import { filterLanguageOptions, type LanguageOption } from "./language-options";

const POPOVER_WIDTH = 13 * 16;
const POPOVER_MAX_HEIGHT = 320;

function pickerOptions(): Array<LanguageOption> {
  return [
    ...CODE_LANGUAGES,
    { id: "text", label: m.common_plain_text(), aliases: [] },
  ];
}

/**
 * The code block's language picker: a trigger showing the current language
 * and a popover with a search box over a filtered list. Focus stays in the
 * search box; arrows move the active option, Enter picks it, Escape closes.
 */
export function LanguagePicker({
  value,
  onChange,
}: {
  /** The block's language as stored; aliases are shown as their language. */
  value: string;
  onChange: (id: string) => void;
}) {
  const options = useMemo(pickerOptions, []);
  const currentId = resolveCodeLanguage(value)?.id ?? value;
  const currentLabel =
    options.find((option) => option.id === currentId)?.label ?? value;

  const [open, setOpen] = useState(false);
  const present = useMotionPresence(open, MOTION.popover);
  const [query, setQuery] = useState("");
  const [activeIndex, setActiveIndex] = useState(0);
  const [popoverStyle, setPopoverStyle] = useState<CSSProperties | null>(null);
  const triggerRef = useRef<HTMLButtonElement>(null);
  const popoverRef = useRef<HTMLDivElement>(null);
  const searchRef = useRef<HTMLInputElement>(null);
  const listId = useId();
  const optionId = (id: string) => `${listId}-${id}`;

  const filtered = useMemo(
    () => filterLanguageOptions(options, query),
    [options, query],
  );
  const active = filtered[activeIndex];

  const openPicker = () => {
    setQuery("");
    setActiveIndex(
      Math.max(
        0,
        options.findIndex((option) => option.id === currentId),
      ),
    );
    setOpen(true);
  };

  const close = () => {
    setOpen(false);
    triggerRef.current?.focus();
  };

  const pick = (option: LanguageOption) => {
    onChange(option.id);
    close();
  };

  useLayoutEffect(() => {
    if (!present) {
      setPopoverStyle(null);
      return;
    }

    const update = () => {
      const trigger = triggerRef.current;
      if (!trigger) return;
      const rect = trigger.getBoundingClientRect();
      const gap = 4;
      const spaceBelow = window.innerHeight - rect.bottom;
      const openUp = spaceBelow < POPOVER_MAX_HEIGHT && rect.top > spaceBelow;
      setPopoverStyle({
        position: "fixed",
        right: window.innerWidth - rect.right,
        width: POPOVER_WIDTH,
        top: openUp ? undefined : rect.bottom + gap,
        bottom: openUp ? window.innerHeight - rect.top + gap : undefined,
        transformOrigin: openUp ? "bottom right" : "top right",
        "--popover-offset": openUp ? "4px" : "-4px",
      } as CSSProperties);
    };

    update();
    window.addEventListener("resize", update);
    document.addEventListener("scroll", update, true);
    return () => {
      window.removeEventListener("resize", update);
      document.removeEventListener("scroll", update, true);
    };
  }, [present]);

  useEffect(() => {
    if (open && popoverStyle) searchRef.current?.focus();
  }, [open, popoverStyle]);

  useEffect(() => {
    if (!open) return;
    const onPointerDown = (event: MouseEvent) => {
      const target = event.target as Node;
      if (triggerRef.current?.contains(target)) return;
      if (popoverRef.current?.contains(target)) return;
      setOpen(false);
    };
    document.addEventListener("mousedown", onPointerDown);
    return () => document.removeEventListener("mousedown", onPointerDown);
  }, [open]);

  useEffect(() => {
    if (!open || !active) return;
    document
      .getElementById(optionId(active.id))
      ?.scrollIntoView?.({ block: "nearest" });
  });

  const handleSearchKeyDown = (event: KeyboardEvent<HTMLInputElement>) => {
    switch (event.key) {
      case "ArrowDown":
      case "ArrowUp": {
        event.preventDefault();
        if (filtered.length === 0) return;
        const step = event.key === "ArrowDown" ? 1 : -1;
        setActiveIndex(
          (current) => (current + step + filtered.length) % filtered.length,
        );
        return;
      }
      case "Enter":
        event.preventDefault();
        if (active) pick(active);
        return;
      case "Escape":
        event.preventDefault();
        event.stopPropagation();
        close();
        return;
      case "Tab":
        setOpen(false);
    }
  };

  return (
    <div className="relative">
      <button
        ref={triggerRef}
        type="button"
        aria-label={m.editor_code_language()}
        aria-haspopup="listbox"
        aria-expanded={open}
        onClick={() => (open ? setOpen(false) : openPicker())}
        className="flex items-center gap-1 rounded-lg bg-(--fuwari-primary)/10 px-2 py-0.5 font-mono text-xs font-bold uppercase text-(--fuwari-primary)"
      >
        <span>{currentLabel}</span>
        <ChevronDown
          size={12}
          aria-hidden="true"
          className={cn(
            "transition-transform duration-200",
            open && "rotate-180",
          )}
        />
      </button>

      {present && popoverStyle
        ? createPortal(
            <div
              ref={popoverRef}
              data-state={open ? "open" : "closing"}
              inert={!open}
              aria-hidden={!open}
              style={popoverStyle}
              className="fuwari-popover-motion z-80 flex flex-col overflow-hidden rounded-xl bg-(--fuwari-card-bg) shadow-md ring-1 ring-(--fuwari-input-border)"
            >
              <div className="flex items-center gap-2 border-b border-(--fuwari-input-border) px-3 py-2 fuwari-text-50 focus-within:text-(--fuwari-primary)">
                <Search size={14} aria-hidden="true" className="shrink-0" />
                <input
                  ref={searchRef}
                  type="text"
                  role="combobox"
                  aria-label={m.editor_code_language_search()}
                  aria-expanded={open}
                  aria-controls={listId}
                  aria-autocomplete="list"
                  aria-activedescendant={
                    active ? optionId(active.id) : undefined
                  }
                  placeholder={m.editor_code_language_search()}
                  autoComplete="off"
                  spellCheck={false}
                  value={query}
                  onChange={(event) => {
                    setQuery(event.target.value);
                    setActiveIndex(0);
                  }}
                  onKeyDown={handleSearchKeyDown}
                  className="min-w-0 flex-1 bg-transparent text-sm fuwari-text-90 outline-none placeholder:text-(--fuwari-fg-30)"
                />
              </div>
              <div
                id={listId}
                role="listbox"
                aria-label={m.editor_code_language()}
                className="max-h-64 overflow-y-auto p-1 empty:hidden custom-scrollbar"
              >
                {filtered.map((option, index) => {
                  const isActive = index === activeIndex;
                  const isCurrent = option.id === currentId;
                  return (
                    <div
                      key={option.id}
                      id={optionId(option.id)}
                      role="option"
                      aria-selected={isActive}
                      // Keep focus in the search box while clicking.
                      onMouseDown={(event) => event.preventDefault()}
                      onMouseMove={() => setActiveIndex(index)}
                      onClick={() => pick(option)}
                      className={cn(
                        "flex cursor-pointer items-center justify-between gap-2 rounded-lg px-3 py-1.5 text-sm transition-colors",
                        isActive && "bg-(--fuwari-btn-regular-bg)",
                        isCurrent
                          ? "text-(--fuwari-primary)"
                          : isActive
                            ? "fuwari-text-90"
                            : "fuwari-text-75",
                      )}
                    >
                      <span className="truncate">{option.label}</span>
                      {isCurrent ? (
                        <Check
                          size={14}
                          strokeWidth={2.5}
                          aria-hidden="true"
                          className="shrink-0"
                        />
                      ) : null}
                    </div>
                  );
                })}
              </div>
              {filtered.length === 0 ? (
                <p className="px-4 py-2.5 text-sm fuwari-text-50">
                  {m.editor_code_language_empty()}
                </p>
              ) : null}
            </div>,
            document.body,
          )
        : null}
    </div>
  );
}
