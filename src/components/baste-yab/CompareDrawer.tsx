"use client";

import { ExternalLink, Trash2, X } from "lucide-react";

import { Button } from "@/components/ui/button";
import {
  Drawer,
  DrawerContent,
  DrawerDescription,
  DrawerTitle,
} from "@/components/ui/drawer";
import {
  VAT_RATE,
  faDigits,
  fmtGB,
  fmtToman,
  fmtValue,
  type Row,
} from "@/lib/providers";
import { KIND_LABEL } from "./helpers";

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
  const f = vat ? 1 + VAT_RATE : 1;
  const paidPerGB = items.filter((i) => !i.isFree).map((i) => i.perGB * f);
  const bestPerGB = paidPerGB.length ? Math.min(...paidPerGB) : null;
  const maxGB = items.length ? Math.max(...items.map((i) => i.gb)) : 0;
  const maxDays = items.length ? Math.max(...items.map((i) => i.days)) : 0;

  return (
    <Drawer open={open} onOpenChange={onOpenChange}>
      <DrawerContent className="mx-auto max-h-[88dvh] max-w-4xl" dir="rtl">
        <div className="flex items-center justify-between border-b border-border/70 px-5 py-3.5">
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
              <Button variant="ghost" size="sm" onClick={onClear} className="gap-1.5 text-xs text-muted-foreground">
                <Trash2 className="h-3.5 w-3.5" />
                پاک‌کردن همه
              </Button>
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
            <div className="py-10 text-center text-sm text-muted-foreground">
              هنوز بسته‌ای برای مقایسه انتخاب نشده است.
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
                        {item.portalOnly ? ` · ${item.portalLabel ?? "فروش فقط از اپ اپراتور"}` : ""}
                        {item.discountPct != null ? ` · ${faDigits(item.discountPct)}٪ تخفیف` : ""}
                      </td>
                    ))}
                  </tr>
                  <tr>
                    <td className="py-3 ps-2 pe-4 text-xs font-bold text-muted-foreground">کد دستوری</td>
                    {items.map((item) => (
                      <td key={`${item.entryKey}:${item.id}`} className="py-3 px-3 font-mono text-xs" dir="ltr">
                        {item.ussd ?? "—"}
                      </td>
                    ))}
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
