import { chromium } from "@playwright/test";
(async () => {
  const b = await chromium.launch({ executablePath: "/opt/pw-browsers/chromium" });
  const p = await b.newPage({ viewport: { width: 1440, height: 900 } });
  p.on("console", (m) => { if (m.type() === "error") { const t = m.text(); console.log(t.split("\n").filter((l) => /^\s*[+-]/.test(l)).join("\n") || t.slice(0, 300)); } });
  await p.goto(process.argv[2] ?? "http://localhost:3000/", { waitUntil: "networkidle" });
  await p.waitForTimeout(1500);
  await b.close();
})();
