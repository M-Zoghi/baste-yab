"use client";

import { Calculator, Home, Info, Scale, Smartphone } from "lucide-react";

import { faDigits } from "@/lib/providers";

export type MobileTab = "mobile" | "home" | "calc" | "compare" | "info";

interface MobileBottomNavProps {
  activeTab: MobileTab;
  compareCount: number;
  onSelectTab: (tab: MobileTab) => void;
}

export function MobileBottomNav({
  activeTab,
  compareCount,
  onSelectTab,
}: MobileBottomNavProps) {
  const itemClass =
    "group flex h-full min-h-[48px] w-full flex-col items-center justify-center gap-0.5 rounded-xl px-1 transition-transform active:scale-[0.95] cursor-pointer select-none focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring";

  const pillClass = (active: boolean) =>
    `relative flex h-7 w-12 items-center justify-center rounded-full transition-colors ${
      active
        ? "bg-primary/18 text-primary"
        : "text-foreground/75 group-hover:bg-muted group-hover:text-foreground"
    }`;

  const labelClass = (active: boolean) =>
    `text-[10.5px] leading-none whitespace-nowrap transition-colors ${
      active ? "font-extrabold text-primary" : "font-semibold text-foreground/80 group-hover:text-foreground"
    }`;

  return (
    <div className="fixed inset-x-0 bottom-0 z-40 border-t border-border bg-card/95 pb-[env(safe-area-inset-bottom)] shadow-[0_-4px_20px_rgba(0,0,0,0.08)] backdrop-blur-md dark:shadow-[0_-4px_24px_rgba(0,0,0,0.45)] lg:hidden">
      <nav
        aria-label="ناوبری اصلی موبایل"
        className="mx-auto grid h-[62px] max-w-lg grid-cols-5 items-center px-1"
      >
        <button
          type="button"
          onClick={() => onSelectTab("mobile")}
          aria-current={activeTab === "mobile" ? "page" : undefined}
          className={itemClass}
        >
          <span className={pillClass(activeTab === "mobile")}>
            <Smartphone
              className="h-[19px] w-[19px]"
              strokeWidth={activeTab === "mobile" ? 2.4 : 1.9}
            />
          </span>
          <span className={labelClass(activeTab === "mobile")}>همراه</span>
        </button>

        <button
          type="button"
          onClick={() => onSelectTab("home")}
          aria-current={activeTab === "home" ? "page" : undefined}
          className={itemClass}
        >
          <span className={pillClass(activeTab === "home")}>
            <Home
              className="h-[19px] w-[19px]"
              strokeWidth={activeTab === "home" ? 2.4 : 1.9}
            />
          </span>
          <span className={labelClass(activeTab === "home")}>ثابت</span>
        </button>

        <button
          type="button"
          onClick={() => onSelectTab("calc")}
          aria-current={activeTab === "calc" ? "page" : undefined}
          className={itemClass}
        >
          <span className={pillClass(activeTab === "calc")}>
            <Calculator
              className="h-[19px] w-[19px]"
              strokeWidth={activeTab === "calc" ? 2.4 : 1.9}
            />
          </span>
          <span className={labelClass(activeTab === "calc")}>محاسبه‌گر</span>
        </button>

        <button
          type="button"
          onClick={() => onSelectTab("compare")}
          aria-current={activeTab === "compare" ? "page" : undefined}
          className={itemClass}
        >
          <span className={pillClass(activeTab === "compare")}>
            <Scale
              className="h-[19px] w-[19px]"
              strokeWidth={activeTab === "compare" ? 2.4 : 1.9}
            />
            {compareCount > 0 && (
              <span className="fa-num absolute -top-0.5 end-0.5 flex h-4 min-w-4 items-center justify-center rounded-full bg-primary px-1 text-[10px] font-extrabold leading-none text-primary-foreground ring-2 ring-card">
                {faDigits(compareCount)}
              </span>
            )}
          </span>
          <span className={labelClass(activeTab === "compare")}>مقایسه</span>
        </button>

        <button
          type="button"
          onClick={() => onSelectTab("info")}
          aria-current={activeTab === "info" ? "page" : undefined}
          className={itemClass}
        >
          <span className={pillClass(activeTab === "info")}>
            <Info
              className="h-[19px] w-[19px]"
              strokeWidth={activeTab === "info" ? 2.4 : 1.9}
            />
          </span>
          <span className={labelClass(activeTab === "info")}>اطلاعات</span>
        </button>
      </nav>
    </div>
  );
}
