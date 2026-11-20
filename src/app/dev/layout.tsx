import { notFound } from "next/navigation";
import { SmoothScroll } from "@/lib/motion/SmoothScroll";

export const metadata = { robots: { index: false, follow: false } };

export default function DevLayout({ children }: { children: React.ReactNode }) {
  // Hidden showcase: never available in production builds.
  if (process.env.NODE_ENV === "production" && process.env.ENABLE_DEV_ROUTES !== "1") notFound();
  return <SmoothScroll>{children}</SmoothScroll>;
}
