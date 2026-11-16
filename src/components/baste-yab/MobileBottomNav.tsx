"use client";

import { Calculator, Home, Scale, SlidersHorizontal, Smartphone } from "lucide-react";

import { faDigits, type Category } from "@/lib/providers";

interface MobileBottomNavProps {
  cat: Category;
  calcOpen: boolean;
  filterOpen: boolean;
  compareOpen: boolean;
  activeFilters: number;
  compareCount: number;
  onSelectCat: (c: Category) => void;
  onToggleCalc: () => void;
  onOpenFilters: () => void;
  onOpenCompare: () => void;
}

export function MobileBottomNav({
  cat,
  calcOpen,
  filterOpen,
  compareOpen,
  activeFilters,
  compareCount,
  onSelectCat,
  onToggleCalc,
  onOpenFilters,
  onOpenCompare,
}: MobileBottomNavProps) {
  const modalOpen = filterOpen || compareOpen;
  const mobileActive = !modalOpen && !calcOpen && cat === "mobile";
  const homeActive = !modalOpen && !calcOpen && cat === "home";
  const calcActive = !modalOpen && calcOpen;
  const filterActive = filterOpen;
  const compareActive = compareOpen;

  const itemClass =
    "group flex h-full min-h-[48px] w-full flex-col items-center justify-center gap-0.5 rounded-xl px-1 transition-colors cursor-pointer select-none focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring";

  const pillClass = (active: boolean, subtleCurrentCat = false) =>
    `relative flex h-7 w-11 items-center justify-center rounded-full transition-colors ${
      active
        ? "bg-primary/18 text-primary"
        : subtleCurrentCat
          ? "text-foreground group-hover:bg-muted"
          : "text-foreground/75 group-hover:bg-muted group-hover:text-foreground"
    }`;

  const labelClass = (active: boolean, subtleCurrentCat = false) =>
    `text-[10.5px] leading-none whitespace-nowrap transition-colors ${
      active
        ? "font-extrabold text-primary"
        : subtleCurrentCat
          ? "font-bold text-foreground"
          : "font-semibold text-foreground/80 group-hover:text-foreground"
    }`;

  return (
    <div className="fixed inset-x-0 bottom-0 z-40 border-t border-border bg-card/95 pb-[env(safe-area-inset-bottom)] shadow-[0_-4px_20px_rgba(0,0,0,0.08)] backdrop-blur-md dark:shadow-[0_-4px_24px_rgba(0,0,0,0.45)] lg:hidden">
      <nav
        aria-label="ناوبری اصلی موبایل"
        className="mx-auto grid h-[62px] max-w-lg grid-cols-5 items-center px-1"
      >
        <button
          type="button"
          onClick={() => onSelectCat("mobile")}
          aria-pressed={cat === "mobile"}
          aria-current={mobileActive ? "page" : undefined}
          className={itemClass}
        >
          <span className={pillClass(mobileActive, cat === "mobile" && !mobileActive)}>
            <Smartphone className="h-[19px] w-[19px]" strokeWidth={mobileActive ? 2.4 : 1.9} />
          </span>
          <span className={labelClass(mobileActive, cat === "mobile" && !mobileActive)}>
            همراه
          </span>
        </button>

        <button
          type="button"
          onClick={() => onSelectCat("home")}
          aria-pressed={cat === "home"}
          aria-current={homeActive ? "page" : undefined}
          className={itemClass}
        >
          <span className={pillClass(homeActive, cat === "home" && !homeActive)}>
            <Home className="h-[19px] w-[19px]" strokeWidth={homeActive ? 2.4 : 1.9} />
          </span>
          <span className={labelClass(homeActive, cat === "home" && !homeActive)}>
            ثابت
          </span>
        </button>

        <button
          type="button"
          onClick={onToggleCalc}
          aria-pressed={calcOpen}
          className={itemClass}
        >
          <span className={pillClass(calcActive)}>
            <Calculator className="h-[19px] w-[19px]" strokeWidth={calcActive ? 2.4 : 1.9} />
          </span>
          <span className={labelClass(calcActive)}>محاسبه‌گر</span>
        </button>

        <button
          type="button"
          onClick={onOpenFilters}
          aria-expanded={filterOpen}
          className={itemClass}
        >
          <span className={pillClass(filterActive)}>
            <SlidersHorizontal
              className="h-[19px] w-[19px]"
              strokeWidth={filterActive ? 2.4 : 1.9}
            />
            {activeFilters > 0 && (
              <span className="fa-num absolute -top-0.5 end-0.5 flex h-4 min-w-4 items-center justify-center rounded-full bg-primary px-1 text-[10px] font-extrabold leading-none text-primary-foreground ring-2 ring-card">
                {faDigits(activeFilters)}
              </span>
            )}
          </span>
          <span className={labelClass(filterActive)}>فیلترها</span>
        </button>

        <button
          type="button"
          onClick={onOpenCompare}
          aria-expanded={compareOpen}
          className={itemClass}
        >
          <span className={pillClass(compareActive)}>
            <Scale className="h-[19px] w-[19px]" strokeWidth={compareActive ? 2.4 : 1.9} />
            {compareCount > 0 && (
              <span className="fa-num absolute -top-0.5 end-0.5 flex h-4 min-w-4 items-center justify-center rounded-full bg-primary px-1 text-[10px] font-extrabold leading-none text-primary-foreground ring-2 ring-card">
                {faDigits(compareCount)}
              </span>
            )}
          </span>
          <span className={labelClass(compareActive)}>مقایسه</span>
        </button>
      </nav>
    </div>
  );
}
