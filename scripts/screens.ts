/* Screenshot pages at 375 / 768 / 1440. Usage: tsx scripts/screens.ts [baseUrl] [outDir] path1 path2 ... */
import { chromium } from "@playwright/test";
import fs from "node:fs";
import path from "node:path";

const [base = "http://localhost:3000", out = "docs/screens", ...paths] = process.argv.slice(2);
const widths = (process.env.WIDTHS || "375,768,1440").split(",").map(Number);
const full = process.env.FULL !== "0";

(async () => {
  fs.mkdirSync(out, { recursive: true });
  const browser = await chromium.launch({ executablePath: process.env.PW_CHROMIUM || "/opt/pw-browsers/chromium" });
  for (const p of paths.length ? paths : ["/"]) {
    for (const w of widths) {
      const page = await browser.newPage({ viewport: { width: w, height: w < 500 ? 812 : w < 1000 ? 1024 : 900 }, deviceScaleFactor: Number(process.env.DSF || 1), reducedMotion: process.env.REDUCED ? "reduce" : "no-preference" });
      const errors: string[] = [];
      page.on("pageerror", (e) => errors.push(e.message));
      page.on("console", (m) => m.type() === "error" && errors.push(m.text()));
      await page.goto(base + p, { waitUntil: "networkidle", timeout: 90000 });
      if (full) {
        // Scroll through so scroll-triggered reveals fire, then return to top.
        await page.evaluate(async () => {
          const h = document.documentElement.scrollHeight;
          for (let y = 0; y < h; y += 500) {
            window.scrollTo(0, y);
            await new Promise((r) => setTimeout(r, 120));
          }
          window.scrollTo(0, 0);
          await new Promise((r) => setTimeout(r, 600));
        });
      }
      await page.waitForTimeout(800);
      const name = (p === "/" ? "home" : p.replace(/^\//, "").replace(/[\/?=&]/g, "_")) + `-${w}.png`;
      await page.screenshot({ path: path.join(out, name), fullPage: full });
      console.log(name, errors.length ? "ERRORS: " + errors.slice(0, 3).join(" | ") : "ok");
      await page.close();
    }
  }
  await browser.close();
})();
