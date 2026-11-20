# Decisions log

| Date | Decision | Why |
|---|---|---|
| 2026-11-20 | Built from CLAUDE.md + owner brief; blueprint PDF and brand guide not yet in repo. | Files were not supplied. Blueprint-only copy ships as empty admin fields. |
| 2026-11-20 | Fonts: Instrument Sans (variable) + Instrument Serif, self-hosted via `next/font/local`. | Fontshare (Satoshi/General Sans) unreachable from build environment. Swap by replacing files in `src/fonts`. |
| 2026-11-20 | Header shows the site name as text until an official logo is uploaded. | CLAUDE.md forbids redrawing the logo; no file supplied. |
| 2026-11-20 | Next.js 16 `proxy.ts` instead of `middleware.ts`; Cache Components on. | Next.js 16 conventions. |
| 2026-11-20 | Rate limiting in Postgres (`rate_limits` table + RPC) rather than Redis. | No extra service; fine at Springvilla's traffic. |
| 2026-11-20 | Admin preview uses Draft Mode on the real public routes inside an iframe. | Owner asked for draft mode; previews exactly what visitors see. |
| 2026-11-20 | Pinned two-paths sequence is 150vh, journey words 200vh (owner maxima). | Owner brief overrides blueprint on motion length. |
| 2026-11-20 | `news` is a kind of `announcements` (public, `kind='news'`), not a separate table. | Avoids duplicate schema; blueprint 18 lists announcements. |
