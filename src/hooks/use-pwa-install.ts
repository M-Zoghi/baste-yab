"use client";

import { useEffect, useState, useSyncExternalStore } from "react";

interface BeforeInstallPromptEvent extends Event {
  prompt: () => Promise<void>;
  userChoice: Promise<{ outcome: "accepted" | "dismissed"; platform: string }>;
}

export type InstallPlatform = "ios" | "android" | "desktop";

const BASE_PATH = process.env.NEXT_PUBLIC_BASE_PATH || "";

const subscribeNoop = () => () => {};

function subscribeOnline(cb: () => void) {
  window.addEventListener("online", cb);
  window.addEventListener("offline", cb);
  return () => {
    window.removeEventListener("online", cb);
    window.removeEventListener("offline", cb);
  };
}

function subscribeStandalone(cb: () => void) {
  const mq = window.matchMedia("(display-mode: standalone)");
  mq.addEventListener("change", cb);
  window.addEventListener("appinstalled", cb);
  return () => {
    mq.removeEventListener("change", cb);
    window.removeEventListener("appinstalled", cb);
  };
}

function getStandaloneSnapshot() {
  return (
    window.matchMedia("(display-mode: standalone)").matches ||
    (window.navigator as unknown as { standalone?: boolean }).standalone === true
  );
}

function getPlatformSnapshot(): InstallPlatform {
  const ua = window.navigator.userAgent.toLowerCase();
  if (/iphone|ipad|ipod/.test(ua) || (ua.includes("macintosh") && navigator.maxTouchPoints > 1)) {
    return "ios";
  }
  if (/android/.test(ua)) {
    return "android";
  }
  return "desktop";
}

export function usePWAInstall() {
  const [deferredPrompt, setDeferredPrompt] = useState<BeforeInstallPromptEvent | null>(null);
  const [acceptedInstall, setAcceptedInstall] = useState(false);

  const isStandalone = useSyncExternalStore(
    subscribeStandalone,
    getStandaloneSnapshot,
    () => false,
  );
  const platform = useSyncExternalStore<InstallPlatform>(
    subscribeNoop,
    getPlatformSnapshot,
    () => "desktop",
  );

  useEffect(() => {
    if ("serviceWorker" in navigator) {
      const scope = BASE_PATH ? `${BASE_PATH}/` : "/";
      navigator.serviceWorker.register(`${BASE_PATH}/sw.js`, { scope }).catch(() => {
        /* ignore registration errors in unsupported contexts */
      });
    }

    const handleBeforeInstallPrompt = (e: Event) => {
      e.preventDefault();
      setDeferredPrompt(e as BeforeInstallPromptEvent);
    };

    const handleAppInstalled = () => {
      setAcceptedInstall(true);
      setDeferredPrompt(null);
    };

    window.addEventListener("beforeinstallprompt", handleBeforeInstallPrompt);
    window.addEventListener("appinstalled", handleAppInstalled);

    return () => {
      window.removeEventListener("beforeinstallprompt", handleBeforeInstallPrompt);
      window.removeEventListener("appinstalled", handleAppInstalled);
    };
  }, []);

  const install = async () => {
    if (!deferredPrompt) return false;
    await deferredPrompt.prompt();
    const { outcome } = await deferredPrompt.userChoice;
    if (outcome === "accepted") {
      setAcceptedInstall(true);
      setDeferredPrompt(null);
      return true;
    }
    return false;
  };

  return {
    isInstallable: Boolean(deferredPrompt),
    isInstalled: isStandalone || acceptedInstall,
    platform,
    install,
  };
}

export function useOnlineStatus() {
  return useSyncExternalStore(
    subscribeOnline,
    () => navigator.onLine,
    () => true,
  );
}
