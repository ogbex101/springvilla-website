import type { ReactNode } from "react";

export function AuthCard({ title, subtitle, children, footer }: { title: string; subtitle?: string; children: ReactNode; footer?: ReactNode }) {
  return (
    <main className="grid min-h-dvh place-items-center bg-canopy px-4 py-10">
      <div className="w-full max-w-md">
        <p className="text-center text-[1.3rem] font-semibold tracking-tight text-white">
          Springvilla <span className="font-serif italic text-lime">admin</span>
        </p>
        <div className="mt-6 rounded-xl bg-milky p-6 text-canopy shadow-lift md:p-8">
          <h1 className="text-[1.6rem] font-semibold leading-tight">{title}</h1>
          {subtitle && <p className="mt-2 text-small text-canopy/80">{subtitle}</p>}
          <div className="mt-6">{children}</div>
        </div>
        {footer && <div className="mt-6 text-center text-small text-white/80">{footer}</div>}
      </div>
    </main>
  );
}
