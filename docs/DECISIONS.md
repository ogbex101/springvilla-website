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
| 2026-11-20 | Hero entrance and all above-the-fold headings use CSS (transform-only) animations; GSAP/Lenis load lazily after hydration via `useGsap` (an equivalent of `useGSAP` with scoped context + cleanup). | Gating the hero copy on JS pushed mobile LCP to 4.7s. Now LCP elements paint on the first frame. |
| 2026-11-20 | Motion (motion/react) is installed but no longer used; page curtain uses the Web Animations API and the mobile drawer uses CSS. | Removed ~40KB from every public page; same visual behaviour. |
| 2026-11-20 | Section renderers split into per-route registries (shared / home / join / contact). Join and contact form sections can't be added to other pages. | Server-imported client components are not code-split in Next 16; this keeps zod/react-hook-form off pages that don't need them. |
| 2026-11-20 | Without analytics consent only `page_view` is stored, with no device/browser/country. | Owner brief: anonymous cookieless count only. Funnel/hero metrics therefore reflect consenting visitors. |
| 2026-11-20 | Join/contact forms validate on submit, then live as fields change. | On-blur validation shifted the layout under the pointer and swallowed submit clicks. |
| 2026-11-20 | Error red `#8a1c1c` used for form errors only. | Functional colour (9:1 on Milky); not a brand green. |
| 2026-11-20 | Dynamic routes prerender published slugs via `generateStaticParams` (placeholder `__none` when empty, as Cache Components requires ≥1). | Full HTML for existing content, readable without JS. |
| 2026-11-20 | "Member Login" and "Join Springvilla" header labels are structural UI strings. | Header CTAs are fixed navigation affordances; the five destinations are editable. |
