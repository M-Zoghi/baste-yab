"use client";

import { useMemo, useState, useSyncExternalStore } from "react";
import { AnimatePresence } from "framer-motion";
import {
  Database,
  Filter,
  Gift,
  Home,
  LayoutGrid,
  Moon,
  Percent,
  RotateCcw,
  Scale,
  SearchX,
  Signal,
  Smartphone,
  Sun,
  Table2,
  X,
} from "lucide-react";
import { useTheme } from "next-themes";

import { Button } from "@/components/ui/button";
import {
  Drawer,
  DrawerContent,
  DrawerDescription,
  DrawerTitle,
  DrawerTrigger,
} from "@/components/ui/drawer";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Separator } from "@/components/ui/separator";
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from "@/components/ui/tooltip";

import {
  ENTRIES,
  allPackages,
  faDate,
  faDigits,
  fmtValue,
  rankRows,
  type Category,
  type Kind,
  type Metric,
  type Row,
  type SortKey,
} from "@/lib/providers";

import { CompareDrawer } from "@/components/baste-yab/CompareDrawer";
import { FilterPanel } from "@/components/baste-yab/FilterPanel";
import {
  AwaitingPanel,
  AwaitingStrip,
  PersonalizedNotice,
} from "@/components/baste-yab/InfoSections";
import { PkgCard } from "@/components/baste-yab/PkgCard";
import { PkgTable } from "@/components/baste-yab/PkgTable";
import { DEFAULT_KINDS, liveKeysOf, norm } from "@/components/baste-yab/helpers";

type ViewMode = "grid" | "table";

export default function Page() {
  const { resolvedTheme, setTheme } = useTheme();
  const mounted = useSyncExternalStore(
    () => () => {},
    () => true,
    () => false,
  );
  const dark = mounted ? resolvedTheme !== "light" : true;

  const [cat, setCat] = useState<Category>("mobile");
  const [metric, setMetric] = useState<Metric>("pergb");
  const [vat, setVat] = useState(false);
  const [sort, setSort] = useState<SortKey>("best");
  const [view, setView] = useState<ViewMode>("grid");
  const [query, setQuery] = useState("");
  const [provSel, setProvSel] = useState<Set<string>>(() => new Set(liveKeysOf("mobile")));
  const [kinds, setKinds] = useState<Set<Kind>>(() => new Set(DEFAULT_KINDS));
  const [maxPrice, setMaxPrice] = useState<number | null>(null);
  const [minGB, setMinGB] = useState<number>(0);
  const [onlyDisc, setOnlyDisc] = useState(false);
  const [hideFree, setHideFree] = useState(false);
  const [filterDrawerOpen, setFilterDrawerOpen] = useState(false);
  const [compareIds, setCompareIds] = useState<string[]>([]);
  const [compareOpen, setCompareOpen] = useState(false);

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

  const provCounts = useMemo(() => {
    const m: Record<string, number> = {};
    for (const p of inCat) {
      if (kinds.has(p.kind)) m[p.entryKey] = (m[p.entryKey] ?? 0) + 1;
    }
    return m;
  }, [inCat, kinds]);

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
    for (const p of inCat) {
      if (provSel.has(p.entryKey)) m[p.kind] = (m[p.kind] ?? 0) + 1;
    }
    return m;
  }, [inCat, provSel]);

  const filtered = useMemo(() => {
    const q = norm(query);
    let list = inCat.filter((p) => provSel.has(p.entryKey) && kinds.has(p.kind));
    if (q) {
      list = list.filter((p) =>
        [p.title, p.providerName, p.regulatoryCode ?? "", p.group ?? "", p.note ?? ""].some(
          (s) => norm(s).includes(q),
        ),
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

  // Market stats across paid filtered items
  const marketStats = useMemo(() => {
    const paidValues = rows
      .filter((r) => !r.isFree && isFinite(r.value))
      .map((r) => r.value)
      .sort((a, b) => a - b);
    if (!paidValues.length) return null;
    const mid = Math.floor(paidValues.length / 2);
    const median =
      paidValues.length % 2 === 0
        ? (paidValues[mid - 1] + paidValues[mid]) / 2
        : paidValues[mid];
    return {
      min: paidValues[0],
      median,
      max: paidValues[paidValues.length - 1],
    };
  }, [rows]);

  const bestPaid = useMemo(() => {
    const paid = rows.filter((r) => !r.isFree && isFinite(r.value));
    if (!paid.length) return null;
    return paid.reduce((best, cur) => (cur.value < best.value ? cur : best), paid[0]);
  }, [rows]);

  const freeTop = rows.length > 0 && rows[0].isFree ? rows[0] : null;

  const lastFetch = useMemo(() => {
    const dates = allLive.map((p) => p.fetchedAt).sort();
    return dates.length ? faDate(dates[dates.length - 1]) : "—";
  }, [allLive]);

  const allRankedMap = useMemo(() => {
    const map = new Map<string, Row>();
    for (const r of rankRows(allLive, { metric, vat, sort: "best" })) {
      map.set(`${r.entryKey}:${r.id}`, r);
    }
    return map;
  }, [allLive, metric, vat]);

  const compareItems = useMemo(
    () =>
      compareIds
        .map((uid) => allRankedMap.get(uid))
        .filter((item): item is Row => Boolean(item)),
    [compareIds, allRankedMap],
  );

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
    setProvSel(new Set(liveKeysOf(c)));
    setMaxPrice(null);
    setMinGB(0);
  };

  const toggleProvider = (key: string) => {
    setProvSel((prev) => {
      const next = new Set(prev);
      if (next.has(key)) next.delete(key);
      else next.add(key);
      return next;
    });
  };

  const toggleKind = (k: Kind) => {
    setKinds((prev) => {
      const next = new Set(prev);
      if (next.has(k)) next.delete(k);
      else next.add(k);
      return next;
    });
  };

  const toggleCompare = (uid: string) => {
    setCompareIds((prev) => {
      if (prev.includes(uid)) return prev.filter((id) => id !== uid);
      if (prev.length >= 3) return prev;
      return [...prev, uid];
    });
  };

  const filterProps = {
    query,
    onQueryChange: setQuery,
    liveEntries,
    awaitingEntries,
    provSel,
    onToggleProvider: toggleProvider,
    onSelectAllProviders: () => setProvSel(new Set(liveEntries.map((e) => e.key))),
    provCounts,
    kinds,
    onToggleKind: toggleKind,
    kindCounts,
    maxPrice,
    priceCap,
    onMaxPriceChange: setMaxPrice,
    minGB,
    gbCap,
    onMinGBChange: setMinGB,
    onlyDisc,
    onOnlyDiscChange: setOnlyDisc,
    hideFree,
    onHideFreeChange: setHideFree,
    activeFilters,
    onReset: reset,
  };

  const unitShort = metric === "pergb" ? "ت/گیگ" : "ت/گیگ×روز";
  const unitLong = metric === "pergb" ? "تومان بر گیگابایت" : "تومان بر (گیگابایت × روز)";

  return (
    <div className="min-h-dvh flex flex-col bg-background text-foreground">
      {/* ── Top Bar: 3-zone single-row contract ── */}
      <header className="sticky top-0 z-40 border-b border-border/80 bg-background/90 backdrop-blur-md">
        <div className="mx-auto flex h-14 w-full max-w-7xl items-center justify-between gap-4 px-4 sm:h-16 sm:px-6">
          {/* Zone 1: Brand wordmark */}
          <a
            href="#"
            className="inline-flex items-center gap-2 whitespace-nowrap shrink-0 text-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring rounded-md"
          >
            <span className="grid h-8 w-8 place-items-center rounded-lg bg-primary text-primary-foreground">
              <Signal className="h-4 w-4" />
            </span>
            <span className="text-[17px] font-extrabold tracking-tight">بسته‌یاب</span>
          </a>

          {/* Zone 2: Category Switcher (desktop/tablet center) */}
          <nav
            aria-label="دسته‌بندی اینترنت"
            className="hidden sm:flex items-center gap-1 rounded-lg border border-border bg-muted/60 p-1"
          >
            <button
              type="button"
              onClick={() => switchCat("mobile")}
              aria-pressed={cat === "mobile"}
              className={`inline-flex min-h-[34px] items-center gap-2 rounded-md px-3.5 py-1 text-[13px] font-bold transition-colors whitespace-nowrap shrink-0 cursor-pointer ${
                cat === "mobile"
                  ? "bg-card text-foreground shadow-xs"
                  : "text-muted-foreground hover:text-foreground"
              }`}
            >
              <Smartphone className="h-3.5 w-3.5" />
              <span>اینترنت همراه</span>
              <span className="fa-num text-[11px] font-medium text-muted-foreground">
                {faDigits(countByCat.mobile)}
              </span>
            </button>
            <button
              type="button"
              onClick={() => switchCat("home")}
              aria-pressed={cat === "home"}
              className={`inline-flex min-h-[34px] items-center gap-2 rounded-md px-3.5 py-1 text-[13px] font-bold transition-colors whitespace-nowrap shrink-0 cursor-pointer ${
                cat === "home"
                  ? "bg-card text-foreground shadow-xs"
                  : "text-muted-foreground hover:text-foreground"
              }`}
            >
              <Home className="h-3.5 w-3.5" />
              <span>اینترنت ثابت</span>
              <span className="fa-num text-[11px] font-medium text-muted-foreground">
                {faDigits(countByCat.home)}
              </span>
            </button>
          </nav>

          {/* Zone 3: Sources anchor + Theme toggle */}
          <div className="flex items-center gap-2 shrink-0">
            <a
              href="#sources"
              className="hidden md:inline-flex items-center px-2.5 py-1.5 text-[13px] font-medium text-muted-foreground transition-colors hover:text-foreground whitespace-nowrap shrink-0"
            >
              منابع داده
            </a>
            <Button
              variant="outline"
              size="icon"
              className="h-9 w-9 cursor-pointer"
              onClick={() => setTheme(dark ? "light" : "dark")}
              aria-label={dark ? "تغییر به حالت روشن" : "تغییر به حالت تاریک"}
            >
              {mounted ? (
                dark ? <Sun className="h-4 w-4" /> : <Moon className="h-4 w-4" />
              ) : (
                <Sun className="h-4 w-4 opacity-0" />
              )}
            </Button>
          </div>
        </div>
      </header>

      <main className="mx-auto w-full max-w-7xl flex-1 px-4 pb-28 sm:px-6 lg:pb-12">
        {/* Mobile Category Switcher (non-sticky to keep sticky chrome minimal) */}
        <div className="mt-3 sm:hidden">
          <div className="grid grid-cols-2 gap-1 rounded-lg border border-border bg-muted/60 p-1">
            <button
              type="button"
              onClick={() => switchCat("mobile")}
              aria-pressed={cat === "mobile"}
              className={`inline-flex min-h-[40px] items-center justify-center gap-1.5 rounded-md px-2 text-[13px] font-bold transition-colors whitespace-nowrap ${
                cat === "mobile"
                  ? "bg-card text-foreground shadow-xs"
                  : "text-muted-foreground"
              }`}
            >
              <Smartphone className="h-3.5 w-3.5" />
              <span>اینترنت همراه</span>
              <span className="fa-num text-[11px] font-medium text-muted-foreground">
                {faDigits(countByCat.mobile)}
              </span>
            </button>
            <button
              type="button"
              onClick={() => switchCat("home")}
              aria-pressed={cat === "home"}
              className={`inline-flex min-h-[40px] items-center justify-center gap-1.5 rounded-md px-2 text-[13px] font-bold transition-colors whitespace-nowrap ${
                cat === "home"
                  ? "bg-card text-foreground shadow-xs"
                  : "text-muted-foreground"
              }`}
            >
              <Home className="h-3.5 w-3.5" />
              <span>اینترنت ثابت</span>
              <span className="fa-num text-[11px] font-medium text-muted-foreground">
                {faDigits(countByCat.home)}
              </span>
            </button>
          </div>
        </div>

        {/* ── Summary Strip (Single-elevation 4-cell KPI bar) ── */}
        <section
          aria-label="خلاصه مقایسه"
          className="mt-4 overflow-hidden rounded-xl border border-border bg-card"
        >
          <div className="grid grid-cols-1 divide-y divide-border/70 sm:grid-cols-2 sm:divide-y-0 lg:grid-cols-4 lg:divide-x lg:divide-x-reverse">
            {/* Cell 1: Best paid package */}
            <div className="p-4 sm:border-b lg:border-b-0 border-border/70 sm:border-e">
              <div className="text-[11px] font-bold text-muted-foreground">بهترین ارزش فعلی</div>
              {bestPaid ? (
                <>
                  <div className="mt-1 line-clamp-1 text-[14px] font-bold text-foreground">
                    {bestPaid.providerName} · {bestPaid.title}
                  </div>
                  <div className="mt-1.5 flex flex-wrap items-baseline gap-x-2 text-sm">
                    <span className="fa-num text-lg font-extrabold text-primary" dir="ltr">
                      {fmtValue(bestPaid.value)}
                    </span>
                    <span className="text-xs text-muted-foreground">{unitShort}</span>
                    {bestPaid.discountPct != null && (
                      <span className="fa-num text-[11px] font-bold text-amber-600 dark:text-amber-400">
                        · {faDigits(bestPaid.discountPct)}٪ تخفیف
                      </span>
                    )}
                  </div>
                  {freeTop && (
                    <div className="mt-1.5 flex items-center gap-1 text-[11px] text-muted-foreground">
                      <Gift className="h-3 w-3 shrink-0 text-primary" />
                      <span className="truncate">
                        صدر رتبه‌بندی رایگان است («{freeTop.title}»)
                      </span>
                    </div>
                  )}
                </>
              ) : (
                <div className="mt-2 text-xs text-muted-foreground">
                  {rows.length ? "—" : "با فیلترهای فعلی بسته‌ای یافت نشد"}
                </div>
              )}
            </div>

            {/* Cell 2: Market Median & Range */}
            <div className="p-4 sm:border-b lg:border-b-0 border-border/70">
              <div className="text-[11px] font-bold text-muted-foreground">میانه و بازه تعرفه‌ها</div>
              {marketStats ? (
                <>
                  <div className="mt-1 flex items-baseline gap-1.5">
                    <span className="fa-num text-lg font-extrabold text-foreground" dir="ltr">
                      {fmtValue(marketStats.median)}
                    </span>
                    <span className="text-xs text-muted-foreground">{unitShort} (میانه)</span>
                  </div>
                  <div className="fa-num mt-1.5 text-[11.5px] text-muted-foreground">
                    بازه از{" "}
                    <span className="font-bold text-foreground">{fmtValue(marketStats.min)}</span> تا{" "}
                    <span className="font-bold text-foreground">{fmtValue(marketStats.max)}</span>
                  </div>
                </>
              ) : (
                <div className="mt-2 text-xs text-muted-foreground">—</div>
              )}
            </div>

            {/* Cell 3: Inventory & Data Freshness */}
            <div className="p-4 sm:border-e border-border/70">
              <div className="text-[11px] font-bold text-muted-foreground">بسته‌های فعال و داده</div>
              <div className="fa-num mt-1 text-lg font-extrabold text-foreground">
                {faDigits(rows.length)}{" "}
                <span className="text-xs font-medium text-muted-foreground">
                  بسته از {faDigits(inCat.length)}
                </span>
              </div>
              <div className="mt-1.5 flex items-center gap-1.5 text-[11.5px] text-muted-foreground">
                <Database className="h-3.5 w-3.5 shrink-0" />
                <span className="truncate">آخرین بروزرسانی: {lastFetch}</span>
              </div>
            </div>

            {/* Cell 4: Tax Status */}
            <div className="p-4">
              <div className="flex items-center justify-between gap-2">
                <span className="text-[11px] font-bold text-muted-foreground">محاسبه مالیات</span>
                <button
                  type="button"
                  onClick={() => setVat(!vat)}
                  className="text-[11px] font-bold text-primary hover:underline cursor-pointer"
                >
                  {vat ? "حذف مالیات" : "اعمال +۱۰٪"}
                </button>
              </div>
              <div className="mt-1 text-[14px] font-bold text-foreground">
                {vat ? "با مالیات ۱۰٪ (قابل پرداخت)" : "بدون مالیات (قیمت پایه کارت)"}
              </div>
              <p className="mt-1.5 text-[11px] leading-4 text-muted-foreground">
                درگاه پرداخت ۱۰٪ ارزش افزوده اضافه می‌کند؛ رتبه‌ها تغییری نمی‌کنند.
              </p>
            </div>
          </div>
        </section>

        {/* Personalized pricing notice */}
        {liveEntries
          .filter((e) => e.personalized?.applies && provSel.has(e.key))
          .map((e) => (
            <PersonalizedNotice key={e.key} entry={e} />
          ))}

        {/* ── Two-Column Workspace: Sticky Sidebar (lg+) + Results ── */}
        <div className="mt-5 grid grid-cols-1 items-start gap-6 lg:grid-cols-[296px_minmax(0,1fr)]">
          {/* Desktop Filter Sidebar */}
          <aside
            aria-label="فیلترهای جست‌وجو"
            className="hidden lg:block lg:sticky lg:top-20 rounded-xl border border-border bg-card p-5 max-h-[calc(100dvh-6rem)] overflow-y-auto rail"
          >
            <FilterPanel {...filterProps} />
          </aside>

          {/* Main Results Column */}
          <div className="min-w-0 space-y-4">
            {/* Workspace Toolbar */}
            <div className="flex flex-wrap items-center justify-between gap-2.5 rounded-xl border border-border bg-card px-3.5 py-2.5">
              <div className="flex flex-wrap items-center gap-2">
                {/* Metric Segmented Switch */}
                <TooltipProvider>
                  <Tooltip>
                    <TooltipTrigger asChild>
                      <div
                        role="group"
                        aria-label="معیار ارزش"
                        className="inline-flex items-center rounded-lg border border-border bg-muted/50 p-0.5"
                      >
                        <button
                          type="button"
                          onClick={() => setMetric("pergb")}
                          aria-pressed={metric === "pergb"}
                          className={`min-h-[34px] rounded-md px-2.5 text-xs font-bold transition-colors whitespace-nowrap shrink-0 cursor-pointer ${
                            metric === "pergb"
                              ? "bg-card text-foreground shadow-xs"
                              : "text-muted-foreground hover:text-foreground"
                          }`}
                        >
                          ت/گیگ
                        </button>
                        <button
                          type="button"
                          onClick={() => setMetric("pergbday")}
                          aria-pressed={metric === "pergbday"}
                          className={`min-h-[34px] rounded-md px-2.5 text-xs font-bold transition-colors whitespace-nowrap shrink-0 cursor-pointer ${
                            metric === "pergbday"
                              ? "bg-card text-foreground shadow-xs"
                              : "text-muted-foreground hover:text-foreground"
                          }`}
                        >
                          ت/گیگ×روز
                        </button>
                      </div>
                    </TooltipTrigger>
                    <TooltipContent side="bottom">معیار فعال: {unitLong}</TooltipContent>
                  </Tooltip>
                </TooltipProvider>

                {/* VAT Toggle Button */}
                <TooltipProvider>
                  <Tooltip>
                    <TooltipTrigger asChild>
                      <button
                        type="button"
                        onClick={() => setVat(!vat)}
                        aria-pressed={vat}
                        className={`inline-flex min-h-[36px] items-center gap-1.5 rounded-lg border px-3 text-xs font-bold transition-colors whitespace-nowrap shrink-0 cursor-pointer ${
                          vat
                            ? "border-amber-500/50 bg-amber-500/15 text-amber-700 dark:text-amber-300"
                            : "border-border bg-background/60 text-muted-foreground hover:bg-secondary hover:text-foreground"
                        }`}
                      >
                        <Percent className="h-3.5 w-3.5" />
                        <span>مالیات {vat ? "+۱۰٪" : "بدون"}</span>
                      </button>
                    </TooltipTrigger>
                    <TooltipContent side="bottom" className="max-w-64 text-right">
                      اعمال ۱۰٪ مالیات بر ارزش افزوده درگاه پرداخت روی قیمت‌ها (رتبه‌ها ثابت
                      می‌مانند).
                    </TooltipContent>
                  </Tooltip>
                </TooltipProvider>
              </div>

              <div className="flex flex-wrap items-center gap-2 ms-auto">
                {/* Sort Select */}
                <Select value={sort} onValueChange={(v) => setSort(v as SortKey)}>
                  <SelectTrigger className="h-9 min-w-[165px] bg-background/60 text-xs font-bold" dir="rtl">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent dir="rtl">
                    <SelectItem value="best">مرتب‌سازی: بهترین ارزش</SelectItem>
                    <SelectItem value="price">مرتب‌سازی: کمترین قیمت</SelectItem>
                    <SelectItem value="gb">مرتب‌سازی: بیشترین حجم</SelectItem>
                    <SelectItem value="days">مرتب‌سازی: بیشترین مدت</SelectItem>
                  </SelectContent>
                </Select>

                {/* View Switcher */}
                <div
                  role="group"
                  aria-label="نحوه نمایش"
                  className="inline-flex items-center rounded-lg border border-border bg-muted/50 p-0.5"
                >
                  <button
                    type="button"
                    onClick={() => setView("grid")}
                    aria-pressed={view === "grid"}
                    aria-label="نمای کارتی"
                    className={`inline-flex h-8 items-center gap-1.5 rounded-md px-2.5 text-xs font-bold transition-colors whitespace-nowrap shrink-0 cursor-pointer ${
                      view === "grid"
                        ? "bg-card text-foreground shadow-xs"
                        : "text-muted-foreground hover:text-foreground"
                    }`}
                  >
                    <LayoutGrid className="h-3.5 w-3.5" />
                    <span className="hidden sm:inline">کارتی</span>
                  </button>
                  <button
                    type="button"
                    onClick={() => setView("table")}
                    aria-pressed={view === "table"}
                    aria-label="نمای جدولی"
                    className={`inline-flex h-8 items-center gap-1.5 rounded-md px-2.5 text-xs font-bold transition-colors whitespace-nowrap shrink-0 cursor-pointer ${
                      view === "table"
                        ? "bg-card text-foreground shadow-xs"
                        : "text-muted-foreground hover:text-foreground"
                    }`}
                  >
                    <Table2 className="h-3.5 w-3.5" />
                    <span className="hidden sm:inline">جدولی</span>
                  </button>
                </div>
              </div>
            </div>

            {/* Package List / Empty State */}
            {liveEntries.length === 0 ? (
              <AwaitingPanel
                entries={awaitingEntries}
                title={cat === "home" ? "بسته‌های اینترنت ثابت" : "بسته‌های اینترنت همراه"}
              />
            ) : rows.length === 0 ? (
              <div className="grid place-items-center gap-3 rounded-xl border border-border bg-card p-12 text-center">
                <span className="grid h-12 w-12 place-items-center rounded-xl bg-muted text-muted-foreground">
                  <SearchX className="h-6 w-6" />
                </span>
                <div>
                  <div className="text-sm font-bold text-foreground">
                    با فیلترهای فعلی بسته‌ای پیدا نشد
                  </div>
                  <p className="mt-1 text-xs text-muted-foreground">
                    بازه قیمت، حجم یا ارائه‌دهنده‌های انتخاب‌شده را تغییر دهید.
                  </p>
                </div>
                <Button onClick={reset} variant="outline" className="mt-1 gap-1.5 font-bold">
                  <RotateCcw className="h-4 w-4" />
                  بازنشانی فیلترها
                </Button>
              </div>
            ) : (
              <>
                {view === "grid" ? (
                  <div className="grid gap-3.5 sm:grid-cols-2 xl:grid-cols-3">
                    <AnimatePresence initial={false}>
                      {rows.map((r) => {
                        const uid = `${r.entryKey}:${r.id}`;
                        return (
                          <PkgCard
                            key={uid}
                            r={r}
                            dark={dark}
                            metric={metric}
                            vat={vat}
                            isCompared={compareIds.includes(uid)}
                            canCompare={compareIds.length < 3}
                            onToggleCompare={toggleCompare}
                          />
                        );
                      })}
                    </AnimatePresence>
                  </div>
                ) : (
                  <PkgTable
                    rows={rows}
                    dark={dark}
                    metric={metric}
                    vat={vat}
                    compareIds={compareIds}
                    onToggleCompare={toggleCompare}
                  />
                )}

                {awaitingEntries.length > 0 && <AwaitingStrip entries={awaitingEntries} />}
              </>
            )}
          </div>
        </div>
      </main>

      {/* ── Footer ── */}
      <footer
        id="sources"
        className="mt-auto border-t border-border/80 bg-card/50 pb-[max(1.5rem,env(safe-area-inset-bottom))]"
      >
        <div className="mx-auto w-full max-w-7xl px-4 py-8 sm:px-6 space-y-6">
          <div className="flex flex-wrap items-baseline justify-between gap-2">
            <h2 className="text-sm font-bold text-foreground">وضعیت منابع داده‌ی زنده</h2>
            <span className="text-xs text-muted-foreground">
              بروزرسانی خودکار از وب‌سایت رسمی ارائه‌دهنده‌ها
            </span>
          </div>

          <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
            {ENTRIES.filter((e) => e.status === "live").map((e) => (
              <div
                key={e.key}
                className="min-w-0 rounded-xl border border-border/80 bg-card p-3.5 text-xs leading-5"
              >
                <div className="flex items-center justify-between gap-2">
                  <div className="flex items-center gap-2">
                    <span className="h-2 w-2 rounded-full" style={{ backgroundColor: e.accent }} />
                    <span className="font-bold text-foreground">{e.nameFa}</span>
                  </div>
                  <span className="text-[11px] font-medium text-muted-foreground">
                    {e.doc?.source.kind === "api" ? "API زنده" : "ضمیمه‌ی صفحه"}
                  </span>
                </div>
                <div className="fa-num mt-1.5 text-[11.5px] text-muted-foreground">
                  {faDigits(e.doc?.packages.length ?? 0)} بسته · {e.tech} ·{" "}
                  {faDate(e.doc?.source.fetchedAt ?? "")}
                </div>
                <div className="mt-1 truncate font-mono text-[10.5px] text-muted-foreground/75" dir="ltr">
                  {e.doc?.source.endpoint}
                </div>
              </div>
            ))}
          </div>

          <Separator />

          <p className="text-xs leading-6 text-muted-foreground">
            قیمت‌ها همان اعداد درج‌شده روی کارت‌های سایت رسمی هر ارائه‌دهنده است (بدون مالیات)؛
            درگاه پرداخت ۱۰٪ مالیات بر ارزش افزوده اضافه می‌کند — با کلید «مالیات» همه ارقام ×۱٫۱
            می‌شود. رتبه‌بندی بر اساس تومان بر گیگابایت است؛ هرچه کمتر، بهتر. داده‌ها با{" "}
            <span className="font-mono text-foreground/85">update/fetch-providers.mjs</span> از سایت
            هر ارائه‌دهنده تازه می‌شود. بسته‌های بدون حجم داده (صوتی) خارج از رتبه‌بندی‌اند. راهنمای
            افزودن ارائه‌دهنده‌های جدید:{" "}
            <a className="font-bold text-primary hover:underline" href="DATA.md">
              DATA.md
            </a>
            .
          </p>
        </div>
      </footer>

      {/* ── Floating Compare Bar (appears only when items are pinned) ── */}
      {compareItems.length > 0 && (
        <div className="fixed inset-x-0 bottom-16 z-40 mx-auto w-fit max-w-[calc(100vw-2rem)] lg:bottom-5">
          <div className="flex items-center gap-3 rounded-xl border border-border bg-card/95 px-4 py-2.5 shadow-lg backdrop-blur-md">
            <div className="flex items-center gap-2 text-xs font-bold">
              <Scale className="h-4 w-4 text-primary" />
              <span className="fa-num">{faDigits(compareItems.length)} بسته برای مقایسه</span>
            </div>
            <Button
              size="sm"
              className="h-8 rounded-lg px-3 text-xs font-bold cursor-pointer"
              onClick={() => setCompareOpen(true)}
            >
              مقایسه کنار هم
            </Button>
            <button
              type="button"
              onClick={() => setCompareIds([])}
              aria-label="پاک‌کردن لیست مقایسه"
              className="rounded-md p-1 text-muted-foreground hover:bg-secondary hover:text-foreground cursor-pointer"
            >
              <X className="h-4 w-4" />
            </button>
          </div>
        </div>
      )}

      <CompareDrawer
        open={compareOpen}
        onOpenChange={setCompareOpen}
        items={compareItems}
        vat={vat}
        onRemove={(uid) => setCompareIds((prev) => prev.filter((id) => id !== uid))}
        onClear={() => {
          setCompareIds([]);
          setCompareOpen(false);
        }}
      />

      {/* ── Mobile Filter Bar + Drawer (< lg) ── */}
      <div className="fixed inset-x-0 bottom-0 z-40 border-t border-border/80 bg-background/95 px-4 py-2 pb-[max(0.5rem,env(safe-area-inset-bottom))] backdrop-blur-md lg:hidden">
        <div className="mx-auto max-w-xl">
          <Drawer open={filterDrawerOpen} onOpenChange={setFilterDrawerOpen}>
            <DrawerTrigger asChild>
              <Button className="h-11 w-full gap-2 rounded-xl text-sm font-bold" size="lg">
                <Filter className="h-4 w-4" />
                <span>فیلترها و جست‌وجو</span>
                {activeFilters > 0 && (
                  <span className="fa-num rounded-md bg-black/20 px-1.5 py-0.5 text-xs">
                    {faDigits(activeFilters)}
                  </span>
                )}
              </Button>
            </DrawerTrigger>
            <DrawerContent className="mx-auto max-h-[86dvh] max-w-md" dir="rtl">
              <div className="border-b border-border/60 px-5 py-3">
                <DrawerTitle className="text-start text-base font-bold">فیلترها</DrawerTitle>
                <DrawerDescription className="fa-num text-start text-xs">
                  {faDigits(rows.length)} بسته در نمایش · از {faDigits(inCat.length)} بسته
                </DrawerDescription>
              </div>
              <div className="overflow-y-auto px-5 pb-8 pt-4">
                <FilterPanel {...filterProps} />
                <Button
                  onClick={() => setFilterDrawerOpen(false)}
                  className="mt-5 h-11 w-full rounded-xl font-bold"
                >
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
