"use client";

import { useState } from "react";
import { motion } from "framer-motion";
import { Award, Check, Copy, ExternalLink, Gift, Scale } from "lucide-react";

import {
  VAT_RATE,
  faDigits,
  fmtGB,
  fmtToman,
  fmtValue,
  type Metric,
  type Row,
} from "@/lib/providers";
import { useToast } from "@/hooks/use-toast";
import { KIND_LABEL, valueColor } from "./helpers";

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
    <motion.article
      layout="position"
      initial={{ opacity: 0, y: 10 }}
      animate={{ opacity: 1, y: 0 }}
      exit={{ opacity: 0, scale: 0.98 }}
      transition={{ duration: 0.16, ease: [0.16, 1, 0.3, 1] }}
      className={`group flex flex-col rounded-xl border bg-card p-4 transition-colors ${
        r.isBest
          ? "border-primary/65 bg-primary/[0.03] dark:bg-primary/[0.045]"
          : isCompared
            ? "border-primary/50"
            : r.isWorst
              ? "border-destructive/35 hover:border-destructive/60"
              : "border-border hover:border-foreground/25"
      }`}
    >
      {/* Top kicker line — clean unboxed metadata with typographic separators */}
      <div className="flex items-center justify-between gap-2 text-xs">
        <div className="flex min-w-0 items-center gap-1.5">
          <span
            className="fa-num inline-flex h-6 min-w-6 items-center justify-center rounded-md px-1.5 text-[12px] font-bold text-white"
            style={{ backgroundColor: meterColor }}
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
              <span className="shrink-0 font-medium text-muted-foreground">
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
            className={`inline-flex h-7 items-center gap-1 rounded-md border px-2 text-[11px] font-medium transition-colors whitespace-nowrap shrink-0 cursor-pointer disabled:cursor-not-allowed disabled:opacity-40 ${
              isCompared
                ? "border-primary/50 bg-primary/10 text-primary font-bold"
                : "border-border/80 bg-transparent text-muted-foreground hover:bg-secondary hover:text-foreground"
            }`}
          >
            {isCompared ? <Check className="h-3 w-3" /> : <Scale className="h-3 w-3" />}
            <span>مقایسه</span>
          </button>
        </div>
      </div>

      {/* Title + optional operator note */}
      <div className="mt-2.5">
        <h3 className="text-[15px] font-bold leading-6 text-foreground">{r.title}</h3>
        {r.note && (
          <p className="mt-1 line-clamp-2 text-[11.5px] leading-5 text-muted-foreground">
            {r.note}
          </p>
        )}
      </div>

      {/* Specs bar — structured hairline cells instead of pill cluster */}
      <div className="mt-3 grid grid-cols-2 divide-x divide-x-reverse divide-border/70 rounded-lg border border-border/60 bg-muted/40 py-2 text-center">
        <div className="px-2">
          <div className="text-[10px] text-muted-foreground">حجم بسته</div>
          <div className="fa-num mt-0.5 text-[13px] font-bold text-foreground">
            {fmtGB(r.gb)}
          </div>
        </div>
        <div className="px-2">
          <div className="text-[10px] text-muted-foreground">مدت اعتبار</div>
          <div className="fa-num mt-0.5 text-[13px] font-bold text-foreground">
            {r.days ? `${faDigits(r.days)} روز` : "—"}
          </div>
        </div>
      </div>
      {r.group && (
        <div className="mt-1.5 truncate text-[11px] text-muted-foreground">
          دسته: <span className="font-medium text-foreground/85">{r.group}</span>
        </div>
      )}

      {/* Value & Price section */}
      <div className="mt-auto pt-4">
        <div className="flex items-end justify-between gap-3 border-t border-border/60 pt-3">
          <div className="min-w-0">
            <div className="flex items-baseline gap-1.5" dir="ltr">
              <span
                className="fa-num text-2xl font-extrabold tracking-tight"
                style={{ color: meterColor }}
              >
                {fmtValue(r.value)}
              </span>
              <span className="text-[11px] font-medium text-muted-foreground">
                {metric === "pergb" ? "ت/گیگ" : "ت/گیگ×روز"}
              </span>
            </div>

            <div className="mt-1 flex items-center gap-1 text-[11px] font-medium text-muted-foreground">
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
                  <span className="fa-num font-bold" dir="ltr" style={{ color: meterColor }}>
                    +{faDigits(r.worsePct < 10 ? Math.round(r.worsePct * 10) / 10 : Math.round(r.worsePct))}٪
                  </span>{" "}
                  نسبت به بهترین
                </span>
              ) : (
                "—"
              )}
            </div>

            {/* Efficiency bar */}
            <div className="mt-2 h-1.5 w-28 overflow-hidden rounded-full bg-secondary">
              <div
                className="h-full rounded-full transition-transform duration-200"
                style={{
                  width: `${Math.max(8, Math.round((1 - t) * 100))}%`,
                  backgroundColor: meterColor,
                }}
              />
            </div>
          </div>

          <div className="shrink-0 text-end">
            {r.isFree ? (
              <div className="text-lg font-extrabold text-primary">رایگان</div>
            ) : (
              <>
                {old != null && (
                  <div className="fa-num text-[11px] text-muted-foreground line-through decoration-1">
                    {fmtToman(old)}
                  </div>
                )}
                <div className="fa-num text-[17px] font-extrabold leading-6 text-foreground">
                  {fmtToman(price)}
                  <span className="ms-1 text-[11px] font-medium text-muted-foreground">تومان</span>
                </div>
              </>
            )}

            <a
              href={r.buyUrl}
              target="_blank"
              rel="noreferrer"
              className="mt-2 inline-flex min-h-[38px] items-center justify-center gap-1.5 rounded-lg bg-secondary px-3.5 py-1.5 text-[12.5px] font-bold text-secondary-foreground transition-colors hover:bg-primary hover:text-primary-foreground whitespace-nowrap shrink-0"
            >
              <span>خرید</span>
              <ExternalLink className="h-3.5 w-3.5" />
            </a>
          </div>
        </div>

        {/* Footer metadata + USSD quick copy */}
        <div className="mt-3 flex items-center justify-between gap-2 border-t border-border/40 pt-2.5 text-[10.5px] text-muted-foreground">
          {r.ussd ? (
            <button
              type="button"
              onClick={handleCopyUssd}
              className="inline-flex min-h-[28px] items-center gap-1 rounded-md bg-muted/60 px-2 py-0.5 font-mono text-[11px] text-foreground transition-colors hover:bg-secondary cursor-pointer"
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
          ) : (
            <span dir="ltr" className="truncate font-mono opacity-80">
              {r.regulatoryCode ? `REG: ${r.regulatoryCode}` : r.sourceKind === "api" ? "API" : "capture"}
            </span>
          )}

          <span dir="ltr" className="fa-num shrink-0 font-mono opacity-80">
            {r.perGB >= 1000 ? `${fmtToman(r.perGB)} T/GB` : `${fmtValue(r.perGB)} T/GB`}
          </span>
        </div>
      </div>
    </motion.article>
  );
}
