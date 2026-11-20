import { clsx, type ClassValue } from "clsx";
import { extendTailwindMerge } from "tailwind-merge";

// Teach tailwind-merge the custom theme keys so e.g. `text-display-l` (size) and
// `text-canopy` (colour) are not treated as conflicting.
const twMerge = extendTailwindMerge({
  extend: {
    theme: {
      text: ["display-xl", "display-l", "display-m", "display-s", "lead", "body", "small", "caption", "eyebrow", "numeral"],
      spacing: ["gutter", "section", "section-sm"],
      radius: ["sm", "md", "lg", "xl"],
    },
  },
});

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs));
}

export function slugify(input: string) {
  return input
    .toLowerCase()
    .normalize("NFKD")
    .replace(/[̀-ͯ]/g, "")
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "")
    .slice(0, 80);
}

export function readingTime(text: string) {
  const words = text.trim().split(/\s+/).filter(Boolean).length;
  return Math.max(1, Math.round(words / 220));
}

export function formatDate(value: string | Date | null | undefined, opts?: Intl.DateTimeFormatOptions & { timeZone?: string }) {
  if (!value) return "";
  const d = typeof value === "string" ? new Date(value) : value;
  return new Intl.DateTimeFormat("en-GB", { day: "numeric", month: "long", year: "numeric", ...opts }).format(d);
}

export function siteUrl(path = "") {
  const base = (process.env.NEXT_PUBLIC_SITE_URL || "http://localhost:3000").replace(/\/$/, "");
  return `${base}${path}`;
}

export function isExternal(href: string) {
  return /^https?:\/\//.test(href) && !href.startsWith(siteUrl());
}
