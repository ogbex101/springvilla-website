"use client";

import { createContext, useCallback, useContext, useState, type ReactNode } from "react";
import { CheckCircle2, AlertTriangle, X } from "lucide-react";

type Toast = { id: number; kind: "success" | "error"; message: string };
const Ctx = createContext<(kind: Toast["kind"], message: string) => void>(() => {});
export const useToast = () => useContext(Ctx);

export function ToastProvider({ children }: { children: ReactNode }) {
  const [toasts, setToasts] = useState<Toast[]>([]);
  const push = useCallback((kind: Toast["kind"], message: string) => {
    const id = Date.now() + Math.random();
    setToasts((t) => [...t, { id, kind, message }]);
    setTimeout(() => setToasts((t) => t.filter((x) => x.id !== id)), kind === "error" ? 8000 : 3500);
  }, []);
  return (
    <Ctx.Provider value={push}>
      {children}
      <div className="pointer-events-none fixed bottom-4 right-4 z-[100] flex w-[min(92vw,380px)] flex-col gap-2" aria-live="polite">
        {toasts.map((t) => (
          <div key={t.id} role={t.kind === "error" ? "alert" : "status"} className={`pointer-events-auto flex items-start gap-3 rounded-lg p-4 text-small shadow-lift ${t.kind === "error" ? "bg-[#7a1c1c] text-white" : "bg-canopy text-white"}`}>
            {t.kind === "error" ? <AlertTriangle className="size-5 shrink-0" aria-hidden /> : <CheckCircle2 className="size-5 shrink-0 text-lime" aria-hidden />}
            <p className="flex-1">{t.message}</p>
            <button onClick={() => setToasts((x) => x.filter((y) => y.id !== t.id))} aria-label="Dismiss" className="-m-1 p-1">
              <X className="size-4" aria-hidden />
            </button>
          </div>
        ))}
      </div>
    </Ctx.Provider>
  );
}
