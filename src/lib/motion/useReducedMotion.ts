"use client";

import { useSyncExternalStore } from "react";

function subscribe(query: string) {
  return (cb: () => void) => {
    const mq = window.matchMedia(query);
    mq.addEventListener("change", cb);
    return () => mq.removeEventListener("change", cb);
  };
}

function useMedia(query: string, serverValue: boolean) {
  return useSyncExternalStore(
    subscribe(query),
    () => window.matchMedia(query).matches,
    () => serverValue,
  );
}

export function useReducedMotion() {
  return useMedia("(prefers-reduced-motion: reduce)", false);
}

export function useFinePointer() {
  return useMedia("(hover: hover) and (pointer: fine)", false);
}

export function useIsDesktop() {
  return useMedia("(min-width: 1024px)", false);
}

export function prefersReducedMotion() {
  return typeof window !== "undefined" && window.matchMedia("(prefers-reduced-motion: reduce)").matches;
}

export function saveDataEnabled() {
  if (typeof navigator === "undefined") return false;
  const c = (navigator as Navigator & { connection?: { saveData?: boolean; effectiveType?: string } }).connection;
  return Boolean(c?.saveData) || c?.effectiveType === "2g" || c?.effectiveType === "slow-2g";
}
