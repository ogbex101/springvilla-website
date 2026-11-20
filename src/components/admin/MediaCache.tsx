"use client";

import { createContext, useCallback, useContext, useEffect, useRef, useState, type ReactNode } from "react";
import { getMediaByIds, type AdminMedia } from "@/app/admin/actions/media";

type Ctx = { get: (id: string) => AdminMedia | null; put: (m: AdminMedia) => void };
const C = createContext<Ctx>({ get: () => null, put: () => {} });
export const useMediaCache = () => useContext(C);

/** Resolves media ids referenced by a form so thumbnails can be shown. */
export function MediaCacheProvider({ ids, initial = [], children }: { ids: string[]; initial?: AdminMedia[]; children: ReactNode }) {
  const [map, setMap] = useState<Record<string, AdminMedia>>(() => Object.fromEntries(initial.map((m) => [m.id, m])));
  const requested = useRef(new Set(initial.map((m) => m.id)));
  useEffect(() => {
    const missing = ids.filter((i) => !requested.current.has(i));
    if (!missing.length) return;
    missing.forEach((i) => requested.current.add(i));
    void getMediaByIds(missing).then((rows) => setMap((m) => ({ ...m, ...Object.fromEntries(rows.map((r) => [r.id, r])) })));
  }, [ids]);
  const get = useCallback((id: string) => map[id] ?? null, [map]);
  const put = useCallback((m: AdminMedia) => setMap((x) => ({ ...x, [m.id]: m })), []);
  return <C.Provider value={{ get, put }}>{children}</C.Provider>;
}
