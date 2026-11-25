/* Sanitiser checks (rich text + uploaded SVG). Run: npx tsx scripts/test-sanitize.ts */
import Module from "node:module";
// "server-only" throws outside Next; stub it for this script.
const req = Module.prototype.require;
Module.prototype.require = function (id: string) {
  if (id === "server-only" || id === "next/cache") return id === "next/cache" ? { cacheLife() {} } : {};
  // eslint-disable-next-line prefer-rest-params
  return req.apply(this, arguments as unknown as [string]);
};
// eslint-disable-next-line @typescript-eslint/no-require-imports
const { sanitizeRichText, sanitizeSvg } = require("../src/lib/sanitize") as typeof import("../src/lib/sanitize");

let failed = 0;
const check = (name: string, ok: boolean, got: string) => {
  console.log(`${ok ? "✓" : "✗"} ${name}${ok ? "" : `\n    got: ${got}`}`);
  if (!ok) failed++;
};
const rt = (h: string) => sanitizeRichText(h);
const bad = /<script|onerror|onload|onclick|javascript:|<iframe|<style|<object|<embed|srcdoc|data:text/i;

for (const [name, html] of [
  ["script tag", "<p>a</p><script>alert(1)</script>"],
  ["img onerror", '<img src=x onerror="alert(1)">'],
  ["javascript: link", '<a href="javascript:alert(1)">x</a>'],
  ["encoded javascript:", '<a href="&#106;avascript:alert(1)">x</a>'],
  ["iframe srcdoc", '<iframe srcdoc="<script>alert(1)</script>"></iframe>'],
  ["svg in rich text", '<svg onload="alert(1)"></svg>'],
  ["style tag", "<style>body{display:none}</style><p>x</p>"],
  ["data: image", '<img src="data:text/html;base64,PHNjcmlwdD4=" alt="x">'],
  ["protocol-relative", '<a href="//evil.example">x</a>'],
  ["inline style attr", '<p style="background:url(javascript:alert(1))">x</p>'],
] as const) {
  const out = rt(html);
  check(`rich text strips ${name}`, !bad.test(out) && !/\/\/evil|style=/.test(out), out);
}
check("keeps editorial markup", rt('<h2>T</h2><p><strong>b</strong> <a href="/join">j</a></p><ul><li>x</li></ul>') === '<h2>T</h2><p><strong>b</strong> <a href="/join">j</a></p><ul><li>x</li></ul>', rt('<h2>T</h2><p><strong>b</strong> <a href="/join">j</a></p><ul><li>x</li></ul>'));
check("external links get rel=noopener", /rel="noopener noreferrer"/.test(rt('<a href="https://a.example" target="_blank">a</a>')), rt('<a href="https://a.example" target="_blank">a</a>'));
check("keeps mailto/tel", /mailto:a@b\.c/.test(rt('<a href="mailto:a@b.c">m</a>')), rt('<a href="mailto:a@b.c">m</a>'));

const logo = '<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 10 10"><defs><linearGradient id="g" gradientUnits="userSpaceOnUse"><stop offset="0" stop-color="#2D3E2C"/></linearGradient></defs><path d="M0 0h10v10z" fill="url(#g)"/></svg>';
const outLogo = sanitizeSvg(logo);
check("svg keeps viewBox, gradients and paths", /viewBox="0 0 10 10"/.test(outLogo) && /<linearGradient id="g" gradientUnits="userSpaceOnUse">/.test(outLogo) && /<path d="M0 0h10v10z"/.test(outLogo), outLogo);
for (const [name, svg] of [
  ["script", '<svg><script>alert(1)</script><rect width="1" height="1"/></svg>'],
  ["onload", '<svg onload="alert(1)"><rect/></svg>'],
  ["use xlink:href", '<svg><use xlink:href="data:image/svg+xml,<svg onload=alert(1)>"/></svg>'],
  ["a href", '<svg><a href="javascript:alert(1)"><text>x</text></a></svg>'],
  ["foreignObject", '<svg><foreignObject><iframe src="javascript:alert(1)"></iframe></foreignObject></svg>'],
  ["animate to href", '<svg><animate attributeName="href" to="javascript:alert(1)"/></svg>'],
  ["style", '<svg><style>@import url(https://evil.example)</style></svg>'],
  ["CDATA script", "<svg><![CDATA[<script>alert(1)</script>]]></svg>"],
] as const) {
  const out = sanitizeSvg(svg);
  check(`svg strips ${name}`, !bad.test(out) && !/href|animate|foreignObject|evil/i.test(out), out);
}
console.log(failed ? `\n${failed} failed` : "\nall sanitiser checks passed");
process.exit(failed ? 1 : 0);
