import localFont from "next/font/local";

export const sans = localFont({
  src: [
    { path: "../fonts/instrument-sans-latin-wght-normal.woff2", weight: "400 700", style: "normal" },
  ],
  variable: "--font-sans-face",
  display: "swap",
  fallback: ["system-ui", "Segoe UI", "Roboto", "Arial", "sans-serif"],
});

export const serif = localFont({
  src: [
    { path: "../fonts/instrument-serif-latin-400-normal.woff2", weight: "400", style: "normal" },
    { path: "../fonts/instrument-serif-latin-400-italic.woff2", weight: "400", style: "italic" },
  ],
  variable: "--font-serif-face",
  display: "swap",
  // Accent-only face: don't compete with the body font for early bandwidth.
  preload: false,
  fallback: ["Georgia", "Times New Roman", "serif"],
});
