"use client";

import { useState } from "react";
import { Check, Copy, ExternalLink, Phone, Trash2, X } from "lucide-react";

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

  return (
    <Drawer open={open} onOpenChange={onOpenChange}>
      <DrawerContent className="mx-auto max-h-[88dvh] max-w-4xl" dir="rtl">
        <div className="flex flex-wrap items-center justify-between gap-2 border-b border-border/70 px-5 py-3.5">
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
          <div className="flex items-center gap-2">
            {items.length > 0 && (
              <>
                <Button
                  variant="outline"
                  size="sm"
                  onClick={handleCopySummary}
                  className="gap-1.5 text-xs font-bold cursor-pointer"
                >
                  {copiedSummary ? (
                    <Check className="h-3.5 w-3.5 text-primary" />
                  ) : (
                    <Copy className="h-3.5 w-3.5" />
                  )}
                  <span>{copiedSummary ? "کپی شد" : "کپی خلاصه مقایسه"}</span>
                </Button>
                <Button variant="ghost" size="sm" onClick={onClear} className="gap-1.5 text-xs text-muted-foreground cursor-pointer">
                  <Trash2 className="h-3.5 w-3.5" />
                  پاک‌کردن همه
                </Button>
              </>
            )}
            <Button
              variant="outline"
              size="icon"
              className="h-8 w-8"
              onClick={() => onOpenChange(false)}
              aria-label="بستن مقایسه"
            >
              <X className="h-4 w-4" />
            </Button>
          </div>
        </div>

        <div className="overflow-auto p-5">
          {items.length === 0 ? (
            <div className="py-10 text-center space-y-1.5">
              <div className="text-sm font-bold text-foreground">
                هنوز بسته‌ای برای مقایسه انتخاب نشده است
              </div>
              <p className="text-xs leading-6 text-muted-foreground">
                روی دکمه‌ی «مقایسه» در کارت هر بسته بزنید (حداکثر ۳ بسته) تا قیمت، حجم، مدت و کد دستوری آن‌ها را کنار هم ببینید.
              </p>
            </div>
          ) : (
            <div className="overflow-x-auto rail">
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
          )}
        </div>
      </DrawerContent>
    </Drawer>
  );
}
