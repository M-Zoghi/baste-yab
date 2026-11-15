"use client";

import { RotateCcw, Search, X } from "lucide-react";

import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Slider } from "@/components/ui/slider";
import { Switch } from "@/components/ui/switch";
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from "@/components/ui/tooltip";
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
}

export function FilterPanel({
  cat,
  homeTech,
  onHomeTechChange,
  homeTechCounts,
  query,
  onQueryChange,
  liveEntries,
  awaitingEntries,
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
}: FilterPanelProps) {
  const allProvidersSelected = provSel.size === liveEntries.length;
  const availableRestrictions = RESTRICTION_OPTIONS.filter(
    (opt) => (restrictionCounts[opt.key] ?? 0) > 0,
  );
  const allIncluded =
    availableRestrictions.length > 0 &&
    availableRestrictions.every((opt) => includedRestrictions.has(opt.key));

  return (
    <div className="space-y-5">
      {/* Search */}
      <div>
        <div className="mb-2 flex items-center justify-between">
          <span className="text-xs font-bold text-muted-foreground">جست‌وجو در بسته‌ها</span>
          {activeFilters > 0 && (
            <button
              type="button"
              onClick={onReset}
              className="inline-flex items-center gap-1 text-[11px] font-bold text-primary hover:underline cursor-pointer"
            >
              <RotateCcw className="h-3 w-3" />
              بازنشانی ({faDigits(activeFilters)})
            </button>
          )}
        </div>
        <div className="relative">
          <Search className="pointer-events-none absolute start-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
          <Input
            value={query}
            onChange={(e) => onQueryChange(e.target.value)}
            placeholder="نام بسته، اپراتور، کد رگولاتوری…"
            className="min-h-[42px] bg-background/60 ps-9 pe-8 text-[13px]"
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

      {/* Providers */}
      <div className="border-t border-border/60 pt-4">
        <div className="mb-2.5 flex items-center justify-between">
          <span className="text-xs font-bold text-muted-foreground">ارائه‌دهنده‌ها</span>
          {!allProvidersSelected && (
            <button
              type="button"
              onClick={onSelectAllProviders}
              className="text-[11px] font-bold text-primary hover:underline cursor-pointer"
            >
              انتخاب همه
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
                className={`inline-flex min-h-[36px] items-center gap-1.5 rounded-lg border px-2.5 py-1.5 text-[12.5px] font-bold transition-colors whitespace-nowrap shrink-0 cursor-pointer focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring ${
                  on
                    ? "border-transparent text-white shadow-xs [text-shadow:0_1px_1px_rgb(0_0_0/0.22)]"
                    : "border-border bg-background/50 text-muted-foreground hover:bg-secondary hover:text-foreground"
                }`}
                style={on ? { backgroundColor: e.accent } : undefined}
              >
                <span
                  className="h-2 w-2 rounded-full shrink-0"
                  style={{ backgroundColor: on ? "rgba(255, 255, 255, 0.9)" : e.accent }}
                />
                <span>{e.nameFa}</span>
                <span
                  className={`fa-num text-[11px] font-semibold ${
                    on ? "text-white/90" : "text-muted-foreground/80"
                  }`}
                >
                  {faDigits(cnt)}
                </span>
              </button>
            );
          })}

          {awaitingEntries.map((e) => (
            <TooltipProvider key={e.key}>
              <Tooltip>
                <TooltipTrigger asChild>
                  <span className="inline-flex min-h-[36px] cursor-not-allowed items-center gap-1.5 rounded-lg border border-dashed border-border/80 px-2.5 py-1.5 text-[12px] text-muted-foreground/70 whitespace-nowrap shrink-0">
                    <span className="h-1.5 w-1.5 rounded-full bg-muted-foreground/35" />
                    <span>{e.nameFa}</span>
                    {e.homeTech === "fixed" && (
                      <span className="text-[10px] opacity-75">(خط ثابت)</span>
                    )}
                  </span>
                </TooltipTrigger>
                <TooltipContent side="top" className="max-w-56 text-right">
                  <div className="font-bold">
                    {e.nameFa} — {e.tech}
                  </div>
                  <div className="text-xs opacity-85">{e.awaitingNote}</div>
                </TooltipContent>
              </Tooltip>
            </TooltipProvider>
          ))}
        </div>
      </div>

      {/* Home connection technology split (TD-LTE/5G modem vs ADSL/fiber) */}
      {cat === "home" && (
        <div className="border-t border-border/60 pt-4">
          <div className="mb-2.5 flex items-center justify-between">
            <span className="text-xs font-bold text-muted-foreground">فناوری اتصال ثابت</span>
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
                  className={`inline-flex min-h-[34px] items-center gap-1.5 rounded-lg border px-2.5 py-1 text-[12px] font-bold transition-colors whitespace-nowrap shrink-0 cursor-pointer focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring ${
                    on
                      ? "border-primary/45 bg-primary/10 text-primary"
                      : cnt === 0
                        ? "border-dashed border-border/70 bg-background/30 text-muted-foreground/60"
                        : "border-border bg-background/50 text-muted-foreground hover:bg-secondary hover:text-foreground"
                  }`}
                >
                  <span>{opt.shortLabel}</span>
                  <span className="fa-num text-[11px] opacity-80">
                    {cnt > 0 ? faDigits(cnt) : "در انتظار"}
                  </span>
                </button>
              );
            })}
          </div>
          <p className="mt-2 text-[11px] leading-5 text-muted-foreground">
            بسته‌های فعلی این بخش مربوط به مودم‌های سیم‌کارتی TD-LTE/5G است؛ سرویس‌های ADSL و فیبر پس از دریافت داده اضافه می‌شوند.
          </p>
        </div>
      )}

      {/* Package Kind */}
      <div className="border-t border-border/60 pt-4">
        <div className="mb-2.5 text-xs font-bold text-muted-foreground">نوع بسته</div>
        <div className="flex flex-wrap gap-1.5">
          {(["internet", "combo", "roaming"] as Kind[]).map((k) => {
            const on = kinds.has(k);
            return (
              <button
                key={k}
                type="button"
                onClick={() => onToggleKind(k)}
                aria-pressed={on}
                className={`inline-flex min-h-[36px] items-center gap-1.5 rounded-lg border px-2.5 py-1.5 text-[12.5px] font-bold transition-colors whitespace-nowrap shrink-0 cursor-pointer focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring ${
                  on
                    ? "border-primary/45 bg-primary/10 text-primary"
                    : "border-border bg-background/50 text-muted-foreground hover:bg-secondary hover:text-foreground"
                }`}
              >
                <span>{KIND_LABEL[k]}</span>
                <span className="fa-num text-[11px] opacity-80">{faDigits(kindCounts[k] ?? 0)}</span>
              </button>
            );
          })}
        </div>
        <p className="mt-2 text-[11px] leading-5 text-muted-foreground">
          رومینگ به‌طور پیش‌فرض غیرفعال است؛ تعرفه‌ی آن با بسته‌های داخلی قابل مقایسه نیست.
        </p>
      </div>

      {/* Duration Presets */}
      <div className="border-t border-border/60 pt-4">
        <div className="mb-2.5 flex items-center justify-between">
          <span className="text-xs font-bold text-muted-foreground">مدت اعتبار</span>
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
                className={`inline-flex min-h-[34px] items-center gap-1.5 rounded-lg border px-2.5 py-1 text-[12px] font-bold transition-colors whitespace-nowrap shrink-0 cursor-pointer focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring ${
                  on
                    ? "border-primary/45 bg-primary/10 text-primary"
                    : cnt === 0
                      ? "border-border/60 bg-background/30 text-muted-foreground/50"
                      : "border-border bg-background/50 text-muted-foreground hover:bg-secondary hover:text-foreground"
                }`}
              >
                <span>{opt.label}</span>
                <span className="fa-num text-[11px] opacity-80">{faDigits(cnt)}</span>
              </button>
            );
          })}
        </div>
      </div>

      {/* Inclusion filters for restricted / special packages */}
      {availableRestrictions.length > 0 && (
        <div className="border-t border-border/60 pt-4">
          <div className="mb-1 flex items-center justify-between gap-2">
            <span className="text-xs font-bold text-muted-foreground">
              نمایش بسته‌های محدود و خاص
            </span>
            {allIncluded ? (
              <button
                type="button"
                onClick={onClearRestrictions}
                className="text-[11px] font-bold text-primary hover:underline cursor-pointer"
              >
                پنهان‌کردن همه
              </button>
            ) : (
              <button
                type="button"
                onClick={() => onIncludeAllRestrictions(availableRestrictions.map((o) => o.key))}
                className="text-[11px] font-bold text-primary hover:underline cursor-pointer"
              >
                نمایش همه
              </button>
            )}
          </div>
          <p className="mb-2.5 text-[11px] leading-5 text-muted-foreground">
            به‌طور پیش‌فرض روشن‌اند؛ برای حذف از فهرست خاموش کنید.
          </p>
          <div className="space-y-2.5">
            {availableRestrictions.map((opt) => {
              const checked = includedRestrictions.has(opt.key);
              const count = restrictionCounts[opt.key] ?? 0;
              return (
                <label
                  key={opt.key}
                  className="flex min-h-[32px] cursor-pointer items-center justify-between gap-2 text-[12.5px] font-medium"
                >
                  <span className="min-w-0 leading-5 text-foreground/90">
                    {opt.label}{" "}
                    <span className="fa-num text-[11px] text-muted-foreground">
                      ({faDigits(count)})
                    </span>
                  </span>
                  <Switch
                    checked={checked}
                    onCheckedChange={() => onToggleRestriction(opt.key)}
                  />
                </label>
              );
            })}
          </div>
        </div>
      )}

      {/* Sliders */}
      <div className="space-y-4 border-t border-border/60 pt-4">
        <div>
          <div className="mb-2.5 flex items-baseline justify-between gap-2">
            <span className="text-xs font-bold text-muted-foreground">
              حداکثر قیمت{vat ? " (با مالیات)" : ""}
            </span>
            <span className="fa-num text-[13px] font-bold text-primary">
              {maxPrice == null ? "همه قیمت‌ها" : `تا ${fmtToman(maxPrice)} تومان`}
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
          <div className="fa-num mt-1.5 flex justify-between text-[10.5px] text-muted-foreground" dir="ltr">
            <span>۰</span>
            <span>{fmtToman(priceCap)}</span>
          </div>
        </div>

        <div className="border-t border-border/40 pt-3.5">
          <div className="mb-2.5 flex items-baseline justify-between gap-2">
            <span className="text-xs font-bold text-muted-foreground">حداقل حجم</span>
            <span className="fa-num text-[13px] font-bold text-primary">
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
          <div className="fa-num mt-1.5 flex justify-between text-[10.5px] text-muted-foreground" dir="ltr">
            <span>۰</span>
            <span>{faDigits(gbCap)} گیگ</span>
          </div>
        </div>
      </div>

      {/* General Boolean Switches */}
      <div className="space-y-3 border-t border-border/60 pt-4">
        <label className="flex min-h-[34px] cursor-pointer items-center justify-between gap-3 text-[12.5px] font-medium">
          <span>فقط بسته‌های تخفیف‌دار</span>
          <Switch checked={onlyDisc} onCheckedChange={onOnlyDiscChange} />
        </label>
        <label className="flex min-h-[34px] cursor-pointer items-center justify-between gap-3 text-[12.5px] font-medium">
          <span>پنهان‌کردن هدایای رایگان</span>
          <Switch checked={hideFree} onCheckedChange={onHideFreeChange} />
        </label>
        {portalOnlyCount > 0 && (
          <label className="flex min-h-[34px] cursor-pointer items-center justify-between gap-3 text-[12.5px] font-medium">
            <span className="min-w-0 leading-5">
              پنهان‌کردن بسته‌های اختصاصی اپ{" "}
              <span className="fa-num text-[11px] text-muted-foreground">
                ({faDigits(portalOnlyCount)})
              </span>
            </span>
            <Switch checked={hidePortalOnly} onCheckedChange={onHidePortalOnlyChange} />
          </label>
        )}
      </div>

      {activeFilters > 0 && (
        <Button
          variant="outline"
          size="sm"
          onClick={onReset}
          className="w-full min-h-[40px] gap-1.5 font-bold"
        >
          <RotateCcw className="h-3.5 w-3.5" />
          بازنشانی همه‌ی فیلترها
        </Button>
      )}
    </div>
  );
}
