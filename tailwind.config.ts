/*
 * بسته‌یاب uses Tailwind CSS v4 (CSS-first configuration).
 * All design tokens live in `src/app/globals.css` (`@theme inline` + CSS variables)
 * and animations come from `tw-animate-css`, imported there as well.
 *
 * This file is intentionally empty of plugins: the previous v3 scaffold imported
 * `tailwindcss-animate`, which is not installed in a v4 project and made
 * `next dev` / `next build` emit "Module not found" warnings on every compile.
 * Keep this stub only so legacy tooling that expects the file finds it.
 */
import type { Config } from "tailwindcss";

const config: Config = {
  content: [],
};

export default config;
