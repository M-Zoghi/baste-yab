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
    <div className="overflow-hidden rounded-2xl sm:rounded-xl border border-border bg-card shadow-xs">
      {/* ── Mobile Native Compact Table (< md, zero horizontal scroll) ── */}
      <div className="md:hidden">
        {/* Compact Column Header */}
        <div className="flex items-center justify-between gap-2 border-b border-border bg-muted/75 px-3 py-2 text-[11px] font-bold text-foreground/85">
          <span>رتبه و مشخصات بسته</span>
          <span className="w-[104px] shrink-0 text-end">ارزش ({unitLabel}) / قیمت</span>
        </div>

        <div className="divide-y divide-border/80">
          {rows.map((r) => {
            const uid = `${r.entryKey}:${r.id}`;
            const t = r.t ?? 0;
            const meterColor = valueColor(t, dark);
            const rankBadgeStyle = valueBadgeStyle(t, dark);
            const price = r.price * (vat ? 1 + VAT_RATE : 1);
            const old = r.oldPrice != null ? r.oldPrice * (vat ? 1 + VAT_RATE : 1) : null;
            const isCompared = compareIds.includes(uid);
            const canCompare = compareIds.length < 3;
            const tel = r.ussd ? ussdTelHref(r.ussd) : null;

            return (
              <div
                key={uid}
                className={`px-3 py-3 even:bg-muted/[0.16] ${
                  r.isBest ? "bg-primary/[0.045] dark:bg-primary/[0.07]" : ""
                }`}
              >
                {/* Top Split Row: Title+Specs (start) | Aligned Value+Price Column (end) */}
                <div className="flex items-start justify-between gap-2.5">
                  <div className="min-w-0 flex-1">
                    <div className="flex items-start gap-1.5">
                      <span
                        className="fa-num mt-0.5 inline-flex h-5 min-w-5 shrink-0 items-center justify-center rounded-md border px-1 text-[11px] font-extrabold"
                        style={rankBadgeStyle}
                      >
                        {faDigits(r.rank)}
                      </span>
                      <div className="min-w-0 text-[13px] font-bold leading-5 text-foreground">
                        {r.title}
                      </div>
                    </div>

                    <div className="mt-1 flex flex-wrap items-center gap-x-1.5 gap-y-0.5 text-[11px] text-muted-foreground">
                      <span className="inline-flex items-center gap-1 font-semibold text-foreground/90">
                        <span
                          className="h-2 w-2 shrink-0 rounded-full"
                          style={{ backgroundColor: r.providerAccent }}
                        />
                        {r.providerName}
                      </span>
                      <span aria-hidden="true" className="text-border">·</span>
                      <span className="fa-num font-bold text-foreground">{fmtGB(r.gb)}</span>
                      <span aria-hidden="true" className="text-border">·</span>
                      <span className="fa-num">{r.days ? `${faDigits(r.days)} روز` : "—"}</span>
                      {r.kind !== "internet" && (
                        <>
                          <span aria-hidden="true" className="text-border">·</span>
                          <span>{KIND_LABEL[r.kind]}</span>
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
                      {r.domesticOnly && (
                        <>
                          <span aria-hidden="true" className="text-border">·</span>
                          <span className="inline-flex items-center gap-0.5 font-semibold text-amber-700 dark:text-amber-300">
                            <ShieldAlert className="h-3 w-3 shrink-0" />
                            داخلی
                          </span>
                        </>
                      )}
                    </div>
                  </div>

                  {/* Aligned Value & Price Column */}
                  <div className="w-[104px] shrink-0 border-s border-border/60 ps-2.5 text-end">
                    <div className="fa-num text-[14px] font-extrabold leading-tight" style={{ color: meterColor }}>
                      {fmtValue(r.value)}
                    </div>
                    <div className="text-[10px] leading-tight text-muted-foreground">{unitLabel}</div>

                    <div className="mt-1.5">
                      {r.isFree ? (
                        <span className="text-xs font-extrabold text-primary">رایگان</span>
                      ) : (
                        <>
                          <div className="fa-num text-[12px] font-extrabold leading-tight text-foreground">
                            {fmtToman(price)}{" "}
                            <span className="text-[10px] font-medium text-muted-foreground">ت</span>
                          </div>
                          {old != null && (
                            <div className="fa-num text-[10px] leading-tight text-muted-foreground line-through">
                              {fmtToman(old)}
                            </div>
                          )}
                        </>
                      )}
                    </div>
                  </div>
                </div>

                {/* Portal / Note */}
                {(r.portalOnly || r.note) && (
                  <div className="mt-1.5 space-y-1">
                    {r.portalOnly && (
                      <div
                        className="flex flex-col gap-0.5 rounded-md border px-2 py-1 text-[10.5px] leading-4"
                        style={accentBadgeStyle(r.providerAccent, dark)}
                      >
                        <span className="inline-flex items-center gap-1 font-semibold">
                          <Smartphone className="h-2.5 w-2.5 shrink-0" />
                          <span>{r.portalLabel ?? "فروش فقط از اپ اپراتور"}</span>
                        </span>
                        <span className="inline-flex items-start gap-1 text-[10px] opacity-90">
                          <Info className="mt-0.5 h-2.5 w-2.5 shrink-0" />
                          <span>{r.portalNote ?? PORTAL_AVAILABILITY_NOTE}</span>
                        </span>
                      </div>
                    )}
                    {r.note && (
                      <div className="text-[11px] leading-4 text-muted-foreground">{r.note}</div>
                    )}
                  </div>
                )}

                {/* Bottom Action & Status Strip */}
                <div className="mt-2 flex flex-wrap items-center justify-between gap-2 border-t border-border/45 pt-2">
                  <div className="flex flex-wrap items-center gap-1.5 text-[11px]">
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
                          +{faDigits(
                            r.worsePct < 10
                              ? Math.round(r.worsePct * 10) / 10
                              : Math.round(r.worsePct),
                          )}
                          ٪
                        </span>{" "}
                        گران‌تر
                      </span>
                    ) : null}

                    {r.ussd && (
                      <span className="inline-flex items-center gap-1">
                        <button
                          type="button"
                          onClick={() => handleCopy(uid, r.ussd!, r.providerName)}
                          className="inline-flex min-h-[28px] items-center gap-1 rounded-lg bg-muted/85 px-1.5 font-mono text-[10.5px] font-semibold text-foreground active:scale-[0.96] transition-transform cursor-pointer"
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
                        {tel && (
                          <a
                            href={tel}
                            title={`شماره‌گیری ${r.ussd}`}
                            aria-label={`شماره‌گیری کد دستوری ${r.ussd}`}
                            className="inline-flex h-7 w-7 items-center justify-center rounded-lg bg-primary/12 text-primary active:scale-[0.95] transition-transform"
                          >
                            <Phone className="h-3 w-3" />
                          </a>
                        )}
                      </span>
                    )}
                  </div>

                  <div className="flex items-center gap-1.5 shrink-0 ms-auto">
                    <button
                      type="button"
                      onClick={() => onToggleCompare(uid)}
                      disabled={!isCompared && !canCompare}
                      aria-pressed={isCompared}
                      className={`inline-flex h-8 items-center gap-1 rounded-xl border px-2.5 text-[11px] font-bold transition-transform active:scale-[0.96] cursor-pointer disabled:cursor-not-allowed disabled:opacity-40 ${
                        isCompared
                          ? "border-primary/60 bg-primary/12 text-primary"
                          : "border-border bg-card text-foreground"
                      }`}
                    >
                      {isCompared ? (
                        <Check className="h-3.5 w-3.5" />
                      ) : (
                        <Scale className="h-3.5 w-3.5" />
                      )}
                      <span>{isCompared ? "در مقایسه" : "مقایسه"}</span>
                    </button>
                    <a
                      href={r.buyUrl}
                      target="_blank"
                      rel="noreferrer"
                      className="inline-flex h-8 items-center gap-1 rounded-xl bg-primary px-3 text-[11px] font-bold text-primary-foreground active:scale-[0.96] transition-transform"
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
      </div>

      {/* ── Desktop / Tablet Full Table (md+) ── */}
      <div className="hidden md:block overflow-x-auto rail">
        <table className="w-full min-w-[680px] border-collapse text-right text-[13.5px]">
          <thead>
            <tr className="border-b border-border bg-muted text-[11.5px] font-bold text-foreground/85">
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
          <tbody className="divide-y divide-border/80">
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
                          <span className="inline-flex items-center gap-1">
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
                            {ussdTelHref(r.ussd) && (
                              <a
                                href={ussdTelHref(r.ussd)!}
                                title={`شماره‌گیری ${r.ussd}`}
                                aria-label={`شماره‌گیری کد دستوری ${r.ussd}`}
                                className="inline-flex items-center justify-center rounded bg-primary/10 p-1 text-primary transition-colors hover:bg-primary hover:text-primary-foreground"
                              >
                                <Phone className="h-3 w-3" />
                              </a>
                            )}
                          </span>
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
                            <span>{r.portalNote ?? PORTAL_AVAILABILITY_NOTE}</span>
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
