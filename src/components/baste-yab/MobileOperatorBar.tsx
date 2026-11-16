"use client";

import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { ChevronLeft, ChevronRight } from "lucide-react";

import { faDigits, type Entry } from "@/lib/providers";

interface MobileOperatorBarProps {
  entries: Entry[];
  totalCount: number;
  provSel: Set<string>;
  page: number;
  onPageChange: (nextPage: number) => void;
  onSelectAll: () => void;
  onToggleSingle: (entryKey: string, isFocused: boolean) => void;
}

type OpItem = { type: "all" } | { type: "entry"; entry: Entry };

const CHIP_GAP = 6; // matches gap-1.5 (0.375rem)
const ARROW_SLOT = 42; // 36px (h-9 w-9) arrow button + 6px gap

function packPages(widths: number[], outerWidth: number): number[][] {
  if (widths.length === 0) return [];
  if (outerWidth <= 0) return [widths.map((_, idx) => idx)];

  const totalWidth =
    widths.reduce((sum, w) => sum + w, 0) + Math.max(0, widths.length - 1) * CHIP_GAP;

  // All buttons fit with no navigation arrows needed
  if (totalWidth <= outerWidth) {
    return [widths.map((_, idx) => idx)];
  }

  const pages: number[][] = [];
  let idx = 0;

  while (idx < widths.length) {
    const isFirst = pages.length === 0;
    const singleArrowAvail = Math.max(72, outerWidth - ARROW_SLOT);
    const bothArrowsAvail = Math.max(72, outerWidth - ARROW_SLOT * 2);

    // If we're past page 0 and all remaining items fit with only the Prev arrow, finish here
    if (!isFirst) {
      const remainingWidth =
        widths.slice(idx).reduce((sum, w) => sum + w, 0) +
        Math.max(0, widths.length - idx - 1) * CHIP_GAP;
      if (remainingWidth <= singleArrowAvail) {
        pages.push(Array.from({ length: widths.length - idx }, (_, k) => idx + k));
        break;
      }
    }

    const avail = isFirst ? singleArrowAvail : bothArrowsAvail;
    const currentPage: number[] = [];
    let used = 0;

    while (idx < widths.length) {
      const w = widths[idx];
      const nextUsed = currentPage.length === 0 ? w : used + CHIP_GAP + w;
      if (currentPage.length > 0 && nextUsed > avail) {
        break;
      }
      currentPage.push(idx);
      used = nextUsed;
      idx += 1;
    }

    pages.push(currentPage);
  }

  return pages;
}

export function MobileOperatorBar({
  entries,
  totalCount,
  provSel,
  page,
  onPageChange,
  onSelectAll,
  onToggleSingle,
}: MobileOperatorBarProps) {
  const containerRef = useRef<HTMLDivElement | null>(null);
  const measureRef = useRef<HTMLDivElement | null>(null);
  const [layout, setLayout] = useState<{ sig: string; pages: number[][] } | null>(null);

  const opItems: OpItem[] = useMemo(
    () => [
      { type: "all" },
      ...entries.map((entry) => ({ type: "entry" as const, entry })),
    ],
    [entries],
  );

  const sig = useMemo(
    () => `${totalCount}:${entries.map((e) => e.key).join(",")}`,
    [entries, totalCount],
  );

  const recalculate = useCallback(() => {
    const container = containerRef.current;
    const measure = measureRef.current;
    if (!container || !measure) return;

    const outerWidth = container.clientWidth;
    if (outerWidth <= 0) return;

    const childNodes = Array.from(measure.children);
    const widths = childNodes.map((node) => Math.ceil(node.getBoundingClientRect().width));
    if (widths.length === 0) return;

    const nextPages = packPages(widths, outerWidth);
    setLayout((prev) => {
      if (
        prev &&
        prev.sig === sig &&
        prev.pages.length === nextPages.length &&
        prev.pages.every(
          (p, pi) =>
            p.length === nextPages[pi].length && p.every((v, vi) => v === nextPages[pi][vi]),
        )
      ) {
        return prev;
      }
      return { sig, pages: nextPages };
    });
  }, [sig]);

  useEffect(() => {
    const container = containerRef.current;
    if (!container) return;

    const frame = window.requestAnimationFrame(recalculate);
    const ro = new ResizeObserver(recalculate);
    ro.observe(container);

    let active = true;
    if (typeof document !== "undefined" && document.fonts?.ready) {
      void document.fonts.ready.then(() => {
        if (active) recalculate();
      });
    }

    return () => {
      active = false;
      window.cancelAnimationFrame(frame);
      ro.disconnect();
    };
  }, [recalculate]);

  if (entries.length === 0) return null;

  const activePages = layout && layout.sig === sig ? layout.pages : null;
  const totalPages = activePages ? activePages.length : 1;
  const safePage = Math.min(page, Math.max(0, totalPages - 1));
  const visibleIndices = activePages
    ? activePages[safePage] ?? []
    : opItems.map((_, idx) => idx);

  const showPrev = activePages !== null && safePage > 0;
  const showNext = activePages !== null && safePage < totalPages - 1;

  const renderChip = (item: OpItem, isMeasure: boolean) => {
    if (item.type === "all") {
      const allSelected = provSel.size === entries.length;
      return (
        <button
          key={isMeasure ? "m-all" : "all"}
          type="button"
          tabIndex={isMeasure ? -1 : undefined}
          onClick={isMeasure ? undefined : onSelectAll}
          aria-pressed={isMeasure ? undefined : allSelected}
          className={`inline-flex h-9 w-auto shrink-0 items-center justify-center gap-1.5 rounded-full border px-3 text-xs font-bold whitespace-nowrap transition-transform active:scale-[0.96] cursor-pointer ${
            !isMeasure && allSelected
              ? "border-primary bg-primary text-primary-foreground shadow-xs"
              : "border-border bg-card text-foreground hover:bg-muted"
          }`}
        >
          <span>همه</span>
          <span className="fa-num shrink-0 text-[11px] opacity-85">
            {faDigits(totalCount)}
          </span>
        </button>
      );
    }

    const { entry } = item;
    const isFocused = provSel.size === 1 && provSel.has(entry.key);
    const isSubsetSelected = provSel.size < entries.length && provSel.has(entry.key);

    return (
      <button
        key={isMeasure ? `m-${entry.key}` : entry.key}
        type="button"
        tabIndex={isMeasure ? -1 : undefined}
        onClick={isMeasure ? undefined : () => onToggleSingle(entry.key, isFocused)}
        aria-pressed={isMeasure ? undefined : isFocused || isSubsetSelected}
        className={`inline-flex h-9 w-auto shrink-0 items-center justify-center gap-1.5 rounded-full border px-3 text-xs font-bold whitespace-nowrap transition-transform active:scale-[0.96] cursor-pointer ${
          !isMeasure && isFocused
            ? "border-foreground bg-foreground text-background shadow-xs"
            : !isMeasure && isSubsetSelected
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
  };

  return (
    <div
      ref={containerRef}
      role="group"
      aria-label="انتخاب اپراتور"
      className="relative flex items-center gap-1.5"
    >
      {/* Hidden intrinsic-width measurement strip */}
      <div
        ref={measureRef}
        aria-hidden="true"
        className="pointer-events-none invisible absolute start-0 top-0 flex w-max items-center gap-1.5"
      >
        {opItems.map((item) => renderChip(item, true))}
      </div>

      {showPrev && (
        <button
          type="button"
          onClick={() => onPageChange(Math.max(0, safePage - 1))}
          aria-label="اپراتورهای قبلی"
          className="inline-flex h-9 w-9 shrink-0 items-center justify-center rounded-full border border-border bg-card text-foreground shadow-xs transition-transform active:scale-[0.94] hover:bg-muted cursor-pointer"
        >
          <ChevronRight className="h-4 w-4" />
        </button>
      )}

      <div className="flex min-w-0 flex-1 items-center gap-1.5 overflow-hidden">
        {visibleIndices.map((idx) => {
          const item = opItems[idx];
          return item ? renderChip(item, false) : null;
        })}
      </div>

      {showNext && (
        <button
          type="button"
          onClick={() => onPageChange(Math.min(totalPages - 1, safePage + 1))}
          aria-label="اپراتورهای بعدی"
          className="inline-flex h-9 w-9 shrink-0 items-center justify-center rounded-full border border-border bg-card text-foreground shadow-xs transition-transform active:scale-[0.94] hover:bg-muted cursor-pointer"
        >
          <ChevronLeft className="h-4 w-4" />
        </button>
      )}
    </div>
  );
}
