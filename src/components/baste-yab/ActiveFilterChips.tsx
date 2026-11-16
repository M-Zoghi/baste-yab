"use client";

import { RotateCcw, X } from "lucide-react";

import {
  ENTRIES,
  faDigits,
  fmtToman,
  type Kind,
  type RestrictionTag,
  type SortKey,
} from "@/lib/providers";
import {
  DURATION_OPTIONS,
  HOME_TECH_OPTIONS,
  RESTRICTION_OPTIONS,
  type DurationKey,
} from "./helpers";
import type { HomeTechFilter } from "@/hooks/use-baste-yab-state";

interface ActiveFilterChipsProps {
  query: string;
  onClearQuery: () => void;
  cat: "home" | "mobile";
  homeTech: HomeTechFilter;
  onClearHomeTech: () => void;
  liveEntries: (typeof ENTRIES)[number][];
  provSel: Set<string>;
  onToggleProvider: (key: string) => void;
  onSelectAllProviders: () => void;
  kinds: Set<Kind>;
  onToggleKind: (k: Kind) => void;
  durations: Set<DurationKey>;
  onToggleDuration: (d: DurationKey) => void;
  maxPrice: number | null;
  vat: boolean;
  onClearMaxPrice: () => void;
  minGB: number;
  onClearMinGB: () => void;
  onlyDisc: boolean;
  onClearOnlyDisc: () => void;
  hideFree: boolean;
  onClearHideFree: () => void;
  hidePortalOnly: boolean;
  onClearHidePortalOnly: () => void;
  includedRestrictions: Set<RestrictionTag>;
  onToggleRestriction: (tag: RestrictionTag) => void;
  sort: SortKey;
  onResetSort: () => void;
  onResetAll: () => void;
}

interface ChipItem {
  id: string;
  label: string;
  dotColor?: string;
  onClear: () => void;
}

const SORT_LABELS: Record<Exclude<SortKey, "best">, string> = {
  price: "کمترین قیمت",
  gb: "بیشترین حجم",
  days: "بیشترین مدت",
};

const EXCLUDED_RESTR_LABEL: Record<RestrictionTag, string> = {
  night: "بدون شبانه",
  morning: "بدون صبحانت",
  hourly: "بدون ساعتی",
  domestic: "بدون انارستان",
  newUser: "بدون مشترک جدید",
  youth: "بدون زیر ۲۸ سال",
};

export function ActiveFilterChips({
  query,
  onClearQuery,
  cat,
  homeTech,
  onClearHomeTech,
  liveEntries,
  provSel,
  onToggleProvider,
  onSelectAllProviders,
  kinds,
  onToggleKind,
  durations,
  onToggleDuration,
  maxPrice,
  vat,
  onClearMaxPrice,
  minGB,
  onClearMinGB,
  onlyDisc,
  onClearOnlyDisc,
  hideFree,
  onClearHideFree,
  hidePortalOnly,
  onClearHidePortalOnly,
  includedRestrictions,
  onToggleRestriction,
  sort,
  onResetSort,
  onResetAll,
}: ActiveFilterChipsProps) {
  const chips: ChipItem[] = [];

  if (query.trim()) {
    chips.push({
      id: "query",
      label: `جست‌وجو: «${query.trim()}»`,
      onClear: onClearQuery,
    });
  }

  if (cat === "home" && homeTech !== "all") {
    const opt = HOME_TECH_OPTIONS.find((o) => o.key === homeTech);
    chips.push({
      id: "homeTech",
      label: `فناوری: ${opt?.shortLabel ?? homeTech}`,
      onClear: onClearHomeTech,
    });
  }

  if (provSel.size !== liveEntries.length) {
    if (provSel.size === 0) {
      chips.push({
        id: "prov-none",
        label: "هیچ اپراتوری انتخاب نشده",
        onClear: onSelectAllProviders,
      });
    } else if (provSel.size <= 2) {
      for (const e of liveEntries) {
        if (!provSel.has(e.key)) continue;
        chips.push({
          id: `prov-${e.key}`,
          label: e.nameFa,
          dotColor: e.accent,
          onClear: provSel.size === 1 ? onSelectAllProviders : () => onToggleProvider(e.key),
        });
      }
    } else if (liveEntries.length - provSel.size === 1) {
      const missing = liveEntries.find((e) => !provSel.has(e.key));
      if (missing) {
        chips.push({
          id: `prov-ex-${missing.key}`,
          label: `بدون ${missing.nameFa}`,
          dotColor: missing.accent,
          onClear: () => onToggleProvider(missing.key),
        });
      }
    } else {
      chips.push({
        id: "prov-subset",
        label: `اپراتورها: ${faDigits(provSel.size)} از ${faDigits(liveEntries.length)}`,
        onClear: onSelectAllProviders,
      });
    }
  }

  if (!kinds.has("internet")) {
    chips.push({
      id: "kind-no-internet",
      label: "بدون اینترنت خالص",
      onClear: () => onToggleKind("internet"),
    });
  }
  if (!kinds.has("combo")) {
    chips.push({
      id: "kind-no-combo",
      label: "بدون ترکیبی",
      onClear: () => onToggleKind("combo"),
    });
  }
  if (kinds.has("roaming")) {
    chips.push({
      id: "kind-roaming",
      label: "شامل رومینگ",
      onClear: () => onToggleKind("roaming"),
    });
  }

  for (const opt of DURATION_OPTIONS) {
    if (durations.has(opt.key)) {
      chips.push({
        id: `dur-${opt.key}`,
        label: `مدت: ${opt.label}`,
        onClear: () => onToggleDuration(opt.key),
      });
    }
  }

  if (maxPrice != null) {
    chips.push({
      id: "maxPrice",
      label: `سقف قیمت${vat ? " (با مالیات)" : ""}: ${fmtToman(maxPrice)} ت`,
      onClear: onClearMaxPrice,
    });
  }

  if (minGB > 0) {
    chips.push({
      id: "minGB",
      label: `حداقل ${faDigits(minGB)} گیگ`,
      onClear: onClearMinGB,
    });
  }

  if (onlyDisc) {
    chips.push({
      id: "onlyDisc",
      label: "فقط تخفیف‌دار",
      onClear: onClearOnlyDisc,
    });
  }

  if (hideFree) {
    chips.push({
      id: "hideFree",
      label: "بدون هدیه رایگان",
      onClear: onClearHideFree,
    });
  }

  if (hidePortalOnly) {
    chips.push({
      id: "hidePortalOnly",
      label: "بدون اختصاصی اپ",
      onClear: onClearHidePortalOnly,
    });
  }

  for (const opt of RESTRICTION_OPTIONS) {
    if (!includedRestrictions.has(opt.key)) {
      chips.push({
        id: `ex-${opt.key}`,
        label: EXCLUDED_RESTR_LABEL[opt.key],
        onClear: () => onToggleRestriction(opt.key),
      });
    }
  }

  if (sort !== "best") {
    chips.push({
      id: "sort",
      label: `مرتب‌سازی: ${SORT_LABELS[sort]}`,
      onClear: onResetSort,
    });
  }

  if (chips.length === 0) return null;

  return (
    <div
      aria-label="فیلترهای فعال"
      className="flex flex-nowrap lg:flex-wrap items-center gap-1.5 overflow-x-auto lg:overflow-visible rail rounded-2xl lg:rounded-xl border border-border bg-card px-3 py-2 shadow-xs"
    >
      <span className="text-[11px] font-bold text-muted-foreground me-0.5 whitespace-nowrap shrink-0">
        فیلترهای فعال:
      </span>
      {chips.map((chip) => (
        <button
          key={chip.id}
          type="button"
          onClick={chip.onClear}
          className="inline-flex min-h-[28px] shrink-0 items-center gap-1.5 rounded-lg border border-input bg-muted/60 px-2 py-0.5 text-[11.5px] font-bold text-foreground transition-colors hover:border-destructive/50 hover:bg-destructive/15 hover:text-destructive whitespace-nowrap cursor-pointer"
        >
          {chip.dotColor && (
            <span
              className="h-2 w-2 rounded-full shrink-0"
              style={{ backgroundColor: chip.dotColor }}
            />
          )}
          <span className="fa-num">{chip.label}</span>
          <X className="h-3 w-3 shrink-0 opacity-75" />
        </button>
      ))}
      {chips.length > 1 && (
        <button
          type="button"
          onClick={onResetAll}
          className="ms-auto inline-flex min-h-[28px] shrink-0 items-center gap-1 rounded-lg px-2 py-0.5 text-[11px] font-bold text-primary hover:bg-primary/12 whitespace-nowrap cursor-pointer"
        >
          <RotateCcw className="h-3 w-3" />
          <span>پاک‌کردن همه</span>
        </button>
      )}
    </div>
  );
}
