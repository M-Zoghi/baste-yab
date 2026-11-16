"use client";

import { useMemo, useState, useSyncExternalStore } from "react";
import {
  ArrowUp,
  Calculator,
  Database,
  Gift,
  Home,
  Info,
  LayoutGrid,
  Moon,
  Percent,
  RotateCcw,
  Scale,
  Search,
  SearchX,
  Smartphone,
  Sun,
  Table2,
  X,
} from "lucide-react";
import { useTheme } from "next-themes";
import { PWAInstallButton } from "@/components/baste-yab/PwaInstall";
import { useToast } from "@/hooks/use-toast";

const BASE_PATH = process.env.NEXT_PUBLIC_BASE_PATH || "";

import { Button } from "@/components/ui/button";
import {
  Drawer,
  DrawerContent,
  DrawerDescription,
  DrawerTitle,
} from "@/components/ui/drawer";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Separator } from "@/components/ui/separator";
import { Switch } from "@/components/ui/switch";
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from "@/components/ui/tooltip";

import {
  ENTRIES,
  VAT_RATE,
  allPackages,
  faDate,
  faDigits,
  fmtValue,
  rankRows,
  type Category,
  type HomeTech,
  type Kind,
  type RestrictionTag,
  type Row,
  type SortKey,
} from "@/lib/providers";

import { ActiveFilterChips } from "@/components/baste-yab/ActiveFilterChips";
import { CompareBody, CompareDrawer } from "@/components/baste-yab/CompareDrawer";
import { FilterPanel } from "@/components/baste-yab/FilterPanel";
import {
  AwaitingPanel,
  AwaitingStrip,
  OperatorNoticesSection,
  ProviderSourcesSection,
} from "@/components/baste-yab/InfoSections";
import { MobileBottomNav, type MobileTab } from "@/components/baste-yab/MobileBottomNav";
import { MobileOperatorBar } from "@/components/baste-yab/MobileOperatorBar";
import { NeedCalculator } from "@/components/baste-yab/NeedCalculator";
import { OperatorBestRow } from "@/components/baste-yab/OperatorBestRow";
import { PkgCard } from "@/components/baste-yab/PkgCard";
import { PkgTable } from "@/components/baste-yab/PkgTable";
import {
  ALL_RESTRICTION_TAGS,
  DEFAULT_KINDS,
  durationBucketOf,
  liveKeysOf,
  norm,
  type DurationKey,
} from "@/components/baste-yab/helpers";
import { useBasteYabState, type HomeTechFilter } from "@/hooks/use-baste-yab-state";

const PAGE_STEP = 36;

const subscribeScroll = (cb: () => void) => {
  window.addEventListener("scroll", cb, { passive: true });
  return () => window.removeEventListener("scroll", cb);
};
const getScrollSnapshot = () => window.scrollY > 480;
const getScrollServerSnapshot = () => false;

export default function Page() {
  const { resolvedTheme, setTheme } = useTheme();
  const mounted = useSyncExternalStore(
    () => () => {},
    () => true,
    () => false,
  );
  const showScrollTop = useSyncExternalStore(
    subscribeScroll,
    getScrollSnapshot,
    getScrollServerSnapshot,
  );
  const dark = mounted ? resolvedTheme === "dark" : false;

  const toggleTheme = () => {
    setTheme(dark ? "light" : "dark");
  };

  const themeLabel = !mounted ? "پوسته" : dark ? "تاریک" : "روشن";
  const themeAriaLabel = !mounted
    ? "تغییر پوسته"
    : dark
      ? "پوسته تاریک (تغییر به روشن)"
      : "پوسته روشن (تغییر به تاریک)";

  const [state, updateState] = useBasteYabState();
  const {
    cat,
    homeTech,
    metric,
    vat,
    sort,
    view,
    query,
    provSel,
    kinds,
    durations,
    maxPrice,
    minGB,
    onlyDisc,
    hideFree,
    hidePortalOnly,
    includedRestrictions,
  } = state;

  const { toast } = useToast();
  const [filterDrawerOpen, setFilterDrawerOpen] = useState(false);
  const [compareIds, setCompareIds] = useState<string[]>([]);
  const [compareOpen, setCompareOpen] = useState(false);
  const [calcOpen, setCalcOpen] = useState(false);
  const [mobileSubTab, setMobileSubTab] = useState<"browse" | "calc" | "compare" | "info">("browse");
  const [opResetKey, setOpResetKey] = useState(0);
  const [visibleLimit, setVisibleLimit] = useState(PAGE_STEP);

  const vatFactor = vat ? 1 + VAT_RATE : 1;

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
    return Math.ceil(Math.max(...list.map((p) => p.price * vatFactor)) / 500000) * 500000;
  }, [inCat, kinds, vatFactor]);

  const effectiveMaxPrice = maxPrice != null && priceCap > 0 && maxPrice >= priceCap ? null : maxPrice;

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

  const homeTechCounts = useMemo(() => {
    const m: Record<HomeTech, number> = { modem: 0, fixed: 0 };
    for (const p of inCat) {
      if (!provSel.has(p.entryKey) || !kinds.has(p.kind)) continue;
      if (p.homeTech) m[p.homeTech] += 1;
    }
    return m;
  }, [inCat, provSel, kinds]);

  const durationCounts = useMemo(() => {
    const m: Record<DurationKey, number> = { short: 0, weekly: 0, monthly: 0, long: 0 };
    for (const p of inCat) {
      if (!provSel.has(p.entryKey) || !kinds.has(p.kind)) continue;
      if (cat === "home" && homeTech !== "all" && p.homeTech !== homeTech) continue;
      const b = durationBucketOf(p.days);
      if (b) m[b] += 1;
    }
    return m;
  }, [inCat, provSel, kinds, cat, homeTech]);

  const portalOnlyCount = useMemo(() => {
    let count = 0;
    for (const p of inCat) {
      if (!provSel.has(p.entryKey) || !kinds.has(p.kind)) continue;
      if (cat === "home" && homeTech !== "all" && p.homeTech !== homeTech) continue;
      if (p.portalOnly) count += 1;
    }
    return count;
  }, [inCat, provSel, kinds, cat, homeTech]);

  const restrictionCounts = useMemo(() => {
    const m: Record<RestrictionTag, number> = {
      night: 0,
      morning: 0,
      hourly: 0,
      domestic: 0,
      newUser: 0,
      youth: 0,
    };
    for (const p of inCat) {
      if (!provSel.has(p.entryKey) || !kinds.has(p.kind)) continue;
      if (cat === "home" && homeTech !== "all" && p.homeTech !== homeTech) continue;
      for (const r of p.restrictions) m[r] += 1;
    }
    return m;
  }, [inCat, provSel, kinds, cat, homeTech]);

  const filtered = useMemo(() => {
    const q = norm(query);
    let list = inCat.filter((p) => provSel.has(p.entryKey) && kinds.has(p.kind));
    if (cat === "home" && homeTech !== "all") {
      list = list.filter((p) => p.homeTech === homeTech);
    }
    if (q) {
      list = list.filter((p) =>
        [p.title, p.providerName, p.regulatoryCode ?? "", p.ussd ?? "", p.group ?? "", p.note ?? ""].some(
          (s) => norm(s).includes(q),
        ),
      );
    }
    if (durations.size > 0) {
      list = list.filter((p) => {
        const b = durationBucketOf(p.days);
        return b != null && durations.has(b);
      });
    }
    if (effectiveMaxPrice != null) list = list.filter((p) => p.price * vatFactor <= effectiveMaxPrice);
    if (minGB > 0) list = list.filter((p) => p.gb >= minGB);
    if (onlyDisc) list = list.filter((p) => p.discountPct != null);
    if (hideFree) list = list.filter((p) => p.price > 0);
    if (hidePortalOnly) list = list.filter((p) => !p.portalOnly);
    list = list.filter(
      (p) =>
        p.restrictions.length === 0 ||
        p.restrictions.every((tag) => includedRestrictions.has(tag)),
    );
    return list;
  }, [
    inCat,
    provSel,
    kinds,
    cat,
    homeTech,
    query,
    durations,
    effectiveMaxPrice,
    vatFactor,
    minGB,
    onlyDisc,
    hideFree,
    hidePortalOnly,
    includedRestrictions,
  ]);

  const calcPool = useMemo(() => {
    return inCat.filter(
      (p) =>
        provSel.has(p.entryKey) &&
        kinds.has(p.kind) &&
        (cat !== "home" || homeTech === "all" || p.homeTech === homeTech) &&
        (!hidePortalOnly || !p.portalOnly) &&
        (p.restrictions.length === 0 ||
          p.restrictions.every((tag) => includedRestrictions.has(tag))),
    );
  }, [inCat, provSel, kinds, cat, homeTech, hidePortalOnly, includedRestrictions]);

  const rows = useMemo(
    () => rankRows(filtered, { metric, vat, sort }),
    [filtered, metric, vat, sort],
  );

  const visibleRows = useMemo(
    () => (rows.length > visibleLimit ? rows.slice(0, visibleLimit) : rows),
    [rows, visibleLimit],
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
    (cat === "home" && homeTech !== "all" ? 1 : 0) +
    (durations.size > 0 ? 1 : 0) +
    (effectiveMaxPrice != null ? 1 : 0) +
    (minGB > 0 ? 1 : 0) +
    (onlyDisc ? 1 : 0) +
    (hideFree ? 1 : 0) +
    (hidePortalOnly ? 1 : 0) +
    ALL_RESTRICTION_TAGS.filter((t) => !includedRestrictions.has(t)).length +
    (provSel.size !== liveEntries.length ? 1 : 0) +
    (sort !== "best" ? 1 : 0) +
    (kinds.size !== DEFAULT_KINDS.length || DEFAULT_KINDS.some((k) => !kinds.has(k)) ? 1 : 0);

  const reset = () => {
    setVisibleLimit(PAGE_STEP);
    setOpResetKey((k) => k + 1);
    updateState((prev) => ({
      ...prev,
      homeTech: "all",
      query: "",
      durations: new Set(),
      maxPrice: null,
      minGB: 0,
      onlyDisc: false,
      hideFree: false,
      hidePortalOnly: false,
      includedRestrictions: new Set(ALL_RESTRICTION_TAGS),
      provSel: new Set(liveKeysOf(prev.cat)),
      kinds: new Set(DEFAULT_KINDS),
      sort: "best",
    }));
  };

  const switchCat = (c: Category) => {
    setVisibleLimit(PAGE_STEP);
    updateState((prev) => ({
      ...prev,
      cat: c,
      homeTech: "all",
      provSel: new Set(liveKeysOf(c)),
      maxPrice: null,
      minGB: 0,
    }));
  };

  const toggleProvider = (key: string) => {
    updateState((prev) => {
      const next = new Set(prev.provSel);
      if (next.has(key)) next.delete(key);
      else next.add(key);
      return { ...prev, provSel: next };
    });
  };

  const toggleKind = (k: Kind) => {
    updateState((prev) => {
      const next = new Set(prev.kinds);
      if (next.has(k)) next.delete(k);
      else next.add(k);
      return { ...prev, kinds: next };
    });
  };

  const toggleDuration = (d: DurationKey) => {
    updateState((prev) => {
      const next = new Set(prev.durations);
      if (next.has(d)) next.delete(d);
      else next.add(d);
      return { ...prev, durations: next };
    });
  };

  const toggleCompare = (uid: string) => {
    if (compareIds.includes(uid)) {
      const next = compareIds.filter((id) => id !== uid);
      setCompareIds(next);
      toast({ title: "از لیست مقایسه حذف شد" });
      return;
    }
    if (compareIds.length >= 3) {
      toast({ title: "حداکثر ۳ بسته قابل مقایسه کنار هم است" });
      return;
    }
    const next = [...compareIds, uid];
    setCompareIds(next);
    toast({ title: `به مقایسه اضافه شد (${faDigits(next.length)} از ۳)` });
  };

  const toggleRestriction = (tag: RestrictionTag) => {
    updateState((prev) => {
      const next = new Set(prev.includedRestrictions);
      if (next.has(tag)) next.delete(tag);
      else next.add(tag);
      return { ...prev, includedRestrictions: next };
    });
  };

  const filterProps = {
    cat,
    homeTech,
    onHomeTechChange: (t: HomeTechFilter) => updateState((prev) => ({ ...prev, homeTech: t })),
    homeTechCounts,
    query,
    onQueryChange: (q: string) => updateState((prev) => ({ ...prev, query: q })),
    liveEntries,
    awaitingEntries,
    provSel,
    onToggleProvider: toggleProvider,
    onSelectAllProviders: () =>
      updateState((prev) => ({ ...prev, provSel: new Set(liveKeysOf(prev.cat)) })),
    provCounts,
    kinds,
    onToggleKind: toggleKind,
    kindCounts,
    durations,
    onToggleDuration: toggleDuration,
    onClearDurations: () => updateState((prev) => ({ ...prev, durations: new Set() })),
    durationCounts,
    vat,
    maxPrice: effectiveMaxPrice,
    priceCap,
    onMaxPriceChange: (val: number | null) => updateState((prev) => ({ ...prev, maxPrice: val })),
    minGB,
    gbCap,
    onMinGBChange: (val: number) => updateState((prev) => ({ ...prev, minGB: val })),
    onlyDisc,
    onOnlyDiscChange: (val: boolean) => updateState((prev) => ({ ...prev, onlyDisc: val })),
    hideFree,
    onHideFreeChange: (val: boolean) => updateState((prev) => ({ ...prev, hideFree: val })),
    hidePortalOnly,
    onHidePortalOnlyChange: (val: boolean) =>
      updateState((prev) => ({ ...prev, hidePortalOnly: val })),
    portalOnlyCount,
    includedRestrictions,
    restrictionCounts,
    onToggleRestriction: toggleRestriction,
    onIncludeAllRestrictions: (tags: RestrictionTag[]) =>
      updateState((prev) => ({ ...prev, includedRestrictions: new Set(tags) })),
    onClearRestrictions: () =>
      updateState((prev) => ({ ...prev, includedRestrictions: new Set() })),
    activeFilters,
    onReset: reset,
  };

  const activeMobileTab: MobileTab = mobileSubTab === "browse" ? cat : mobileSubTab;

  const handleSelectMobileTab = (tab: Exclude<MobileTab, "info">) => {
    setFilterDrawerOpen(false);
    setCompareOpen(false);
    if (tab === "mobile" || tab === "home") {
      if (cat !== tab) {
        switchCat(tab);
      }
      setMobileSubTab("browse");
    } else {
      setMobileSubTab(tab);
    }
    if (typeof window !== "undefined") {
      window.scrollTo({ top: 0, behavior: "smooth" });
    }
  };

  const mobileSubtitle =
    mobileSubTab === "calc"
      ? "محاسبه ترکیب و بسته مناسب نیاز"
      : mobileSubTab === "compare"
        ? "مقایسه کنار هم بسته‌ها"
        : mobileSubTab === "info"
          ? "تنظیمات، نکات اپراتورها و منابع"
          : cat === "mobile"
            ? "مقایسه قیمت واقعی اینترنت همراه"
            : "مقایسه قیمت واقعی اینترنت ثابت";

  const unitShort = metric === "pergb" ? "ت/گیگ" : "ت/گیگ×روز";
  const unitLong = metric === "pergb" ? "تومان بر گیگابایت" : "تومان بر (گیگابایت × روز)";

  return (
    <div className="min-h-dvh flex flex-col overflow-x-clip bg-background text-foreground">
      {/* ── Top Bar: Native App Top Bar (< lg) + 3-zone Desktop Bar (lg+) ── */}
      <header className="sticky top-0 z-40 border-b border-border bg-card/95 shadow-xs backdrop-blur-md">
        <div className="mx-auto flex h-[52px] w-full max-w-7xl items-center justify-between gap-3 px-4 sm:h-16 sm:px-6">
          {/* Zone 1: Brand logo & wordmark */}
          <a
            href="#"
            onClick={(e) => {
              e.preventDefault();
              setMobileSubTab("browse");
              if (typeof window !== "undefined") {
                window.scrollTo({ top: 0, behavior: "smooth" });
              }
            }}
            className="inline-flex min-w-0 items-center gap-2.5 whitespace-nowrap text-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring rounded-md"
          >
            <img
              src={`${BASE_PATH}/pwa-192x192.png`}
              alt=""
              width={32}
              height={32}
              referrerPolicy="no-referrer"
              className="h-8 w-8 shrink-0 rounded-xl shadow-xs"
            />
            <div className="min-w-0">
              <span className="block text-[15.5px] sm:text-[17px] font-extrabold tracking-tight leading-tight">
                بسته‌یاب
              </span>
              <span className="block lg:hidden truncate text-[10.5px] font-medium text-muted-foreground leading-tight">
                {mobileSubtitle}
              </span>
            </div>
          </a>

          {/* Zone 2: Category Switcher (desktop center; < lg uses bottom nav bar) */}
          <nav
            aria-label="دسته‌بندی اینترنت"
            className="hidden lg:flex items-center gap-1 rounded-lg border border-border bg-muted p-1"
          >
            <button
              type="button"
              onClick={() => switchCat("mobile")}
              aria-pressed={cat === "mobile"}
              className={`inline-flex min-h-[34px] items-center gap-2 rounded-md px-3.5 py-1 text-[13px] font-bold transition-colors whitespace-nowrap shrink-0 cursor-pointer ${
                cat === "mobile"
                  ? "border border-border/80 bg-card text-foreground shadow-xs"
                  : "border border-transparent text-foreground/75 hover:text-foreground"
              }`}
            >
              <Smartphone className="h-3.5 w-3.5" />
              <span>اینترنت همراه</span>
              <span className="fa-num text-[11px] font-semibold text-muted-foreground">
                {faDigits(countByCat.mobile)}
              </span>
            </button>
            <button
              type="button"
              onClick={() => switchCat("home")}
              aria-pressed={cat === "home"}
              className={`inline-flex min-h-[34px] items-center gap-2 rounded-md px-3.5 py-1 text-[13px] font-bold transition-colors whitespace-nowrap shrink-0 cursor-pointer ${
                cat === "home"
                  ? "border border-border/80 bg-card text-foreground shadow-xs"
                  : "border border-transparent text-foreground/75 hover:text-foreground"
              }`}
            >
              <Home className="h-3.5 w-3.5" />
              <span>اینترنت ثابت</span>
              <span className="fa-num text-[11px] font-semibold text-muted-foreground">
                {faDigits(countByCat.home)}
              </span>
            </button>
          </nav>

          {/* Zone 3: Notices + Sources anchors + Install App + Theme toggle */}
          <div className="flex items-center gap-2 shrink-0">
            <a
              href="#notices"
              className="hidden md:inline-flex items-center px-2 py-1.5 text-[13px] font-semibold text-foreground/75 transition-colors hover:text-foreground whitespace-nowrap shrink-0"
            >
              نکات اپراتورها
            </a>
            <a
              href="#sources"
              className="hidden md:inline-flex items-center px-2 py-1.5 text-[13px] font-semibold text-foreground/75 transition-colors hover:text-foreground whitespace-nowrap shrink-0"
            >
              بروزرسانی داده‌ها
            </a>
            <PWAInstallButton />
            <Button
              variant="outline"
              size="sm"
              className={`lg:hidden h-8 sm:h-9 w-8 sm:w-9 p-0 cursor-pointer ${
                mobileSubTab === "info"
                  ? "border-primary/60 bg-primary/12 text-primary hover:bg-primary/18"
                  : "border-border bg-card text-foreground hover:bg-muted"
              }`}
              onClick={() => {
                setFilterDrawerOpen(false);
                setCompareOpen(false);
                setMobileSubTab((prev) => (prev === "info" ? "browse" : "info"));
                if (typeof window !== "undefined") {
                  window.scrollTo({ top: 0, behavior: "smooth" });
                }
              }}
              aria-pressed={mobileSubTab === "info"}
              aria-label="اطلاعات و تنظیمات"
              title="اطلاعات و تنظیمات"
            >
              <Info className="h-4 w-4" />
            </Button>
            <Button
              variant="outline"
              size="sm"
              className="h-8 sm:h-9 w-8 sm:w-auto sm:px-2.5 gap-1.5 border-border bg-card text-foreground hover:bg-muted cursor-pointer"
              onClick={toggleTheme}
              title={themeAriaLabel}
              aria-label={themeAriaLabel}
            >
              {mounted ? (
                dark ? <Moon className="h-4 w-4" /> : <Sun className="h-4 w-4" />
              ) : (
                <Sun className="h-4 w-4 opacity-0" />
              )}
              <span className="hidden md:inline text-xs font-bold">{themeLabel}</span>
            </Button>
          </div>
        </div>
      </header>

      <main className="mx-auto w-full max-w-7xl flex-1 px-3.5 pb-24 sm:px-6 lg:pb-12">
        {/* ── First-Sight Intro Header (always on lg+; shown at top of browse on mobile) ── */}
        <section
          aria-label="معرفی بسته‌یاب"
          className={mobileSubTab === "browse" ? "mt-3 sm:mt-4" : "hidden lg:block mt-4"}
        >
          <h1 className="text-[16px] sm:text-xl font-extrabold tracking-tight text-foreground leading-snug">
            مقایسه قیمت واقعی بسته‌های اینترنت
          </h1>
          <p className="mt-0.5 text-[12px] sm:text-[13px] leading-5 text-muted-foreground">
            مقایسه و رتبه‌بندی ارزان‌ترین بسته‌ها بر اساس قیمت هر گیگابایت
          </p>
        </section>

        {/* ── Mobile Native Browse Top Controls (< lg — instant paint, zero hydration opacity delay) ── */}
        {mobileSubTab === "browse" && (
          <div className="mt-3 space-y-2.5 lg:hidden">
            {/* Full-width Search Input (Filter is accessible from bottom mobile navigator) */}
            <div className="relative">
              <Search className="pointer-events-none absolute start-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
              <input
                type="search"
                value={query}
                onChange={(e) => {
                  setVisibleLimit(PAGE_STEP);
                  updateState((prev) => ({ ...prev, query: e.target.value }));
                }}
                placeholder={
                  cat === "mobile"
                    ? "جست‌وجو در بسته‌های همراه..."
                    : "جست‌وجو در بسته‌های ثابت..."
                }
                aria-label="جست‌وجو در بسته‌ها"
                className="h-11 w-full rounded-2xl border border-input bg-card ps-9 pe-9 text-[13px] font-medium text-foreground placeholder:text-muted-foreground shadow-xs focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
              />
              {query && (
                <button
                  type="button"
                  onClick={() => updateState((prev) => ({ ...prev, query: "" }))}
                  aria-label="پاک کردن جست‌وجو"
                  className="absolute end-1.5 top-1/2 inline-flex h-8 w-8 -translate-y-1/2 items-center justify-center rounded-xl text-muted-foreground hover:bg-muted hover:text-foreground cursor-pointer"
                >
                  <X className="h-4 w-4" />
                </button>
              )}
            </div>

            {/* Smooth-Scrolling Free-Size Operator Bar with Edge-Faded Arrows */}
            <MobileOperatorBar
              category={cat}
              entries={liveEntries}
              totalCount={inCat.length}
              provSel={provSel}
              resetKey={opResetKey}
              onSelectAll={() => {
                setVisibleLimit(PAGE_STEP);
                updateState((prev) => ({
                  ...prev,
                  provSel: new Set(liveKeysOf(prev.cat)),
                }));
              }}
              onToggleSingle={(entryKey, isFocused) => {
                setVisibleLimit(PAGE_STEP);
                updateState((prev) => ({
                  ...prev,
                  provSel: isFocused
                    ? new Set(liveKeysOf(prev.cat))
                    : new Set([entryKey]),
                }));
              }}
            />

            {/* Quiet Utility Bar: Count + Sort + View Toggle */}
            <div className="flex items-center justify-between gap-2 pt-0.5">
              <div className="flex min-w-0 items-center gap-2 text-xs text-muted-foreground">
                <span className="fa-num font-bold text-foreground">
                  {faDigits(rows.length)} بسته
                </span>
                {activeFilters > 0 && (
                  <button
                    type="button"
                    onClick={reset}
                    className="font-bold text-primary hover:underline cursor-pointer"
                  >
                    پاک‌کردن فیلتر
                  </button>
                )}
              </div>

              <div className="flex items-center gap-1.5 shrink-0">
                <Select
                  value={sort}
                  onValueChange={(v) =>
                    updateState((prev) => ({ ...prev, sort: v as SortKey }))
                  }
                >
                  <SelectTrigger
                    aria-label="مرتب‌سازی"
                    className="h-8 w-auto min-w-[116px] rounded-xl border-border bg-card px-2.5 text-[11.5px] font-bold"
                    dir="rtl"
                  >
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent dir="rtl">
                    <SelectItem value="best">بهترین ارزش</SelectItem>
                    <SelectItem value="price">کمترین قیمت</SelectItem>
                    <SelectItem value="gb">بیشترین حجم</SelectItem>
                    <SelectItem value="days">بیشترین مدت</SelectItem>
                  </SelectContent>
                </Select>

                <button
                  type="button"
                  onClick={() =>
                    updateState(
                      (prev) => ({ ...prev, view: prev.view === "grid" ? "table" : "grid" }),
                      { persistPrefs: true },
                    )
                  }
                  aria-label={view === "grid" ? "تغییر به نمای جدولی" : "تغییر به نمای کارتی"}
                  title={view === "grid" ? "نمای جدولی" : "نمای کارتی"}
                  className="inline-flex h-8 w-8 items-center justify-center rounded-xl border border-border bg-card text-foreground transition-transform active:scale-[0.95] cursor-pointer"
                >
                  {view === "grid" ? (
                    <Table2 className="h-4 w-4 text-primary" />
                  ) : (
                    <LayoutGrid className="h-4 w-4 text-primary" />
                  )}
                </button>
              </div>
            </div>
          </div>
        )}

        {/* ── Mobile Dedicated Calculator Screen (< lg) ── */}
        {mobileSubTab === "calc" && (
          <section
            aria-label="محاسبه‌گر بسته مناسب"
            className="mt-3 space-y-3 lg:hidden"
          >
            <div className="flex flex-wrap items-center justify-between gap-2">
              <div
                role="group"
                aria-label="دسته محاسبه‌گر"
                className="inline-flex items-center rounded-xl border border-border bg-muted p-0.5"
              >
                <button
                  type="button"
                  onClick={() => switchCat("mobile")}
                  aria-pressed={cat === "mobile"}
                  className={`inline-flex min-h-[36px] items-center gap-1.5 rounded-lg px-3 text-xs font-bold transition-colors cursor-pointer ${
                    cat === "mobile"
                      ? "bg-card text-foreground shadow-xs"
                      : "text-foreground/75"
                  }`}
                >
                  <Smartphone className="h-3.5 w-3.5" />
                  <span>همراه</span>
                </button>
                <button
                  type="button"
                  onClick={() => switchCat("home")}
                  aria-pressed={cat === "home"}
                  className={`inline-flex min-h-[36px] items-center gap-1.5 rounded-lg px-3 text-xs font-bold transition-colors cursor-pointer ${
                    cat === "home"
                      ? "bg-card text-foreground shadow-xs"
                      : "text-foreground/75"
                  }`}
                >
                  <Home className="h-3.5 w-3.5" />
                  <span>ثابت</span>
                </button>
              </div>

              <button
                type="button"
                onClick={() =>
                  updateState((prev) => ({ ...prev, vat: !prev.vat }), { persistPrefs: true })
                }
                aria-pressed={vat}
                className={`inline-flex min-h-[36px] items-center gap-1.5 rounded-full border px-3 text-xs font-bold cursor-pointer ${
                  vat
                    ? "border-amber-600/50 bg-amber-500/15 text-amber-800 dark:border-amber-400/50 dark:text-amber-300"
                    : "border-border bg-card text-foreground"
                }`}
              >
                <Percent className="h-3.5 w-3.5" />
                <span>مالیات {vat ? "+۱۰٪" : "بدون"}</span>
              </button>
            </div>

            {liveEntries.length > 0 ? (
              <NeedCalculator packages={calcPool} vat={vat} dark={dark} embedded />
            ) : (
              <AwaitingPanel
                entries={awaitingEntries}
                title={cat === "home" ? "بسته‌های اینترنت ثابت" : "بسته‌های اینترنت همراه"}
              />
            )}
          </section>
        )}

        {/* ── Mobile Dedicated Compare Screen (< lg) ── */}
        {mobileSubTab === "compare" && (
          <section
            aria-label="مقایسه کنار هم بسته‌ها"
            className="mt-3 space-y-3 lg:hidden"
          >
            <div className="flex items-center justify-between gap-2">
              <h1 className="text-base font-extrabold text-foreground">مقایسه کنار هم</h1>
              <button
                type="button"
                onClick={() =>
                  updateState((prev) => ({ ...prev, vat: !prev.vat }), { persistPrefs: true })
                }
                aria-pressed={vat}
                className={`inline-flex min-h-[36px] items-center gap-1.5 rounded-full border px-3 text-xs font-bold cursor-pointer ${
                  vat
                    ? "border-amber-600/50 bg-amber-500/15 text-amber-800 dark:border-amber-400/50 dark:text-amber-300"
                    : "border-border bg-card text-foreground"
                }`}
              >
                <Percent className="h-3.5 w-3.5" />
                <span>مالیات {vat ? "+۱۰٪" : "بدون"}</span>
              </button>
            </div>

            <CompareBody
              items={compareItems}
              vat={vat}
              onRemove={(uid) => setCompareIds((prev) => prev.filter((id) => id !== uid))}
              onClear={() => setCompareIds([])}
              onBrowse={() => setMobileSubTab("browse")}
            />
          </section>
        )}

        {/* ── Mobile Dedicated Info & Settings Screen (< lg) ── */}
        {mobileSubTab === "info" && (
          <section
            aria-label="تنظیمات و اطلاعات برنامه"
            className="mt-3 space-y-4 lg:hidden"
          >
            <div className="overflow-hidden rounded-2xl border border-border bg-card shadow-xs divide-y divide-border">
              <div className="bg-muted/45 px-4 py-2.5 text-xs font-extrabold text-foreground">
                تنظیمات و نمایش
              </div>

              {/* Theme Selector Row — Light / Dark only (auto OS by default) */}
              <div className="flex items-center justify-between gap-3 px-4 py-3">
                <div className="min-w-0">
                  <div className="text-xs font-bold text-foreground">ظاهر برنامه</div>
                  <div className="text-[11px] text-muted-foreground">روشن یا تاریک</div>
                </div>
                <div
                  role="group"
                  aria-label="انتخاب پوسته"
                  className="inline-flex shrink-0 items-center rounded-xl border border-border bg-muted p-0.5"
                >
                  <button
                    type="button"
                    onClick={() => setTheme("light")}
                    aria-pressed={mounted && !dark}
                    className={`inline-flex min-h-[34px] items-center gap-1.5 rounded-lg px-3 text-[11.5px] font-bold transition-colors cursor-pointer ${
                      mounted && !dark
                        ? "bg-card text-foreground shadow-xs"
                        : "text-foreground/75"
                    }`}
                  >
                    <Sun className="h-3.5 w-3.5" />
                    <span>روشن</span>
                  </button>
                  <button
                    type="button"
                    onClick={() => setTheme("dark")}
                    aria-pressed={mounted && dark}
                    className={`inline-flex min-h-[34px] items-center gap-1.5 rounded-lg px-3 text-[11.5px] font-bold transition-colors cursor-pointer ${
                      mounted && dark
                        ? "bg-card text-foreground shadow-xs"
                        : "text-foreground/75"
                    }`}
                  >
                    <Moon className="h-3.5 w-3.5" />
                    <span>تاریک</span>
                  </button>
                </div>
              </div>

              {/* VAT Switch Row */}
              <label className="flex items-center justify-between gap-3 px-4 py-3 cursor-pointer">
                <div className="min-w-0">
                  <div className="text-xs font-bold text-foreground">محاسبه ۱۰٪ مالیات ارزش افزوده</div>
                  <div className="text-[11px] text-muted-foreground">اعمال نرخ پرداخت درگاه روی قیمت‌ها</div>
                </div>
                <Switch
                  checked={vat}
                  onCheckedChange={() =>
                    updateState((prev) => ({ ...prev, vat: !prev.vat }), { persistPrefs: true })
                  }
                />
              </label>

              {/* Metric Row */}
              <div className="flex items-center justify-between gap-3 px-4 py-3">
                <div className="min-w-0">
                  <div className="text-xs font-bold text-foreground">معیار ارزش</div>
                  <div className="text-[11px] text-muted-foreground">مبنای رتبه‌بندی بسته‌ها</div>
                </div>
                <div
                  role="group"
                  aria-label="معیار ارزش"
                  className="inline-flex shrink-0 items-center rounded-xl border border-border bg-muted p-0.5"
                >
                  <button
                    type="button"
                    onClick={() =>
                      updateState((prev) => ({ ...prev, metric: "pergb" }), { persistPrefs: true })
                    }
                    aria-pressed={metric === "pergb"}
                    className={`min-h-[34px] rounded-lg px-2.5 text-[11.5px] font-bold transition-colors cursor-pointer ${
                      metric === "pergb"
                        ? "bg-card text-foreground shadow-xs"
                        : "text-foreground/75"
                    }`}
                  >
                    ت/گیگ
                  </button>
                  <button
                    type="button"
                    onClick={() =>
                      updateState((prev) => ({ ...prev, metric: "pergbday" }), { persistPrefs: true })
                    }
                    aria-pressed={metric === "pergbday"}
                    className={`min-h-[34px] rounded-lg px-2.5 text-[11.5px] font-bold transition-colors cursor-pointer ${
                      metric === "pergbday"
                        ? "bg-card text-foreground shadow-xs"
                        : "text-foreground/75"
                    }`}
                  >
                    گیگ×روز
                  </button>
                </div>
              </div>

              {/* View Mode Row */}
              <div className="flex items-center justify-between gap-3 px-4 py-3">
                <div className="min-w-0">
                  <div className="text-xs font-bold text-foreground">نمای فهرست بسته‌ها</div>
                  <div className="text-[11px] text-muted-foreground">کارت‌های لمسی یا جدول فشرده</div>
                </div>
                <div
                  role="group"
                  aria-label="نمای فهرست"
                  className="inline-flex shrink-0 items-center rounded-xl border border-border bg-muted p-0.5"
                >
                  <button
                    type="button"
                    onClick={() =>
                      updateState((prev) => ({ ...prev, view: "grid" }), { persistPrefs: true })
                    }
                    aria-pressed={view === "grid"}
                    className={`inline-flex min-h-[34px] items-center gap-1 rounded-lg px-2.5 text-[11.5px] font-bold transition-colors cursor-pointer ${
                      view === "grid"
                        ? "bg-card text-foreground shadow-xs"
                        : "text-foreground/75"
                    }`}
                  >
                    <LayoutGrid className="h-3.5 w-3.5" />
                    <span>کارتی</span>
                  </button>
                  <button
                    type="button"
                    onClick={() =>
                      updateState((prev) => ({ ...prev, view: "table" }), { persistPrefs: true })
                    }
                    aria-pressed={view === "table"}
                    className={`inline-flex min-h-[34px] items-center gap-1 rounded-lg px-2.5 text-[11.5px] font-bold transition-colors cursor-pointer ${
                      view === "table"
                        ? "bg-card text-foreground shadow-xs"
                        : "text-foreground/75"
                    }`}
                  >
                    <Table2 className="h-3.5 w-3.5" />
                    <span>جدولی</span>
                  </button>
                </div>
              </div>
            </div>
          </section>
        )}

        {/* ── Summary Strip (Desktop/Large 4-cell KPI bar) ── */}
        <section
          aria-label="خلاصه مقایسه"
          className="mt-4 hidden overflow-hidden rounded-xl border border-border bg-card shadow-xs lg:block"
        >
          <div className="grid grid-cols-1 divide-y divide-border sm:grid-cols-2 sm:divide-y-0 lg:grid-cols-4 lg:divide-x lg:divide-x-reverse">
            {/* Cell 1: Best paid package */}
            <div className="p-4 sm:border-b lg:border-b-0 border-border sm:border-e">
              <div className="text-[11px] font-bold text-muted-foreground">بهترین ارزش فعلی</div>
              {bestPaid ? (
                <>
                  <div className="mt-1 line-clamp-1 text-[14px] font-bold text-foreground">
                    {bestPaid.providerName} · {bestPaid.title}
                  </div>
                  <div className="mt-1.5 flex flex-wrap items-baseline gap-x-2 text-sm">
                    <span className="fa-num text-lg font-extrabold text-primary">
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
            <div className="p-4 sm:border-b lg:border-b-0 border-border">
              <div className="text-[11px] font-bold text-muted-foreground">میانه و بازه تعرفه‌ها</div>
              {marketStats ? (
                <>
                  <div className="mt-1 flex items-baseline gap-1.5">
                    <span className="fa-num text-lg font-extrabold text-foreground">
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
            <div className="p-4 sm:border-e border-border">
              <div className="text-[11px] font-bold text-muted-foreground">بسته‌های فعال و داده</div>
              <div className="fa-num mt-1 text-lg font-extrabold text-foreground">
                {faDigits(rows.length)}{" "}
                <span className="text-xs font-medium text-muted-foreground">
                  بسته از {faDigits(inCat.length)}
                </span>
              </div>
              <div className="mt-1.5 flex items-center gap-1.5 text-[11.5px] text-muted-foreground">
                <Database className="h-3.5 w-3.5 shrink-0" />
                <a href="#sources" className="truncate hover:text-primary hover:underline">
                  تازه‌ترین داده: {lastFetch} (جزئیات اپراتورها ↓)
                </a>
              </div>
            </div>

            {/* Cell 4: Tax Status */}
            <div className="p-4">
              <div className="flex items-center justify-between gap-2">
                <span className="text-[11px] font-bold text-muted-foreground">محاسبه مالیات</span>
                <button
                  type="button"
                  onClick={() =>
                    updateState((prev) => ({ ...prev, vat: !prev.vat }), { persistPrefs: true })
                  }
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

        {/* ── Two-Column Workspace: Sticky Sidebar (lg+) + Results ── */}
        <div
          className={`${
            mobileSubTab === "browse" ? "grid" : "hidden lg:grid"
          } mt-3 lg:mt-5 grid-cols-1 items-start gap-6 lg:grid-cols-[296px_minmax(0,1fr)]`}
        >
          {/* Desktop Filter Sidebar */}
          <aside
            aria-label="فیلترهای جست‌وجو"
            className="hidden lg:block lg:sticky lg:top-20 rounded-xl border border-border bg-card p-5 shadow-xs max-h-[calc(100dvh-6rem)] overflow-y-auto rail"
          >
            <FilterPanel {...filterProps} />
          </aside>

          {/* Main Results Column */}
          <div className="min-w-0 space-y-3 sm:space-y-4">
            {/* Workspace Toolbar (Desktop/Large; mobile uses Search + Chip Rail + Settings tab) */}
            <div className="hidden lg:flex flex-wrap items-center justify-between gap-2 rounded-xl border border-border bg-card px-3.5 py-2.5 shadow-xs">
              <div className="flex flex-wrap items-center gap-2">
                {/* Metric Segmented Switch (desktop/tablet; on mobile inside Filter Drawer) */}
                <TooltipProvider>
                  <Tooltip>
                    <TooltipTrigger asChild>
                      <div
                        role="group"
                        aria-label="معیار ارزش"
                        className="hidden sm:inline-flex items-center rounded-lg border border-border bg-muted p-0.5"
                      >
                        <button
                          type="button"
                          onClick={() =>
                            updateState(
                              (prev) => ({ ...prev, metric: "pergb" }),
                              { persistPrefs: true },
                            )
                          }
                          aria-pressed={metric === "pergb"}
                          className={`min-h-[34px] rounded-md px-2.5 text-xs font-bold transition-colors whitespace-nowrap shrink-0 cursor-pointer ${
                            metric === "pergb"
                              ? "border border-border/80 bg-card text-foreground shadow-xs"
                              : "border border-transparent text-foreground/75 hover:text-foreground"
                          }`}
                        >
                          ت/گیگ
                        </button>
                        <button
                          type="button"
                          onClick={() =>
                            updateState(
                              (prev) => ({ ...prev, metric: "pergbday" }),
                              { persistPrefs: true },
                            )
                          }
                          aria-pressed={metric === "pergbday"}
                          className={`min-h-[34px] rounded-md px-2.5 text-xs font-bold transition-colors whitespace-nowrap shrink-0 cursor-pointer ${
                            metric === "pergbday"
                              ? "border border-border/80 bg-card text-foreground shadow-xs"
                              : "border border-transparent text-foreground/75 hover:text-foreground"
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
                        onClick={() =>
                          updateState(
                            (prev) => ({ ...prev, vat: !prev.vat }),
                            { persistPrefs: true },
                          )
                        }
                        aria-pressed={vat}
                        className={`inline-flex min-h-[36px] items-center gap-1.5 rounded-lg border px-2.5 sm:px-3 text-xs font-bold transition-colors whitespace-nowrap shrink-0 cursor-pointer ${
                          vat
                            ? "border-amber-600/50 bg-amber-500/15 text-amber-800 dark:border-amber-400/50 dark:text-amber-300"
                            : "border-border bg-muted/55 text-foreground hover:bg-muted"
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

                {/* Need Calculator Toggle (desktop toolbar; on mobile in Bottom Nav Bar) */}
                <button
                  type="button"
                  onClick={() => setCalcOpen((prev) => !prev)}
                  aria-expanded={calcOpen}
                  className={`hidden lg:inline-flex min-h-[36px] items-center gap-1.5 rounded-lg border px-3 text-xs font-bold transition-colors whitespace-nowrap shrink-0 cursor-pointer ${
                    calcOpen
                      ? "border-primary/60 bg-primary/15 text-primary"
                      : "border-border bg-muted/55 text-foreground hover:bg-muted"
                  }`}
                >
                  <Calculator className="h-3.5 w-3.5" />
                  <span>محاسبه نیاز من</span>
                </button>
              </div>

              <div className="flex flex-wrap items-center gap-2 ms-auto">
                {/* Sort Select */}
                <Select
                  value={sort}
                  onValueChange={(v) =>
                    updateState((prev) => ({ ...prev, sort: v as SortKey }))
                  }
                >
                  <SelectTrigger className="h-9 min-w-[155px] sm:min-w-[165px] border-input bg-card text-xs font-bold" dir="rtl">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent dir="rtl">
                    <SelectItem value="best">مرتب‌سازی: بهترین ارزش</SelectItem>
                    <SelectItem value="price">مرتب‌سازی: کمترین قیمت</SelectItem>
                    <SelectItem value="gb">مرتب‌سازی: بیشترین حجم</SelectItem>
                    <SelectItem value="days">مرتب‌سازی: بیشترین مدت</SelectItem>
                  </SelectContent>
                </Select>

                {/* View Switcher (desktop/tablet; on mobile inside Filter Drawer) */}
                <div
                  role="group"
                  aria-label="نحوه نمایش"
                  className="hidden sm:inline-flex items-center rounded-lg border border-border bg-muted p-0.5"
                >
                  <button
                    type="button"
                    onClick={() =>
                      updateState((prev) => ({ ...prev, view: "grid" }), { persistPrefs: true })
                    }
                    aria-pressed={view === "grid"}
                    aria-label="نمای کارتی"
                    className={`inline-flex h-8 items-center gap-1.5 rounded-md px-2.5 text-xs font-bold transition-colors whitespace-nowrap shrink-0 cursor-pointer ${
                      view === "grid"
                        ? "border border-border/80 bg-card text-foreground shadow-xs"
                        : "border border-transparent text-foreground/75 hover:text-foreground"
                    }`}
                  >
                    <LayoutGrid className="h-3.5 w-3.5" />
                    <span>کارتی</span>
                  </button>
                  <button
                    type="button"
                    onClick={() =>
                      updateState((prev) => ({ ...prev, view: "table" }), { persistPrefs: true })
                    }
                    aria-pressed={view === "table"}
                    aria-label="نمای جدولی"
                    className={`inline-flex h-8 items-center gap-1.5 rounded-md px-2.5 text-xs font-bold transition-colors whitespace-nowrap shrink-0 cursor-pointer ${
                      view === "table"
                        ? "border border-border/80 bg-card text-foreground shadow-xs"
                        : "border border-transparent text-foreground/75 hover:text-foreground"
                    }`}
                  >
                    <Table2 className="h-3.5 w-3.5" />
                    <span>جدولی</span>
                  </button>
                </div>
              </div>
            </div>

            {/* Active Filter Chips Strip */}
            <ActiveFilterChips
              query={query}
              onClearQuery={() => updateState((prev) => ({ ...prev, query: "" }))}
              cat={cat}
              homeTech={homeTech}
              onClearHomeTech={() => updateState((prev) => ({ ...prev, homeTech: "all" }))}
              liveEntries={liveEntries}
              provSel={provSel}
              onToggleProvider={toggleProvider}
              onSelectAllProviders={() =>
                updateState((prev) => ({ ...prev, provSel: new Set(liveKeysOf(prev.cat)) }))
              }
              kinds={kinds}
              onToggleKind={toggleKind}
              durations={durations}
              onToggleDuration={toggleDuration}
              maxPrice={effectiveMaxPrice}
              vat={vat}
              onClearMaxPrice={() => updateState((prev) => ({ ...prev, maxPrice: null }))}
              minGB={minGB}
              onClearMinGB={() => updateState((prev) => ({ ...prev, minGB: 0 }))}
              onlyDisc={onlyDisc}
              onClearOnlyDisc={() => updateState((prev) => ({ ...prev, onlyDisc: false }))}
              hideFree={hideFree}
              onClearHideFree={() => updateState((prev) => ({ ...prev, hideFree: false }))}
              hidePortalOnly={hidePortalOnly}
              onClearHidePortalOnly={() =>
                updateState((prev) => ({ ...prev, hidePortalOnly: false }))
              }
              includedRestrictions={includedRestrictions}
              onToggleRestriction={toggleRestriction}
              sort={sort}
              onResetSort={() => updateState((prev) => ({ ...prev, sort: "best" }))}
              onResetAll={reset}
            />

            {/* Interactive Need / Multi-pack Calculator (Desktop inline; mobile has dedicated Calc tab) */}
            {calcOpen && liveEntries.length > 0 && (
              <div id="need-calculator" className="hidden lg:block scroll-mt-20">
                <NeedCalculator
                  packages={calcPool}
                  vat={vat}
                  dark={dark}
                  onClose={() => setCalcOpen(false)}
                />
              </div>
            )}

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
                <OperatorBestRow
                  rows={rows}
                  metric={metric}
                  vat={vat}
                  dark={dark}
                  onFocusProvider={(key) => {
                    setVisibleLimit(PAGE_STEP);
                    updateState((prev) => ({ ...prev, provSel: new Set([key]) }));
                  }}
                />

                {view === "grid" ? (
                  <div className="grid grid-cols-1 gap-2.5 sm:gap-3 md:grid-cols-2 xl:grid-cols-3">
                    {visibleRows.map((r) => {
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
                  </div>
                ) : (
                  <PkgTable
                    rows={visibleRows}
                    dark={dark}
                    metric={metric}
                    vat={vat}
                    compareIds={compareIds}
                    onToggleCompare={toggleCompare}
                  />
                )}

                {rows.length > visibleLimit && (
                  <div className="flex flex-wrap items-center justify-center gap-2.5 pt-2">
                    <Button
                      variant="outline"
                      onClick={() => setVisibleLimit((prev) => prev + PAGE_STEP)}
                      className="fa-num h-10 rounded-xl px-4 text-xs font-bold"
                    >
                      نمایش {faDigits(Math.min(PAGE_STEP, rows.length - visibleLimit))} بسته دیگر
                    </Button>
                    <Button
                      variant="ghost"
                      onClick={() => setVisibleLimit(rows.length)}
                      className="fa-num h-10 rounded-xl px-4 text-xs font-bold text-muted-foreground hover:text-foreground"
                    >
                      نمایش همه ({faDigits(rows.length)} بسته)
                    </Button>
                  </div>
                )}

                {awaitingEntries.length > 0 && <AwaitingStrip entries={awaitingEntries} />}
              </>
            )}
          </div>
        </div>

        {/* Dedicated Operator Notices Section (always on lg+; inside Info tab on mobile) */}
        <div className={mobileSubTab === "info" ? "block mt-4 lg:mt-0" : "hidden lg:block"}>
          <OperatorNoticesSection entries={liveEntries.filter((e) => provSel.has(e.key))} />
        </div>
      </main>

      {/* ── Footer (always on lg+; inside Info tab on mobile) ── */}
      <footer
        id="sources"
        className={`${
          mobileSubTab === "info" ? "block" : "hidden lg:block"
        } mt-auto border-t border-border/80 bg-card/50 pb-24 lg:pb-[max(1.5rem,env(safe-area-inset-bottom))]`}
      >
        <div className="mx-auto w-full max-w-7xl px-4 py-8 sm:px-6 space-y-6">
          <ProviderSourcesSection mounted={mounted} />

          <Separator />

          <p className="text-xs leading-6 text-muted-foreground">
            قیمت‌ها همان اعداد درج‌شده روی کارت‌های سایت رسمی هر ارائه‌دهنده است (بدون مالیات)؛
            درگاه پرداخت ۱۰٪ مالیات بر ارزش افزوده اضافه می‌کند — با کلید «مالیات» همه ارقام ×۱٫۱
            می‌شود. رتبه‌بندی بر اساس تومان بر گیگابایت است؛ هرچه کمتر، بهتر. داده‌ها با{" "}
            <span className="font-mono text-foreground/85">update/fetch-providers.mjs</span> از سایت
            هر ارائه‌دهنده تازه می‌شود. بسته‌های بدون حجم داده (صوتی) خارج از رتبه‌بندی‌اند. راهنمای
            افزودن ارائه‌دهنده‌های جدید:{" "}
            <a
              className="font-bold text-primary hover:underline"
              href="https://github.com/M-Zoghi/baste-yab/blob/main/DATA.md"
              target="_blank"
              rel="noreferrer"
            >
              DATA.md
            </a>
            .
          </p>
        </div>
      </footer>

      {/* ── Floating Compare Bar (Desktop lg+; mobile uses Bottom Nav Compare tab) ── */}
      {compareItems.length > 0 && (
        <div className="hidden lg:block fixed inset-x-0 bottom-5 z-40 mx-auto w-fit max-w-[calc(100vw-2rem)]">
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

      {/* ── Mobile Filter Drawer (< lg, opened via Filter tab in bottom navigator) ── */}
      <Drawer open={filterDrawerOpen} onOpenChange={setFilterDrawerOpen}>
        <DrawerContent className="mx-auto max-h-[86dvh] max-w-md border-border bg-card lg:hidden" dir="rtl">
          <div className="border-b border-border px-5 py-3">
            <DrawerTitle className="text-start text-base font-bold">
              فیلتر بسته‌ها
            </DrawerTitle>
            <DrawerDescription className="fa-num text-start text-xs">
              {faDigits(rows.length)} بسته از {faDigits(inCat.length)}
            </DrawerDescription>
          </div>
          <div className="overflow-y-auto px-5 pb-8 pt-4 space-y-5">
            <FilterPanel {...filterProps} hideSearch />

            <Button
              onClick={() => setFilterDrawerOpen(false)}
              className="h-11 w-full rounded-2xl font-bold cursor-pointer"
            >
              نمایش {faDigits(rows.length)} بسته
            </Button>
          </div>
        </DrawerContent>
      </Drawer>

      {/* ── Native-Style 5-Tab Mobile Bottom Navigation Bar (< lg) ── */}
      <MobileBottomNav
        activeTab={activeMobileTab}
        filterOpen={filterDrawerOpen}
        activeFilters={activeFilters}
        compareCount={compareItems.length}
        onSelectTab={handleSelectMobileTab}
        onOpenFilters={() => {
          setCompareOpen(false);
          if (mobileSubTab !== "browse") {
            setMobileSubTab("browse");
          }
          setFilterDrawerOpen((prev) => !prev);
        }}
      />

      {/* ── Floating Back-to-Top Button ── */}
      {showScrollTop && (
        <button
          type="button"
          onClick={() => window.scrollTo({ top: 0, behavior: "smooth" })}
          aria-label="بازگشت به بالا"
          className="fixed bottom-[5.25rem] end-4 z-30 inline-flex items-center gap-1.5 rounded-xl border border-border bg-card/95 px-3 py-2 text-xs font-bold text-foreground shadow-lg backdrop-blur-md transition-colors hover:bg-muted cursor-pointer lg:bottom-5"
        >
          <ArrowUp className="h-3.5 w-3.5 text-primary" />
          <span className="hidden sm:inline">بازگشت به بالا</span>
        </button>
      )}
    </div>
  );
}
