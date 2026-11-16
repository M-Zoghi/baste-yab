/* src/lib/providers.ts — provider registry + data loading + derived metrics.
 * Data files (src/data/providers/*.json) are refreshed by update/fetch-providers.mjs
 * and committed; the app imports them statically (static-export friendly, no
 * runtime fetch, works offline and behind any CDN). */

import samantelDoc from "@/data/providers/samantel.json";
import aptelDoc from "@/data/providers/aptel.json";
import mciDoc from "@/data/providers/mci.json";
import mciModemDoc from "@/data/providers/mci-modem.json";
import irancellDoc from "@/data/providers/irancell.json";
import irancellTdlteDoc from "@/data/providers/irancell-tdlte.json";
import rightelDoc from "@/data/providers/rightel.json";
import rightelTdlteDoc from "@/data/providers/rightel-tdlte.json";

export type Category = "home" | "mobile";
export type HomeTech = "modem" | "fixed";
export type Kind = "internet" | "combo" | "roaming";
export type RestrictionTag = "night" | "morning" | "hourly" | "domestic" | "newUser" | "youth";
export type UpdateMode = "auto" | "hybrid" | "manual";

export interface Pkg {
  id: string;
  title: string;
  kind?: Kind;              // internet (default) | combo (voice+sms) | roaming
  domesticOnly?: boolean;   // e.g. MCI Anarestan — domestic Iranian traffic only
  portalOnly?: boolean;     // sold ONLY via the operator app/portal (MCI همراه من / my.mci.ir, Irancell ایرانسل من / my.irancell.ir), not the public web shop
  lastSeen?: string;         // portal packs (irancell-my-* / aptel-my-* / mci-my-*, mci-modem-*): ISO date of the last capture that saw this pack — union ledger across per-customer portal captures; not rendered
  gb: number;
  days: number;
  price: number;            // toman, pre-tax (as printed on the provider card)
  oldPrice: number | null;  // pre-discount price, toman
  discountPct: number | null;
  group: string | null;
  regulatoryCode: string | null;
  ussd?: string | null;
  buyUrl?: string;          // per-package buy link (portal-only packs deep-link to the operator portal)
  note: string | null;
}

export interface PersonalizedSample {
  title: string;
  gb: number;
  days: number;
  price: number;
  oldPrice: number | null;
  discountPct: number | null;
}

export interface Personalized {
  applies: boolean;         // prices in this doc are PUBLIC (logged-out); logged-in prices may differ
  note: string;
  source?: string;
  capturedAt?: string;      // ISO capture time of the portal HAR (freshness gate for re-feeds)
  samples: PersonalizedSample[];
}

export interface ExcludedPkg {
  title: string;
  reason: string;
}

export interface ProviderDoc {
  schema: number;
  provider: {
    id: string;
    nameFa: string;
    nameEn: string;
    category: Category;
    tech: string;
    regions: string[];
    accent: string;
    site: string;
    buyUrl: string;
  };
  source: {
    kind: string;
    endpoint: string;
    fetchedAt: string;
    parts?: Record<string, { kind: string; endpoint: string; fetchedAt: string }>;
  };
  prices: { unit: string; includesTax: boolean; apiUnit?: string };
  personalized?: Personalized;
  packages: Pkg[];
  excluded: ExcludedPkg[];
}

export interface Entry {
  key: string;              // unique entry id (provider × category)
  nameFa: string;
  nameEn: string;
  category: Category;
  homeTech?: HomeTech;      // for category === "home": wireless modem (TD-LTE/5G) vs wired (ADSL/fiber)
  tech: string;
  regions: string[];
  accent: string;
  site: string;
  buyUrl?: string;
  status: "live" | "awaiting";
  updateMode: UpdateMode;
  updateNote: string;
  awaitingNote?: string;     // what we need to unlock it (shown in UI/DATA.md)
  doc?: ProviderDoc;
  personalized?: Personalized; // surfaced from doc for the UI notice
}

const DOCS: Record<string, ProviderDoc> = {
  samantel: samantelDoc as ProviderDoc,
  aptel: aptelDoc as ProviderDoc,
  mci: mciDoc as ProviderDoc,
  "mci-modem": mciModemDoc as ProviderDoc,
  irancell: irancellDoc as ProviderDoc,
  "irancell-tdlte": irancellTdlteDoc as ProviderDoc,
  rightel: rightelDoc as ProviderDoc,
  "rightel-tdlte": rightelTdlteDoc as ProviderDoc,
};

export const ENTRIES: Entry[] = [
  /* ── home (ثابت) ── */
  {
    key: "tci", nameFa: "مخابرات ایران", nameEn: "TCI", category: "home", homeTech: "fixed",
    tech: "ADSL/VDSL/فیبر", regions: ["سراسری"], accent: "#14b8a6",
    site: "https://tci.ir", status: "awaiting",
    updateMode: "manual",
    updateNote: "آداپتور هنوز نوشته نشده — در انتظار اولین فایل HAR/JSON",
    awaitingNote: "یک فایل HAR یا JSON از صفحه تعرفه‌های مخابرات لازم است تا آداپتور نوشته شود",
  },
  {
    key: "asiatech", nameFa: "آسیاتک", nameEn: "Asiatech", category: "home", homeTech: "fixed",
    tech: "ADSL/VDSL/فیبر", regions: ["سراسری"], accent: "#f97316",
    site: "https://www.asiatech.ir", status: "awaiting",
    updateMode: "manual",
    updateNote: "آداپتور هنوز نوشته نشده — در انتظار اولین فایل HAR/JSON",
    awaitingNote: "یک فایل HAR یا JSON از پنل یا سایت آسیاتک لازم است تا آداپتور نوشته شود",
  },
  {
    key: "irancell-tdlte", nameFa: "ایرانسل (ثابت)", nameEn: "Irancell TD-LTE", category: "home", homeTech: "modem",
    tech: "TD-LTE", regions: ["سراسری"], accent: "#eab308",
    site: "https://www.irancell.ir", buyUrl: "https://irancell.ir/p/305229/td-lte-internet-packages",
    status: "live", doc: DOCS["irancell-tdlte"],
    updateMode: "auto",
    updateNote: "بروزرسانی خودکار روزانه (GitHub Actions)",
  },
  {
    key: "rightel-tdlte", nameFa: "رایتل (مودم)", nameEn: "Rightel Modem", category: "home", homeTech: "modem",
    tech: "سیم‌کارت دیتا · 4G/5G", regions: ["سراسری"], accent: "#A72B77",
    site: "https://www.rightel.ir", buyUrl: "https://package.rightel.ir/packagesList",
    status: "live", doc: DOCS["rightel-tdlte"],
    updateMode: "manual",
    updateNote: "بروزرسانی دستی از داخل ایران (هم‌زمان با رایتل همراه)",
  },
  {
    key: "mci-modem", nameFa: "همراه اول (مودم)", nameEn: "MCI Modem", category: "home", homeTech: "modem",
    tech: "سیم‌کارت دیتا · 4G/5G", regions: ["سراسری"], accent: "#0095da",
    site: "https://mci.ir", buyUrl: "https://my.mci.ir/panel/packages/list/modem_bundle",
    status: "live", doc: DOCS["mci-modem"],
    updateMode: "manual",
    updateNote: "بروزرسانی دستی از داخل ایران (هم‌زمان با همراه اول)",
  },
  /* ── mobile (همراه) ── */
  {
    key: "mci", nameFa: "همراه اول", nameEn: "MCI", category: "mobile",
    tech: "4G/5G", regions: ["سراسری"], accent: "#0095da",
    site: "https://mci.ir", buyUrl: "https://shop.mci.ir/products/19/internet-package",
    status: "live", doc: DOCS.mci,
    updateMode: "hybrid",
    updateNote: "ادغام فروشگاه + پنل همراه من (۶۸ بسته): دستی از ایران · صفحه اصلی: خودکار روزانه",
  },
  {
    key: "samantel", nameFa: "سامانتل", nameEn: "Samantel", category: "mobile",
    tech: "اپراتور مجازی · 4G/5G · TD-LTE", regions: ["سراسری"], accent: "#EA5B0C",
    site: "https://samantel.ir", buyUrl: "https://payment.samantel.ir/package",
    status: "live", doc: DOCS.samantel,
    updateMode: "auto",
    updateNote: "بروزرسانی خودکار روزانه (GitHub Actions)",
  },
  {
    key: "aptel", nameFa: "آپتل", nameEn: "Aptel", category: "mobile",
    tech: "اپراتور مجازی 4G/5G", regions: ["سراسری"], accent: "#db3328",
    site: "https://www.aptel.ir", buyUrl: "https://www.aptel.ir/packages",
    status: "live", doc: DOCS.aptel, personalized: DOCS.aptel?.personalized,
    updateMode: "hybrid",
    updateNote: "ادغام فروشگاه عمومی + اپ «آپتل من» (۵۵ بسته): عمومی خودکار روزانه · اپ دستی با HAR",
  },
  {
    key: "irancell", nameFa: "ایرانسل", nameEn: "Irancell", category: "mobile",
    tech: "4G/5G", regions: ["سراسری"], accent: "#eab308",
    site: "https://www.irancell.ir", buyUrl: "https://irancell.ir/o/1001/mobile-internet-packages",
    status: "live", doc: DOCS.irancell,
    updateMode: "hybrid",
    updateNote: "ادغام وب‌سایت + اپ ایرانسل‌من (۸۸ بسته): سایت خودکار روزانه · اپ دستی از ایران",
  },
  {
    key: "rightel", nameFa: "رایتل", nameEn: "Rightel", category: "mobile",
    tech: "4G/5G", regions: ["سراسری"], accent: "#A72B77",
    site: "https://www.rightel.ir", buyUrl: "https://package.rightel.ir/packagesList",
    status: "live", doc: DOCS.rightel,
    updateMode: "manual",
    updateNote: "بروزرسانی دستی از داخل ایران (API از خارج ایران مسدود است)",
  },
];

export const VAT_RATE = 0.1;

/* Operator app/portal branding for the «فروش فقط از …» badges — each provider
 * that sells portal-only packs names its own app so the UI text stays exact. */
export const PORTAL_AVAILABILITY_NOTE = "ممکن است برای همه مشترکان در دسترس نباشد";

export const APTEL_PORTAL_PAGE = "https://my.aptel.ir/packages"; // «آپتل من» buy page — portal-only packs deep-link here

export const PORTAL_LABELS: Record<string, { badge: string; hint: string; note?: string }> = {
  aptel: {
    badge: "فروش فقط از اپ آپتل من / my.aptel.ir",
    hint: "خرید و قیمت ارزان فقط با ورود به حساب در اپ آپتل من (my.aptel.ir) — در فروشگاه عمومی www.aptel.ir نیست",
    // replaces the generic availability note under the badge: the price
    // exists only for logged-in subscribers — cheaper if they log in
    note: "با ورود به اپ آپتل من ارزان‌تر است — بدون ورود، فروشگاه عمومی این بسته را ندارد",
  },
  mci: {
    badge: "فروش فقط از اپ همراه من / my.mci.ir",
    hint: `خرید از اپلیکیشن همراه من یا my.mci.ir — در فروشگاه آنلاین shop.mci.ir نیست (${PORTAL_AVAILABILITY_NOTE})`,
  },
  "mci-modem": {
    badge: "فروش فقط از اپ همراه من / my.mci.ir",
    hint: `خرید از اپلیکیشن همراه من یا my.mci.ir — در فروشگاه آنلاین shop.mci.ir نیست (${PORTAL_AVAILABILITY_NOTE})`,
  },
  irancell: {
    badge: "فروش فقط از اپ ایرانسل من / my.irancell.ir",
    hint: `خرید از اپلیکیشن ایرانسل من یا my.irancell.ir — در فروشگاه آنلاین irancell.ir نیست (${PORTAL_AVAILABILITY_NOTE})`,
  },
};
const FALLBACK_PORTAL_LABEL = { badge: "فروش فقط از اپ اپراتور", hint: PORTAL_AVAILABILITY_NOTE } as const;

export interface DerivedPkg extends Pkg {
  entryKey: string;
  providerName: string;
  providerAccent: string;
  homeTech: HomeTech | null;
  buyUrl: string;
  portalLabel: string | null;  // «فروش فقط از …» badge text (portal-only packs)
  portalHint: string | null;   // buy-button tooltip (portal-only packs)
  portalNote: string | null;   // badge-box note line (falls back to the generic availability note)
  fetchedAt: string;
  sourceKind: string;
  kind: Kind; // materialized with default
  domesticOnly: boolean;
  portalOnly: boolean;
  restrictions: RestrictionTag[];
}

export interface Row extends DerivedPkg {
  value: number;        // active metric value (with VAT factor applied)
  perGB: number;        // raw ت/گیگ (no VAT)
  perGBDay: number;     // raw ت/(گیگ×روز) (no VAT)
  rank: number;
  count: number;
  worsePct: number | null; // vs best PAID (free packs rank first)
  isBest: boolean;
  isWorst: boolean;
  isFree: boolean;
}

export function allPackages(): DerivedPkg[] {
  const out: DerivedPkg[] = [];
  for (const e of ENTRIES) {
    if (e.status !== "live" || !e.doc) continue;
    for (const p of e.doc.packages) {
      const text = `${p.title} ${p.note ?? ""} ${p.group ?? ""}`;
      const domesticOnly = Boolean(
        p.domesticOnly || /انارستان|فقط اینترنت داخلی/.test(text),
      );
      const restrictions: RestrictionTag[] = [];
      if (/شبانه|شبانت|بامداد|۲ تا ۷|2 تا 7/.test(text)) restrictions.push("night");
      if (/صبحانت|صبحانه|۶ صبح تا ۱۲|۶ تا ۱۲|6 تا 12/.test(text)) restrictions.push("morning");
      if (/ساعتی|ساعته/.test(text)) restrictions.push("hourly");
      if (domesticOnly) restrictions.push("domestic");
      if (/مشترکین جدید/.test(text)) restrictions.push("newUser");
      if (/زیر ۲۸ سال/.test(text)) restrictions.push("youth");

      const portalOnly = Boolean(p.portalOnly);
      const portalInfo = portalOnly ? (PORTAL_LABELS[e.key] ?? FALLBACK_PORTAL_LABEL) : null;

      out.push({
        ...p,
        kind: p.kind ?? "internet",
        domesticOnly,
        portalOnly,
        portalLabel: portalInfo ? portalInfo.badge : null,
        portalHint: portalInfo ? portalInfo.hint ?? null : null,
        portalNote: portalInfo ? portalInfo.note ?? null : null,
        restrictions,
        entryKey: e.key,
        providerName: e.nameFa,
        providerAccent: e.accent,
        homeTech: e.homeTech ?? null,
        buyUrl: p.buyUrl ?? e.buyUrl ?? e.site,
        fetchedAt: e.doc.source.fetchedAt,
        sourceKind: e.doc.source.kind,
      });
    }
  }
  return out;
}

export type Metric = "pergb" | "pergbday";
export type SortKey = "best" | "price" | "gb" | "days";

export interface RankOpts {
  metric: Metric;
  vat: boolean;
  sort: SortKey;
}

/** Rank + relative-value metadata for a filtered list (mirrors the userscript rules). */
export function rankRows(list: DerivedPkg[], opts: RankOpts): Row[] {
  const f = opts.vat ? 1 + VAT_RATE : 1;
  const val = (p: DerivedPkg) =>
    opts.metric === "pergb"
      ? (p.price * f) / p.gb
      : p.days > 0
        ? (p.price * f) / (p.gb * p.days)
        : Infinity;

  const cmp =
    opts.sort === "best"
      ? (a: DerivedPkg, b: DerivedPkg) => val(a) - val(b)
      : opts.sort === "price"
        ? (a: DerivedPkg, b: DerivedPkg) => a.price * f - b.price * f
        : opts.sort === "gb"
          ? (a: DerivedPkg, b: DerivedPkg) => b.gb - a.gb
          : (a: DerivedPkg, b: DerivedPkg) => b.days - a.days;

  const sorted = [...list].sort(cmp);
  const values = sorted.map(val);
  const paid = values.filter((v) => v > 0 && isFinite(v));
  const refMin = paid.length ? Math.min(...paid) : 0;
  const min = values.length ? Math.min(...values) : 0;
  const max = values.length ? Math.max(...values) : 0;

  const rows: Row[] = [];
  let prev: number | null = null;
  sorted.forEach((p, i) => {
    const v = val(p);
    const rank =
      i > 0 && prev != null && Math.abs(v - prev) < 1e-9 ? rows[i - 1].rank : i + 1;
    prev = v;
    rows.push({
      ...p,
      perGB: p.price / p.gb,
      perGBDay: p.days > 0 ? p.price / (p.gb * p.days) : null as unknown as number,
      value: v,
      rank,
      count: sorted.length,
      worsePct: v > 0 && refMin > 0 ? (v / refMin - 1) * 100 : null,
      isBest: rank === 1,
      isWorst:
        sorted.length >= 5 && i === sorted.length - 1 && isFinite(max) && Math.abs(v - max) < 1e-9,
      isFree: p.price === 0,
    });
  });
  // colour scale position (0 = best, 1 = worst) for the value bar
  for (const r of rows) {
    (r as Row & { t?: number }).t =
      max > min && isFinite(r.value) ? Math.min(1, Math.max(0, (r.value - min) / (max - min))) : 0;
  }
  return rows;
}

/* ── formatting helpers (Persian digits + separators) ── */
const FA = "۰۱۲۳۴۵۶۷۸۹";
export const faDigits = (s: string | number) =>
  String(s).replace(/\d/g, (d) => FA[+d]).replace(/,/g, "٬");

export const fmtToman = (n: number) => faDigits(Math.round(n).toLocaleString("en-US"));

export function fmtValue(v: number): string {
  if (!isFinite(v)) return "—";
  if (v >= 100) return faDigits(Math.round(v).toLocaleString("en-US"));
  if (v >= 10) return faDigits(String(Math.round(v * 10) / 10));
  return faDigits(String(Math.round(v * 100) / 100));
}

export function fmtGB(gb: number): string {
  if (gb >= 1024 && Number.isInteger(gb / 1024)) return `${faDigits(gb / 1024)} ترابایت`;
  if (gb >= 1) return `${faDigits(Number.isInteger(gb) ? gb : Math.round(gb * 10) / 10)} گیگ`;
  return `${faDigits(Math.round(gb * 1024))} مگ`;
}

export const faDate = (iso: string) => {
  try {
    // Explicit timeZone keeps SSR (UTC) and the browser (Tehran) byte-identical;
    // without it the rendered time differs and React hydration fails.
    return new Intl.DateTimeFormat("fa-IR", {
      dateStyle: "medium",
      timeStyle: "short",
      timeZone: "Asia/Tehran",
    }).format(new Date(iso));
  } catch {
    return iso;
  }
};

export const STALE_WARN_DAYS = 7;

export const faAgeDays = (iso: string): number | null => {
  const ts = Date.parse(iso);
  if (!Number.isFinite(ts)) return null;
  return Math.max(0, Math.floor((Date.now() - ts) / 86400000));
};

export const faRelativeAge = (iso: string): string | null => {
  const days = faAgeDays(iso);
  if (days == null) return null;
  if (days <= 0) return "امروز";
  if (days === 1) return "دیروز";
  return `${faDigits(days)} روز پیش`;
};
