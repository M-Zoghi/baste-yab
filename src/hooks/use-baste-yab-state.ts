"use client";

import { useCallback, useSyncExternalStore } from "react";

import {
  type Category,
  type HomeTech,
  type Kind,
  type Metric,
  type RestrictionTag,
  type SortKey,
} from "@/lib/providers";
import {
  ALL_RESTRICTION_TAGS,
  DEFAULT_KINDS,
  DURATION_OPTIONS,
  liveKeysOf,
  type DurationKey,
} from "@/components/baste-yab/helpers";

export type ViewMode = "grid" | "table";
export type HomeTechFilter = HomeTech | "all";

export interface BasteYabState {
  cat: Category;
  homeTech: HomeTechFilter;
  metric: Metric;
  vat: boolean;
  sort: SortKey;
  view: ViewMode;
  query: string;
  provSel: Set<string>;
  kinds: Set<Kind>;
  durations: Set<DurationKey>;
  maxPrice: number | null;
  minGB: number;
  onlyDisc: boolean;
  hideFree: boolean;
  hidePortalOnly: boolean;
  includedRestrictions: Set<RestrictionTag>;
}

interface StoredPrefs {
  metric?: Metric;
  vat?: boolean;
  view?: ViewMode;
}

const PREFS_STORAGE_KEY = "baste-yab:prefs";
const VALID_KINDS = new Set<Kind>(["internet", "combo", "roaming"]);
const VALID_DURATIONS = new Set<DurationKey>(DURATION_OPTIONS.map((o) => o.key));
const VALID_RESTR = new Set<RestrictionTag>(ALL_RESTRICTION_TAGS);

const createDefaultState = (): BasteYabState => ({
  cat: "mobile",
  homeTech: "all",
  metric: "pergb",
  vat: false,
  sort: "best",
  view: "grid",
  query: "",
  provSel: new Set(liveKeysOf("mobile")),
  kinds: new Set(DEFAULT_KINDS),
  durations: new Set(),
  maxPrice: null,
  minGB: 0,
  onlyDisc: false,
  hideFree: false,
  hidePortalOnly: false,
  includedRestrictions: new Set(ALL_RESTRICTION_TAGS),
});

const SERVER_STATE: BasteYabState = createDefaultState();

let clientState: BasteYabState | null = null;
let urlSyncTimer: number | null = null;
const listeners = new Set<() => void>();

function readPrefs(): StoredPrefs {
  try {
    const raw = window.localStorage.getItem(PREFS_STORAGE_KEY);
    if (!raw) return {};
    const parsed = JSON.parse(raw) as StoredPrefs;
    return parsed && typeof parsed === "object" ? parsed : {};
  } catch {
    return {};
  }
}

function savePrefs(state: BasteYabState) {
  try {
    const payload: StoredPrefs = {
      metric: state.metric,
      vat: state.vat,
      view: state.view,
    };
    window.localStorage.setItem(PREFS_STORAGE_KEY, JSON.stringify(payload));
  } catch {
    /* ignore storage quota / private mode errors */
  }
}

function readStateFromEnvironment(): BasteYabState {
  const base = createDefaultState();
  const prefs = readPrefs();

  if (prefs.metric === "pergb" || prefs.metric === "pergbday") base.metric = prefs.metric;
  if (typeof prefs.vat === "boolean") base.vat = prefs.vat;
  if (prefs.view === "grid" || prefs.view === "table") base.view = prefs.view;

  const params = new URLSearchParams(window.location.search);

  const catParam = params.get("cat");
  if (catParam === "home" || catParam === "mobile") {
    base.cat = catParam;
    base.provSel = new Set(liveKeysOf(catParam));
  }

  const techParam = params.get("tech");
  if (techParam === "modem" || techParam === "fixed") base.homeTech = techParam;

  const metricParam = params.get("metric");
  if (metricParam === "pergb" || metricParam === "pergbday") base.metric = metricParam;

  const vatParam = params.get("vat");
  if (vatParam === "1" || vatParam === "true") base.vat = true;
  else if (vatParam === "0" || vatParam === "false") base.vat = false;

  const sortParam = params.get("sort");
  if (sortParam === "best" || sortParam === "price" || sortParam === "gb" || sortParam === "days") {
    base.sort = sortParam;
  }

  const viewParam = params.get("view");
  if (viewParam === "grid" || viewParam === "table") base.view = viewParam;

  const qParam = params.get("q");
  if (qParam != null) base.query = qParam;

  const provParam = params.get("prov");
  if (provParam != null) {
    if (provParam === "none") {
      base.provSel = new Set();
    } else {
      const validKeys = new Set(liveKeysOf(base.cat));
      const next = new Set(
        provParam
          .split(",")
          .map((s) => s.trim())
          .filter((k) => validKeys.has(k)),
      );
      base.provSel = next;
    }
  }

  const kindParam = params.get("kind");
  if (kindParam != null) {
    if (kindParam === "none") {
      base.kinds = new Set();
    } else {
      base.kinds = new Set(
        kindParam
          .split(",")
          .map((s) => s.trim() as Kind)
          .filter((k) => VALID_KINDS.has(k)),
      );
    }
  }

  const durParam = params.get("dur");
  if (durParam) {
    base.durations = new Set(
      durParam
        .split(",")
        .map((s) => s.trim() as DurationKey)
        .filter((d) => VALID_DURATIONS.has(d)),
    );
  }

  const maxParam = params.get("max");
  if (maxParam != null) {
    const n = Number(maxParam);
    if (Number.isFinite(n) && n >= 0) base.maxPrice = n;
  }

  const minGbParam = params.get("minGb");
  if (minGbParam != null) {
    const n = Number(minGbParam);
    if (Number.isFinite(n) && n >= 0) base.minGB = n;
  }

  if (params.get("disc") === "1") base.onlyDisc = true;
  if (params.get("noFree") === "1") base.hideFree = true;
  if (params.get("noPortal") === "1") base.hidePortalOnly = true;

  const exRestrParam = params.get("exRestr");
  if (exRestrParam) {
    const excluded = new Set(
      exRestrParam
        .split(",")
        .map((s) => s.trim() as RestrictionTag)
        .filter((t) => VALID_RESTR.has(t)),
    );
    base.includedRestrictions = new Set(ALL_RESTRICTION_TAGS.filter((t) => !excluded.has(t)));
  }

  return base;
}

function writeStateToUrl(state: BasteYabState) {
  try {
    const params = new URLSearchParams();
    if (state.cat !== "mobile") params.set("cat", state.cat);
    if (state.cat === "home" && state.homeTech !== "all") params.set("tech", state.homeTech);
    if (state.metric !== "pergb") params.set("metric", state.metric);
    if (state.vat) params.set("vat", "1");
    if (state.sort !== "best") params.set("sort", state.sort);
    if (state.view !== "grid") params.set("view", state.view);
    if (state.query.trim()) params.set("q", state.query);

    const allCatProvs = liveKeysOf(state.cat);
    const sameProvs =
      state.provSel.size === allCatProvs.length &&
      allCatProvs.every((k) => state.provSel.has(k));
    if (!sameProvs) {
      params.set("prov", state.provSel.size ? [...state.provSel].join(",") : "none");
    }

    const sameKinds =
      state.kinds.size === DEFAULT_KINDS.length && DEFAULT_KINDS.every((k) => state.kinds.has(k));
    if (!sameKinds) {
      params.set("kind", state.kinds.size ? [...state.kinds].join(",") : "none");
    }

    if (state.durations.size > 0) params.set("dur", [...state.durations].join(","));
    if (state.maxPrice != null) params.set("max", String(state.maxPrice));
    if (state.minGB > 0) params.set("minGb", String(state.minGB));
    if (state.onlyDisc) params.set("disc", "1");
    if (state.hideFree) params.set("noFree", "1");
    if (state.hidePortalOnly) params.set("noPortal", "1");

    const excludedRestr = ALL_RESTRICTION_TAGS.filter((t) => !state.includedRestrictions.has(t));
    if (excludedRestr.length > 0) params.set("exRestr", excludedRestr.join(","));

    const qs = params.toString();
    const nextUrl = `${window.location.pathname}${qs ? `?${qs}` : ""}${window.location.hash}`;
    const currentUrl = `${window.location.pathname}${window.location.search}${window.location.hash}`;
    if (nextUrl !== currentUrl) {
      window.history.replaceState(null, "", nextUrl);
    }
  } catch {
    /* ignore history replace limits */
  }
}

function scheduleUrlSync(state: BasteYabState) {
  if (urlSyncTimer != null) window.clearTimeout(urlSyncTimer);
  urlSyncTimer = window.setTimeout(() => {
    urlSyncTimer = null;
    writeStateToUrl(state);
  }, 220);
}

function getClientSnapshot(): BasteYabState {
  if (!clientState) clientState = readStateFromEnvironment();
  return clientState;
}

function getServerSnapshot(): BasteYabState {
  return SERVER_STATE;
}

function subscribe(listener: () => void) {
  listeners.add(listener);
  const onPopState = () => {
    clientState = readStateFromEnvironment();
    for (const l of listeners) l();
  };
  if (listeners.size === 1 && typeof window !== "undefined") {
    window.addEventListener("popstate", onPopState);
  }
  return () => {
    listeners.delete(listener);
    if (listeners.size === 0 && typeof window !== "undefined") {
      window.removeEventListener("popstate", onPopState);
    }
  };
}

export function useBasteYabState() {
  const state = useSyncExternalStore(subscribe, getClientSnapshot, getServerSnapshot);

  const updateState = useCallback(
    (updater: (prev: BasteYabState) => BasteYabState, opts?: { persistPrefs?: boolean }) => {
      const prev = getClientSnapshot();
      const next = updater(prev);
      clientState = next;
      if (opts?.persistPrefs) savePrefs(next);
      scheduleUrlSync(next);
      for (const l of listeners) l();
    },
    [],
  );

  return [state, updateState] as const;
}
