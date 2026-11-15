"use client";

import { useState } from "react";
import { Award, Check, Copy, ExternalLink, Gift, Info, Phone, Scale, ShieldAlert, Smartphone } from "lucide-react";

import {
  PORTAL_AVAILABILITY_NOTE,
  VAT_RATE,
  faDigits,
  fmtGB,
  fmtToman,
  fmtValue,
  type Metric,
  type Row,
} from "@/lib/providers";
import { useToast } from "@/hooks/use-toast";
import { KIND_LABEL, accentBadgeStyle, accentDividerColor, ussdTelHref, valueBadgeStyle, valueColor } from "./helpers";

interface PkgCardProps {
  r: Row & { t?: number };
  dark: boolean;
  metric: Metric;
  vat: boolean;
  isCompared: boolean;
  canCompare: boolean;
  onToggleCompare: (key: string) => void;
}

export function PkgCard({
  r,
  dark,
  metric,
  vat,
  isCompared,
  canCompare,
  onToggleCompare,
}: PkgCardProps) {
  const { toast } = useToast();
  const [copied, setCopied] = useState(false);

  const price = r.price * (vat ? 1 + VAT_RATE : 1);
  const old = r.oldPrice != null ? r.oldPrice * (vat ? 1 + VAT_RATE : 1) : null;
  const t = r.t ?? 0;
  const uid = `${r.entryKey}:${r.id}`;
  const meterColor = valueColor(t, dark);
  const rankBadgeStyle = valueBadgeStyle(t, dark);

  const handleCopyUssd = async () => {
    if (!r.ussd) return;
    try {
      await navigator.clipboard.writeText(r.ussd);
      setCopied(true);
      toast({
        title: "کد دستوری کپی شد",
        description: `${r.ussd} — ${r.providerName}`,
      });
      setTimeout(() => setCopied(false), 1800);
    } catch {
      toast({
        title: "کپی انجام نشد",
        description: `کد دستوری: ${r.ussd}`,
      });
    }
  };

  return (
    <article
      className={`group flex flex-col rounded-xl border bg-card p-5 transition-colors ${
        r.isBest
          ? "border-primary/65 bg-primary/[0.03] dark:bg-primary/[0.045]"
          : isCompared
            ? "border-primary/50"
            : r.isWorst
              ? "border-destructive/35 hover:border-destructive/60"
              : "border-border hover:border-foreground/25"
      }`}
    >
      {/* Top kicker line — clean unboxed metadata */}
      <div className="flex items-center justify-between gap-2 text-[13px]">
        <div className="flex min-w-0 items-center gap-2">
          <span
            className="fa-num inline-flex h-7 min-w-7 items-center justify-center rounded-md border px-2 text-xs font-extrabold"
            style={rankBadgeStyle}
          >
            {faDigits(r.rank)}
          </span>
          <span
            className="h-2.5 w-2.5 shrink-0 rounded-full"
            style={{ backgroundColor: r.providerAccent }}
          />
          <span className="truncate font-bold text-foreground">{r.providerName}</span>
          {r.kind !== "internet" && (
            <>
              <span aria-hidden="true" className="text-muted-foreground/50">·</span>
              <span className="shrink-0 text-xs font-medium text-muted-foreground">
                {KIND_LABEL[r.kind]}
              </span>
            </>
          )}
        </div>

        <div className="flex shrink-0 items-center gap-1.5">
          {r.discountPct != null && (
            <span className="fa-num rounded-md bg-amber-500/15 px-2 py-0.5 text-[11.5px] font-bold text-amber-700 dark:text-amber-400">
              {faDigits(r.discountPct)}٪ تخفیف
            </span>
          )}
          <button
            type="button"
            onClick={() => onToggleCompare(uid)}
            disabled={!isCompared && !canCompare}
            aria-pressed={isCompared}
            title={
              isCompared
                ? "حذف از مقایسه"
                : canCompare
                  ? "افزودن به مقایسه"
                  : "حداکثر ۳ بسته قابل مقایسه است"
            }
            className={`inline-flex h-8 items-center gap-1.5 rounded-lg border px-2.5 text-xs font-medium transition-colors whitespace-nowrap shrink-0 cursor-pointer disabled:cursor-not-allowed disabled:opacity-40 ${
              isCompared
                ? "border-primary/50 bg-primary/10 text-primary font-bold"
                : "border-border/80 bg-transparent text-muted-foreground hover:bg-secondary hover:text-foreground"
            }`}
          >
            {isCompared ? <Check className="h-3.5 w-3.5" /> : <Scale className="h-3.5 w-3.5" />}
            <span>مقایسه</span>
          </button>
        </div>
      </div>

      {/* Title + Traffic scope / Note */}
      <div className="mt-3">
        <h3 className="text-[15.5px] font-bold leading-7 text-foreground">{r.title}</h3>
        {(r.domesticOnly || r.portalOnly) && (
          <div className="mt-2 flex flex-col items-start gap-2">
            {r.domesticOnly && (
              <span className="inline-flex items-center gap-1.5 rounded-md border border-amber-500/25 bg-amber-500/10 px-2.5 py-0.5 text-xs font-semibold text-amber-700 dark:text-amber-300">
                <ShieldAlert className="h-3.5 w-3.5 shrink-0" />
                <span>فقط اینترنت داخلی</span>
              </span>
            )}
            {r.portalOnly && (
              <div
                className="w-full rounded-lg border px-2.5 py-1.5 text-xs"
                style={accentBadgeStyle(r.providerAccent, dark)}
              >
                <div className="flex items-center gap-1.5 font-semibold leading-5">
                  <Smartphone className="h-3.5 w-3.5 shrink-0" />
                  <span>{r.portalLabel ?? "فروش فقط از اپ اپراتور"}</span>
                </div>
                <div
                  className="mt-1 flex items-center gap-1.5 border-t pt-1 text-[11px] font-medium leading-4 opacity-90"
                  style={{ borderColor: accentDividerColor(r.providerAccent, dark) }}
                >
                  <Info className="h-3 w-3 shrink-0" />
                  <span>{r.portalNote ?? PORTAL_AVAILABILITY_NOTE}</span>
                </div>
              </div>
            )}
          </div>
        )}
        {r.note && (
          <p className="mt-1.5 text-[12.5px] leading-6 text-muted-foreground">
            {r.note}
          </p>
        )}
      </div>

      {/* Readable 2-cell specs bar */}
      <div className="mt-4 grid grid-cols-2 divide-x divide-x-reverse divide-border/70 rounded-lg border border-border/60 bg-muted/40 py-2.5 text-center">
        <div className="px-3">
          <div className="text-[11px] text-muted-foreground">حجم بسته</div>
          <div className="fa-num mt-0.5 text-sm font-bold text-foreground">
            {fmtGB(r.gb)}
          </div>
        </div>
        <div className="px-3">
          <div className="text-[11px] text-muted-foreground">مدت اعتبار</div>
          <div className="fa-num mt-0.5 text-sm font-bold text-foreground">
            {r.days ? `${faDigits(r.days)} روز` : "—"}
          </div>
        </div>
      </div>
      {r.group && (
        <div className="mt-2 truncate text-xs text-muted-foreground">
          دسته: <span className="font-medium text-foreground/85">{r.group}</span>
        </div>
      )}

      {/* Value & Price section — both prices aligned on the same baseline */}
      <div className="mt-auto pt-4">
        <div className="border-t border-border/60 pt-3.5">
          {/* Row 1: Unit value & Total price on the exact same line */}
          <div className="flex flex-wrap items-baseline justify-between gap-x-3 gap-y-1">
            <div className="flex flex-wrap items-baseline gap-1.5 min-w-0">
              <span
                className="fa-num text-[21px] font-extrabold leading-7 tracking-tight"
                style={{ color: meterColor }}
              >
                {fmtValue(r.value)}
              </span>
              <span className="text-xs font-medium text-muted-foreground whitespace-nowrap">
                {metric === "pergb" ? "تومان بر گیگ" : "تومان / گیگ×روز"}
              </span>
            </div>

            <div className="flex flex-wrap items-baseline justify-end gap-1.5 shrink-0 text-end">
              {r.isFree ? (
                <span className="text-[18px] font-extrabold leading-7 text-primary">رایگان</span>
              ) : (
                <>
                  {old != null && (
                    <span className="fa-num text-xs text-muted-foreground line-through decoration-1">
                      {fmtToman(old)}
                    </span>
                  )}
                  <span className="fa-num text-[18px] font-extrabold leading-7 text-foreground whitespace-nowrap">
                    {fmtToman(price)}{" "}
                    <span className="text-xs font-medium text-muted-foreground">تومان</span>
                  </span>
                </>
              )}
            </div>
          </div>

          {/* Row 2: Relative rank note & Buy CTA */}
          <div className="mt-2.5 flex items-center justify-between gap-3">
            <div className="flex items-center gap-1 text-xs font-medium text-muted-foreground min-w-0">
              {r.isFree ? (
                <span className="inline-flex items-center gap-1 font-bold text-primary">
                  <Gift className="h-3.5 w-3.5" />
                  هدیه رایگان
                </span>
              ) : r.isBest ? (
                <span className="inline-flex items-center gap-1 font-bold text-primary">
                  <Award className="h-3.5 w-3.5" />
                  بهترین ارزش
                </span>
              ) : r.worsePct != null ? (
                <span>
                  <span className="fa-num font-bold" style={{ color: meterColor }}>
                    {faDigits(r.worsePct < 10 ? Math.round(r.worsePct * 10) / 10 : Math.round(r.worsePct))}٪+
                  </span>{" "}
                  گران‌تر از بهترین
                </span>
              ) : (
                "—"
              )}
            </div>

            <a
              href={r.buyUrl}
              target="_blank"
              rel="noreferrer"
              title={r.portalOnly ? (r.portalHint ?? "خرید از اپلیکیشن اپراتور") : undefined}
              className="inline-flex min-h-[36px] items-center justify-center gap-1.5 rounded-lg bg-secondary px-4 py-1.5 text-[13px] font-bold text-secondary-foreground transition-colors hover:bg-primary hover:text-primary-foreground whitespace-nowrap shrink-0"
            >
              <span>خرید</span>
              <ExternalLink className="h-3.5 w-3.5" />
            </a>
          </div>
        </div>

        {/* Footer metadata + USSD quick copy & direct dial */}
        <div className="mt-3.5 flex items-center justify-between gap-2 border-t border-border/40 pt-2.5 text-[11px] text-muted-foreground">
          {r.ussd ? (
            <div className="inline-flex min-w-0 items-center gap-1">
              <button
                type="button"
                onClick={handleCopyUssd}
                className="inline-flex min-h-[30px] items-center gap-1.5 rounded-md bg-muted/60 px-2.5 py-0.5 font-mono text-xs text-foreground transition-colors hover:bg-secondary cursor-pointer"
                dir="ltr"
                title="کپی کد دستوری"
              >
                {copied ? (
                  <Check className="h-3.5 w-3.5 text-primary" />
                ) : (
                  <Copy className="h-3.5 w-3.5 text-muted-foreground" />
                )}
                <span>{r.ussd}</span>
              </button>
              {ussdTelHref(r.ussd) && (
                <a
                  href={ussdTelHref(r.ussd)!}
                  title={`شماره‌گیری ${r.ussd}`}
                  aria-label={`شماره‌گیری کد دستوری ${r.ussd}`}
                  className="inline-flex min-h-[30px] items-center gap-1 rounded-md bg-primary/10 px-2 py-0.5 text-[11px] font-bold text-primary transition-colors hover:bg-primary hover:text-primary-foreground"
                >
                  <Phone className="h-3 w-3 shrink-0" />
                  <span className="hidden sm:inline">شماره‌گیری</span>
                </a>
              )}
            </div>
          ) : (
            <span dir="ltr" className="truncate font-mono opacity-80">
              {r.regulatoryCode ? `REG: ${r.regulatoryCode}` : r.sourceKind === "api" ? "API" : "capture"}
            </span>
          )}

          <span className="fa-num shrink-0 font-medium text-muted-foreground">
            {r.perGB >= 1000 ? `${fmtToman(r.perGB)} ت/گیگ` : `${fmtValue(r.perGB)} ت/گیگ`}
          </span>
        </div>
      </div>
    </article>
  );
}
