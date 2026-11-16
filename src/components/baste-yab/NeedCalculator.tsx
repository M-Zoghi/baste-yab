"use client";

import { useMemo, useState } from "react";
import {
  Calculator,
  Check,
  Copy,
  ExternalLink,
  Phone,
  Smartphone,
  Sparkles,
  X,
} from "lucide-react";

import { Input } from "@/components/ui/input";
import { Switch } from "@/components/ui/switch";
import { useToast } from "@/hooks/use-toast";
import {
  VAT_RATE,
  faDigits,
  fmtGB,
  fmtToman,
  type DerivedPkg,
} from "@/lib/providers";
import { accentBadgeStyle, ussdTelHref } from "./helpers";

interface NeedCalculatorProps {
  packages: DerivedPkg[];
  vat: boolean;
  dark: boolean;
  embedded?: boolean;
  onClose?: () => void;
}

interface CalcOption {
  pkg: DerivedPkg;
  count: number;
  mode: "single" | "parallel" | "sequential";
  totalGB: number;
  totalDays: number;
  totalPrice: number;
}

const GB_PRESETS = [5, 10, 20, 30, 50, 100];
const DAY_PRESETS = [7, 15, 30, 90, 180];
const MAX_REPEAT_COUNT = 12;

const CALC_PAGE_STEP = 12;

export function NeedCalculator({
  packages,
  vat,
  dark,
  embedded = false,
  onClose,
}: NeedCalculatorProps) {
  const { toast } = useToast();
  const [needGB, setNeedGB] = useState(20);
  const [needDays, setNeedDays] = useState(30);
  const [allowMulti, setAllowMulti] = useState(true);
  const [visibleCount, setVisibleCount] = useState(CALC_PAGE_STEP);
  const [copiedId, setCopiedId] = useState<string | null>(null);

  const safeGB = Number.isFinite(needGB) && needGB > 0 ? Math.min(2000, needGB) : 1;
  const safeDays = Number.isFinite(needDays) && needDays > 0 ? Math.min(365, needDays) : 1;
  const vatFactor = vat ? 1 + VAT_RATE : 1;

  const { allOptions, bestSingle, savings } = useMemo(() => {
    const candidates: CalcOption[] = [];
    let cheapestSingle: CalcOption | null = null;

    for (const pkg of packages) {
      if (pkg.price <= 0 || pkg.gb <= 0 || pkg.days <= 0) continue;

      if (pkg.gb >= safeGB && pkg.days >= safeDays) {
        const singleOpt: CalcOption = {
          pkg,
          count: 1,
          mode: "single",
          totalGB: pkg.gb,
          totalDays: pkg.days,
          totalPrice: pkg.price * vatFactor,
        };
        if (
          !cheapestSingle ||
          singleOpt.totalPrice < cheapestSingle.totalPrice ||
          (singleOpt.totalPrice === cheapestSingle.totalPrice &&
            singleOpt.totalGB > cheapestSingle.totalGB)
        ) {
          cheapestSingle = singleOpt;
        }
        candidates.push(singleOpt);
        continue;
      }

      if (!allowMulti) continue;

      const volCount = Math.ceil(safeGB / pkg.gb);
      const dayCount = Math.ceil(safeDays / pkg.days);
      const count = Math.max(volCount, dayCount);
      if (count > MAX_REPEAT_COUNT) continue;

      candidates.push({
        pkg,
        count,
        mode: pkg.days >= safeDays ? "parallel" : "sequential",
        totalGB: Math.round(pkg.gb * count * 100) / 100,
        totalDays: pkg.days >= safeDays ? pkg.days : pkg.days * count,
        totalPrice: pkg.price * vatFactor * count,
      });
    }

    candidates.sort((a, b) => {
      if (a.totalPrice !== b.totalPrice) return a.totalPrice - b.totalPrice;
      if (a.count !== b.count) return a.count - b.count;
      if (a.totalGB !== b.totalGB) return b.totalGB - a.totalGB;
      return b.totalDays - a.totalDays;
    });

    // Keep all unique valid options (dedupe identical entryKey+id+count)
    const seen = new Set<string>();
    const all: CalcOption[] = [];
    for (const c of candidates) {
      const k = `${c.pkg.entryKey}:${c.pkg.id}:${c.count}`;
      if (seen.has(k)) continue;
      seen.add(k);
      all.push(c);
    }

    const best = all[0] ?? null;
    const saved =
      best &&
      best.count > 1 &&
      cheapestSingle &&
      cheapestSingle.totalPrice > best.totalPrice
        ? cheapestSingle.totalPrice - best.totalPrice
        : 0;

    return { allOptions: all, bestSingle: cheapestSingle, savings: saved };
  }, [packages, safeGB, safeDays, allowMulti, vatFactor]);

  const shownOptions = useMemo(
    () => (allOptions.length > visibleCount ? allOptions.slice(0, visibleCount) : allOptions),
    [allOptions, visibleCount],
  );

  const handleCopy = async (uid: string, ussd: string, provider: string) => {
    try {
      await navigator.clipboard.writeText(ussd);
      setCopiedId(uid);
      toast({
        title: "کد دستوری کپی شد",
        description: `${ussd} — ${provider}`,
      });
      setTimeout(() => setCopiedId((prev) => (prev === uid ? null : prev)), 1800);
    } catch {
      toast({ title: "کپی انجام نشد", description: `کد دستوری: ${ussd}` });
    }
  };

  return (
    <section
      aria-label="محاسبه‌گر نیاز من"
      className="space-y-4 rounded-2xl sm:rounded-xl border border-border bg-card p-4 shadow-xs sm:p-5"
    >
      {/* Simple Header */}
      <div className="flex items-center justify-between gap-3">
        <div className="flex items-center gap-2.5">
          <span className="grid h-9 w-9 shrink-0 place-items-center rounded-xl bg-primary/12 text-primary">
            <Calculator className="h-4 w-4" />
          </span>
          <div>
            <h2 className="text-sm font-extrabold text-foreground">
              چقدر اینترنت می‌خواهید؟
            </h2>
            <p className="text-[11.5px] text-muted-foreground">
              {allOptions.length > 0
                ? `${faDigits(allOptions.length)} پیشنهاد مرتب‌شده از ارزان‌ترین`
                : "ارزان‌ترین گزینه برای نیاز شما"}
            </p>
          </div>
        </div>
        {!embedded && onClose && (
          <button
            type="button"
            onClick={onClose}
            aria-label="بستن ماشین‌حساب"
            className="rounded-lg p-1.5 text-muted-foreground hover:bg-muted hover:text-foreground cursor-pointer"
          >
            <X className="h-4 w-4" />
          </button>
        )}
      </div>

      {/* Clean 2-Step Inputs */}
      <div className="grid gap-4 rounded-xl bg-muted/45 p-3.5 md:grid-cols-2">
        {/* Needed Volume */}
        <div className="space-y-2">
          <div className="flex items-center justify-between gap-2">
            <label htmlFor="calc-gb" className="text-xs font-bold text-foreground">
              حجم (گیگابایت)
            </label>
            <div className="flex items-center gap-1.5">
              <Input
                id="calc-gb"
                type="number"
                min={1}
                max={2000}
                value={needGB}
                onChange={(e) => {
                  const v = Number(e.target.value);
                  setNeedGB(Number.isFinite(v) ? Math.max(1, Math.min(2000, v)) : 1);
                  setVisibleCount(CALC_PAGE_STEP);
                }}
                className="fa-num h-9 w-20 rounded-xl bg-card text-center text-sm font-extrabold"
                dir="ltr"
              />
              <span className="text-xs text-muted-foreground">گیگ</span>
            </div>
          </div>
          <div className="flex flex-wrap gap-1.5">
            {GB_PRESETS.map((g) => (
              <button
                key={g}
                type="button"
                onClick={() => {
                  setNeedGB(g);
                  setVisibleCount(CALC_PAGE_STEP);
                }}
                className={`fa-num min-h-[32px] rounded-full border px-2.5 text-xs font-bold transition-colors cursor-pointer ${
                  needGB === g
                    ? "border-primary bg-primary text-primary-foreground shadow-xs"
                    : "border-border bg-card text-foreground/85 hover:bg-muted"
                }`}
              >
                {faDigits(g)}
              </button>
            ))}
          </div>
        </div>

        {/* Needed Duration */}
        <div className="space-y-2">
          <div className="flex items-center justify-between gap-2">
            <label htmlFor="calc-days" className="text-xs font-bold text-foreground">
              مدت (روز)
            </label>
            <div className="flex items-center gap-1.5">
              <Input
                id="calc-days"
                type="number"
                min={1}
                max={365}
                value={needDays}
                onChange={(e) => {
                  const v = Number(e.target.value);
                  setNeedDays(Number.isFinite(v) ? Math.max(1, Math.min(365, v)) : 1);
                  setVisibleCount(CALC_PAGE_STEP);
                }}
                className="fa-num h-9 w-20 rounded-xl bg-card text-center text-sm font-extrabold"
                dir="ltr"
              />
              <span className="text-xs text-muted-foreground">روز</span>
            </div>
          </div>
          <div className="flex flex-wrap gap-1.5">
            {DAY_PRESETS.map((d) => (
              <button
                key={d}
                type="button"
                onClick={() => {
                  setNeedDays(d);
                  setVisibleCount(CALC_PAGE_STEP);
                }}
                className={`fa-num min-h-[32px] rounded-full border px-2.5 text-xs font-bold transition-colors cursor-pointer ${
                  needDays === d
                    ? "border-primary bg-primary text-primary-foreground shadow-xs"
                    : "border-border bg-card text-foreground/85 hover:bg-muted"
                }`}
              >
                {faDigits(d)} روز
              </button>
            ))}
          </div>
        </div>

        {/* Simple Multi-pack Toggle */}
        <div className="md:col-span-2 flex items-center justify-between gap-3 border-t border-border/60 pt-2.5">
          <label className="flex cursor-pointer items-center gap-2.5 text-xs font-medium text-foreground">
            <Switch
              checked={allowMulti}
              onCheckedChange={(v) => {
                setAllowMulti(v);
                setVisibleCount(CALC_PAGE_STEP);
              }}
            />
            <span>پیشنهاد خرید چند بسته (اگر ارزان‌تر باشد)</span>
          </label>
        </div>
      </div>

      {/* All Results */}
      {allOptions.length === 0 ? (
        <div className="rounded-xl border border-dashed border-border py-6 px-4 text-center text-xs text-muted-foreground">
          بسته‌ای برای {faDigits(safeGB)} گیگ در {faDigits(safeDays)} روز با فیلترهای فعلی پیدا نشد.
        </div>
      ) : (
        <>
          <div className="grid gap-2.5 sm:gap-3 md:grid-cols-2 xl:grid-cols-3">
            {shownOptions.map((opt, idx) => {
              const uid = `calc:${opt.pkg.entryKey}:${opt.pkg.id}:${opt.count}`;
              const tel = opt.pkg.ussd ? ussdTelHref(opt.pkg.ussd) : null;
              const isTop = idx === 0;
              const countText =
                opt.count === 1
                  ? "تک‌بسته"
                  : opt.mode === "parallel"
                    ? `${faDigits(opt.count)} عدد هم‌زمان`
                    : `${faDigits(opt.count)} دوره پشت‌سرهم`;

              return (
                <div
                  key={uid}
                  className={`flex flex-col justify-between gap-2.5 rounded-2xl border p-3.5 shadow-xs ${
                    isTop
                      ? "border-primary/65 bg-primary/[0.045] dark:bg-primary/[0.07]"
                      : "border-border bg-card"
                  }`}
                >
                  <div className="space-y-1.5">
                    <div className="flex items-center justify-between gap-2 text-xs">
                      <div className="flex min-w-0 items-center gap-1.5">
                        <span
                          className={`fa-num inline-flex h-5 w-5 shrink-0 items-center justify-center rounded-md text-[11px] font-extrabold ${
                            isTop
                              ? "bg-primary text-primary-foreground"
                              : "bg-muted text-foreground"
                          }`}
                        >
                          {faDigits(idx + 1)}
                        </span>
                        <span
                          className="h-2 w-2 shrink-0 rounded-full"
                          style={{ backgroundColor: opt.pkg.providerAccent }}
                        />
                        <span className="truncate font-bold text-foreground">
                          {opt.pkg.providerName}
                        </span>
                      </div>
                      <span className="fa-num shrink-0 rounded-full bg-muted px-2 py-0.5 text-[10.5px] font-bold text-foreground">
                        {countText}
                      </span>
                    </div>

                    <div className="text-[13.5px] font-bold leading-5 text-foreground">
                      {opt.pkg.title}
                    </div>

                    <div className="fa-num text-xs text-muted-foreground">
                      جمع:{" "}
                      <strong className="text-foreground">{fmtGB(opt.totalGB)}</strong>
                      {" · "}
                      <strong className="text-foreground">{faDigits(opt.totalDays)} روز</strong>
                    </div>

                    {isTop && savings > 0 && bestSingle && (
                      <div className="inline-flex items-center gap-1 rounded-full bg-primary/12 px-2.5 py-0.5 text-[11px] font-bold text-primary">
                        <Sparkles className="h-3 w-3 shrink-0" />
                        <span className="fa-num">
                          {fmtToman(savings)} ت ارزان‌تر از تک‌بسته
                        </span>
                      </div>
                    )}

                    {opt.pkg.portalOnly && (
                      <div
                        className="inline-flex items-center gap-1 text-[11px] font-semibold"
                        style={{ color: accentBadgeStyle(opt.pkg.providerAccent, dark).color }}
                      >
                        <Smartphone className="h-3 w-3 shrink-0" />
                        <span>{opt.pkg.portalLabel ?? "فروش فقط از اپ اپراتور"}</span>
                      </div>
                    )}
                  </div>

                  <div className="flex items-center justify-between gap-2 border-t border-border/50 pt-2">
                    <div>
                      <div className="fa-num text-[15px] font-extrabold text-primary">
                        {fmtToman(opt.totalPrice)}{" "}
                        <span className="text-[11px] font-medium text-muted-foreground">
                          تومان
                        </span>
                      </div>
                      {opt.count > 1 && (
                        <div className="fa-num text-[10.5px] text-muted-foreground">
                          هر عدد {fmtToman(opt.pkg.price * vatFactor)} ت
                        </div>
                      )}
                    </div>

                    <div className="flex items-center gap-1.5 shrink-0">
                      {opt.pkg.ussd && (
                        <>
                          {tel ? (
                            <a
                              href={tel}
                              title={`شماره‌گیری ${opt.pkg.ussd}`}
                              aria-label={`شماره‌گیری ${opt.pkg.ussd}`}
                              className="inline-flex h-8 items-center gap-1 rounded-xl border border-border bg-muted px-2 font-mono text-[11px] font-semibold text-foreground"
                              dir="ltr"
                            >
                              <Phone className="h-3 w-3 text-primary" />
                              <span>{opt.pkg.ussd}</span>
                            </a>
                          ) : (
                            <button
                              type="button"
                              onClick={() =>
                                handleCopy(uid, opt.pkg.ussd!, opt.pkg.providerName)
                              }
                              title="کپی کد دستوری"
                              className="inline-flex h-8 items-center gap-1 rounded-xl border border-border bg-muted px-2 font-mono text-[11px] text-foreground cursor-pointer"
                              dir="ltr"
                            >
                              {copiedId === uid ? (
                                <Check className="h-3 w-3 text-primary" />
                              ) : (
                                <Copy className="h-3 w-3 text-muted-foreground" />
                              )}
                              <span>{opt.pkg.ussd}</span>
                            </button>
                          )}
                        </>
                      )}
                      <a
                        href={opt.pkg.buyUrl}
                        target="_blank"
                        rel="noreferrer"
                        className={`inline-flex h-8 items-center gap-1 rounded-xl px-3 text-xs font-bold transition-transform active:scale-[0.97] ${
                          isTop
                            ? "bg-primary text-primary-foreground"
                            : "bg-secondary text-secondary-foreground hover:bg-primary hover:text-primary-foreground"
                        }`}
                      >
                        <span>خرید</span>
                        <ExternalLink className="h-3 w-3" />
                      </a>
                    </div>
                  </div>
                </div>
              );
            })}
          </div>

          {allOptions.length > visibleCount && (
            <div className="flex flex-wrap items-center justify-center gap-2 pt-1">
              <button
                type="button"
                onClick={() => setVisibleCount((prev) => prev + CALC_PAGE_STEP)}
                className="fa-num inline-flex h-9 items-center rounded-xl border border-border bg-card px-3.5 text-xs font-bold text-foreground hover:bg-muted cursor-pointer"
              >
                نمایش {faDigits(Math.min(CALC_PAGE_STEP, allOptions.length - visibleCount))} پیشنهاد دیگر
              </button>
              <button
                type="button"
                onClick={() => setVisibleCount(allOptions.length)}
                className="fa-num inline-flex h-9 items-center rounded-xl px-3.5 text-xs font-bold text-primary hover:bg-primary/10 cursor-pointer"
              >
                نمایش همه ({faDigits(allOptions.length)})
              </button>
            </div>
          )}
        </>
      )}
    </section>
  );
}
