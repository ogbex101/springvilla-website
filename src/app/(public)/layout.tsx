import { getChrome } from "@/lib/content/queries";
import { Header } from "@/components/site/Header";
import { Footer } from "@/components/site/Footer";
import { SkipLink } from "@/components/site/SkipLink";
import { SmoothScroll } from "@/lib/motion/SmoothScroll";
import { PageTransition } from "@/lib/motion/PageTransition";
import { Analytics } from "@/components/site/Analytics";
import { Suspense } from "react";
import { AutoMotion } from "@/lib/motion/AutoMotion";
import { Analytics as VercelAnalytics } from "@vercel/analytics/next";
import { SpeedInsights } from "@vercel/speed-insights/next";

export default async function PublicLayout({ children }: { children: React.ReactNode }) {
  const chrome = await getChrome();
  return (
    <SmoothScroll>
      <SkipLink />
      <Header siteName={chrome.siteName} logo={chrome.logo} links={chrome.nav.header} mobileLinks={chrome.nav.mobile} />
      <div className="relative z-10 overflow-x-clip bg-milky shadow-[0_30px_60px_-30px_rgb(0_0_0/0.45)]">
        <main id="main" tabIndex={-1} className="outline-none">
          {children}
        </main>
      </div>
      <Footer chrome={chrome} />
      <PageTransition />
      <Suspense fallback={null}>
        <AutoMotion />
      </Suspense>
      <Analytics enabled={chrome.analyticsEnabled} bannerEnabled={chrome.cookieBannerEnabled} bannerText={chrome.cookieBannerText} />
      {chrome.vercelAnalyticsEnabled && (
        <>
          <VercelAnalytics />
          <SpeedInsights />
        </>
      )}
    </SmoothScroll>
  );
}
