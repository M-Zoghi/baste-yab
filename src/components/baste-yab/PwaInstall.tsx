"use client";

import { useState } from "react";
import {
  Download,
  Monitor,
  MoreVertical,
  PlusSquare,
  Share,
  Smartphone,
  WifiOff,
  X,
} from "lucide-react";

import { Button } from "@/components/ui/button";
import { useOnlineStatus, usePWAInstall } from "@/hooks/use-pwa-install";

export function PWAInstallButton() {
  const { isInstallable, isInstalled, platform, install } = usePWAInstall();
  const [showGuide, setShowGuide] = useState(false);

  if (isInstalled) {
    return null;
  }

  const handleClick = async () => {
    if (isInstallable) {
      await install();
      return;
    }
    setShowGuide(true);
  };

  return (
    <>
      <Button
        type="button"
        variant={isInstallable ? "default" : "outline"}
        size="sm"
        onClick={handleClick}
        title="نصب بسته‌یاب به‌صورت برنامه روی گوشی یا کامپیوتر"
        className="h-9 gap-1.5 rounded-lg px-2.5 sm:px-3 text-xs font-bold cursor-pointer whitespace-nowrap shrink-0"
      >
        <Download className="h-3.5 w-3.5 shrink-0" />
        <span>نصب اپ</span>
      </Button>

      {showGuide && (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 p-4 backdrop-blur-xs"
          role="dialog"
          aria-modal="true"
          aria-labelledby="pwa-guide-title"
          onClick={() => setShowGuide(false)}
        >
          <div
            dir="rtl"
            className="w-full max-w-md rounded-2xl border border-border bg-card p-5 text-right shadow-2xl"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="flex items-start justify-between gap-3">
              <div>
                <h2 id="pwa-guide-title" className="text-base font-extrabold text-foreground">
                  نصب بسته‌یاب روی دستگاه شما
                </h2>
                <p className="mt-1 text-xs leading-5 text-muted-foreground">
                  بدون نیاز به استور؛ مثل یک برنامه‌ی مستقل و قابل‌اجرا در حالت آفلاین نصب می‌شود.
                </p>
              </div>
              <button
                type="button"
                onClick={() => setShowGuide(false)}
                aria-label="بستن"
                className="rounded-lg p-1.5 text-muted-foreground hover:bg-secondary hover:text-foreground cursor-pointer"
              >
                <X className="h-4 w-4" />
              </button>
            </div>

            <div className="mt-4 space-y-3 text-xs leading-6">
              {/* iOS Safari */}
              <div
                className={`rounded-xl border p-3.5 ${
                  platform === "ios"
                    ? "border-primary/50 bg-primary/[0.06]"
                    : "border-border/80 bg-muted/35"
                }`}
              >
                <div className="flex items-center gap-2 font-bold text-foreground">
                  <Smartphone className="h-4 w-4 text-primary" />
                  <span>آیفون و آیپد (Safari)</span>
                </div>
                <ol className="mt-1.5 list-decimal space-y-1 ps-4 text-muted-foreground">
                  <li className="inline-flex flex-wrap items-center gap-1">
                    در نوار پایین Safari روی دکمه‌ی اشتراک‌گذاری (
                    <Share className="inline h-3.5 w-3.5 text-foreground" />
                    <span className="font-medium text-foreground">Share</span>) بزنید.
                  </li>
                  <li className="inline-flex flex-wrap items-center gap-1">
                    گزینه‌ی <PlusSquare className="inline h-3.5 w-3.5 text-foreground" />{" "}
                    <strong className="text-foreground">Add to Home Screen</strong> را انتخاب کنید.
                  </li>
                </ol>
              </div>

              {/* Android */}
              <div
                className={`rounded-xl border p-3.5 ${
                  platform === "android"
                    ? "border-primary/50 bg-primary/[0.06]"
                    : "border-border/80 bg-muted/35"
                }`}
              >
                <div className="flex items-center gap-2 font-bold text-foreground">
                  <Smartphone className="h-4 w-4 text-primary" />
                  <span>گوشی اندروید (Chrome / Edge / Samsung)</span>
                </div>
                <ol className="mt-1.5 list-decimal space-y-1 ps-4 text-muted-foreground">
                  <li className="inline-flex flex-wrap items-center gap-1">
                    منوی مرورگر (<MoreVertical className="inline h-3.5 w-3.5 text-foreground" />)
                    را باز کنید.
                  </li>
                  <li>
                    روی <strong className="text-foreground">Install app</strong> یا{" "}
                    <strong className="text-foreground">Add to Home screen</strong> بزنید.
                  </li>
                </ol>
              </div>

              {/* Desktop / PC / Mac */}
              <div
                className={`rounded-xl border p-3.5 ${
                  platform === "desktop"
                    ? "border-primary/50 bg-primary/[0.06]"
                    : "border-border/80 bg-muted/35"
                }`}
              >
                <div className="flex items-center gap-2 font-bold text-foreground">
                  <Monitor className="h-4 w-4 text-primary" />
                  <span>کامپیوتر و مک (Chrome / Edge / Safari)</span>
                </div>
                <ul className="mt-1.5 list-disc space-y-1 ps-4 text-muted-foreground">
                  <li>
                    در <strong className="text-foreground">Chrome / Edge / Brave</strong>: روی آیکون
                    نصب در سمت راست نوار آدرس بزنید (یا از منوی مرورگر گزینه‌ی{" "}
                    <strong className="text-foreground">Install بسته‌یاب</strong> را انتخاب کنید).
                  </li>
                  <li>
                    در <strong className="text-foreground">Safari مک</strong>: از منوی{" "}
                    <strong className="text-foreground">File → Add to Dock</strong> را بزنید.
                  </li>
                </ul>
              </div>
            </div>

            <Button
              type="button"
              variant="secondary"
              onClick={() => setShowGuide(false)}
              className="mt-4 h-10 w-full rounded-xl text-xs font-bold cursor-pointer"
            >
              متوجه شدم
            </Button>
          </div>
        </div>
      )}
    </>
  );
}

export function OfflineIndicator() {
  const isOnline = useOnlineStatus();

  if (isOnline) return null;

  return (
    <div
      dir="rtl"
      className="fixed bottom-16 start-4 z-50 flex items-center gap-2 rounded-xl border border-amber-500/40 bg-amber-600 px-3.5 py-2 text-xs font-bold text-white shadow-lg lg:bottom-4"
      role="status"
      aria-live="polite"
    >
      <WifiOff className="h-3.5 w-3.5 shrink-0" />
      <span>حالت آفلاین — نمایش داده‌های ذخیره‌شده</span>
    </div>
  );
}
