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
import { KIND_LABEL, accentBadgeStyle, ussdTelHref, valueBadgeStyle, valueColor } from "./helpers";

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
      className={`group flex flex-col rounded-2xl sm:rounded-xl border bg-card p-3 sm:p-3.5 shadow-xs transition-colors ${
        r.isBest
          ? "border-primary/70 bg-primary/[0.045] dark:bg-primary/[0.065]"
          : isCompared
            ? "border-primary/65"
            : r.isWorst
              ? "border-destructive/45 hover:border-destructive/70"
              : "border-border hover:border-foreground/35"
      }`}
    >
      {/* Top kicker line — clean unboxed metadata */}
      <div className="flex items-center justify-between gap-2 text-xs">
        <div className="flex min-w-0 items-center gap-1.5">
          <span
            className="fa-num inline-flex h-6 min-w-6 items-center justify-center rounded-md border px-1.5 text-[11px] font-extrabold"
            style={rankBadgeStyle}
          >
            {faDigits(r.rank)}
          </span>
          <span
            className="h-2 w-2 shrink-0 rounded-full"
            style={{ backgroundColor: r.providerAccent }}
          />
          <span className="truncate font-bold text-foreground">{r.providerName}</span>
          {r.kind !== "internet" && (
            <>
              <span aria-hidden="true" className="text-muted-foreground/50">·</span>
              <span className="shrink-0 text-[11px] font-medium text-muted-foreground">
                {KIND_LABEL[r.kind]}
              </span>
            </>
          )}
        </div>

        <div className="flex shrink-0 items-center gap-1.5">
          {r.discountPct != null && (
            <span className="fa-num rounded-md bg-amber-500/15 px-1.5 py-0.5 text-[11px] font-bold text-amber-700 dark:text-amber-400">
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
            className={`inline-flex h-7 items-center gap-1 rounded-xl border px-2.5 text-[11px] font-bold transition-colors whitespace-nowrap shrink-0 cursor-pointer disabled:cursor-not-allowed disabled:opacity-40 ${
              isCompared
                ? "border-primary/60 bg-primary/12 text-primary"
                : "border-border bg-card text-foreground hover:bg-muted"
            }`}
          >
            {isCompared ? <Check className="h-3 w-3" /> : <Scale className="h-3 w-3" />}
            <span>{isCompared ? "در مقایسه" : "مقایسه"}</span>
          </button>
        </div>
      </div>

      {/* Title + Concise Flags / Note */}
      <div className="mt-2">
        <h3 className="text-[13.5px] sm:text-[14px] font-bold leading-5 text-foreground">
          {r.title}
        </h3>
        {(r.domesticOnly || r.portalOnly) && (
          <div className="mt-1.5 flex flex-wrap items-center gap-1.5 text-[11px]">
            {r.domesticOnly && (
              <span className="inline-flex items-center gap-1 rounded-md bg-amber-500/12 px-2 py-0.5 font-semibold text-amber-700 dark:text-amber-300">
                <ShieldAlert className="h-3 w-3 shrink-0" />
                <span>فقط اینترنت داخلی</span>
              </span>
            )}
            {r.portalOnly && (
              <div
                className="flex flex-col gap-0.5 rounded-md border px-2 py-1 text-[10.5px] leading-4"
                style={accentBadgeStyle(r.providerAccent, dark)}
              >
                <span className="inline-flex items-center gap-1 font-semibold">
                  <Smartphone className="h-3 w-3 shrink-0" />
                  <span>{r.portalLabel ?? "فروش فقط از اپ اپراتور"}</span>
                </span>
                <span className="inline-flex items-start gap-1 text-[10px] opacity-90">
                  <Info className="mt-0.5 h-3 w-3 shrink-0" />
                  <span>{r.portalNote ?? PORTAL_AVAILABILITY_NOTE}</span>
                </span>
              </div>
            )}
          </div>
        )}
        {r.note && (
          <p className="mt-1 text-[11.5px] leading-4.5 text-muted-foreground">
            {r.note}
          </p>
        )}
      </div>

      {/* Bottom-aligned specs + Value & Price section so boxes line up across grid rows */}
      <div className="mt-auto pt-2.5">
        {/* Compact inline specs strip across mobile and desktop */}
        <div className="grid grid-cols-2 rounded-xl bg-muted/65 py-1.5 text-center">
          <div className="flex items-center justify-center gap-1.5 px-2">
            <span className="text-[11px] font-medium text-muted-foreground">حجم</span>
            <span className="fa-num text-[12.5px] font-bold text-foreground">
              {fmtGB(r.gb)}
            </span>
          </div>
          <div className="flex items-center justify-center gap-1.5 border-s border-border/70 px-2">
            <span className="text-[11px] font-medium text-muted-foreground">مدت</span>
            <span className="fa-num text-[12.5px] font-bold text-foreground">
              {r.days ? `${faDigits(r.days)} روز` : "—"}
            </span>
          </div>
        </div>

        <div className="mt-2 border-t border-border/75 pt-2">
          {/* Row 1: Unit value & Total price on the exact same line */}
          <div className="flex flex-wrap items-baseline justify-between gap-x-2 gap-y-0.5">
            <div className="flex flex-wrap items-baseline gap-1 min-w-0">
              <span
                className="fa-num text-[17px] sm:text-[18px] font-extrabold leading-6 tracking-tight"
                style={{ color: meterColor }}
              >
                {fmtValue(r.value)}
              </span>
              <span className="text-[11px] font-medium text-muted-foreground whitespace-nowrap">
                {metric === "pergb" ? "تومان بر گیگ" : "تومان / گیگ×روز"}
              </span>
            </div>

            <div className="flex flex-wrap items-baseline justify-end gap-1.5 shrink-0 text-end">
              {r.isFree ? (
                <span className="text-[15px] sm:text-[16px] font-extrabold leading-6 text-primary">رایگان</span>
              ) : (
                <>
                  {old != null && (
                    <span className="fa-num text-[11px] text-muted-foreground line-through decoration-1">
                      {fmtToman(old)}
                    </span>
                  )}
                  <span className="fa-num text-[15px] sm:text-[16px] font-extrabold leading-6 text-foreground whitespace-nowrap">
                    {fmtToman(price)}{" "}
                    <span className="text-[11px] font-medium text-muted-foreground">تومان</span>
                  </span>
                </>
              )}
            </div>
          </div>

          {/* Row 2: Relative rank note & Buy CTA (consistent primary style with table view) */}
          <div className="mt-2 flex items-center justify-between gap-2">
            <div className="flex items-center gap-1 text-[11px] font-medium text-muted-foreground min-w-0">
              {r.isFree ? (
                <span className="inline-flex items-center gap-1 font-bold text-primary">
                  <Gift className="h-3 w-3" />
                  هدیه رایگان
                </span>
              ) : r.isBest ? (
                <span className="inline-flex items-center gap-1 font-bold text-primary">
                  <Award className="h-3 w-3" />
                  بهترین ارزش
                </span>
              ) : r.worsePct != null ? (
                <span>
                  <span className="fa-num font-bold" style={{ color: meterColor }}>
                    +{faDigits(r.worsePct < 10 ? Math.round(r.worsePct * 10) / 10 : Math.round(r.worsePct))}٪
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
              className="inline-flex h-8 items-center justify-center gap-1 rounded-xl bg-primary px-3 text-[11px] font-bold text-primary-foreground shadow-xs transition-all hover:bg-primary/90 active:scale-[0.96] whitespace-nowrap shrink-0"
            >
              <span>خرید</span>
              <ExternalLink className="h-3 w-3" />
            </a>
          </div>
        </div>

        {/* Footer row: shown only when USSD or secondary perGB metric is present */}
        {(r.ussd || metric !== "pergb") && (
          <div className="mt-2 flex items-center justify-between gap-2 border-t border-border/60 pt-2 text-[11px] text-muted-foreground">
            {r.ussd ? (
              <div className="inline-flex min-w-0 items-center gap-1">
                <button
                  type="button"
                  onClick={handleCopyUssd}
                  className="inline-flex min-h-[28px] items-center gap-1 rounded-lg bg-muted/85 px-2 py-0.5 font-mono text-[10.5px] font-semibold text-foreground transition-colors hover:bg-secondary cursor-pointer"
                  dir="ltr"
                  title="کپی کد دستوری"
                >
                  {copied ? (
                    <Check className="h-3 w-3 text-primary" />
                  ) : (
                    <Copy className="h-3 w-3 text-muted-foreground" />
                  )}
                  <span>{r.ussd}</span>
                </button>
                {ussdTelHref(r.ussd) && (
                  <a
                    href={ussdTelHref(r.ussd)!}
                    title={`شماره‌گیری ${r.ussd}`}
                    aria-label={`شماره‌گیری کد دستوری ${r.ussd}`}
                    className="inline-flex min-h-[28px] items-center gap-1 rounded-lg bg-primary/12 px-2 py-0.5 text-[10.5px] font-bold text-primary transition-colors hover:bg-primary hover:text-primary-foreground"
                  >
                    <Phone className="h-3 w-3 shrink-0" />
                    <span>شماره‌گیری</span>
                  </a>
                )}
              </div>
            ) : (
              <span />
            )}

            {metric !== "pergb" && (
              <span className="fa-num shrink-0 font-medium text-muted-foreground">
                {r.perGB >= 1000 ? `${fmtToman(r.perGB)} ت/گیگ` : `${fmtValue(r.perGB)} ت/گیگ`}
              </span>
            )}
          </div>
        )}
      </div>
    </article>
  );
}
