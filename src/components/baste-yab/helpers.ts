import { ENTRIES, type Category, type HomeTech, type Kind, type RestrictionTag } from "@/lib/providers";

export const norm = (s: string) =>
  String(s)
    .replace(/[۰-۹]/g, (d) => String("۰۱۲۳۴۵۶۷۸۹".indexOf(d)))
    .replace(/[٠-٩]/g, (d) => String("٠١٢٣٤٥٦٧٨٩".indexOf(d)))
    .replace(/ي/g, "ی")
    .replace(/ك/g, "ک")
    .replace(/[\u200c,\s٬]/g, "")
    .toLowerCase();

export const valueColor = (t: number, dark: boolean) => {
  const hue = Math.round(145 * (1 - t));
  // Darken mid-spectrum yellow-green slightly in light mode so text stays crisp on white cards
  const light = dark ? 62 : Math.round(33 - 3 * Math.sin(Math.PI * t));
  return `hsl(${hue}, 70%, ${light}%)`;
};

export const valueBadgeStyle = (t: number, dark: boolean) => {
  const hue = Math.round(145 * (1 - t));
  return {
    backgroundColor: `hsla(${hue}, 74%, ${dark ? 54 : 42}%, ${dark ? 0.18 : 0.12})`,
    borderColor: `hsla(${hue}, 74%, ${dark ? 58 : 38}%, ${dark ? 0.36 : 0.28})`,
    color: `hsl(${hue}, 72%, ${dark ? 72 : 30}%)`,
  };
};

const hexToHsl = (hex: string): [number, number, number] => {
  const clean = hex.replace("#", "").trim();
  const full = clean.length === 3 ? clean.split("").map((c) => c + c).join("") : clean;
  const num = Number.parseInt(full, 16);
  if (Number.isNaN(num)) return [199, 85, 45];
  const r = ((num >> 16) & 255) / 255;
  const g = ((num >> 8) & 255) / 255;
  const b = (num & 255) / 255;
  const max = Math.max(r, g, b);
  const min = Math.min(r, g, b);
  const l = (max + min) / 2;
  let h = 0;
  let s = 0;
  if (max !== min) {
    const d = max - min;
    s = l > 0.5 ? d / (2 - max - min) : d / (max + min);
    switch (max) {
      case r:
        h = (g - b) / d + (g < b ? 6 : 0);
        break;
      case g:
        h = (b - r) / d + 2;
        break;
      default:
        h = (r - g) / d + 4;
        break;
    }
    h /= 6;
  }
  return [Math.round(h * 360), Math.round(s * 100), Math.round(l * 100)];
};

export const accentTextColor = (hex: string, dark: boolean) => {
  const [h, s, l] = hexToHsl(hex);
  if (dark) {
    const sat = Math.min(92, Math.max(s, 70));
    const light = Math.max(l, 68);
    return `hsl(${h}, ${sat}%, ${light}%)`;
  }
  // Yellow/lime hues (e.g. Irancell #eab308) need a deeper gold lightness on light cards to keep contrast crisp
  const maxLight = h >= 35 && h <= 85 ? 29 : 36;
  const light = Math.min(l, maxLight);
  return `hsl(${h}, ${s}%, ${light}%)`;
};

export const accentDividerColor = (hex: string, dark: boolean) => {
  const [h, s] = hexToHsl(hex);
  return `hsla(${h}, ${s}%, ${dark ? 62 : 40}%, ${dark ? 0.22 : 0.18})`;
};

export const accentBadgeStyle = (hex: string, dark: boolean) => {
  const [h, s] = hexToHsl(hex);
  return {
    backgroundColor: `hsla(${h}, ${s}%, ${dark ? 54 : 48}%, ${dark ? 0.14 : 0.10})`,
    borderColor: `hsla(${h}, ${s}%, ${dark ? 58 : 42}%, ${dark ? 0.30 : 0.26})`,
    color: accentTextColor(hex, dark),
  };
};

/* roaming is hidden by default — its tariffs are not comparable with domestic packs */
export const DEFAULT_KINDS: Kind[] = ["internet", "combo"];

export const KIND_LABEL: Record<Kind, string> = {
  internet: "اینترنت خالص",
  combo: "ترکیبی",
  roaming: "رومینگ",
};

export const HOME_TECH_OPTIONS: { key: HomeTech; label: string; shortLabel: string }[] = [
  { key: "modem", label: "مودم سیم‌کارتی (TD-LTE / 5G)", shortLabel: "مودم TD-LTE / 5G" },
  { key: "fixed", label: "خط ثابت (ADSL / VDSL / فیبر)", shortLabel: "ADSL / فیبر" },
];

export type DurationKey = "short" | "weekly" | "monthly" | "long";

export const DURATION_OPTIONS: {
  key: DurationKey;
  label: string;
  match: (days: number) => boolean;
}[] = [
  { key: "short", label: "۱ تا ۳ روز", match: (d) => d > 0 && d <= 3 },
  { key: "weekly", label: "۷ تا ۱۵ روز", match: (d) => d >= 4 && d <= 15 },
  { key: "monthly", label: "۳۰ روزه", match: (d) => d >= 16 && d <= 31 },
  { key: "long", label: "بلندمدت (+۲ ماه)", match: (d) => d > 31 },
];

export const durationBucketOf = (days: number): DurationKey | null => {
  for (const opt of DURATION_OPTIONS) {
    if (opt.match(days)) return opt.key;
  }
  return null;
};

export const RESTRICTION_OPTIONS: { key: RestrictionTag; label: string }[] = [
  { key: "night", label: "شبانه / شبانت (۲ تا ۷ صبح)" },
  { key: "morning", label: "صبحانت / صبح (۶ تا ۱۲)" },
  { key: "domestic", label: "انارستان (فقط اینترنت داخلی)" },
  { key: "newUser", label: "ویژه مشترکین جدید" },
  { key: "youth", label: "ویژه زیر ۲۸ سال" },
];

export const ALL_RESTRICTION_TAGS: RestrictionTag[] = RESTRICTION_OPTIONS.map((o) => o.key);

export const liveKeysOf = (c: Category) =>
  ENTRIES.filter((e) => e.category === c && e.status === "live").map((e) => e.key);

export const ussdTelHref = (ussd: string): string | null => {
  const clean = ussd.replace(/\s+/g, "").trim();
  if (!clean) return null;
  const normalized = clean.startsWith("*") ? clean : `*${clean}`;
  if (!/^[*#\d]+$/.test(normalized)) return null;
  return `tel:${normalized.replace(/#/g, "%23")}`;
};
