/* Viewport frames at scroll positions: tsx scripts/dev/frames.ts url outDir width step count */
import { chromium } from "@playwright/test";
(async () => {
  const [url, out, w = "1440", step = "700", count = "20"] = process.argv.slice(2);
  const b = await chromium.launch({ executablePath: "/opt/pw-browsers/chromium" });
  const p = await b.newPage({ viewport: { width: +w, height: +w < 500 ? 812 : 900 } });
  await p.goto(url, { waitUntil: "networkidle" });
  await p.waitForTimeout(1500);
  const sw = await p.evaluate(() => [document.documentElement.scrollWidth, document.documentElement.scrollHeight]);
  console.log("scrollWidth/Height", sw);
  for (let i = 0; i < +count; i++) {
    await p.mouse.wheel(0, i === 0 ? 0 : +step);
    await p.waitForTimeout(900);
    await p.screenshot({ path: `${out}/f${String(i).padStart(2, "0")}.png` });
  }
  await b.close();
})();
