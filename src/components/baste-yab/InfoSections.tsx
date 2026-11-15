"use client";

import { useState } from "react";
import {
  AlertCircle,
  ArrowUpLeft,
  Check,
  Clock,
  Copy,
  ExternalLink,
  RefreshCw,
  Terminal,
} from "lucide-react";

import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from "@/components/ui/tooltip";
import { useToast } from "@/hooks/use-toast";
import {
  ENTRIES,
  APTEL_PORTAL_PAGE,
  faDate,
  faDigits,
  faRelativeAge,
  fmtToman,
  type UpdateMode,
} from "@/lib/providers";

const MODE_LABEL: Record<UpdateMode, string> = {
  auto: "خودکار روزانه",
  hybrid: "ترکیبی (بخشی خودکار + بخشی دستی از ایران)",
  manual: "نیازمند بروزرسانی دستی از ایران",
};

export function OperatorNoticesSection({
  entries,
}: {
  entries: (typeof ENTRIES)[number][];
}) {
  const aptelEntry = entries.find((e) => e.key === "aptel" && e.personalized?.applies);
  const mciEntry = entries.find((e) => e.key === "mci");
  const irancellEntry = entries.find((e) => e.key === "irancell");

  if (!aptelEntry && !mciEntry && !irancellEntry) return null;

  return (
    <section id="notices" aria-label="نکات و هشدارهای اپراتورها" className="mt-8 space-y-3">
      <div className="flex flex-wrap items-baseline justify-between gap-2">
        <h2 className="text-sm font-bold text-foreground">نکات مهم اپراتورها</h2>
        <span className="text-xs text-muted-foreground">
          شرایط خاص قیمت‌گذاری و محدودیت‌های هر ارائه‌دهنده
        </span>
      </div>

      <div className="grid gap-3 md:grid-cols-2">
        {aptelEntry && (
          <div className="md:col-span-2 rounded-xl border border-amber-500/35 bg-amber-500/[0.04] p-4">
            <div className="flex flex-wrap items-center justify-between gap-2">
              <div className="flex items-center gap-2">
                <AlertCircle className="h-4 w-4 shrink-0 text-amber-600 dark:text-amber-400" />
                <h3 className="text-[13.5px] font-bold text-foreground">
                  {aptelEntry.nameFa} — بسته‌های اختصاصی «آپتل من» در فهرست است (ارزان‌تر با ورود به حساب)
                </h3>
              </div>
              <a
                href={APTEL_PORTAL_PAGE}
                target="_blank"
                rel="noreferrer"
                className="inline-flex items-center gap-1 text-xs font-bold text-primary hover:underline"
              >
                <span>مشاهده قیمت‌ها با ورود به پنل</span>
                <ExternalLink className="h-3.5 w-3.5" />
              </a>
            </div>

            <p className="mt-1.5 text-xs leading-6 text-muted-foreground">
              {aptelEntry.personalized!.note}
            </p>

            <div className="mt-3 flex flex-wrap gap-x-5 gap-y-1.5 border-t border-amber-500/20 pt-2.5 text-xs">
              {aptelEntry.personalized!.samples.map((s) => (
                <div key={s.title} className="inline-flex items-center gap-1.5">
                  <span className="font-medium text-foreground">{s.title}:</span>
                  {s.price === 0 ? (
                    <span className="font-bold text-primary">رایگان</span>
                  ) : (
                    <span className="fa-num font-bold text-foreground">
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

            {aptelEntry.personalized!.source && (
              <div className="mt-2 text-[10.5px] text-muted-foreground/80">
                {aptelEntry.personalized!.source}
              </div>
            )}
          </div>
        )}

        {mciEntry && (
          <div className="rounded-xl border border-border bg-card p-4 text-xs leading-6">
            <div className="flex items-center gap-2 font-bold text-foreground">
              <span className="h-2 w-2 rounded-full" style={{ backgroundColor: mciEntry.accent }} />
              <span>همراه اول — فروشگاه رسمی + اپ همراه من</span>
            </div>
            <p className="mt-1.5 text-muted-foreground">
              بسته‌های سیم‌کارت <strong className="text-foreground">انارستان</strong> فقط برای
              ترافیک <strong className="text-foreground">اینترنت داخلی</strong> هستند و با برچسب
              «فقط اینترنت داخلی» مشخص شده‌اند. کاتالوگ این اپراتور از دو منبع ادغام می‌شود:
              فروشگاه رسمی <span className="font-mono">shop.mci.ir</span> و پنل/اپلیکیشن{" "}
              <strong className="text-foreground">همراه من</strong> (my.mci.ir). برخی بسته‌ها —
              روبیکا، نامحدود با سقف مصرف منصفانه، آی‌نو، پنجره‌ی ۶ تا ۱۲، بلندمدت و «همه‌چیز
              تمام» — <strong className="text-foreground">فقط از اپ همراه من (my.mci.ir)
              قابل خریدند</strong> و در فروشگاه آنلاین نیستند؛ این بسته‌ها با برچسب «فروش فقط
              از اپ همراه من / my.mci.ir» مشخص شده‌اند و دکمه‌ی خریدشان مستقیم به my.mci.ir می‌رود
              (توجه کنید برخی از این بسته‌های اختصاصی اپ ممکن است برای همه مشترکان در دسترس نباشند).
            </p>
          </div>
        )}

        {irancellEntry && (
          <div className="rounded-xl border border-border bg-card p-4 text-xs leading-6">
            <div className="flex items-center gap-2 font-bold text-foreground">
              <span
                className="h-2 w-2 rounded-full"
                style={{ backgroundColor: irancellEntry.accent }}
              />
              <span>ایرانسل — وب‌سایت + اپلیکیشن ایرانسل من</span>
            </div>
            <p className="mt-1.5 text-muted-foreground">
              کاتالوگ این اپراتور از دو منبع ادغام می‌شود: وب‌سایت{" "}
              <span className="font-mono">irancell.ir</span> و اپلیکیشن{" "}
              <strong className="text-foreground">ایرانسل من</strong> (my.irancell.ir).
              برخی بسته‌ها — پنجره‌های تخفیف‌دار شبانه (۲ تا ۷ صبح) و صبحانه (۶ صبح تا
              ۱۲ ظهر)، اندازه‌های کوتاه‌مدت، بسته‌های ساعتی، فوتبالی پلاس و جونیور —{" "}
              <strong className="text-foreground">فقط از اپ ایرانسل من (my.irancell.ir)
              قابل خریدند</strong> و در فروشگاه آنلاین نیستند؛ این بسته‌ها با برچسب «فروش
              فقط از اپ ایرانسل من / my.irancell.ir» مشخص شده‌اند و دکمه‌ی خریدشان مستقیم
              به my.irancell.ir می‌رود (توجه کنید برخی از این بسته‌های اختصاصی اپ ممکن است
              برای همه مشترکان در دسترس نباشند). برای برخی اندازه‌ها قیمتِ اپ از وب‌سایت کمتر
              است (توضیح کارت را ببینید). برخی بسته‌ها هم فقط از وب‌سایت قابل خریدند و طرح‌های
              «تعرفه آزاد» و «اشتراک هر گیگ» به‌دلیل نداشتن حجم ثابت از رتبه‌بندی کنار
              گذاشته شده‌اند.
            </p>
          </div>
        )}
      </div>
    </section>
  );
}

export function ProviderSourcesSection({ mounted }: { mounted: boolean }) {
  const { toast } = useToast();
  const [copiedCmd, setCopiedCmd] = useState<string | null>(null);

  const copyCommand = async (id: string, cmd: string) => {
    try {
      await navigator.clipboard.writeText(cmd);
      setCopiedCmd(id);
      toast({
        title: "دستور کپی شد",
        description: cmd,
      });
      setTimeout(() => setCopiedCmd((prev) => (prev === id ? null : prev)), 1800);
    } catch {
      toast({ title: "کپی انجام نشد", description: cmd });
    }
  };

  const iranBatchCmd = "npm run update:iran";

  return (
    <div className="space-y-6">
      {/* Header + Quick manual update bar */}
      <div className="flex flex-wrap items-start justify-between gap-4">
        <div>
          <h2 className="text-sm font-bold text-foreground">
            وضعیت بروزرسانی و منابع داده‌ی اپراتورها
          </h2>
          <p className="mt-1 text-xs leading-6 text-muted-foreground">
            <strong className="text-foreground">سامانتل</strong> و{" "}
            <strong className="text-foreground">آپتل</strong> هر روز حدود ساعت ۰۶:۴۷ به‌وقت تهران
            به‌طور <strong className="text-primary">خودکار</strong> از GitHub Actions بروزرسانی
            می‌شوند. <strong className="text-foreground">ایرانسل</strong>،{" "}
            <strong className="text-foreground">رایتل (همراه و مودم)</strong> و{" "}
            <strong className="text-foreground">فروشگاه همراه اول</strong> به‌دلیل مسدودبودن از
            خارج ایران، نیازمند <strong className="text-amber-600 dark:text-amber-400">بروزرسانی دستی از داخل ایران</strong> هستند.
          </p>
        </div>
      </div>

      {/* One-command manual refresh helper */}
      <div className="rounded-xl border border-border bg-card p-4">
        <div className="flex flex-wrap items-center justify-between gap-2">
          <div className="flex items-center gap-2 text-xs font-bold text-foreground">
            <Terminal className="h-4 w-4 text-primary" />
            <span>بروزرسانی آسان اپراتورهای داخل ایران (از روی سیستم شخصی در ایران)</span>
          </div>
          <a
            href="https://github.com/M-Zoghi/baste-yab/blob/main/DATA.md"
            target="_blank"
            rel="noreferrer"
            className="inline-flex items-center gap-1 text-xs font-bold text-primary hover:underline"
          >
            <span>راهنمای کامل + HAR (DATA.md)</span>
            <ArrowUpLeft className="h-3.5 w-3.5" />
          </a>
        </div>
        <p className="mt-1.5 text-xs leading-6 text-muted-foreground">
          داخل پوشه‌ی پروژه (پیشنهاد: کلون‌شده با{" "}
          <code dir="ltr" className="font-mono text-foreground">git clone</code> نه فایل ZIP) این
          دستور را اجرا کنید تا{" "}
          <strong className="text-foreground">فروشگاه همراه اول</strong>،{" "}
          <strong className="text-foreground">ایرانسل</strong> و{" "}
          <strong className="text-foreground">رایتل (همراه و مودم)</strong> مستقیماً تازه شوند،
          سپس فایل‌های تغییریافته‌ی{" "}
          <code dir="ltr" className="font-mono text-foreground">src/data/providers/</code>{" "}
          را push یا در گیت‌هاب آپلود کنید.
        </p>
        <div className="mt-3 flex flex-wrap items-center gap-2">
          <code
            dir="ltr"
            className="flex-1 min-w-[240px] overflow-x-auto rounded-lg border border-border bg-muted/60 px-3 py-2 font-mono text-xs text-foreground"
          >
            {iranBatchCmd}
          </code>
          <button
            type="button"
            onClick={() => copyCommand("iran-batch", iranBatchCmd)}
            className="inline-flex h-9 items-center gap-1.5 rounded-lg bg-primary px-3.5 text-xs font-bold text-primary-foreground transition-colors hover:bg-primary/90 cursor-pointer whitespace-nowrap shrink-0"
          >
            {copiedCmd === "iran-batch" ? (
              <Check className="h-3.5 w-3.5" />
            ) : (
              <Copy className="h-3.5 w-3.5" />
            )}
            <span>{copiedCmd === "iran-batch" ? "کپی شد" : "کپی دستور"}</span>
          </button>
        </div>
      </div>

      {/* Per-operator status & last update grid */}
      <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
        {ENTRIES.filter((e) => e.status === "live").map((e) => {
          const fetchedAt = e.doc?.source.fetchedAt ?? "";
          const age = mounted && fetchedAt ? faRelativeAge(fetchedAt) : null;
          const cmdKey = e.key === "rightel-tdlte" ? "rightel" : e.key;
          const singleCmd = `node update/fetch-providers.mjs --only ${cmdKey}`;

          return (
            <div
              key={e.key}
              className="flex min-w-0 flex-col rounded-xl border border-border/80 bg-card p-4 text-xs leading-5"
            >
              <div className="flex items-center justify-between gap-2">
                <div className="flex items-center gap-2">
                  <span
                    className="h-2.5 w-2.5 shrink-0 rounded-full"
                    style={{ backgroundColor: e.accent }}
                  />
                  <span className="text-[13px] font-bold text-foreground">{e.nameFa}</span>
                </div>
                <span
                  className={`inline-flex items-center gap-1 rounded-md px-2 py-0.5 text-[10.5px] font-bold ${
                    e.updateMode === "auto"
                      ? "bg-primary/10 text-primary"
                      : e.updateMode === "hybrid"
                        ? "bg-sky-500/12 text-sky-700 dark:text-sky-300"
                        : "bg-amber-500/12 text-amber-700 dark:text-amber-300"
                  }`}
                >
                  <RefreshCw className="h-3 w-3" />
                  <span>
                    {e.updateMode === "auto"
                      ? "خودکار روزانه"
                      : e.updateMode === "hybrid"
                        ? "ترکیبی (دستی + خودکار)"
                        : "دستی از ایران"}
                  </span>
                </span>
              </div>

              <div className="fa-num mt-2 text-foreground/90">
                آخرین بروزرسانی:{" "}
                <span className="font-bold">{fetchedAt ? faDate(fetchedAt) : "—"}</span>
                {age && <span className="ms-1 text-muted-foreground">({age})</span>}
              </div>

              <div className="fa-num mt-1 text-[11px] text-muted-foreground">
                {faDigits(e.doc?.packages.length ?? 0)} بسته · {e.tech}
              </div>

              <p className="mt-1.5 text-[11px] text-muted-foreground">{MODE_LABEL[e.updateMode]}</p>

              <div className="mt-auto pt-3">
                <div className="flex items-center justify-between gap-2 border-t border-border/50 pt-2.5">
                  <span
                    className="truncate font-mono text-[10.5px] text-muted-foreground/80"
                    dir="ltr"
                  >
                    {e.doc?.source.endpoint}
                  </span>
                  {e.updateMode !== "auto" && (
                    <button
                      type="button"
                      onClick={() => copyCommand(e.key, singleCmd)}
                      title={`کپی: ${singleCmd}`}
                      className="inline-flex shrink-0 items-center gap-1 rounded-md border border-border px-2 py-1 text-[10.5px] font-bold text-foreground hover:bg-secondary cursor-pointer"
                    >
                      {copiedCmd === e.key ? (
                        <Check className="h-3 w-3 text-primary" />
                      ) : (
                        <Copy className="h-3 w-3 text-muted-foreground" />
                      )}
                      <span>کپی دستور</span>
                    </button>
                  )}
                </div>
              </div>
            </div>
          );
        })}
      </div>
    </div>
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
        href="https://github.com/M-Zoghi/baste-yab/blob/main/DATA.md"
        target="_blank"
        rel="noreferrer"
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
      <span className="font-bold text-foreground/80">در انتظار داده (دستی از ایران):</span>
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
        href="https://github.com/M-Zoghi/baste-yab/blob/main/DATA.md"
        target="_blank"
        rel="noreferrer"
        className="ms-auto inline-flex items-center gap-1 font-bold text-primary hover:underline whitespace-nowrap"
      >
        <span>چطور کمک کنیم؟</span>
        <ArrowUpLeft className="h-3.5 w-3.5" />
      </a>
    </div>
  );
}
