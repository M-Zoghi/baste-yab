import type { Metadata, Viewport } from "next";
import { ThemeProvider } from "next-themes";
import "./globals.css";
import { Toaster } from "@/components/ui/toaster";

export const metadata: Metadata = {
  title: "بسته‌یاب — مقایسه بسته‌های اینترنت ایران",
  description:
    "مقایسه زنده‌ی بسته‌های اینترنت ارائه‌دهنده‌های ایران (سامانتل، آپتل و…) بر اساس تومان بر گیگابایت — همراه و ثابت، با فیلتر، رتبه‌بندی و محاسبه‌ی مالیات.",
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
  openGraph: {
    title: "بسته‌یاب — مقایسه بسته‌های اینترنت",
    description: "ارزش هر بسته به تومان بر گیگ — رتبه‌بندی زنده از سایت رسمی هر ارائه‌دهنده",
    type: "website",
    locale: "fa_IR",
  },
};

export const viewport: Viewport = {
  themeColor: [
    { media: "(prefers-color-scheme: dark)", color: "#1c1917" },
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
    <html lang="fa" dir="rtl" suppressHydrationWarning>
      <body className="font-sans antialiased bg-background text-foreground">
        <ThemeProvider
          attribute="class"
          defaultTheme="dark"
          enableSystem
          disableTransitionOnChange
        >
          {children}
          <Toaster />
        </ThemeProvider>
      </body>
    </html>
  );
}
