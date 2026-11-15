import type { MetadataRoute } from "next";

export const dynamic = "force-static";

const bp = process.env.NEXT_PUBLIC_BASE_PATH || "";
const root = bp ? `${bp}/` : "/";

export default function manifest(): MetadataRoute.Manifest {
  return {
    id: root,
    name: "بسته‌یاب — مقایسه بسته‌های اینترنت ایران",
    short_name: "بسته‌یاب",
    description:
      "مقایسه‌ی زنده‌ی بسته‌های اینترنت همراه و ثابت ایران بر اساس تومان بر گیگابایت",
    start_url: root,
    scope: root,
    display: "standalone",
    dir: "rtl",
    lang: "fa",
    background_color: "#0b0e14",
    theme_color: "#059669",
    icons: [
      {
        src: `${bp}/pwa-192x192.png`,
        sizes: "192x192",
        type: "image/png",
        purpose: "any",
      },
      {
        src: `${bp}/pwa-512x512.png`,
        sizes: "512x512",
        type: "image/png",
        purpose: "any",
      },
      {
        src: `${bp}/pwa-maskable-512x512.png`,
        sizes: "512x512",
        type: "image/png",
        purpose: "maskable",
      },
    ],
  };
}
