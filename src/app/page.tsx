"use client";

import { useMemo, useState } from "react";
import { AnimatePresence, motion } from "framer-motion";
import {
  BadgePercent,
  Database,
  ExternalLink,
  Filter,
  Home,
  Info,
  Moon,
  Percent,
  RotateCcw,
  Search,
  Smartphone,
  Sun,
} from "lucide-react";
import { useTheme } from "next-themes";

import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Separator } from "@/components/ui/separator";
import { Slider } from "@/components/ui/slider";
import { Switch } from "@/components/ui/switch";
import { Tabs, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from "@/components/ui/tooltip";
import {
  Drawer,
  DrawerContent,
  DrawerDescription,
  DrawerTitle,
  DrawerTrigger,
} from "@/components/ui/drawer";

import {
  ENTRIES,
  VAT_RATE,
  allPackages,
  faDate,
  faDigits,
  fmtGB,
  fmtToman,
  fmtValue,
  rankRows,
  type Category,
  type Kind,
  type Metric,
  type Row,
  type SortKey,
} from "@/lib/providers";

const norm = (s: string) =>
  String(s)
    .replace(/[۰-۹]/g, (d) => String("۰۱۲۳۴۵۶۷۸۹".indexOf(d)))
    .replace(/[٠-٩]/g, (d) => String("٠١٢٣٤٥٦٧٨٩".indexOf(d)))
    .replace(/[\u200c,\s٬]/g, "")
    .toLowerCase();

const valueColor = (t: number, dark: boolean) =>
  `hsl(${Math.round(140 * (1 - t))},72%,${dark ? 52 : 40}%)`;

/* roaming is hidden by default — its tariffs are not comparable with domestic packs */
const DEFAULT_KINDS: Kind[] = ["internet", "combo"];
const KIND_LABEL: Record<Kind, string> = {
  internet: "اینترنت خالص",
  combo: "ترکیبی",
  roaming: "رومینگ",
};
const liveKeysOf = (c: Category) =>
  ENTRIES.filter((e) => e.category === c && e.status === "live").map((e) => e.key);

export default function Page() {
  const { theme, setTheme } = useTheme();
  const dark = theme !== "light";

  const [cat, setCat] = useState<Category>("mobile");
  const [metric, setMetric] = useState<Metric>("pergb");
  const [vat, setVat] = useState(false);
  const [sort, setSort] = useState<SortKey>("best");
  const [query, setQuery] = useState("");
  const [provSel, setProvSel] = useState<Set<string>>(new Set(liveKeysOf("mobile")));
  const [kinds, setKinds] = useState<Set<Kind>>(new Set(DEFAULT_KINDS));
  const [maxPrice, setMaxPrice] = useState<number | null>(null); // null = همه
  const [minGB, setMinGB] = useState<number>(0);
  const [onlyDisc, setOnlyDisc] = useState(false);
  const [hideFree, setHideFree] = useState(false);
  const [open, setOpen] = useState(false); // drawer

  const liveEntries = useMemo(
    () => ENTRIES.filter((e) => e.category === cat && e.status === "live"),
    [cat],
  );
  const awaitingEntries = useMemo(
    () => ENTRIES.filter((e) => e.category === cat && e.status === "awaiting"),
    [cat],
  );
  const allLive = useMemo(() => allPackages(), []);
  const countByCat = useMemo(() => {
    const m: Record<Category, number> = { home: 0, mobile: 0 };
    for (const p of allLive) {
      const c = ENTRIES.find((e) => e.key === p.entryKey)?.category;
      if (c) m[c] += 1;
    }
    return m;
  }, [allLive]);
  const inCat = useMemo(
    () => allLive.filter((p) => ENTRIES.find((e) => e.key === p.entryKey)?.category === cat),
    [allLive, cat],
  );

  const priceCap = useMemo(() => {
    const list = inCat.filter((p) => kinds.has(p.kind));
    if (!list.length) return 0;
    return Math.ceil(Math.max(...list.map((p) => p.price)) / 500000) * 500000;
  }, [inCat, kinds]);
  const gbCap = useMemo(() => {
    const list = inCat.filter((p) => kinds.has(p.kind));
    if (!list.length) return 0;
    return Math.ceil(Math.max(...list.map((p) => p.gb)));
  }, [inCat, kinds]);

  const kindCounts = useMemo(() => {
    const m: Record<Kind, number> = { internet: 0, combo: 0, roaming: 0 };
    for (const p of inCat) if (provSel.has(p.entryKey)) m[p.kind] = (m[p.kind] ?? 0) + 1;
    return m;
  }, [inCat, provSel]);

  const filtered = useMemo(() => {
    const q = norm(query);
    let list = inCat.filter((p) => provSel.has(p.entryKey) && kinds.has(p.kind));
    if (q) {
      list = list.filter((p) =>
        [p.title, p.providerName, p.regulatoryCode ?? "", p.group ?? "", p.note ?? ""]
          .some((s) => norm(s).includes(q)),
      );
    }
    if (maxPrice != null) list = list.filter((p) => p.price <= maxPrice);
    if (minGB > 0) list = list.filter((p) => p.gb >= minGB);
    if (onlyDisc) list = list.filter((p) => p.discountPct != null);
    if (hideFree) list = list.filter((p) => p.price > 0);
    return list;
  }, [inCat, provSel, kinds, query, maxPrice, minGB, onlyDisc, hideFree]);

  const rows = useMemo(
    () => rankRows(filtered, { metric, vat, sort }),
    [filtered, metric, vat, sort],
  );

  const bestPaid = rows.find((r) => r.price > 0) ?? null;
  const freeTop = rows.length > 0 && rows[0].isFree ? rows[0] : null;
  const lastFetch = useMemo(() => {
    const dates = allLive.map((p) => p.fetchedAt).sort();
    return dates.length ? faDate(dates[dates.length - 1]) : "—";
  }, [allLive]);

  const activeFilters =
    (query ? 1 : 0) +
    (maxPrice != null ? 1 : 0) +
    (minGB > 0 ? 1 : 0) +
    (onlyDisc ? 1 : 0) +
    (hideFree ? 1 : 0) +
    (provSel.size !== liveEntries.length ? 1 : 0) +
    (sort !== "best" ? 1 : 0) +
    (kinds.size !== DEFAULT_KINDS.length || DEFAULT_KINDS.some((k) => !kinds.has(k)) ? 1 : 0);

  const reset = () => {
    setQuery("");
    setMaxPrice(null);
    setMinGB(0);
    setOnlyDisc(false);
    setHideFree(false);
    setProvSel(new Set(liveEntries.map((e) => e.key)));
    setKinds(new Set(DEFAULT_KINDS));
    setSort("best");
  };

  const switchCat = (c: Category) => {
    setCat(c);
    setProvSel(new Set(ENTRIES.filter((e) => e.category === c && e.status === "live").map((e) => e.key)));
    setMaxPrice(null);
    setMinGB(0);
  };

  const chip = (e: (typeof ENTRIES)[number]) => {
    const on = provSel.has(e.key);
    return (
      <button
        key={e.key}
        type="button"
        onClick={() =>
          setProvSel((prev) => {
            const n = new Set(prev);
            if (n.has(e.key)) n.delete(e.key);
            else n.add(e.key);
            return n;
          })
        }
        className={`inline-flex items-center gap-1.5 rounded-full border px-3 py-1.5 text-[13px] font-bold transition-colors min-h-[36px] ${
          on
            ? "border-transparent text-white"
            : "border-border bg-card text-muted-foreground hover:bg-secondary"
        }`}
        style={on ? { background: e.accent } : undefined}
        aria-pressed={on}
      >
        <span
          className="h-2 w-2 rounded-full"
          style={{ background: on ? "rgba(255,255,255,.85)" : e.accent }}
        />
        {e.nameFa}
      </button>
    );
  };

  /* ── shared filter panel (drawer on mobile, inline card on ≥md) ── */
  const FilterPanel = (
    <div className="space-y-5">
      <div>
        <div className="mb-2 text-xs font-bold text-muted-foreground">ارائه‌دهنده‌ها</div>
        <div className="flex flex-wrap gap-2">
          {liveEntries.map(chip)}
          {awaitingEntries.map((e) => (
            <TooltipProvider key={e.key}>
              <Tooltip>
                <TooltipTrigger asChild>
                  <span className="inline-flex cursor-not-allowed items-center gap-1.5 rounded-full border border-dashed border-border px-3 py-1.5 text-[13px] text-muted-foreground/70 min-h-[36px]">
                    <span className="h-2 w-2 rounded-full bg-muted-foreground/30" />
                    {e.nameFa}
                  </span>
                </TooltipTrigger>
                <TooltipContent side="top" className="max-w-56 text-right">
                  <div className="font-bold">{e.nameFa} — در انتظار داده</div>
                  <div className="text-xs opacity-80">{e.awaitingNote}</div>
                </TooltipContent>
              </Tooltip>
            </TooltipProvider>
          ))}
        </div>
      </div>

      <div>
        <div className="mb-2 text-xs font-bold text-muted-foreground">نوع بسته</div>
        <div className="flex flex-wrap items-center gap-2">
          {(["internet", "combo", "roaming"] as Kind[]).map((k) => {
            const on = kinds.has(k);
            return (
              <button
                key={k}
                type="button"
                onClick={() =>
                  setKinds((prev) => {
                    const n = new Set(prev);
                    if (n.has(k)) n.delete(k);
                    else n.add(k);
                    return n;
                  })
                }
                className={`inline-flex items-center gap-1.5 rounded-full border px-3 py-1.5 text-[13px] font-bold transition-colors min-h-[36px] ${
                  on
                    ? "border-primary/50 bg-primary/10 text-primary"
                    : "border-border bg-card text-muted-foreground hover:bg-secondary"
                }`}
                aria-pressed={on}
              >
                {KIND_LABEL[k]}
                <span
                  className={`rounded-full px-1.5 text-[10px] font-black ${
                    on ? "bg-primary/15" : "bg-secondary"
                  }`}
                >
                  {faDigits(kindCounts[k] ?? 0)}
                </span>
              </button>
            );
          })}
          <span className="text-[10.5px] leading-4 text-muted-foreground/80">
            رومینگ به‌طور پیش‌فرض کنار است — تعرفه‌ی آن با بسته‌های داخلی قابل مقایسه نیست.
          </span>
        </div>
      </div>

      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
        <div>
          <div className="mb-2 text-xs font-bold text-muted-foreground">مرتب‌سازی</div>
          <Select value={sort} onValueChange={(v) => setSort(v as SortKey)}>
            <SelectTrigger className="w-full min-h-[44px]" dir="rtl">
              <SelectValue />
            </SelectTrigger>
            <SelectContent dir="rtl">
              <SelectItem value="best">بهترین ارزش (معیار فعال)</SelectItem>
              <SelectItem value="price">کمترین قیمت</SelectItem>
              <SelectItem value="gb">بیشترین حجم</SelectItem>
              <SelectItem value="days">بیشترین مدت</SelectItem>
            </SelectContent>
          </Select>
        </div>
        <div>
          <div className="mb-2 text-xs font-bold text-muted-foreground">جست‌وجو</div>
          <div className="relative">
            <Search className="absolute start-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
            <Input
              value={query}
              onChange={(e) => setQuery(e.target.value)}
              placeholder="نام بسته، ارائه‌دهنده، کد رگولاتوری…"
              className="ps-9 min-h-[44px] bg-card"
            />
          </div>
        </div>
      </div>

      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
        <Card className="p-4 bg-card/60">
          <div className="mb-3 flex items-baseline justify-between">
            <span className="text-xs font-bold text-muted-foreground">حداکثر قیمت</span>
            <span className="text-sm font-extrabold text-primary">
              {maxPrice == null ? "همه" : `تا ${fmtToman(maxPrice)}`}
            </span>
          </div>
          <Slider
            min={0}
            max={priceCap || 1}
            step={50000}
            value={[maxPrice == null ? priceCap : maxPrice]}
            onValueChange={([v]) => setMaxPrice(v >= priceCap ? null : v)}
            dir="ltr"
          />
          <div className="mt-1 flex justify-between text-[10px] text-muted-foreground" dir="ltr">
            <span>۰</span>
            <span>{fmtToman(priceCap)}</span>
          </div>
        </Card>
        <Card className="p-4 bg-card/60">
          <div className="mb-3 flex items-baseline justify-between">
            <span className="text-xs font-bold text-muted-foreground">حداقل حجم</span>
            <span className="text-sm font-extrabold text-primary">
              {minGB === 0 ? "همه" : `از ${faDigits(minGB)} گیگ`}
            </span>
          </div>
          <Slider
            min={0}
            max={gbCap || 1}
            step={1}
            value={[minGB]}
            onValueChange={([v]) => setMinGB(v)}
            dir="ltr"
          />
          <div className="mt-1 flex justify-between text-[10px] text-muted-foreground" dir="ltr">
            <span>۰</span>
            <span>{faDigits(gbCap)} گیگ</span>
          </div>
        </Card>
      </div>

      <div className="flex flex-wrap items-center gap-x-6 gap-y-3">
        <label className="flex cursor-pointer items-center gap-2.5 text-sm font-bold">
          <Switch checked={onlyDisc} onCheckedChange={setOnlyDisc} />
          فقط تخفیف‌دارها
        </label>
        <label className="flex cursor-pointer items-center gap-2.5 text-sm font-bold">
          <Switch checked={hideFree} onCheckedChange={setHideFree} />
          پنهان‌کردن هدایای رایگان
        </label>
        {activeFilters > 0 && (
          <Button variant="ghost" size="sm" onClick={reset} className="gap-1.5 text-muted-foreground">
            <RotateCcw className="h-3.5 w-3.5" />
            بازنشانی فیلترها
          </Button>
        )}
      </div>
    </div>
  );

  return (
    <div className="min-h-dvh flex flex-col">
      {/* ── header ── */}
      <header className="sticky top-0 z-40 border-b border-border/70 bg-background/85 backdrop-blur-md">
        <div className="mx-auto w-full max-w-6xl px-4">
          <div className="flex h-16 items-center gap-3">
            <div className="flex items-center gap-2.5">
              <span className="grid h-9 w-9 place-items-center rounded-2xl bg-primary text-primary-foreground text-lg font-black">
                ب
              </span>
              <div className="leading-tight">
                <div className="text-[15px] font-black">بسته‌یاب</div>
                <div className="text-[10.5px] text-muted-foreground">
                  مقایسه زنده بسته‌ها · تومان بر گیگ
                </div>
              </div>
            </div>

            <div className="ms-auto flex items-center gap-1.5">
              <TooltipProvider>
                <Tooltip>
                  <TooltipTrigger asChild>
                    <button
                      type="button"
                      onClick={() => setMetric(metric === "pergb" ? "pergbday" : "pergb")}
                      className="h-9 rounded-xl border border-border bg-card px-3 text-[12.5px] font-black"
                      aria-label="تغییر معیار"
                    >
                      {metric === "pergb" ? "ت/گیگ" : "ت/گیگ×روز"}
                    </button>
                  </TooltipTrigger>
                  <TooltipContent side="bottom">
                    معیار ارزش: {metric === "pergb" ? "تومان بر گیگابایت" : "تومان بر گیگابایت×روز"}
                  </TooltipContent>
                </Tooltip>
              </TooltipProvider>
              <TooltipProvider>
                <Tooltip>
                  <TooltipTrigger asChild>
                    <button
                      type="button"
                      onClick={() => setVat(!vat)}
                      aria-pressed={vat}
                      className={`flex h-9 items-center gap-1.5 rounded-xl border px-3 text-[12.5px] font-black transition-colors ${
                        vat
                          ? "border-transparent bg-amber-500 text-black"
                          : "border-border bg-card text-muted-foreground"
                      }`}
                    >
                      <Percent className="h-3.5 w-3.5" />
                      مالیات {vat ? "+۱۰٪" : "بدون"}
                    </button>
                  </TooltipTrigger>
                  <TooltipContent side="bottom" className="max-w-64">
                    قیمت‌های کارت‌ها بدون مالیات است؛ درگاه پرداخت ۱۰٪ مالیات بر ارزش افزوده اضافه
                    می‌کند. با این کلید همه ارقام ×۱٫۱ می‌شود (رتبه‌ها تغییری نمی‌کنند).
                  </TooltipContent>
                </Tooltip>
              </TooltipProvider>
              <Button
                variant="outline"
                size="icon"
                className="h-9 w-9"
                onClick={() => setTheme(dark ? "light" : "dark")}
                aria-label="تغییر پوسته"
              >
                {dark ? <Sun className="h-4 w-4" /> : <Moon className="h-4 w-4" />}
              </Button>
            </div>
          </div>

          {/* category tabs */}
          <div className="pb-3">
            <Tabs value={cat} onValueChange={(v) => switchCat(v as Category)}>
              <TabsList className="grid w-full max-w-sm grid-cols-2 h-11">
                <TabsTrigger value="home" className="gap-1.5 text-[13px]">
                  <Home className="h-3.5 w-3.5" />
                  اینترنت ثابت
                  <Badge variant="secondary" className="ms-1 px-1.5 text-[10px] font-black">
                    {faDigits(countByCat.home)}
                  </Badge>
                </TabsTrigger>
                <TabsTrigger value="mobile" className="gap-1.5 text-[13px]">
                  <Smartphone className="h-3.5 w-3.5" />
                  اینترنت همراه
                  <Badge variant="secondary" className="ms-1 px-1.5 text-[10px] font-black">
                    {faDigits(countByCat.mobile)}
                  </Badge>
                </TabsTrigger>
              </TabsList>
            </Tabs>
          </div>
        </div>
      </header>

      <main className="flex-1 mx-auto w-full max-w-6xl px-4 pb-28 md:pb-10">
        {/* summary strip */}
        <section className="mt-4 grid gap-3 sm:grid-cols-2">
          <Card className="relative overflow-hidden p-4 bg-gradient-to-br from-card to-primary/5">
            <div className="text-[11px] font-bold text-muted-foreground">بهترین ارزش فعلی</div>
            {bestPaid ? (
              <>
                <div className="mt-1 text-[15px] font-black leading-6">
                  {bestPaid.providerName} · {bestPaid.title}
                </div>
                <div className="mt-1 flex flex-wrap items-baseline gap-x-2 text-sm">
                  <span className="font-black text-primary" style={{ direction: "ltr" }}>
                    {fmtValue(bestPaid.value)}
                  </span>
                  <span className="text-muted-foreground">
                    {metric === "pergb" ? "تومان بر گیگ" : "تومان بر گیگ×روز"}
                  </span>
                  {bestPaid.discountPct != null && (
                    <Badge className="bg-amber-500 text-black hover:bg-amber-500">
                      {faDigits(bestPaid.discountPct)}٪ تخفیف
                    </Badge>
                  )}
                </div>
                {freeTop && (
                  <div className="mt-2 text-[11px] text-muted-foreground">
                    🎁 صدر رتبه‌بندی: «{freeTop.title}» رایگان است؛ درصدها نسبت به بهترین بسته‌ی
                    پرداختی سنجیده می‌شود.
                  </div>
                )}
              </>
            ) : (
              <div className="mt-2 text-sm text-muted-foreground">
                {rows.length ? "—" : "با فیلترهای فعلی بسته‌ای نیست"}
              </div>
            )}
            <div className="pointer-events-none absolute -end-6 -top-6 text-7xl opacity-10">🥇</div>
          </Card>
          <Card className="p-4">
            <div className="text-[11px] font-bold text-muted-foreground">نمای کلی</div>
            <div className="mt-1 flex flex-wrap gap-x-4 gap-y-1 text-[13px] font-bold">
              <span>{faDigits(rows.length)} بسته در نمایش</span>
              <span className="text-muted-foreground">
                از {faDigits(filtered.length)} بسته‌ی فیلترشده
              </span>
              <span className="flex items-center gap-1 text-muted-foreground">
                <Database className="h-3.5 w-3.5" />
                آخرین داده: {lastFetch}
              </span>
            </div>
            <div className="mt-2 text-[11px] leading-5 text-muted-foreground">
              {vat
                ? "ارقام شامل مالیات بر ارزش افزوده ۱۰٪ است (قیمت قابل پرداخت)."
                : "قیمت‌ها همان اعداد کارت‌هاست؛ مالیات ۱۰٪ درگاه پرداخت با کلید «مالیات» اعمال می‌شود."}
            </div>
          </Card>
        </section>

        {/* personalized-pricing notice — only for providers whose public (logged-out)
            prices differ from what a subscriber sees after login */}
        {liveEntries
          .filter((e) => e.personalized?.applies && provSel.has(e.key))
          .map((e) => (
            <PersonalizedNotice key={e.key} entry={e} />
          ))}

        {/* desktop filter rail */}
        <section className="mt-4 hidden md:block">
          <Card className="p-5">{FilterPanel}</Card>
        </section>

        {/* results */}
        <section className="mt-4">
          {liveEntries.length === 0 ? (
            <AwaitingPanel entries={awaitingEntries} title={cat === "home" ? "بسته‌های اینترنت ثابت" : "بسته‌های اینترنت همراه"} />
          ) : rows.length === 0 ? (
            <Card className="grid place-items-center gap-3 p-10 text-center">
              <div className="text-3xl">🧐</div>
              <div className="text-sm font-bold">با فیلترهای فعلی بسته‌ای پیدا نشد</div>
              <Button onClick={reset} variant="outline" className="gap-1.5">
                <RotateCcw className="h-4 w-4" /> بازنشانی فیلترها
              </Button>
            </Card>
          ) : (
            <>
              <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
                <AnimatePresence initial={false}>
                  {rows.map((r) => (
                    <PkgCard key={`${r.entryKey}:${r.id}`} r={r} dark={dark} metric={metric} vat={vat} />
                  ))}
                </AnimatePresence>
              </div>
              {awaitingEntries.length > 0 && <AwaitingStrip entries={awaitingEntries} />}
            </>
          )}
        </section>
      </main>

      {/* ── footer ── */}
      <footer className="mt-auto border-t border-border/70 bg-card/40 pb-[max(1rem,env(safe-area-inset-bottom))]">
        <div className="mx-auto w-full max-w-6xl px-4 py-6 space-y-4">
          <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
            {ENTRIES.filter((e) => e.status === "live").map((e) => (
              <div key={e.key} className="min-w-0 rounded-xl border border-border/60 bg-card/60 p-3 text-[11px] leading-5">
                <div className="mb-1 flex items-center gap-2">
                  <span className="h-2 w-2 rounded-full" style={{ background: e.accent }} />
                  <span className="font-black">{e.nameFa}</span>
                  <Badge variant="outline" className="ms-auto px-1.5 text-[9.5px]">
                    {e.doc?.source.kind === "api" ? "API زنده" : "ضمیمه‌ی صفحه"}
                  </Badge>
                </div>
                <div className="text-muted-foreground">
                  {faDigits(e.doc?.packages.length ?? 0)} بسته · {e.tech} ·{" "}
                  {faDate(e.doc?.source.fetchedAt ?? "")}
                </div>
                <div className="mt-1 truncate text-muted-foreground/80" dir="ltr">
                  {e.doc?.source.endpoint}
                </div>
              </div>
            ))}
          </div>
          <Separator />
          <p className="text-[11px] leading-6 text-muted-foreground">
            قیمت‌ها همان اعداد درج‌شده روی کارت‌های سایت رسمی هر ارائه‌دهنده است (بدون مالیات)؛
            درگاه پرداخت ۱۰٪ مالیات بر ارزش افزوده اضافه می‌کند — با کلید «مالیات» همه ارقام
            ×۱٫۱ می‌شود. رتبه‌بندی بر اساس تومان بر گیگابایت است؛ هرچه کمتر، بهتر. داده‌ها با
            <span className="font-bold"> update/fetch-providers.mjs </span>
            از سایت هر ارائه‌دهنده تازه می‌شود. بسته‌های بدون حجم داده (صوتی) خارج از
            رتبه‌بندی‌اند. افزودن ارائه‌دهنده‌های جدید: راهنما در
            <a className="font-bold text-primary hover:underline" href="DATA.md">
              {" "}
              DATA.md{" "}
            </a>
            (می‌توانید با یک HAR از صفحه‌ی بسته‌ها کمک کنید).
          </p>
        </div>
      </footer>

      {/* ── mobile filter bar + drawer ── */}
      <div className="fixed inset-x-0 bottom-0 z-40 border-t border-border/70 bg-background/90 pb-[max(0.5rem,env(safe-area-inset-bottom))] pt-2 backdrop-blur-md md:hidden">
        <div className="mx-auto w-full max-w-6xl px-4">
          <Drawer open={open} onOpenChange={setOpen}>
            <DrawerTrigger asChild>
              <Button className="h-12 w-full gap-2 rounded-2xl text-[15px] font-black" size="lg">
                <Filter className="h-4 w-4" />
                فیلترها و مرتب‌سازی
                {activeFilters > 0 && (
                  <Badge className="ms-1 bg-black/25 px-1.5 text-[11px]">
                    {faDigits(activeFilters)}
                  </Badge>
                )}
              </Button>
            </DrawerTrigger>
            <DrawerContent className="max-h-[85dvh] mx-auto max-w-md" dir="rtl">
              <DrawerTitle className="text-start">فیلترها</DrawerTitle>
              <DrawerDescription className="text-start">
                {faDigits(rows.length)} بسته در نمایش · {faDigits(filtered.length)} بسته‌ی فیلترشده
              </DrawerDescription>
              <div className="overflow-y-auto px-4 pb-8 pt-3">
                {FilterPanel}
                <Button onClick={() => setOpen(false)} className="mt-5 h-12 w-full rounded-2xl font-black">
                  نمایش {faDigits(rows.length)} بسته
                </Button>
              </div>
            </DrawerContent>
          </Drawer>
        </div>
      </div>
    </div>
  );
}

/* ── package card ── */
function PkgCard({ r, dark, metric, vat }: { r: Row & { t?: number }; dark: boolean; metric: Metric; vat: boolean }) {
  const price = r.price * (vat ? 1 + VAT_RATE : 1);
  const old = r.oldPrice != null ? r.oldPrice * (vat ? 1 + VAT_RATE : 1) : null;
  const t = r.t ?? 0;
  return (
    <motion.article
      layout="position"
      initial={{ opacity: 0, y: 14 }}
      animate={{ opacity: 1, y: 0 }}
      exit={{ opacity: 0, scale: 0.97 }}
      transition={{ duration: 0.18, ease: "easeOut" }}
      className={`relative overflow-hidden rounded-2xl border bg-card p-4 ${
        r.isBest ? "border-primary/60 shadow-[0_0_0_1px_var(--color-primary),0_10px_40px_-12px_var(--color-primary)]" : r.isWorst ? "border-dashed border-destructive/60" : "border-border"
      }`}
    >
      <span className="absolute inset-y-0 start-0 w-[3px]" style={{ background: r.providerAccent }} />
      <div className="flex items-center gap-2">
        <span
          className="grid h-7 min-w-7 place-items-center rounded-full px-2 text-[13px] font-black text-white"
          style={{ background: valueColor(t, dark) }}
        >
          {faDigits(r.rank)}
        </span>
        <span className="text-[12.5px] font-black" style={{ color: r.providerAccent }}>
          {r.providerName}
        </span>
        {r.note && r.kind !== "roaming" && (
          <Badge
            variant="outline"
            className="min-w-0 max-w-full shrink whitespace-normal text-start px-1.5 text-[10px] leading-4 text-muted-foreground"
          >
            {r.note}
          </Badge>
        )}
        {r.kind === "combo" && (
          <Badge className="border border-amber-500/40 bg-amber-500/15 px-1.5 text-[10px] text-amber-600 hover:bg-amber-500/15 dark:text-amber-400">
            ترکیبی
          </Badge>
        )}
        {r.kind === "roaming" && (
          <Badge className="border border-violet-500/40 bg-violet-500/15 px-1.5 text-[10px] text-violet-600 hover:bg-violet-500/15 dark:text-violet-400">
            {r.note ?? "رومینگ"}
          </Badge>
        )}
        {r.discountPct != null && (
          <Badge className="ms-auto bg-amber-500 text-black hover:bg-amber-500">
            {faDigits(r.discountPct)}٪
          </Badge>
        )}
      </div>

      <h3 className="mt-2.5 text-[15px] font-extrabold leading-6">{r.title}</h3>

      <div className="mt-2 flex flex-wrap gap-1.5 text-[11px] font-bold text-muted-foreground">
        <span className="rounded-lg bg-secondary px-2 py-1">{fmtGB(r.gb)}</span>
        <span className="rounded-lg bg-secondary px-2 py-1">
          {faDigits(r.days)} {r.days ? "روزه" : "—"}
        </span>
        {r.group && <span className="rounded-lg bg-secondary px-2 py-1">{r.group}</span>}
      </div>

      <div className="mt-3 flex items-end justify-between gap-2">
        <div className="min-w-0">
          <div className="flex items-baseline gap-1.5" dir="ltr">
            <span className="text-2xl font-black tabular-nums" style={{ color: valueColor(t, dark) }}>
              {fmtValue(r.value)}
            </span>
            <span className="text-[10.5px] font-bold text-muted-foreground">
              {metric === "pergb" ? "ت/گیگ" : "ت/گیگ×روز"}
            </span>
          </div>
          <div className="mt-1 text-[11px] font-bold text-muted-foreground">
            {r.isBest || r.price === 0 ? (
              <span className="text-primary font-black">
                {r.price === 0 ? "هدیه رایگان · بهترین" : "بهترین ارزش"}
              </span>
            ) : r.worsePct != null ? (
              <>
                <span dir="ltr" style={{ color: valueColor(t, dark) }}>
                  +{faDigits(r.worsePct < 10 ? Math.round(r.worsePct * 10) / 10 : Math.round(r.worsePct))}٪
                </span>{" "}
                نسبت به بهترین
              </>
            ) : (
              "—"
            )}
          </div>
          {/* value bar */}
          <div className="mt-2 h-1.5 w-28 overflow-hidden rounded-full bg-secondary">
            <div
              className="h-full rounded-full"
              style={{
                width: `${Math.round((1 - t) * 100)}%`,
                background: `linear-gradient(90deg, ${valueColor(0.1, dark)}, ${valueColor(t, dark)})`,
              }}
            />
          </div>
        </div>

        <div className="shrink-0 text-end">
          {r.isFree ? (
            <span className="text-xl font-black text-primary">رایگان</span>
          ) : (
            <>
              {old != null && (
                <div className="text-[11px] text-muted-foreground line-through decoration-2">
                  {fmtToman(old)}
                </div>
              )}
              <div className="text-[17px] font-black leading-6">
                {fmtToman(price)}
                <span className="ms-1 text-[10.5px] font-bold text-muted-foreground">تومان</span>
              </div>
            </>
          )}
          <a
            href={r.buyUrl}
            target="_blank"
            rel="noreferrer"
            className="mt-1.5 inline-flex min-h-[36px] items-center gap-1 rounded-xl bg-secondary px-3 text-[12px] font-black text-secondary-foreground transition-colors hover:bg-primary hover:text-primary-foreground"
          >
            خرید
            <ExternalLink className="h-3 w-3" />
          </a>
        </div>
      </div>

      <div className="mt-3 flex items-center justify-between text-[10px] text-muted-foreground/80">
        <span dir="ltr" className="truncate">
          {r.ussd ? `${r.ussd} · ` : ""}
          {r.regulatoryCode ? `REG: ${r.regulatoryCode}` : r.sourceKind === "api" ? "API" : "capture"}
        </span>
        <span dir="ltr" className="truncate opacity-70">
          {r.perGB >= 1000 ? `${fmtToman(r.perGB)} T/GB` : `${fmtValue(r.perGB)} T/GB`}
        </span>
      </div>
    </motion.article>
  );
}

/* ── personalized-pricing notice (public vs logged-in prices) ── */
function PersonalizedNotice({ entry }: { entry: (typeof ENTRIES)[number] }) {
  const p = entry.personalized!;
  return (
    <section className="mt-3">
      <Card className="overflow-hidden border-dashed">
        <div className="flex flex-wrap items-center gap-2 px-4 pt-3">
          <BadgePercent className="h-4 w-4 shrink-0 text-amber-500" />
          <span className="text-[13px] font-black">
            {entry.nameFa} — قیمت‌های این لیست عمومی است (بدون ورود)
          </span>
          <a
            href={entry.buyUrl ?? entry.site}
            target="_blank"
            rel="noreferrer"
            className="ms-auto inline-flex min-h-[36px] items-center gap-1 text-[11px] font-black text-primary hover:underline"
          >
            قیمت‌های ویژه با ورود ↗
          </a>
        </div>
        <p className="px-4 pt-1.5 text-[12px] leading-6 text-muted-foreground">{p.note}</p>
        <div className="flex flex-wrap gap-1.5 px-4 pb-3 pt-2">
          {p.samples.map((s) => (
            <span
              key={s.title}
              className="inline-flex flex-wrap items-center gap-1.5 rounded-xl bg-secondary px-2.5 py-1.5 text-[11px] font-bold"
            >
              {s.title}
              {s.price === 0 ? (
                <span className="font-black text-primary">رایگان</span>
              ) : (
                <span dir="ltr" className="tabular-nums">
                  {fmtToman(s.price)}
                </span>
              )}
              {s.discountPct != null && (
                <span className="rounded-full bg-amber-500/20 px-1.5 text-[10px] font-black text-amber-600 dark:text-amber-400">
                  {faDigits(s.discountPct)}٪ تخفیف
                </span>
              )}
            </span>
          ))}
        </div>
        {p.source && (
          <div className="border-t border-dashed border-border/60 px-4 py-1.5 text-[10px] text-muted-foreground/70">
            {p.source}
          </div>
        )}
      </Card>
    </section>
  );
}

/* ── awaiting helpers ── */
function AwaitingPanel({ entries, title }: { entries: (typeof ENTRIES)[number][]; title: string }) {
  return (
    <Card className="p-6">
      <div className="flex items-start gap-3">
        <span className="grid h-10 w-10 shrink-0 place-items-center rounded-2xl bg-secondary">
          <Info className="h-5 w-5 text-muted-foreground" />
        </span>
        <div>
          <h2 className="text-base font-black">
            {title} — هنوز داده‌ای دریافت نشده
          </h2>
          <p className="mt-1 text-[13px] leading-6 text-muted-foreground">
            ارائه‌دهنده‌های فعلاً از خارج از ایران قابل استخراج نیستند.
            اگر داخل ایران هستید، با یک ضمیمه‌ی HAR از DevTools می‌توانید داده‌ی زنده‌ی این
            ارائه‌دهنده‌ها را به همین سایت اضافه کنید — راهنمای گام‌به‌گام:
          </p>
        </div>
      </div>
      <div className="mt-4 grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
        {entries.map((e) => (
          <div key={e.key} className="rounded-xl border border-dashed border-border p-4">
            <div className="flex items-center gap-2">
              <span className="h-2.5 w-2.5 rounded-full" style={{ background: e.accent }} />
              <span className="text-sm font-black">{e.nameFa}</span>
              <span className="ms-auto text-[10px] text-muted-foreground">{e.tech}</span>
            </div>
            <p className="mt-2 text-[12px] leading-5 text-muted-foreground">{e.awaitingNote}</p>
          </div>
        ))}
      </div>
      <a
        href="DATA.md"
        className="mt-4 inline-flex min-h-[44px] items-center gap-2 rounded-2xl bg-primary px-5 text-sm font-black text-primary-foreground"
      >
        راهنمای جمع‌آوری داده (DATA.md)
      </a>
    </Card>
  );
}

function AwaitingStrip({ entries }: { entries: (typeof ENTRIES)[number][] }) {
  return (
    <div className="mt-4 flex flex-wrap items-center gap-2 rounded-2xl border border-dashed border-border p-3 text-[12px] text-muted-foreground">
      <span className="font-bold">در انتظار داده:</span>
      {entries.map((e) => (
        <TooltipProvider key={e.key}>
          <Tooltip>
            <TooltipTrigger asChild>
              <span className="inline-flex items-center gap-1.5 rounded-full bg-secondary px-2.5 py-1 font-bold">
                <span className="h-2 w-2 rounded-full" style={{ background: e.accent }} />
                {e.nameFa}
              </span>
            </TooltipTrigger>
            <TooltipContent side="top" className="max-w-56">
              <div className="font-bold">{e.nameFa}</div>
              <div className="text-xs opacity-80">{e.awaitingNote}</div>
            </TooltipContent>
          </Tooltip>
        </TooltipProvider>
      ))}
      <a href="DATA.md" className="ms-auto font-black text-primary hover:underline">
        چطور کمک کنیم؟ ↗
      </a>
    </div>
  );
}
