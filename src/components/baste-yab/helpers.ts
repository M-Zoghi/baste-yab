import { ENTRIES, type Category, type Kind, type RestrictionTag } from "@/lib/providers";

export const norm = (s: string) =>
  String(s)
    .replace(/[۰-۹]/g, (d) => String("۰۱۲۳۴۵۶۷۸۹".indexOf(d)))
    .replace(/[٠-٩]/g, (d) => String("٠١٢٣٤٥٦٧٨٩".indexOf(d)))
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

/** Pick high-contrast foreground ink (#0b1117 or #ffffff) against any hex brand accent. */
export const contrastInk = (hex: string): "#0b1117" | "#ffffff" => {
  const m = hex.replace("#", "").match(/^([0-9a-f]{2})([0-9a-f]{2})([0-9a-f]{2})$/i);
  if (!m) return "#ffffff";
  const toLinear = (c: number) => {
    const s = c / 255;
    return s <= 0.03928 ? s / 12.92 : Math.pow((s + 0.055) / 1.055, 2.4);
  };
  const lum =
    0.2126 * toLinear(parseInt(m[1], 16)) +
    0.7152 * toLinear(parseInt(m[2], 16)) +
    0.0722 * toLinear(parseInt(m[3], 16));
  const whiteContrast = 1.05 / (lum + 0.05);
  const darkContrast = (lum + 0.05) / 0.055; // #0b1117 relative luminance ≈ 0.005
  return darkContrast >= whiteContrast ? "#0b1117" : "#ffffff";
};

/* roaming is hidden by default — its tariffs are not comparable with domestic packs */
export const DEFAULT_KINDS: Kind[] = ["internet", "combo"];

export const KIND_LABEL: Record<Kind, string> = {
  internet: "اینترنت خالص",
  combo: "ترکیبی",
  roaming: "رومینگ",
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
