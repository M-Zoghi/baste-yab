"use client";

import { ChevronDown, RotateCcw, Search, X } from "lucide-react";

import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Slider } from "@/components/ui/slider";
import { Switch } from "@/components/ui/switch";
import {
  ENTRIES,
  faDigits,
  fmtToman,
  type Category,
  type HomeTech,
  type Kind,
  type RestrictionTag,
} from "@/lib/providers";
import {
  ALL_RESTRICTION_TAGS,
  DEFAULT_KINDS,
  DURATION_OPTIONS,
  HOME_TECH_OPTIONS,
  KIND_LABEL,
  RESTRICTION_OPTIONS,
  type DurationKey,
} from "./helpers";
import type { HomeTechFilter } from "@/hooks/use-baste-yab-state";

interface FilterPanelProps {
  cat: Category;
  homeTech: HomeTechFilter;
  onHomeTechChange: (t: HomeTechFilter) => void;
  homeTechCounts: Record<HomeTech, number>;
  query: string;
  onQueryChange: (q: string) => void;
  liveEntries: (typeof ENTRIES)[number][];
  awaitingEntries: (typeof ENTRIES)[number][];
  provSel: Set<string>;
  onToggleProvider: (key: string) => void;
  onSelectAllProviders: () => void;
  provCounts: Record<string, number>;
  kinds: Set<Kind>;
  onToggleKind: (k: Kind) => void;
  kindCounts: Record<Kind, number>;
  durations: Set<DurationKey>;
  onToggleDuration: (d: DurationKey) => void;
  onClearDurations: () => void;
  durationCounts: Record<DurationKey, number>;
  vat: boolean;
  maxPrice: number | null;
  priceCap: number;
  onMaxPriceChange: (val: number | null) => void;
  minGB: number;
  gbCap: number;
  onMinGBChange: (val: number) => void;
  onlyDisc: boolean;
  onOnlyDiscChange: (val: boolean) => void;
  hideFree: boolean;
  onHideFreeChange: (val: boolean) => void;
  hidePortalOnly: boolean;
  onHidePortalOnlyChange: (val: boolean) => void;
  portalOnlyCount: number;
  includedRestrictions: Set<RestrictionTag>;
  restrictionCounts: Record<RestrictionTag, number>;
  onToggleRestriction: (tag: RestrictionTag) => void;
  onIncludeAllRestrictions: (tags: RestrictionTag[]) => void;
  onClearRestrictions: () => void;
  activeFilters: number;
  onReset: () => void;
  hideSearch?: boolean;
}

const SHORT_RESTRICTION_LABEL: Record<RestrictionTag, string> = {
  night: "شبانه (۲ تا ۷ صبح)",
  morning: "صبحانت (۶ تا ۱۲)",
  hourly: "ساعتی",
  domestic: "انارستان (داخلی)",
  newUser: "مشترک جدید",
  youth: "زیر ۲۸ سال",
};

export function FilterPanel({
  cat,
  homeTech,
  onHomeTechChange,
  homeTechCounts,
  query,
  onQueryChange,
  liveEntries,
  provSel,
  onToggleProvider,
  onSelectAllProviders,
  provCounts,
  kinds,
  onToggleKind,
  kindCounts,
  durations,
  onToggleDuration,
  onClearDurations,
  durationCounts,
  vat,
  maxPrice,
  priceCap,
  onMaxPriceChange,
  minGB,
  gbCap,
  onMinGBChange,
  onlyDisc,
  onOnlyDiscChange,
  hideFree,
  onHideFreeChange,
  hidePortalOnly,
  onHidePortalOnlyChange,
  portalOnlyCount,
  includedRestrictions,
  restrictionCounts,
  onToggleRestriction,
  onIncludeAllRestrictions,
  onClearRestrictions,
  activeFilters,
  onReset,
  hideSearch = false,
}: FilterPanelProps) {
  const allProvidersSelected = provSel.size === liveEntries.length;
  const availableRestrictions = RESTRICTION_OPTIONS.filter(
    (opt) => (restrictionCounts[opt.key] ?? 0) > 0,
  );
  const allRestrictedHidden =
    availableRestrictions.length > 0 &&
    availableRestrictions.every((opt) => !includedRestrictions.has(opt.key));

  const advancedModifiedCount =
    (cat === "home" && homeTech !== "all" ? 1 : 0) +
    (kinds.size !== DEFAULT_KINDS.length || DEFAULT_KINDS.some((k) => !kinds.has(k)) ? 1 : 0) +
    (hideFree ? 1 : 0) +
    (hidePortalOnly ? 1 : 0);

  return (
    <div className="space-y-4">
      {/* Search (Desktop Sidebar; Mobile Drawer hides it since search is already at top of Browse) */}
      {!hideSearch && (
        <div>
          <div className="mb-2 flex items-center justify-between">
            <span className="text-xs font-bold text-muted-foreground">جست‌وجو</span>
            {activeFilters > 0 && (
              <button
                type="button"
                onClick={onReset}
                className="inline-flex items-center gap-1 text-[11px] font-bold text-primary hover:underline cursor-pointer"
              >
                <RotateCcw className="h-3 w-3" />
                پاک‌کردن ({faDigits(activeFilters)})
              </button>
            )}
          </div>
          <div className="relative">
            <Search className="pointer-events-none absolute start-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
            <Input
              value={query}
              onChange={(e) => onQueryChange(e.target.value)}
              placeholder="نام بسته، اپراتور..."
              className="min-h-[40px] bg-card ps-9 pe-8 text-[13px]"
            />
            {query && (
              <button
                type="button"
                onClick={() => onQueryChange("")}
                aria-label="پاک‌کردن جست‌وجو"
                className="absolute end-2.5 top-1/2 -translate-y-1/2 rounded-md p-1 text-muted-foreground hover:bg-secondary hover:text-foreground cursor-pointer"
              >
                <X className="h-3.5 w-3.5" />
              </button>
            )}
          </div>
        </div>
      )}

      {/* 1. Operators */}
      <div className={hideSearch ? "" : "border-t border-border/60 pt-4"}>
        <div className="mb-2 flex items-center justify-between">
          <span className="text-xs font-bold text-foreground">اپراتور</span>
          {!allProvidersSelected && (
            <button
              type="button"
              onClick={onSelectAllProviders}
              className="text-[11px] font-bold text-primary hover:underline cursor-pointer"
            >
              همه
            </button>
          )}
        </div>
        <div className="flex flex-wrap gap-1.5">
          {liveEntries.map((e) => {
            const on = provSel.has(e.key);
            const cnt = provCounts[e.key] ?? 0;
            return (
              <button
                key={e.key}
                type="button"
                onClick={() => onToggleProvider(e.key)}
                aria-pressed={on}
                className={`inline-flex min-h-[34px] items-center gap-1.5 rounded-full border px-3 text-xs font-bold transition-colors whitespace-nowrap shrink-0 cursor-pointer focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring ${
                  on
                    ? "border-transparent text-white shadow-xs [text-shadow:0_1px_1px_rgb(0_0_0/0.22)]"
                    : "border-border bg-muted/55 text-foreground/85 hover:bg-secondary hover:text-foreground"
                }`}
                style={on ? { backgroundColor: e.accent } : undefined}
              >
                <span
                  className="h-2 w-2 rounded-full shrink-0"
                  style={{ backgroundColor: on ? "rgba(255, 255, 255, 0.9)" : e.accent }}
                />
                <span>{e.nameFa}</span>
                <span
                  className={`fa-num text-[10.5px] font-semibold ${
                    on ? "text-white/90" : "text-muted-foreground"
                  }`}
                >
                  {faDigits(cnt)}
                </span>
              </button>
            );
          })}
        </div>
      </div>

      {/* 2. Duration */}
      <div className="border-t border-border/60 pt-4">
        <div className="mb-2 flex items-center justify-between">
          <span className="text-xs font-bold text-foreground">مدت اعتبار</span>
          {durations.size > 0 && (
            <button
              type="button"
              onClick={onClearDurations}
              className="text-[11px] font-bold text-primary hover:underline cursor-pointer"
            >
              همه دوره‌ها
            </button>
          )}
        </div>
        <div className="flex flex-wrap gap-1.5">
          {DURATION_OPTIONS.map((opt) => {
            const on = durations.has(opt.key);
            const cnt = durationCounts[opt.key] ?? 0;
            return (
              <button
                key={opt.key}
                type="button"
                onClick={() => onToggleDuration(opt.key)}
                aria-pressed={on}
                className={`inline-flex min-h-[34px] items-center gap-1.5 rounded-full border px-3 text-xs font-bold transition-colors whitespace-nowrap shrink-0 cursor-pointer focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring ${
                  on
                    ? "border-primary bg-primary text-primary-foreground shadow-xs"
                    : cnt === 0
                      ? "border-border/80 bg-muted/30 text-muted-foreground/70"
                      : "border-border bg-muted/55 text-foreground/85 hover:bg-secondary hover:text-foreground"
                }`}
              >
                <span>{opt.label}</span>
                <span className="fa-num text-[10.5px] opacity-80">{faDigits(cnt)}</span>
              </button>
            );
          })}
        </div>
      </div>

      {/* 3. Budget & Volume Sliders */}
      <div className="space-y-3.5 border-t border-border/60 pt-4">
        <div>
          <div className="mb-2 flex items-baseline justify-between gap-2">
            <span className="text-xs font-bold text-foreground">
              حداکثر قیمت{vat ? " (با مالیات)" : ""}
            </span>
            <span className="fa-num text-xs font-extrabold text-primary">
              {maxPrice == null ? "بدون محدودیت" : `تا ${fmtToman(maxPrice)} ت`}
            </span>
          </div>
          <Slider
            min={0}
            max={priceCap || 1}
            step={50000}
            value={[maxPrice == null ? priceCap : maxPrice]}
            onValueChange={([v]) => onMaxPriceChange(v >= priceCap ? null : v)}
            dir="ltr"
          />
          <div className="fa-num mt-1 flex justify-between text-[10.5px] text-muted-foreground" dir="ltr">
            <span>۰</span>
            <span>{fmtToman(priceCap)}</span>
          </div>
        </div>

        <div>
          <div className="mb-2 flex items-baseline justify-between gap-2">
            <span className="text-xs font-bold text-foreground">حداقل حجم</span>
            <span className="fa-num text-xs font-extrabold text-primary">
              {minGB === 0 ? "همه حجم‌ها" : `از ${faDigits(minGB)} گیگ`}
            </span>
          </div>
          <Slider
            min={0}
            max={gbCap || 1}
            step={1}
            value={[minGB]}
            onValueChange={([v]) => onMinGBChange(v)}
            dir="ltr"
          />
          <div className="fa-num mt-1 flex justify-between text-[10.5px] text-muted-foreground" dir="ltr">
            <span>۰</span>
            <span>{faDigits(gbCap)} گیگ</span>
          </div>
        </div>
      </div>

      {/* 4. Two Simple Quick Switches */}
      <div className="space-y-3 border-t border-border/60 pt-4">
        <label className="flex min-h-[34px] cursor-pointer items-center justify-between gap-3 text-xs font-bold text-foreground">
          <span>فقط بسته‌های تخفیف‌دار</span>
          <Switch checked={onlyDisc} onCheckedChange={onOnlyDiscChange} />
        </label>

        {availableRestrictions.length > 0 && (
          <label className="flex min-h-[34px] cursor-pointer items-center justify-between gap-3">
            <span className="min-w-0">
              <span className="block text-xs font-bold text-foreground">
                حذف بسته‌های زمان‌دار و خاص
              </span>
              <span className="block text-[11px] text-muted-foreground">
                شبانه، ساعتی، صبحانت و طرح‌های سنی
              </span>
            </span>
            <Switch
              checked={allRestrictedHidden}
              onCheckedChange={(hideAll) => {
                if (hideAll) onClearRestrictions();
                else onIncludeAllRestrictions(ALL_RESTRICTION_TAGS);
              }}
            />
          </label>
        )}
      </div>

      {/* 5. Collapsible Advanced Filters (for power users only) */}
      <details className="group border-t border-border/60 pt-3">
        <summary className="flex cursor-pointer list-none items-center justify-between py-1 text-xs font-bold text-muted-foreground hover:text-foreground">
          <span className="inline-flex items-center gap-1.5">
            <span>فیلترهای بیشتر</span>
            {advancedModifiedCount > 0 && (
              <span className="fa-num rounded-full bg-primary/15 px-1.5 py-0.5 text-[10px] font-extrabold text-primary">
                {faDigits(advancedModifiedCount)} فعال
              </span>
            )}
          </span>
          <ChevronDown className="h-4 w-4 transition-transform group-open:rotate-180" />
        </summary>

        <div className="mt-3 space-y-4">
          {/* Home Technology (only when category === home) */}
          {cat === "home" && (
            <div>
              <div className="mb-1.5 flex items-center justify-between">
                <span className="text-[11.5px] font-bold text-muted-foreground">نوع اینترنت ثابت</span>
                {homeTech !== "all" && (
                  <button
                    type="button"
                    onClick={() => onHomeTechChange("all")}
                    className="text-[11px] font-bold text-primary hover:underline cursor-pointer"
                  >
                    همه
                  </button>
                )}
              </div>
              <div className="flex flex-wrap gap-1.5">
                {HOME_TECH_OPTIONS.map((opt) => {
                  const on = homeTech === opt.key;
                  const cnt = homeTechCounts[opt.key] ?? 0;
                  return (
                    <button
                      key={opt.key}
                      type="button"
                      onClick={() => onHomeTechChange(on ? "all" : opt.key)}
                      aria-pressed={on}
                      className={`inline-flex min-h-[32px] items-center gap-1.5 rounded-lg border px-2.5 text-[11.5px] font-bold transition-colors whitespace-nowrap shrink-0 cursor-pointer ${
                        on
                          ? "border-primary/60 bg-primary/15 text-primary"
                          : "border-border bg-muted/50 text-foreground/85"
                      }`}
                    >
                      <span>{opt.shortLabel}</span>
                      <span className="fa-num text-[10.5px] opacity-80">
                        {cnt > 0 ? faDigits(cnt) : "به‌زودی"}
                      </span>
                    </button>
                  );
                })}
              </div>
            </div>
          )}

          {/* Package Kind */}
          <div>
            <div className="mb-1.5 text-[11.5px] font-bold text-muted-foreground">نوع بسته</div>
            <div className="flex flex-wrap gap-1.5">
              {(["internet", "combo", "roaming"] as Kind[]).map((k) => {
                const on = kinds.has(k);
                return (
                  <button
                    key={k}
                    type="button"
                    onClick={() => onToggleKind(k)}
                    aria-pressed={on}
                    className={`inline-flex min-h-[32px] items-center gap-1.5 rounded-lg border px-2.5 text-[11.5px] font-bold transition-colors whitespace-nowrap shrink-0 cursor-pointer ${
                      on
                        ? "border-primary/60 bg-primary/15 text-primary"
                        : "border-border bg-muted/50 text-foreground/85"
                    }`}
                  >
                    <span>{KIND_LABEL[k]}</span>
                    <span className="fa-num text-[10.5px] opacity-80">
                      {faDigits(kindCounts[k] ?? 0)}
                    </span>
                  </button>
                );
              })}
            </div>
          </div>

          {/* Individual Restriction Pills */}
          {availableRestrictions.length > 0 && (
            <div>
              <div className="mb-1.5 flex items-center justify-between">
                <span className="text-[11.5px] font-bold text-muted-foreground">
                  بسته‌های زمان‌دار و خاص
                </span>
                <button
                  type="button"
                  onClick={() =>
                    allRestrictedHidden
                      ? onIncludeAllRestrictions(ALL_RESTRICTION_TAGS)
                      : onClearRestrictions()
                  }
                  className="text-[11px] font-bold text-primary hover:underline cursor-pointer"
                >
                  {allRestrictedHidden ? "نمایش همه" : "حذف همه"}
                </button>
              </div>
              <div className="flex flex-wrap gap-1.5">
                {availableRestrictions.map((opt) => {
                  const shown = includedRestrictions.has(opt.key);
                  const count = restrictionCounts[opt.key] ?? 0;
                  return (
                    <button
                      key={opt.key}
                      type="button"
                      onClick={() => onToggleRestriction(opt.key)}
                      aria-pressed={shown}
                      className={`inline-flex min-h-[30px] items-center gap-1 rounded-lg border px-2 text-[11px] font-bold transition-colors cursor-pointer ${
                        shown
                          ? "border-primary/50 bg-primary/12 text-primary"
                          : "border-border bg-muted/40 text-muted-foreground line-through"
                      }`}
                    >
                      <span>{SHORT_RESTRICTION_LABEL[opt.key]}</span>
                      <span className="fa-num opacity-75">({faDigits(count)})</span>
                    </button>
                  );
                })}
              </div>
            </div>
          )}

          {/* Extra Hide Toggles */}
          <div className="space-y-2.5 border-t border-border/50 pt-2.5">
            <label className="flex min-h-[30px] cursor-pointer items-center justify-between gap-3 text-xs font-medium text-foreground">
              <span>پنهان‌کردن هدایای رایگان</span>
              <Switch checked={hideFree} onCheckedChange={onHideFreeChange} />
            </label>
            {portalOnlyCount > 0 && (
              <label className="flex min-h-[30px] cursor-pointer items-center justify-between gap-3 text-xs font-medium text-foreground">
                <span>
                  پنهان‌کردن بسته‌های اختصاصی اپ ({faDigits(portalOnlyCount)})
                </span>
                <Switch checked={hidePortalOnly} onCheckedChange={onHidePortalOnlyChange} />
              </label>
            )}
          </div>
        </div>
      </details>

      {activeFilters > 0 && (
        <Button
          variant="outline"
          size="sm"
          onClick={onReset}
          className="w-full min-h-[40px] rounded-xl gap-1.5 font-bold cursor-pointer"
        >
          <RotateCcw className="h-3.5 w-3.5" />
          پاک‌کردن فیلترها
        </Button>
      )}
    </div>
  );
}
