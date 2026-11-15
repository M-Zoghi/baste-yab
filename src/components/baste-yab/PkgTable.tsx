"use client";

import { useState } from "react";
import { Award, Check, Copy, ExternalLink, Gift, Info, Scale, ShieldAlert, Smartphone } from "lucide-react";

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
import { KIND_LABEL, accentBadgeStyle, valueBadgeStyle, valueColor } from "./helpers";

interface PkgTableProps {
  rows: (Row & { t?: number })[];
  dark: boolean;
  metric: Metric;
  vat: boolean;
  compareIds: string[];
  onToggleCompare: (key: string) => void;
}

export function PkgTable({
  rows,
  dark,
  metric,
  vat,
  compareIds,
  onToggleCompare,
}: PkgTableProps) {
  const { toast } = useToast();
  const [copiedId, setCopiedId] = useState<string | null>(null);

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

  const unitLabel = metric === "pergb" ? "ت/گیگ" : "ت/گیگ×روز";

  return (
    <div className="overflow-hidden rounded-xl border border-border bg-card">
      <div className="overflow-x-auto rail">
        <table className="w-full min-w-[680px] border-collapse text-right text-[13.5px]">
          <thead>
            <tr className="border-b border-border bg-muted/50 text-[11.5px] font-bold text-muted-foreground">
              <th className="w-12 py-3 ps-4 pe-2 text-center">رتبه</th>
              <th className="py-3 px-3">بسته</th>
              <th className="w-24 py-3 px-3 whitespace-nowrap">حجم</th>
              <th className="w-20 py-3 px-3 whitespace-nowrap">مدت</th>
              <th className="w-36 py-3 px-3 whitespace-nowrap">
                ارزش ({unitLabel})
              </th>
              <th className="w-32 py-3 px-3 whitespace-nowrap">قیمت</th>
              <th className="w-28 py-3 ps-3 pe-4 text-end whitespace-nowrap">اقدام</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-border/50">
            {rows.map((r) => {
              const uid = `${r.entryKey}:${r.id}`;
              const t = r.t ?? 0;
              const meterColor = valueColor(t, dark);
              const rankBadgeStyle = valueBadgeStyle(t, dark);
              const price = r.price * (vat ? 1 + VAT_RATE : 1);
              const old = r.oldPrice != null ? r.oldPrice * (vat ? 1 + VAT_RATE : 1) : null;
              const isCompared = compareIds.includes(uid);
              const canCompare = compareIds.length < 3;

              return (
                <tr
                  key={uid}
                  className={`transition-colors even:bg-muted/[0.16] hover:bg-muted/40 ${
                    r.isBest ? "bg-primary/[0.04] dark:bg-primary/[0.06]" : ""
                  }`}
                >
                  {/* Rank */}
                  <td className="py-3.5 ps-4 pe-2 text-center align-top">
                    <span
                      className="fa-num mt-0.5 inline-flex h-6 min-w-6 items-center justify-center rounded-md border px-1.5 text-xs font-extrabold"
                      style={rankBadgeStyle}
                    >
                      {faDigits(r.rank)}
                    </span>
                  </td>

                  {/* Title + Provider + Inline Metadata & USSD */}
                  <td className="py-3.5 px-3 align-top">
                    <div className="font-bold leading-6 text-foreground">{r.title}</div>

                    <div className="mt-1 flex flex-wrap items-center gap-x-2 gap-y-1 text-xs text-muted-foreground">
                      <span className="inline-flex items-center gap-1.5 font-semibold text-foreground/90">
                        <span
                          className="h-2 w-2 shrink-0 rounded-full"
                          style={{ backgroundColor: r.providerAccent }}
                        />
                        {r.providerName}
                      </span>

                      {r.kind !== "internet" && (
                        <>
                          <span aria-hidden="true" className="text-border">·</span>
                          <span>{KIND_LABEL[r.kind]}</span>
                        </>
                      )}

                      {r.domesticOnly && (
                        <>
                          <span aria-hidden="true" className="text-border">·</span>
                          <span className="inline-flex items-center gap-1 font-semibold text-amber-700 dark:text-amber-300">
                            <ShieldAlert className="h-3 w-3 shrink-0" />
                            فقط اینترنت داخلی
                          </span>
                        </>
                      )}

                      {r.discountPct != null && (
                        <>
                          <span aria-hidden="true" className="text-border">·</span>
                          <span className="fa-num font-bold text-amber-600 dark:text-amber-400">
                            {faDigits(r.discountPct)}٪ تخفیف
                          </span>
                        </>
                      )}

                      {r.ussd && (
                        <>
                          <span aria-hidden="true" className="text-border">·</span>
                          <button
                            type="button"
                            onClick={() => handleCopy(uid, r.ussd!, r.providerName)}
                            className="inline-flex items-center gap-1 rounded bg-muted/80 px-1.5 py-0.5 font-mono text-[11px] text-foreground hover:bg-secondary cursor-pointer"
                            dir="ltr"
                            title="کپی کد دستوری"
                          >
                            {copiedId === uid ? (
                              <Check className="h-3 w-3 text-primary" />
                            ) : (
                              <Copy className="h-3 w-3 text-muted-foreground" />
                            )}
                            <span>{r.ussd}</span>
                          </button>
                        </>
                      )}
                    </div>

                    {r.portalOnly && (
                      <div className="mt-1.5">
                        <span
                          className="inline-flex flex-wrap items-center gap-x-2 gap-y-0.5 rounded-md border px-2 py-0.5 text-[11.5px]"
                          style={accentBadgeStyle(r.providerAccent, dark)}
                        >
                          <span className="inline-flex items-center gap-1 font-semibold">
                            <Smartphone className="h-3 w-3 shrink-0" />
                            <span>{r.portalLabel ?? "فروش فقط از اپ اپراتور"}</span>
                          </span>
                          <span aria-hidden="true" className="opacity-35">|</span>
                          <span className="inline-flex items-center gap-1 opacity-90">
                            <Info className="h-3 w-3 shrink-0" />
                            <span>{PORTAL_AVAILABILITY_NOTE}</span>
                          </span>
                        </span>
                      </div>
                    )}

                    {r.note && (
                      <div className="mt-1 text-[11.5px] leading-5 text-muted-foreground">
                        {r.note}
                      </div>
                    )}
                  </td>

                  {/* Volume */}
                  <td className="fa-num py-3.5 px-3 align-top font-bold text-foreground whitespace-nowrap">
                    {fmtGB(r.gb)}
                  </td>

                  {/* Duration */}
                  <td className="fa-num py-3.5 px-3 align-top text-muted-foreground whitespace-nowrap">
                    {r.days ? `${faDigits(r.days)} روز` : "—"}
                  </td>

                  {/* Unit Value + Relative % */}
                  <td className="py-3.5 px-3 align-top whitespace-nowrap">
                    <div className="flex items-baseline gap-1">
                      <span
                        className="fa-num text-[15px] font-extrabold"
                        style={{ color: meterColor }}
                      >
                        {fmtValue(r.value)}
                      </span>
                      <span className="text-[11px] text-muted-foreground">{unitLabel}</span>
                    </div>
                    <div className="mt-0.5 text-[11px]">
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
                        <span className="text-muted-foreground">
                          <span className="fa-num font-semibold" style={{ color: meterColor }}>
                            {faDigits(
                              r.worsePct < 10
                                ? Math.round(r.worsePct * 10) / 10
                                : Math.round(r.worsePct),
                            )}
                            ٪
                          </span>{" "}
                          بیشتر
                        </span>
                      ) : (
                        "—"
                      )}
                    </div>
                  </td>

                  {/* Price */}
                  <td className="py-3.5 px-3 align-top whitespace-nowrap">
                    {r.isFree ? (
                      <span className="font-bold text-primary">رایگان</span>
                    ) : (
                      <div>
                        <div className="fa-num font-bold text-foreground">
                          {fmtToman(price)}{" "}
                          <span className="text-[11px] font-normal text-muted-foreground">
                            تومان
                          </span>
                        </div>
                        {old != null && (
                          <div className="fa-num text-[11px] text-muted-foreground line-through">
                            {fmtToman(old)}
                          </div>
                        )}
                      </div>
                    )}
                  </td>

                  {/* Actions */}
                  <td className="py-3.5 ps-3 pe-4 align-top text-end whitespace-nowrap">
                    <div className="inline-flex items-center gap-1.5">
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
                        className={`inline-flex h-8 w-8 items-center justify-center rounded-lg border transition-colors cursor-pointer disabled:cursor-not-allowed disabled:opacity-40 ${
                          isCompared
                            ? "border-primary/50 bg-primary/10 text-primary"
                            : "border-border text-muted-foreground hover:bg-secondary hover:text-foreground"
                        }`}
                      >
                        {isCompared ? (
                          <Check className="h-3.5 w-3.5" />
                        ) : (
                          <Scale className="h-3.5 w-3.5" />
                        )}
                      </button>
                      <a
                        href={r.buyUrl}
                        target="_blank"
                        rel="noreferrer"
                        className="inline-flex h-8 items-center gap-1 rounded-lg bg-secondary px-2.5 text-xs font-bold text-secondary-foreground transition-colors hover:bg-primary hover:text-primary-foreground"
                      >
                        <span>خرید</span>
                        <ExternalLink className="h-3 w-3" />
                      </a>
                    </div>
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>
    </div>
  );
}
