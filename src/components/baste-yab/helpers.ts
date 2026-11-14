import { ENTRIES, type Category, type Kind } from "@/lib/providers";

export const norm = (s: string) =>
  String(s)
    .replace(/[۰-۹]/g, (d) => String("۰۱۲۳۴۵۶۷۸۹".indexOf(d)))
    .replace(/[٠-٩]/g, (d) => String("٠١٢٣٤٥٦٧٨٩".indexOf(d)))
    .replace(/[\u200c,\s٬]/g, "")
    .toLowerCase();

export const valueColor = (t: number, dark: boolean) =>
  `hsl(${Math.round(142 * (1 - t))}, 68%, ${dark ? 54 : 38}%)`;

/* roaming is hidden by default — its tariffs are not comparable with domestic packs */
export const DEFAULT_KINDS: Kind[] = ["internet", "combo"];

export const KIND_LABEL: Record<Kind, string> = {
  internet: "اینترنت خالص",
  combo: "ترکیبی",
  roaming: "رومینگ",
};

export const liveKeysOf = (c: Category) =>
  ENTRIES.filter((e) => e.category === c && e.status === "live").map((e) => e.key);
