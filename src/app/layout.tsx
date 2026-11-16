import type { Metadata, Viewport } from "next";
import localFont from "next/font/local";
import { ThemeProvider } from "next-themes";
import "./globals.css";
import { Toaster } from "@/components/ui/toaster";
import { OfflineIndicator } from "@/components/baste-yab/PwaInstall";

const bp = process.env.NEXT_PUBLIC_BASE_PATH || "";

const estedad = localFont({
  src: [
    { path: "./fonts/Estedad-Regular.woff2", weight: "400", style: "normal" },
    { path: "./fonts/Estedad-Medium.woff2", weight: "500", style: "normal" },
    { path: "./fonts/Estedad-SemiBold.woff2", weight: "600", style: "normal" },
    { path: "./fonts/Estedad-Bold.woff2", weight: "700", style: "normal" },
    { path: "./fonts/Estedad-ExtraBold.woff2", weight: "800 900", style: "normal" },
  ],
  variable: "--font-estedad",
  display: "swap",
});

export const metadata: Metadata = {
  title: "بسته‌یاب — مقایسه بسته‌های اینترنت ایران",
  description:
    "مقایسه زنده‌ی بسته‌های اینترنت ارائه‌دهنده‌های ایران (همراه اول، ایرانسل، رایتل، سامانتل و آپتل) بر اساس تومان بر گیگابایت — همراه و ثابت، با فیلتر، رتبه‌بندی و محاسبه‌ی مالیات.",
  keywords: [
    "بسته اینترنت",
    "مقایسه بسته اینترنت",
    "تومان بر گیگ",
    "سامانتل",
    "آپتل",
    "ایرانسل",
    "همراه اول",
    "رایتل",
    "مخابرات",
    "آسیاتک",
  ],
  appleWebApp: {
    capable: true,
    statusBarStyle: "default",
    title: "بسته‌یاب",
  },
  icons: {
    icon: [
      { url: `${bp}/icon.svg`, type: "image/svg+xml" },
      { url: `${bp}/pwa-192x192.png`, sizes: "192x192", type: "image/png" },
    ],
    apple: [{ url: `${bp}/apple-touch-icon.png`, sizes: "180x180", type: "image/png" }],
  },
  openGraph: {
    title: "بسته‌یاب — مقایسه بسته‌های اینترنت",
    description: "ارزش هر بسته به تومان بر گیگ — رتبه‌بندی زنده از سایت رسمی هر ارائه‌دهنده",
    type: "website",
    locale: "fa_IR",
  },
};

export const viewport: Viewport = {
  themeColor: [
    { media: "(prefers-color-scheme: dark)", color: "#0b0e14" },
    { media: "(prefers-color-scheme: light)", color: "#faf9f7" },
  ],
  width: "device-width",
  initialScale: 1,
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="fa" dir="rtl" className={estedad.variable} suppressHydrationWarning>
      <body className="font-sans antialiased bg-background text-foreground">
        <ThemeProvider
          attribute="class"
          defaultTheme="system"
          enableSystem
          disableTransitionOnChange
        >
          {children}
          <OfflineIndicator />
          <Toaster />
        </ThemeProvider>
      </body>
    </html>
  );
}
