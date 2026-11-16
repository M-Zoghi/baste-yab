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
  const [copiedId, setCopiedId] = useState<string | null>(null);

  const safeGB = Number.isFinite(needGB) && needGB > 0 ? Math.min(2000, needGB) : 1;
  const safeDays = Number.isFinite(needDays) && needDays > 0 ? Math.min(365, needDays) : 1;
  const vatFactor = vat ? 1 + VAT_RATE : 1;

  const { topOptions, bestSingle, savings } = useMemo(() => {
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

    // Keep top 4 unique options (dedupe identical entryKey+title+count)
    const seen = new Set<string>();
    const top: CalcOption[] = [];
    for (const c of candidates) {
      const k = `${c.pkg.entryKey}:${c.pkg.id}:${c.count}`;
      if (seen.has(k)) continue;
      seen.add(k);
      top.push(c);
      if (top.length >= 4) break;
    }

    const best = top[0] ?? null;
    const saved =
      best &&
      best.count > 1 &&
      cheapestSingle &&
      cheapestSingle.totalPrice > best.totalPrice
        ? cheapestSingle.totalPrice - best.totalPrice
        : 0;

    return { topOptions: top, bestSingle: cheapestSingle, savings: saved };
  }, [packages, safeGB, safeDays, allowMulti, vatFactor]);

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
      className="rounded-2xl sm:rounded-xl border border-primary/45 bg-card p-4 shadow-xs sm:p-5 space-y-4"
    >
      {/* Header */}
      <div className="flex items-start justify-between gap-3">
        <div className="flex items-start gap-2.5">
          <span className="mt-0.5 grid h-8 w-8 shrink-0 place-items-center rounded-lg bg-primary/15 text-primary">
            <Calculator className="h-4 w-4" />
          </span>
          <div>
            <h2 className="text-sm font-bold text-foreground">
              ماشین‌حساب مصرف شخصی (پیشنهاد ارزان‌ترین ترکیب)
            </h2>
            <p className="mt-0.5 text-xs text-muted-foreground">
              حجم و مدت مورد نیازتان را مشخص کنید تا ارزان‌ترین تک‌بسته یا خرید چندتایی بین اپراتورهای انتخاب‌شده پیدا شود.
            </p>
          </div>
        </div>
        {!embedded && onClose && (
          <button
            type="button"
            onClick={onClose}
            aria-label="بستن ماشین‌حساب"
            className="rounded-md p-1.5 text-muted-foreground hover:bg-muted hover:text-foreground cursor-pointer"
          >
            <X className="h-4 w-4" />
          </button>
        )}
      </div>

      {/* Controls */}
      <div className="grid gap-4 rounded-lg border border-border bg-muted/50 p-3.5 md:grid-cols-2">
        {/* Needed Volume */}
        <div className="space-y-2">
          <div className="flex items-center justify-between gap-2">
            <label htmlFor="calc-gb" className="text-xs font-bold text-foreground">
              حجم مورد نیاز (گیگابایت)
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
                }}
                className="fa-num h-8 w-20 bg-background text-center text-xs font-bold"
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
                onClick={() => setNeedGB(g)}
                className={`fa-num min-h-[28px] rounded-md border px-2 py-0.5 text-[11.5px] font-bold transition-colors cursor-pointer ${
                  needGB === g
                    ? "border-primary/60 bg-primary/15 text-primary"
                    : "border-input bg-card text-foreground/85 hover:bg-muted hover:text-foreground"
                }`}
              >
                {faDigits(g)} گیگ
              </button>
            ))}
          </div>
        </div>

        {/* Needed Duration */}
        <div className="space-y-2">
          <div className="flex items-center justify-between gap-2">
            <label htmlFor="calc-days" className="text-xs font-bold text-foreground">
              بازه زمانی مورد نیاز (روز)
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
                }}
                className="fa-num h-8 w-20 bg-background text-center text-xs font-bold"
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
                onClick={() => setNeedDays(d)}
                className={`fa-num min-h-[28px] rounded-md border px-2 py-0.5 text-[11.5px] font-bold transition-colors cursor-pointer ${
                  needDays === d
                    ? "border-primary/60 bg-primary/15 text-primary"
                    : "border-input bg-card text-foreground/85 hover:bg-muted hover:text-foreground"
                }`}
              >
                {faDigits(d)} روز
              </button>
            ))}
          </div>
        </div>

        {/* Multi-pack Switch */}
        <div className="md:col-span-2 flex flex-wrap items-center justify-between gap-3 border-t border-border/60 pt-2.5">
          <label className="flex cursor-pointer items-center gap-2.5 text-xs font-medium text-foreground">
            <Switch checked={allowMulti} onCheckedChange={setAllowMulti} />
            <span>اجازه خرید چندباره یا تمدید پیاپی یک بسته (حداکثر {faDigits(MAX_REPEAT_COUNT)} عدد)</span>
          </label>
          <span className="fa-num text-[11px] text-muted-foreground">
            نیاز شما: دست‌کم {faDigits(safeGB)} گیگ در {faDigits(safeDays)} روز
            {vat ? " (با احتساب ۱۰٪ مالیات)" : " (بدون مالیات)"}
          </span>
        </div>
      </div>

      {/* Savings Callout when Multi-pack beats Best Single */}
      {savings > 0 && bestSingle && topOptions[0] && (
        <div className="flex flex-wrap items-center gap-2 rounded-lg border border-primary/30 bg-primary/[0.07] px-3 py-2 text-xs font-medium text-foreground">
          <Sparkles className="h-4 w-4 shrink-0 text-primary" />
          <span>
            خرید{" "}
            <strong className="fa-num text-primary">
              {faDigits(topOptions[0].count)}× {topOptions[0].pkg.title}
            </strong>{" "}
            ({topOptions[0].pkg.providerName}) حدود{" "}
            <strong className="fa-num text-primary">{fmtToman(savings)} تومان</strong> از ارزان‌ترین تک‌بسته («{bestSingle.pkg.title}» با{" "}
            <span className="fa-num">{fmtToman(bestSingle.totalPrice)}</span> ت) ارزان‌تر است!
          </span>
        </div>
      )}

      {/* Results */}
      {topOptions.length === 0 ? (
        <div className="rounded-lg border border-dashed border-border py-6 text-center text-xs text-muted-foreground">
          با فیلترها و تعداد انتخابی فعلی، بسته‌ای برای پوشش {faDigits(safeGB)} گیگ در{" "}
          {faDigits(safeDays)} روز پیدا نشد. گزینه‌ی «خرید چندباره» یا فیلتر اپراتورها را بررسی کنید.
        </div>
      ) : (
        <div className="grid gap-2.5 md:grid-cols-2">
          {topOptions.map((opt, idx) => {
            const uid = `calc:${opt.pkg.entryKey}:${opt.pkg.id}:${opt.count}`;
            const tel = opt.pkg.ussd ? ussdTelHref(opt.pkg.ussd) : null;
            const badgeText =
              opt.count === 1
                ? "۱ بسته (تک‌خرید)"
                : opt.mode === "parallel"
                  ? `${faDigits(opt.count)} عدد هم‌زمان`
                  : `${faDigits(opt.count)} دوره پیاپی (${faDigits(opt.pkg.days)} روزه)`;

            return (
              <div
                key={uid}
                className={`flex flex-col justify-between gap-2.5 rounded-xl border p-3.5 shadow-xs ${
                  idx === 0
                    ? "border-primary/60 bg-primary/[0.06]"
                    : "border-border bg-card"
                }`}
              >
                <div>
                  <div className="flex items-center justify-between gap-2 text-xs">
                    <div className="flex min-w-0 items-center gap-1.5">
                      <span className="fa-num inline-flex h-5 w-5 shrink-0 items-center justify-center rounded bg-primary/15 text-[11px] font-extrabold text-primary">
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
                    <span className="fa-num shrink-0 rounded-md border border-border/80 bg-muted/70 px-2 py-0.5 text-[11px] font-bold text-foreground">
                      {badgeText}
                    </span>
                  </div>

                  <div className="mt-1.5 text-[13.5px] font-bold leading-6 text-foreground">
                    {opt.pkg.title}
                  </div>

                  <div className="fa-num mt-1 text-[11.5px] text-muted-foreground">
                    حجم کل: <strong className="text-foreground">{fmtGB(opt.totalGB)}</strong>
                    {" · "}
                    مدت پوشش: <strong className="text-foreground">{faDigits(opt.totalDays)} روز</strong>
                  </div>

                  {opt.pkg.portalOnly && (
                    <div
                      className="mt-1.5 inline-flex items-center gap-1 rounded-md border px-2 py-0.5 text-[11px] font-semibold"
                      style={accentBadgeStyle(opt.pkg.providerAccent, dark)}
                    >
                      <Smartphone className="h-3 w-3 shrink-0" />
                      <span>{opt.pkg.portalLabel ?? "فروش فقط از اپ اپراتور"}</span>
                    </div>
                  )}
                </div>

                <div className="flex flex-wrap items-center justify-between gap-2 border-t border-border/50 pt-2.5">
                  <div>
                    <div className="fa-num text-[15px] font-extrabold text-primary">
                      {fmtToman(opt.totalPrice)}{" "}
                      <span className="text-[11px] font-medium text-muted-foreground">
                        تومان کل
                      </span>
                    </div>
                    {opt.count > 1 && (
                      <div className="fa-num text-[10.5px] text-muted-foreground">
                        هر عدد: {fmtToman(opt.pkg.price * vatFactor)} ت
                      </div>
                    )}
                  </div>

                  <div className="flex items-center gap-1.5">
                    {opt.pkg.ussd && (
                      <>
                        <button
                          type="button"
                          onClick={() =>
                            handleCopy(uid, opt.pkg.ussd!, opt.pkg.providerName)
                          }
                          title="کپی کد دستوری"
                          className="inline-flex h-8 items-center gap-1 rounded-md border border-border bg-muted/60 px-2 font-mono text-[11px] text-foreground hover:bg-secondary cursor-pointer"
                          dir="ltr"
                        >
                          {copiedId === uid ? (
                            <Check className="h-3 w-3 text-primary" />
                          ) : (
                            <Copy className="h-3 w-3 text-muted-foreground" />
                          )}
                          <span>{opt.pkg.ussd}</span>
                        </button>
                        {tel && (
                          <a
                            href={tel}
                            title={`شماره‌گیری ${opt.pkg.ussd}`}
                            aria-label={`شماره‌گیری کد دستوری ${opt.pkg.ussd}`}
                            className="inline-flex h-8 w-8 items-center justify-center rounded-md bg-primary/10 text-primary hover:bg-primary hover:text-primary-foreground"
                          >
                            <Phone className="h-3.5 w-3.5" />
                          </a>
                        )}
                      </>
                    )}
                    <a
                      href={opt.pkg.buyUrl}
                      target="_blank"
                      rel="noreferrer"
                      className="inline-flex h-8 items-center gap-1 rounded-lg bg-secondary px-2.5 text-xs font-bold text-secondary-foreground transition-colors hover:bg-primary hover:text-primary-foreground"
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
      )}
    </section>
  );
}
