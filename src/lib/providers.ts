/* src/lib/providers.ts — provider registry + data loading + derived metrics.
 * Data files (src/data/providers/*.json) are refreshed by update/fetch-providers.mjs
 * and committed; the app imports them statically (static-export friendly, no
 * runtime fetch, works offline and behind any CDN). */

import samantelDoc from "@/data/providers/samantel.json";
import aptelDoc from "@/data/providers/aptel.json";
import mciDoc from "@/data/providers/mci.json";
import irancellDoc from "@/data/providers/irancell.json";
import rightelDoc from "@/data/providers/rightel.json";
import rightelTdlteDoc from "@/data/providers/rightel-tdlte.json";

export type Category = "home" | "mobile";
export type Kind = "internet" | "combo" | "roaming";
export type RestrictionTag = "night" | "morning" | "domestic" | "newUser" | "youth";
export type UpdateMode = "auto" | "hybrid" | "manual";

export interface Pkg {
  id: string;
  title: string;
  kind?: Kind;              // internet (default) | combo (voice+sms) | roaming
  domesticOnly?: boolean;   // e.g. MCI Anarestan — domestic Iranian traffic only
  gb: number;
  days: number;
  price: number;            // toman, pre-tax (as printed on the provider card)
  oldPrice: number | null;  // pre-discount price, toman
  discountPct: number | null;
  group: string | null;
  regulatoryCode: string | null;
  ussd?: string | null;
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
  source: { kind: string; endpoint: string; fetchedAt: string };
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
  irancell: irancellDoc as ProviderDoc,
  rightel: rightelDoc as ProviderDoc,
  "rightel-tdlte": rightelTdlteDoc as ProviderDoc,
};

export const ENTRIES: Entry[] = [
  /* ── home (ثابت) ── */
  {
    key: "tci", nameFa: "مخابرات ایران", nameEn: "TCI", category: "home",
    tech: "ADSL/VDSL/فیبر", regions: ["سراسری"], accent: "#14b8a6",
    site: "https://tci.ir", status: "awaiting",
    updateMode: "manual",
    updateNote: "مسدود از خارج ایران — در انتظار اولین فایل HAR/JSON",
    awaitingNote: "از خارج از ایران در دسترس نیست — یک HAR یا JSON از صفحه تعرفه‌ها لازم است",
  },
  {
    key: "asiatech", nameFa: "آسیاتک", nameEn: "Asiatech", category: "home",
    tech: "ADSL/VDSL/فیبر", regions: ["سراسری"], accent: "#f97316",
    site: "https://www.asiatech.ir", status: "awaiting",
    updateMode: "manual",
    updateNote: "مسدود از خارج ایران — در انتظار اولین فایل HAR/JSON",
    awaitingNote: "از خارج از ایران در دسترس نیست — HAR/JSON از پنل یا سایت آسیاتک لازم است",
  },
  {
    key: "irancell-tdlte", nameFa: "ایرانسل (ثابت)", nameEn: "Irancell TD-LTE", category: "home",
    tech: "TD-LTE", regions: ["سراسری"], accent: "#eab308",
    site: "https://www.irancell.ir", status: "awaiting",
    updateMode: "manual",
    updateNote: "مسدود از خارج ایران — در انتظار اولین فایل HAR/JSON",
    awaitingNote: "از خارج از ایران در دسترس نیست — HAR/JSON از صفحه بسته‌های TD-LTE لازم است",
  },
  {
    key: "rightel-tdlte", nameFa: "رایتل (مودم)", nameEn: "Rightel Modem", category: "home",
    tech: "سیم‌کارت دیتا · 4G/5G", regions: ["سراسری"], accent: "#8b5cf6",
    site: "https://www.rightel.ir", buyUrl: "https://package.rightel.ir/packagesList",
    status: "live", doc: DOCS["rightel-tdlte"],
    updateMode: "manual",
    updateNote: "بروزرسانی دستی از داخل ایران (هم‌زمان با رایتل همراه)",
  },
  /* ── mobile (همراه) ── */
  {
    key: "mci", nameFa: "همراه اول", nameEn: "MCI", category: "mobile",
    tech: "4G/5G", regions: ["سراسری"], accent: "#0095da",
    site: "https://mci.ir", buyUrl: "https://mci.ir/internet-plans",
    status: "live", doc: DOCS.mci,
    updateMode: "hybrid",
    updateNote: "فروشگاه کامل (۴۸ بسته): دستی از ایران · صفحه اصلی (۳۰ بسته): خودکار روزانه",
  },
  {
    key: "samantel", nameFa: "سامانتل", nameEn: "Samantel", category: "mobile",
    tech: "اپراتور مجازی · 4G/5G · TD-LTE", regions: ["سراسری"], accent: "#10b981",
    site: "https://samantel.ir", buyUrl: "https://payment.samantel.ir/package",
    status: "live", doc: DOCS.samantel,
    updateMode: "auto",
    updateNote: "بروزرسانی خودکار روزانه ساعت ۰۷:۰۰ تهران (GitHub Actions)",
  },
  {
    key: "aptel", nameFa: "آپتل", nameEn: "Aptel", category: "mobile",
    tech: "اپراتور مجازی 4G/5G", regions: ["سراسری"], accent: "#db3328",
    site: "https://www.aptel.ir", buyUrl: "https://www.aptel.ir/packages",
    status: "live", doc: DOCS.aptel, personalized: DOCS.aptel?.personalized,
    updateMode: "auto",
    updateNote: "بروزرسانی خودکار روزانه ساعت ۰۷:۰۰ تهران (GitHub Actions)",
  },
  {
    key: "irancell", nameFa: "ایرانسل", nameEn: "Irancell", category: "mobile",
    tech: "4G/5G", regions: ["سراسری"], accent: "#eab308",
    site: "https://www.irancell.ir", buyUrl: "https://irancell.ir/o/1001/mobile-internet-packages",
    status: "live", doc: DOCS.irancell,
    updateMode: "manual",
    updateNote: "بروزرسانی دستی از داخل ایران (API از خارج ایران مسدود است)",
  },
  {
    key: "rightel", nameFa: "رایتل", nameEn: "Rightel", category: "mobile",
    tech: "4G/5G", regions: ["سراسری"], accent: "#8b5cf6",
    site: "https://www.rightel.ir", buyUrl: "https://package.rightel.ir/packagesList",
    status: "live", doc: DOCS.rightel,
    updateMode: "manual",
    updateNote: "بروزرسانی دستی از داخل ایران (API از خارج ایران مسدود است)",
  },
];

export const VAT_RATE = 0.1;

export interface DerivedPkg extends Pkg {
  entryKey: string;
  providerName: string;
  providerAccent: string;
  buyUrl: string;
  fetchedAt: string;
  sourceKind: string;
  kind: Kind; // materialized with default
  domesticOnly: boolean;
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
      if (/شبانه|شبانت|۲ تا ۷|2 تا 7/.test(text)) restrictions.push("night");
      if (/صبحانت|صبحانه|۶ صبح تا ۱۲|۶ تا ۱۲|6 تا 12/.test(text)) restrictions.push("morning");
      if (domesticOnly) restrictions.push("domestic");
      if (/مشترکین جدید/.test(text)) restrictions.push("newUser");
      if (/زیر ۲۸ سال/.test(text)) restrictions.push("youth");

      out.push({
        ...p,
        kind: p.kind ?? "internet",
        domesticOnly,
        restrictions,
        entryKey: e.key,
        providerName: e.nameFa,
        providerAccent: e.accent,
        buyUrl: e.buyUrl ?? e.site,
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

export const faRelativeAge = (iso: string): string | null => {
  const ts = Date.parse(iso);
  if (!Number.isFinite(ts)) return null;
  const days = Math.floor((Date.now() - ts) / 86400000);
  if (days <= 0) return "امروز";
  if (days === 1) return "دیروز";
  return `${faDigits(days)} روز پیش`;
};
