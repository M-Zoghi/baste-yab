"use client";

import { AlertCircle, ArrowUpLeft, Clock, ExternalLink } from "lucide-react";

import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from "@/components/ui/tooltip";
import { ENTRIES, faDigits, fmtToman } from "@/lib/providers";

export function PersonalizedNotice({ entry }: { entry: (typeof ENTRIES)[number] }) {
  const p = entry.personalized!;
  return (
    <section className="mt-4">
      <div className="rounded-xl border border-amber-500/35 bg-amber-500/[0.04] p-4">
        <div className="flex flex-wrap items-center justify-between gap-2">
          <div className="flex items-center gap-2">
            <AlertCircle className="h-4 w-4 shrink-0 text-amber-600 dark:text-amber-400" />
            <h2 className="text-[13px] font-bold text-foreground">
              {entry.nameFa} — قیمت‌های این فهرست عمومی است (بدون ورود به حساب)
            </h2>
          </div>
          <a
            href={entry.buyUrl ?? entry.site}
            target="_blank"
            rel="noreferrer"
            className="inline-flex items-center gap-1 text-xs font-bold text-primary hover:underline"
          >
            <span>مشاهده قیمت‌های ویژه با ورود</span>
            <ExternalLink className="h-3.5 w-3.5" />
          </a>
        </div>

        <p className="mt-1.5 text-xs leading-6 text-muted-foreground">{p.note}</p>

        <div className="mt-3 flex flex-wrap gap-x-5 gap-y-1.5 border-t border-amber-500/20 pt-2.5 text-xs">
          {p.samples.map((s) => (
            <div key={s.title} className="inline-flex items-center gap-1.5">
              <span className="font-medium text-foreground">{s.title}:</span>
              {s.price === 0 ? (
                <span className="font-bold text-primary">رایگان</span>
              ) : (
                <span className="fa-num font-bold text-foreground" dir="ltr">
                  {fmtToman(s.price)} ت
                </span>
              )}
              {s.discountPct != null && (
                <span className="fa-num text-[11px] font-bold text-amber-600 dark:text-amber-400">
                  ({faDigits(s.discountPct)}٪ تخفیف)
                </span>
              )}
            </div>
          ))}
        </div>

        {p.source && (
          <div className="mt-2 text-[10.5px] text-muted-foreground/80">{p.source}</div>
        )}
      </div>
    </section>
  );
}

export function AwaitingPanel({
  entries,
  title,
}: {
  entries: (typeof ENTRIES)[number][];
  title: string;
}) {
  return (
    <div className="rounded-xl border border-border bg-card p-6">
      <div className="flex items-start gap-3">
        <span className="grid h-10 w-10 shrink-0 place-items-center rounded-xl bg-muted">
          <Clock className="h-5 w-5 text-muted-foreground" />
        </span>
        <div>
          <h2 className="text-base font-bold text-foreground">
            {title} — هنوز داده‌ای دریافت نشده
          </h2>
          <p className="mt-1 text-[13px] leading-6 text-muted-foreground">
            این ارائه‌دهنده‌ها فعلاً از خارج از ایران قابل استخراج نیستند. اگر داخل ایران هستید،
            با یک ضمیمه‌ی HAR از DevTools می‌توانید داده‌ی زنده‌ی این ارائه‌دهنده‌ها را اضافه کنید.
          </p>
        </div>
      </div>

      <div className="mt-5 grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
        {entries.map((e) => (
          <div key={e.key} className="rounded-lg border border-border/80 bg-background/50 p-4">
            <div className="flex items-center justify-between gap-2">
              <div className="flex items-center gap-2">
                <span className="h-2.5 w-2.5 rounded-full" style={{ backgroundColor: e.accent }} />
                <span className="text-sm font-bold text-foreground">{e.nameFa}</span>
              </div>
              <span className="text-[11px] text-muted-foreground">{e.tech}</span>
            </div>
            <p className="mt-2 text-xs leading-5 text-muted-foreground">{e.awaitingNote}</p>
          </div>
        ))}
      </div>

      <a
        href="DATA.md"
        className="mt-5 inline-flex min-h-[40px] items-center gap-1.5 rounded-lg bg-primary px-4 py-2 text-sm font-bold text-primary-foreground transition-colors hover:bg-primary/90"
      >
        <span>راهنمای جمع‌آوری داده (DATA.md)</span>
        <ArrowUpLeft className="h-4 w-4" />
      </a>
    </div>
  );
}

export function AwaitingStrip({ entries }: { entries: (typeof ENTRIES)[number][] }) {
  return (
    <div className="mt-5 flex flex-wrap items-center gap-x-4 gap-y-2 rounded-xl border border-border/80 bg-card/70 px-4 py-3 text-xs text-muted-foreground">
      <span className="font-bold text-foreground/80">در انتظار داده:</span>
      <div className="flex flex-wrap items-center gap-x-3 gap-y-1">
        {entries.map((e, idx) => (
          <TooltipProvider key={e.key}>
            <Tooltip>
              <TooltipTrigger asChild>
                <span className="inline-flex cursor-help items-center gap-1.5 font-medium text-muted-foreground hover:text-foreground">
                  <span className="h-2 w-2 rounded-full" style={{ backgroundColor: e.accent }} />
                  <span>{e.nameFa}</span>
                  {idx < entries.length - 1 && (
                    <span aria-hidden="true" className="ms-1.5 text-border">·</span>
                  )}
                </span>
              </TooltipTrigger>
              <TooltipContent side="top" className="max-w-56 text-right">
                <div className="font-bold">{e.nameFa}</div>
                <div className="text-xs opacity-85">{e.awaitingNote}</div>
              </TooltipContent>
            </Tooltip>
          </TooltipProvider>
        ))}
      </div>
      <a
        href="DATA.md"
        className="ms-auto inline-flex items-center gap-1 font-bold text-primary hover:underline whitespace-nowrap"
      >
        <span>چطور کمک کنیم؟</span>
        <ArrowUpLeft className="h-3.5 w-3.5" />
      </a>
    </div>
  );
}
