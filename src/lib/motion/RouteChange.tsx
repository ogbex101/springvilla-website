"use client";

import { Suspense, useEffect } from "react";
import { usePathname } from "next/navigation";

function Watcher({ onChange }: { onChange: (pathname: string) => void }) {
  const pathname = usePathname();
  useEffect(() => onChange(pathname), [pathname, onChange]);
  return null;
}

/**
 * Reports the current pathname without making the caller depend on runtime
 * URL data (keeps layouts in the prerendered static shell).
 */
export function RouteChange({ onChange }: { onChange: (pathname: string) => void }) {
  return (
    <Suspense fallback={null}>
      <Watcher onChange={onChange} />
    </Suspense>
  );
}
