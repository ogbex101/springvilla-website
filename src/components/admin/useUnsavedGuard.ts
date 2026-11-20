"use client";

import { useEffect } from "react";

/** Warns before leaving the page (tab close or in-app link) with unsaved changes. */
export function useUnsavedGuard(dirty: boolean) {
  useEffect(() => {
    if (!dirty) return;
    const before = (e: BeforeUnloadEvent) => {
      e.preventDefault();
      e.returnValue = "";
    };
    const click = (e: MouseEvent) => {
      const a = (e.target as HTMLElement).closest("a");
      if (!a || a.target === "_blank" || !a.href) return;
      if (!confirm("You have unsaved changes. Leave without saving?")) {
        e.preventDefault();
        e.stopPropagation();
      }
    };
    window.addEventListener("beforeunload", before);
    document.addEventListener("click", click, true);
    return () => {
      window.removeEventListener("beforeunload", before);
      document.removeEventListener("click", click, true);
    };
  }, [dirty]);
}
