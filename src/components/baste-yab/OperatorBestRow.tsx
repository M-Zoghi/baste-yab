"use client";

import { Award, ExternalLink } from "lucide-react";

import {
  VAT_RATE,
  faDigits,
  fmtGB,
  fmtToman,
  fmtValue,
  type Metric,
  type Row,
} from "@/lib/providers";
import { accentTextColor } from "./helpers";

interface OperatorBestRowProps {
  rows: Row[];
  metric: Metric;
  vat: boolean;
  dark: boolean;
  onFocusProvider: (entryKey: string) => void;
}

export function OperatorBestRow({
  rows,
  metric,
  vat,
  dark,
  onFocusProvider,
}: OperatorBestRowProps) {
  const map = new Map<string, Row>();
  for (const r of rows) {
    if (r.isFree || !isFinite(r.value)) continue;
    const prev = map.get(r.entryKey);
    if (!prev || r.value < prev.value) {
      map.set(r.entryKey, r);
    }
  }

  const bestList = [...map.values()].sort((a, b) => a.value - b.value);
  if (bestList.length < 2) return null;

  const unitShort = metric === "pergb" ? "ت/گیگ" : "ت/گیگ×روز";
  const f = vat ? 1 + VAT_RATE : 1;

  return (
    <section
      aria-label="بهترین بسته هر اپراتور"
      className="rounded-2xl sm:rounded-xl border border-border bg-card p-3 sm:p-3.5 shadow-xs"
    >
      <div className="mb-2 flex flex-wrap items-center justify-between gap-2">
        <div className="flex items-center gap-1.5">
          <Award className="h-4 w-4 text-primary" />
          <h2 className="text-xs font-extrabold text-foreground">بهترینِ هر اپراتور</h2>
        </div>
        <span className="hidden sm:inline text-[11px] text-muted-foreground">
          بر اساس کمترین {unitShort} · برای فیلتر کلیک کنید
        </span>
      </div>

      <div className="flex gap-2 overflow-x-auto pb-0.5 snap-x snap-mandatory rail sm:grid sm:grid-cols-2 sm:gap-2.5 sm:overflow-visible sm:pb-0 xl:grid-cols-4">
        {bestList.map((r, idx) => {
          const isLeader = idx === 0;
          const accentText = accentTextColor(r.providerAccent, dark);
          const displayPrice = r.price * f;
          return (
            <div
              key={r.entryKey}
              className={`group flex min-w-[172px] shrink-0 snap-start flex-col justify-between rounded-xl sm:rounded-lg border px-2.5 py-2 sm:px-3 sm:py-2.5 transition-colors sm:min-w-0 ${
                isLeader
                  ? "border-primary/60 bg-primary/[0.06] dark:bg-primary/[0.09]"
                  : "border-border bg-muted/50 hover:border-foreground/30 hover:bg-muted/80"
              }`}
            >
              <div className="flex items-start justify-between gap-2">
                <button
                  type="button"
                  onClick={() => onFocusProvider(r.entryKey)}
                  className="flex min-w-0 flex-1 items-center gap-1.5 text-start cursor-pointer"
                >
                  <span
                    className="h-2.5 w-2.5 rounded-full shrink-0"
                    style={{ backgroundColor: r.providerAccent }}
                  />
                  <span className="truncate text-xs font-extrabold" style={{ color: accentText }}>
                    {r.providerName}
                  </span>
                  {isLeader && (
                    <span className="rounded bg-primary/15 px-1.5 py-0.5 text-[10px] font-bold text-primary shrink-0">
                      برتر
                    </span>
                  )}
                </button>
                <a
                  href={r.buyUrl}
                  target="_blank"
                  rel="noreferrer"
                  aria-label={`خرید بهترین بسته ${r.providerName}`}
                  title="صفحه خرید"
                  className="rounded p-1 text-muted-foreground transition-colors hover:bg-secondary hover:text-foreground shrink-0"
                >
                  <ExternalLink className="h-3.5 w-3.5" />
                </a>
              </div>

              <button
                type="button"
                onClick={() => onFocusProvider(r.entryKey)}
                className="mt-1.5 text-start cursor-pointer"
              >
                <div className="line-clamp-1 text-[12px] font-bold text-foreground group-hover:text-primary transition-colors">
                  {r.title}
                </div>
                <div className="fa-num mt-1 flex flex-wrap items-baseline gap-x-1.5 text-[11px] text-muted-foreground">
                  <span className="text-[13px] font-extrabold text-foreground">
                    {fmtValue(r.value)}
                  </span>
                  <span>{unitShort}</span>
                  <span>·</span>
                  <span>{fmtGB(r.gb)}</span>
                  <span>·</span>
                  <span>{r.days ? `${faDigits(r.days)} روز` : "—"}</span>
                  <span>·</span>
                  <span>{fmtToman(displayPrice)} ت</span>
                </div>
              </button>
            </div>
          );
        })}
      </div>
    </section>
  );
}
