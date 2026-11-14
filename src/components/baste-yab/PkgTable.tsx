"use client";

import { useState } from "react";
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

  return (
    <div className="overflow-hidden rounded-xl border border-border bg-card">
      <div className="overflow-x-auto rail">
        <table className="w-full min-w-[760px] border-collapse text-right text-[13px]">
          <thead>
            <tr className="border-b border-border bg-muted/45 text-[11.5px] font-bold text-muted-foreground">
              <th className="py-3 ps-4 pe-2 text-center w-14">رتبه</th>
              <th className="py-3 px-3">بسته و ارائه‌دهنده</th>
              <th className="py-3 px-3 whitespace-nowrap">حجم</th>
              <th className="py-3 px-3 whitespace-nowrap">مدت</th>
              <th className="py-3 px-3 whitespace-nowrap">
                {metric === "pergb" ? "ارزش (ت/گیگ)" : "ارزش (ت/گیگ×روز)"}
              </th>
              <th className="py-3 px-3 whitespace-nowrap">اختلاف با بهترین</th>
              <th className="py-3 px-3 whitespace-nowrap">قیمت</th>
              <th className="py-3 px-3 whitespace-nowrap">کد دستوری</th>
              <th className="py-3 ps-3 pe-4 text-end whitespace-nowrap">اقدام</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-border/60">
            {rows.map((r) => {
              const uid = `${r.entryKey}:${r.id}`;
              const t = r.t ?? 0;
              const meterColor = valueColor(t, dark);
              const price = r.price * (vat ? 1 + VAT_RATE : 1);
              const old = r.oldPrice != null ? r.oldPrice * (vat ? 1 + VAT_RATE : 1) : null;
              const isCompared = compareIds.includes(uid);
              const canCompare = compareIds.length < 3;

              return (
                <tr
                  key={uid}
                  className={`transition-colors hover:bg-muted/35 ${
                    r.isBest ? "bg-primary/[0.03] dark:bg-primary/[0.04]" : ""
                  }`}
                >
                  <td className="py-3 ps-4 pe-2 text-center align-middle">
                    <span
                      className="fa-num inline-flex h-6 min-w-6 items-center justify-center rounded-md px-1.5 text-[12px] font-bold text-white"
                      style={{ backgroundColor: meterColor }}
                    >
                      {faDigits(r.rank)}
                    </span>
                  </td>

                  <td className="py-3 px-3 align-middle">
                    <div className="flex items-center gap-1.5 text-[11.5px] text-muted-foreground">
                      <span
                        className="h-2 w-2 shrink-0 rounded-full"
                        style={{ backgroundColor: r.providerAccent }}
                      />
                      <span className="font-bold text-foreground">{r.providerName}</span>
                      {r.kind !== "internet" && (
                        <>
                          <span aria-hidden="true">·</span>
                          <span>{KIND_LABEL[r.kind]}</span>
                        </>
                      )}
                      {r.discountPct != null && (
                        <>
                          <span aria-hidden="true">·</span>
                          <span className="fa-num font-bold text-amber-600 dark:text-amber-400">
                            {faDigits(r.discountPct)}٪ تخفیف
                          </span>
                        </>
                      )}
                    </div>
                    <div className="mt-0.5 font-bold text-foreground leading-5">{r.title}</div>
                    {r.note && (
                      <div className="mt-0.5 line-clamp-1 text-[11px] text-muted-foreground">
                        {r.note}
                      </div>
                    )}
                  </td>

                  <td className="fa-num py-3 px-3 align-middle font-bold whitespace-nowrap">
                    {fmtGB(r.gb)}
                  </td>

                  <td className="fa-num py-3 px-3 align-middle whitespace-nowrap text-muted-foreground">
                    {r.days ? `${faDigits(r.days)} روز` : "—"}
                  </td>

                  <td className="py-3 px-3 align-middle whitespace-nowrap">
                    <span
                      className="fa-num text-[15px] font-extrabold"
                      dir="ltr"
                      style={{ color: meterColor }}
                    >
                      {fmtValue(r.value)}
                    </span>
                  </td>

                  <td className="py-3 px-3 align-middle whitespace-nowrap text-[12px]">
                    {r.isFree ? (
                      <span className="inline-flex items-center gap-1 font-bold text-primary">
                        <Gift className="h-3.5 w-3.5" />
                        رایگان
                      </span>
                    ) : r.isBest ? (
                      <span className="inline-flex items-center gap-1 font-bold text-primary">
                        <Award className="h-3.5 w-3.5" />
                        بهترین
                      </span>
                    ) : r.worsePct != null ? (
                      <span className="fa-num font-bold" dir="ltr" style={{ color: meterColor }}>
                        +{faDigits(r.worsePct < 10 ? Math.round(r.worsePct * 10) / 10 : Math.round(r.worsePct))}٪
                      </span>
                    ) : (
                      "—"
                    )}
                  </td>

                  <td className="py-3 px-3 align-middle whitespace-nowrap">
                    {r.isFree ? (
                      <span className="font-bold text-primary">رایگان</span>
                    ) : (
                      <div>
                        <div className="fa-num font-bold text-foreground">
                          {fmtToman(price)}{" "}
                          <span className="text-[11px] font-normal text-muted-foreground">تومان</span>
                        </div>
                        {old != null && (
                          <div className="fa-num text-[10.5px] text-muted-foreground line-through">
                            {fmtToman(old)}
                          </div>
                        )}
                      </div>
                    )}
                  </td>

                  <td className="py-3 px-3 align-middle whitespace-nowrap">
                    {r.ussd ? (
                      <button
                        type="button"
                        onClick={() => handleCopy(uid, r.ussd!, r.providerName)}
                        className="inline-flex items-center gap-1 rounded-md bg-muted/70 px-2 py-1 font-mono text-[11px] text-foreground hover:bg-secondary cursor-pointer"
                        dir="ltr"
                      >
                        {copiedId === uid ? (
                          <Check className="h-3 w-3 text-primary" />
                        ) : (
                          <Copy className="h-3 w-3 text-muted-foreground" />
                        )}
                        <span>{r.ussd}</span>
                      </button>
                    ) : (
                      <span className="text-[11px] text-muted-foreground/60">—</span>
                    )}
                  </td>

                  <td className="py-3 ps-3 pe-4 align-middle text-end whitespace-nowrap">
                    <div className="inline-flex items-center gap-1.5">
                      <button
                        type="button"
                        onClick={() => onToggleCompare(uid)}
                        disabled={!isCompared && !canCompare}
                        aria-pressed={isCompared}
                        title="افزودن به مقایسه"
                        className={`inline-flex h-8 w-8 items-center justify-center rounded-lg border transition-colors cursor-pointer disabled:cursor-not-allowed disabled:opacity-40 ${
                          isCompared
                            ? "border-primary/50 bg-primary/10 text-primary"
                            : "border-border text-muted-foreground hover:bg-secondary hover:text-foreground"
                        }`}
                      >
                        {isCompared ? <Check className="h-3.5 w-3.5" /> : <Scale className="h-3.5 w-3.5" />}
                      </button>
                      <a
                        href={r.buyUrl}
                        target="_blank"
                        rel="noreferrer"
                        className="inline-flex h-8 items-center gap-1 rounded-lg bg-secondary px-2.5 text-[12px] font-bold text-secondary-foreground transition-colors hover:bg-primary hover:text-primary-foreground"
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
