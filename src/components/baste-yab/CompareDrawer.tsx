"use client";

import { useState } from "react";
import { Award, Check, Copy, ExternalLink, Phone, Scale, Trash2, X } from "lucide-react";

import { Button } from "@/components/ui/button";
import {
  Drawer,
  DrawerContent,
  DrawerDescription,
  DrawerTitle,
} from "@/components/ui/drawer";
import { useToast } from "@/hooks/use-toast";
import {
  PORTAL_AVAILABILITY_NOTE,
  VAT_RATE,
  faDigits,
  fmtGB,
  fmtToman,
  fmtValue,
  type Row,
} from "@/lib/providers";
import { KIND_LABEL, ussdTelHref } from "./helpers";

interface CompareBodyProps {
  items: Row[];
  vat: boolean;
  onRemove: (uid: string) => void;
  onClear: () => void;
  onBrowse?: () => void;
}

export function CompareBody({
  items,
  vat,
  onRemove,
  onClear,
  onBrowse,
}: CompareBodyProps) {
  const { toast } = useToast();
  const [copiedSummary, setCopiedSummary] = useState(false);

  const f = vat ? 1 + VAT_RATE : 1;
  const paidPerGB = items.filter((i) => !i.isFree).map((i) => i.perGB * f);
  const bestPerGB = paidPerGB.length ? Math.min(...paidPerGB) : null;
  const maxGB = items.length ? Math.max(...items.map((i) => i.gb)) : 0;
  const maxDays = items.length ? Math.max(...items.map((i) => i.days)) : 0;

  const handleCopySummary = async () => {
    if (!items.length) return;
    const header = `مقایسه ${faDigits(items.length)} بسته اینترنت (${vat ? "با احتساب ۱۰٪ مالیات" : "بدون مالیات"}):`;
    const lines = items.map((item, idx) => {
      const priceStr = item.isFree ? "رایگان" : `${fmtToman(item.price * f)} تومان`;
      const perGbStr = `${fmtValue(item.perGB * f)} ت/گیگ`;
      const ussdStr = item.ussd ? ` | کد: ${item.ussd}` : "";
      const portalStr = item.portalOnly
        ? ` | ${item.portalLabel ?? "فروش فقط از اپ اپراتور"}`
        : "";
      return `${faDigits(idx + 1)}) ${item.providerName} — ${item.title}\n   حجم: ${fmtGB(item.gb)} | مدت: ${item.days ? `${faDigits(item.days)} روز` : "—"} | قیمت: ${priceStr} (${perGbStr})${ussdStr}${portalStr}`;
    });
    const text = `${header}\n\n${lines.join("\n\n")}`;
    try {
      await navigator.clipboard.writeText(text);
      setCopiedSummary(true);
      toast({ title: "خلاصه مقایسه کپی شد" });
      setTimeout(() => setCopiedSummary(false), 1800);
    } catch {
      toast({ title: "کپی انجام نشد" });
    }
  };

  if (items.length === 0) {
    return (
      <div className="flex flex-col items-center justify-center rounded-2xl border border-border bg-card px-5 py-12 text-center shadow-xs">
        <span className="grid h-12 w-12 place-items-center rounded-2xl bg-primary/12 text-primary">
          <Scale className="h-6 w-6" />
        </span>
        <div className="mt-3 text-sm font-bold text-foreground">
          هنوز بسته‌ای برای مقایسه انتخاب نشده است
        </div>
        <p className="mt-1 max-w-xs text-xs leading-6 text-muted-foreground">
          روی دکمه‌ی «مقایسه» در کارت هر بسته بزنید (حداکثر ۳ بسته) تا قیمت، حجم، مدت و کد دستوری آن‌ها را کنار هم ببینید.
        </p>
        {onBrowse && (
          <Button
            onClick={onBrowse}
            className="mt-4 h-10 rounded-xl px-5 text-xs font-bold cursor-pointer"
          >
            مشاهده فهرست بسته‌ها
          </Button>
        )}
      </div>
    );
  }

  return (
    <div className="space-y-4">
      {/* Action Row (visible inline for mobile tab, harmless in drawer) */}
      <div className="flex flex-wrap items-center justify-between gap-2">
        <span className="fa-num text-xs font-bold text-muted-foreground">
          {faDigits(items.length)} از ۳ بسته انتخاب‌شده ({vat ? "با ۱۰٪ مالیات" : "بدون مالیات"})
        </span>
        <div className="flex items-center gap-2">
          <Button
            variant="outline"
            size="sm"
            onClick={handleCopySummary}
            className="h-9 gap-1.5 rounded-xl border-border bg-card text-xs font-bold cursor-pointer"
          >
            {copiedSummary ? (
              <Check className="h-3.5 w-3.5 text-primary" />
            ) : (
              <Copy className="h-3.5 w-3.5" />
            )}
            <span>{copiedSummary ? "کپی شد" : "کپی خلاصه"}</span>
          </Button>
          <Button
            variant="ghost"
            size="sm"
            onClick={onClear}
            className="h-9 gap-1.5 rounded-xl text-xs font-bold text-muted-foreground hover:text-destructive cursor-pointer"
          >
            <Trash2 className="h-3.5 w-3.5" />
            <span>پاک‌کردن</span>
          </Button>
        </div>
      </div>

      {/* Mobile Native Stacked Comparison Cards (< sm) */}
      <div className="space-y-3 sm:hidden">
        {items.map((item) => {
          const uid = `${item.entryKey}:${item.id}`;
          const val = item.perGB * f;
          const isBestItem = !item.isFree && bestPerGB != null && Math.abs(val - bestPerGB) < 1e-6;
          const tel = item.ussd ? ussdTelHref(item.ussd) : null;
          return (
            <div
              key={uid}
              className={`rounded-2xl border p-4 shadow-xs ${
                isBestItem
                  ? "border-primary/65 bg-primary/[0.05]"
                  : "border-border bg-card"
              }`}
            >
              <div className="flex items-start justify-between gap-2">
                <div className="min-w-0">
                  <div className="flex flex-wrap items-center gap-1.5 text-xs">
                    <span
                      className="h-2.5 w-2.5 rounded-full shrink-0"
                      style={{ backgroundColor: item.providerAccent }}
                    />
                    <span className="font-bold text-foreground">{item.providerName}</span>
                    {isBestItem && (
                      <span className="inline-flex items-center gap-1 rounded-md bg-primary/15 px-1.5 py-0.5 text-[10.5px] font-extrabold text-primary">
                        <Award className="h-3 w-3" />
                        به‌صرفه‌ترین
                      </span>
                    )}
                  </div>
                  <h3 className="mt-1 text-sm font-bold leading-6 text-foreground">{item.title}</h3>
                </div>
                <button
                  type="button"
                  onClick={() => onRemove(uid)}
                  aria-label="حذف از مقایسه"
                  className="rounded-lg border border-border bg-muted/60 p-1.5 text-muted-foreground hover:text-destructive cursor-pointer"
                >
                  <X className="h-4 w-4" />
                </button>
              </div>

              <div className="mt-3 grid grid-cols-3 divide-x divide-x-reverse divide-border rounded-xl border border-border bg-muted/60 py-2 text-center">
                <div className="px-1.5">
                  <div className="text-[10px] text-muted-foreground">ارزش گیگ</div>
                  <div
                    className={`fa-num mt-0.5 text-xs font-extrabold ${
                      isBestItem ? "text-primary" : "text-foreground"
                    }`}
                  >
                    {fmtValue(val)} ت
                  </div>
                </div>
                <div className="px-1.5">
                  <div className="text-[10px] text-muted-foreground">حجم</div>
                  <div
                    className={`fa-num mt-0.5 text-xs font-bold ${
                      item.gb === maxGB ? "text-primary" : "text-foreground"
                    }`}
                  >
                    {fmtGB(item.gb)}
                  </div>
                </div>
                <div className="px-1.5">
                  <div className="text-[10px] text-muted-foreground">مدت</div>
                  <div
                    className={`fa-num mt-0.5 text-xs font-bold ${
                      item.days === maxDays ? "text-primary" : "text-foreground"
                    }`}
                  >
                    {item.days ? `${faDigits(item.days)} روز` : "—"}
                  </div>
                </div>
              </div>

              <div className="mt-3 flex flex-wrap items-center justify-between gap-2">
                <div className="fa-num text-base font-extrabold text-foreground">
                  {item.isFree ? (
                    <span className="text-primary">رایگان</span>
                  ) : (
                    <>
                      {fmtToman(item.price * f)}{" "}
                      <span className="text-xs font-medium text-muted-foreground">تومان</span>
                    </>
                  )}
                </div>

                <div className="flex items-center gap-1.5">
                  {item.ussd && tel && (
                    <a
                      href={tel}
                      className="inline-flex h-9 items-center gap-1 rounded-xl border border-border bg-muted px-2.5 font-mono text-xs font-semibold text-foreground"
                      dir="ltr"
                    >
                      <Phone className="h-3.5 w-3.5 text-primary" />
                      <span>{item.ussd}</span>
                    </a>
                  )}
                  <a
                    href={item.buyUrl}
                    target="_blank"
                    rel="noreferrer"
                    className="inline-flex h-9 items-center gap-1.5 rounded-xl bg-primary px-3.5 text-xs font-bold text-primary-foreground"
                  >
                    <span>خرید</span>
                    <ExternalLink className="h-3.5 w-3.5" />
                  </a>
                </div>
              </div>

              {(item.note || item.portalOnly || item.domesticOnly) && (
                <p className="mt-2 border-t border-border/70 pt-2 text-[11px] leading-5 text-muted-foreground">
                  {item.portalOnly
                    ? `${item.portalLabel ?? "فروش فقط از اپ اپراتور"} · `
                    : ""}
                  {item.domesticOnly ? "فقط اینترنت داخلی · " : ""}
                  {item.note ?? ""}
                </p>
              )}
            </div>
          );
        })}
      </div>

      {/* Desktop / Tablet Side-by-Side Table (sm+) */}
      <div className="hidden sm:block overflow-x-auto rail rounded-xl border border-border bg-card p-3">
        <table className="w-full min-w-[560px] border-collapse text-right text-[13px]">
          <thead>
            <tr className="border-b border-border">
              <th className="w-36 py-3 ps-2 pe-4 text-xs font-bold text-muted-foreground align-top">
                مشخصه
              </th>
              {items.map((item) => {
                const uid = `${item.entryKey}:${item.id}`;
                return (
                  <th key={uid} className="min-w-[170px] py-3 px-3 align-top font-normal">
                    <div className="flex items-start justify-between gap-2">
                      <div className="flex items-center gap-1.5 text-xs">
                        <span
                          className="h-2 w-2 rounded-full shrink-0"
                          style={{ backgroundColor: item.providerAccent }}
                        />
                        <span className="font-bold text-foreground">{item.providerName}</span>
                      </div>
                      <button
                        type="button"
                        onClick={() => onRemove(uid)}
                        aria-label="حذف از مقایسه"
                        className="rounded p-1 text-muted-foreground hover:bg-secondary hover:text-foreground cursor-pointer"
                      >
                        <X className="h-3.5 w-3.5" />
                      </button>
                    </div>
                    <div className="mt-1 text-sm font-bold leading-5 text-foreground">
                      {item.title}
                    </div>
                  </th>
                );
              })}
            </tr>
          </thead>
          <tbody className="divide-y divide-border/60">
            <tr>
              <td className="py-3 ps-2 pe-4 text-xs font-bold text-muted-foreground">
                قیمت {vat ? "(با مالیات)" : "(بدون مالیات)"}
              </td>
              {items.map((item) => (
                <td key={`${item.entryKey}:${item.id}`} className="fa-num py-3 px-3 font-bold">
                  {item.isFree ? (
                    <span className="text-primary">رایگان</span>
                  ) : (
                    `${fmtToman(item.price * f)} تومان`
                  )}
                </td>
              ))}
            </tr>
            <tr>
              <td className="py-3 ps-2 pe-4 text-xs font-bold text-muted-foreground">
                ارزش هر گیگ
              </td>
              {items.map((item) => {
                const val = item.perGB * f;
                const isBestItem = !item.isFree && bestPerGB != null && Math.abs(val - bestPerGB) < 1e-6;
                return (
                  <td key={`${item.entryKey}:${item.id}`} className="fa-num py-3 px-3">
                    <span className={isBestItem ? "font-extrabold text-primary" : "font-bold"}>
                      {fmtValue(val)} ت/گیگ
                    </span>
                    {isBestItem && (
                      <span className="ms-1.5 text-[11px] font-bold text-primary">
                        (به‌صرفه‌ترین)
                      </span>
                    )}
                  </td>
                );
              })}
            </tr>
            <tr>
              <td className="py-3 ps-2 pe-4 text-xs font-bold text-muted-foreground">
                ارزش گیگ×روز
              </td>
              {items.map((item) => (
                <td key={`${item.entryKey}:${item.id}`} className="fa-num py-3 px-3">
                  {item.days > 0 ? `${fmtValue(item.perGBDay * f)} تومان` : "—"}
                </td>
              ))}
            </tr>
            <tr>
              <td className="py-3 ps-2 pe-4 text-xs font-bold text-muted-foreground">حجم</td>
              {items.map((item) => (
                <td
                  key={`${item.entryKey}:${item.id}`}
                  className={`fa-num py-3 px-3 ${item.gb === maxGB ? "font-bold text-foreground" : ""}`}
                >
                  {fmtGB(item.gb)}
                </td>
              ))}
            </tr>
            <tr>
              <td className="py-3 ps-2 pe-4 text-xs font-bold text-muted-foreground">مدت اعتبار</td>
              {items.map((item) => (
                <td
                  key={`${item.entryKey}:${item.id}`}
                  className={`fa-num py-3 px-3 ${item.days === maxDays ? "font-bold text-foreground" : ""}`}
                >
                  {item.days ? `${faDigits(item.days)} روز` : "—"}
                </td>
              ))}
            </tr>
            <tr>
              <td className="py-3 ps-2 pe-4 text-xs font-bold text-muted-foreground">نوع بسته</td>
              {items.map((item) => (
                <td key={`${item.entryKey}:${item.id}`} className="py-3 px-3 text-muted-foreground">
                  {KIND_LABEL[item.kind]}
                  {item.domesticOnly ? " · فقط اینترنت داخلی" : ""}
                  {item.portalOnly
                    ? ` · ${item.portalLabel ?? "فروش فقط از اپ اپراتور"} (${item.portalNote ?? PORTAL_AVAILABILITY_NOTE})`
                    : ""}
                  {item.discountPct != null ? ` · ${faDigits(item.discountPct)}٪ تخفیف` : ""}
                </td>
              ))}
            </tr>
            <tr>
              <td className="py-3 ps-2 pe-4 text-xs font-bold text-muted-foreground">کد دستوری</td>
              {items.map((item) => {
                const tel = item.ussd ? ussdTelHref(item.ussd) : null;
                return (
                  <td key={`${item.entryKey}:${item.id}`} className="py-3 px-3 font-mono text-xs" dir="ltr">
                    {item.ussd ? (
                      <span className="inline-flex items-center gap-1.5">
                        <span>{item.ussd}</span>
                        {tel && (
                          <a
                            href={tel}
                            title={`شماره‌گیری ${item.ussd}`}
                            aria-label={`شماره‌گیری ${item.ussd}`}
                            className="inline-flex items-center justify-center rounded bg-primary/10 p-1 text-primary transition-colors hover:bg-primary hover:text-primary-foreground"
                          >
                            <Phone className="h-3 w-3" />
                          </a>
                        )}
                      </span>
                    ) : (
                      "—"
                    )}
                  </td>
                );
              })}
            </tr>
            <tr>
              <td className="py-3 ps-2 pe-4 text-xs font-bold text-muted-foreground">توضیحات</td>
              {items.map((item) => (
                <td key={`${item.entryKey}:${item.id}`} className="py-3 px-3 text-xs leading-5 text-muted-foreground">
                  {item.note ?? "—"}
                </td>
              ))}
            </tr>
            <tr>
              <td className="py-3 ps-2 pe-4 text-xs font-bold text-muted-foreground">خرید</td>
              {items.map((item) => (
                <td key={`${item.entryKey}:${item.id}`} className="py-3 px-3">
                  <a
                    href={item.buyUrl}
                    target="_blank"
                    rel="noreferrer"
                    className="inline-flex min-h-[36px] items-center gap-1.5 rounded-lg bg-primary px-3 py-1.5 text-xs font-bold text-primary-foreground transition-colors hover:bg-primary/90"
                  >
                    <span>خرید از {item.providerName}</span>
                    <ExternalLink className="h-3.5 w-3.5" />
                  </a>
                </td>
              ))}
            </tr>
          </tbody>
        </table>
      </div>
    </div>
  );
}

interface CompareDrawerProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  items: Row[];
  vat: boolean;
  onRemove: (uid: string) => void;
  onClear: () => void;
}

export function CompareDrawer({
  open,
  onOpenChange,
  items,
  vat,
  onRemove,
  onClear,
}: CompareDrawerProps) {
  return (
    <Drawer open={open} onOpenChange={onOpenChange}>
      <DrawerContent className="mx-auto max-h-[88dvh] max-w-4xl border-border bg-card" dir="rtl">
        <div className="flex flex-wrap items-center justify-between gap-2 border-b border-border px-5 py-3.5">
          <div>
            <DrawerTitle className="text-start text-base font-bold">
              مقایسه کنار هم ({faDigits(items.length)} بسته)
            </DrawerTitle>
            <DrawerDescription className="text-start text-xs">
              {vat
                ? "ارقام با احتساب ۱۰٪ مالیات بر ارزش افزوده نمایش داده می‌شوند."
                : "ارقام بر اساس قیمت پایه‌ی درج‌شده در سایت ارائه‌دهنده (بدون مالیات) است."}
            </DrawerDescription>
          </div>
          <Button
            variant="outline"
            size="icon"
            className="h-8 w-8 cursor-pointer"
            onClick={() => onOpenChange(false)}
            aria-label="بستن مقایسه"
          >
            <X className="h-4 w-4" />
          </Button>
        </div>

        <div className="overflow-auto p-5">
          <CompareBody items={items} vat={vat} onRemove={onRemove} onClear={onClear} />
        </div>
      </DrawerContent>
    </Drawer>
  );
}
