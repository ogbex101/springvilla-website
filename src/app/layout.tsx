import type { Metadata, Viewport } from "next";
import { sans, serif } from "@/lib/fonts";
import { siteUrl } from "@/lib/utils";
import "./globals.css";

export const metadata: Metadata = {
  metadataBase: new URL(siteUrl()),
  title: { default: "Springvilla", template: "%s · Springvilla" },
  formatDetection: { telephone: false },
  ...(process.env.SITE_NOINDEX === "true" ? { robots: { index: false, follow: false } } : {}),
};

export const viewport: Viewport = {
  themeColor: "#2D3E2C",
  width: "device-width",
  initialScale: 1,
};

// Adds `js` before first paint so entrance states only apply when JS runs;
// a failsafe reveals everything if the motion engine has not booted in 3.5s.
const bootScript = `(function(d){var h=d.documentElement;h.classList.add('js');setTimeout(function(){if(!h.classList.contains('motion-ok'))h.classList.add('reveal-failsafe')},3500)})(document)`;

export default function RootLayout({ children }: Readonly<{ children: React.ReactNode }>) {
  return (
    <html lang="en-GB" className={`${sans.variable} ${serif.variable}`} suppressHydrationWarning>
      <head>
        <script dangerouslySetInnerHTML={{ __html: bootScript }} />
      </head>
      <body className="min-h-dvh overflow-x-clip">{children}</body>
    </html>
  );
}
