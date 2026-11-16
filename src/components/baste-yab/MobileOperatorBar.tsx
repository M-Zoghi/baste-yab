"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { ChevronLeft, ChevronRight } from "lucide-react";

import { faDigits, type Category, type Entry } from "@/lib/providers";

interface MobileOperatorBarProps {
  category: Category;
  entries: Entry[];
  totalCount: number;
  provSel: Set<string>;
  resetKey?: number;
  onSelectAll: () => void;
  onToggleSingle: (entryKey: string, isFocused: boolean) => void;
}

export function MobileOperatorBar({
  category,
  entries,
  totalCount,
  provSel,
  resetKey = 0,
  onSelectAll,
  onToggleSingle,
}: MobileOperatorBarProps) {
  const scrollerRef = useRef<HTMLDivElement | null>(null);
  const [edges, setEdges] = useState<{ canPrev: boolean; canNext: boolean }>({
    canPrev: false,
    canNext: false,
  });

  const updateEdges = useCallback(() => {
    const el = scrollerRef.current;
    if (!el) return;

    const first = el.firstElementChild;
    const last = el.lastElementChild;
    if (!first || !last) {
      setEdges((prev) => (prev.canPrev || prev.canNext ? { canPrev: false, canNext: false } : prev));
      return;
    }

    const elRect = el.getBoundingClientRect();
    const firstRect = first.getBoundingClientRect();
    const lastRect = last.getBoundingClientRect();

    // In RTL: first chip starts on the right edge, last chip ends on the left edge
    const canPrev = firstRect.right > elRect.right + 2;
    const canNext = lastRect.left < elRect.left - 2;

    setEdges((prev) =>
      prev.canPrev === canPrev && prev.canNext === canNext ? prev : { canPrev, canNext },
    );
  }, []);

  useEffect(() => {
    const el = scrollerRef.current;
    if (!el) return;

    el.scrollTo({ left: 0, behavior: "auto" });
    const frame = window.requestAnimationFrame(updateEdges);

    const ro = new ResizeObserver(updateEdges);
    ro.observe(el);

    let active = true;
    if (typeof document !== "undefined" && document.fonts?.ready) {
      void document.fonts.ready.then(() => {
        if (active) updateEdges();
      });
    }

    return () => {
      active = false;
      window.cancelAnimationFrame(frame);
      ro.disconnect();
    };
  }, [category, entries, totalCount, resetKey, updateEdges]);

  if (entries.length === 0) return null;

  const scrollByStep = (dir: "prev" | "next") => {
    const el = scrollerRef.current;
    if (!el) return;
    const step = Math.max(140, Math.round(el.clientWidth * 0.65));
    // Visual X axis: +step scrolls right (toward start/prev in RTL), -step scrolls left (toward next in RTL)
    el.scrollBy({
      left: dir === "prev" ? step : -step,
      behavior: "smooth",
    });
  };

  const allSelected = provSel.size === entries.length;

  return (
    <div role="group" aria-label="انتخاب اپراتور" className="relative">
      {/* Scrollable free-size operator strip (swift native touch scroll, no scrollbar) */}
      <div
        ref={scrollerRef}
        onScroll={updateEdges}
        className="flex w-full items-center gap-1.5 overflow-x-auto py-0.5 [scrollbar-width:none] [-ms-overflow-style:none] [&::-webkit-scrollbar]:hidden"
      >
        <button
          type="button"
          onClick={onSelectAll}
          aria-pressed={allSelected}
          className={`inline-flex h-9 w-auto shrink-0 items-center justify-center gap-1.5 rounded-full border px-3 text-xs font-bold whitespace-nowrap transition-transform active:scale-[0.96] cursor-pointer ${
            allSelected
              ? "border-primary bg-primary text-primary-foreground shadow-xs"
              : "border-border bg-card text-foreground hover:bg-muted"
          }`}
        >
          <span>همه</span>
          <span className="fa-num shrink-0 text-[11px] opacity-85">
            {faDigits(totalCount)}
          </span>
        </button>

        {entries.map((entry) => {
          const isFocused = provSel.size === 1 && provSel.has(entry.key);
          const isSubsetSelected =
            provSel.size < entries.length && provSel.has(entry.key);

          return (
            <button
              key={entry.key}
              type="button"
              onClick={() => onToggleSingle(entry.key, isFocused)}
              aria-pressed={isFocused || isSubsetSelected}
              className={`inline-flex h-9 w-auto shrink-0 items-center justify-center gap-1.5 rounded-full border px-3 text-xs font-bold whitespace-nowrap transition-transform active:scale-[0.96] cursor-pointer ${
                isFocused
                  ? "border-foreground bg-foreground text-background shadow-xs"
                  : isSubsetSelected
                    ? "border-primary/60 bg-primary/15 text-foreground shadow-xs"
                    : "border-border bg-card text-foreground hover:bg-muted"
              }`}
            >
              <span
                className="h-2 w-2 shrink-0 rounded-full ring-1 ring-black/15 dark:ring-white/25"
                style={{ backgroundColor: entry.accent }}
              />
              <span>{entry.nameFa}</span>
            </button>
          );
        })}
      </div>

      {/* Right edge fade + ">" arrow (shown only when scrolled away from start) */}
      {edges.canPrev && (
        <div className="pointer-events-none absolute inset-y-0 start-0 z-10 flex items-center bg-gradient-to-l from-background via-background/85 to-transparent pe-6">
          <button
            type="button"
            onClick={() => scrollByStep("prev")}
            aria-label="اپراتورهای قبلی"
            className="pointer-events-auto inline-flex h-8 w-8 items-center justify-center rounded-full border border-border bg-card/95 text-foreground shadow-sm backdrop-blur-xs transition-transform active:scale-[0.92] hover:bg-muted cursor-pointer"
          >
            <ChevronRight className="h-4 w-4" />
          </button>
        </div>
      )}

      {/* Left edge fade + "<" arrow (shown only when more operators overflow to the left) */}
      {edges.canNext && (
        <div className="pointer-events-none absolute inset-y-0 end-0 z-10 flex items-center bg-gradient-to-r from-background via-background/85 to-transparent ps-6">
          <button
            type="button"
            onClick={() => scrollByStep("next")}
            aria-label="اپراتورهای بعدی"
            className="pointer-events-auto inline-flex h-8 w-8 items-center justify-center rounded-full border border-border bg-card/95 text-foreground shadow-sm backdrop-blur-xs transition-transform active:scale-[0.92] hover:bg-muted cursor-pointer"
          >
            <ChevronLeft className="h-4 w-4" />
          </button>
        </div>
      )}
    </div>
  );
}
