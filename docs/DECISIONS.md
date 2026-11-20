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
| 2026-11-21 | Blueprint v1.0 alignment pass; gaps and resolutions in `docs/BLUEPRINT_GAPS.md`. | Blueprint supplied after the build. |
| 2026-11-21 | Join form follows §12.2 exactly: email **or** phone; no age/date of birth until an eligibility policy exists; updates opt-in unticked; consent version stored. | Blueprint §12.2–12.3. |
| 2026-11-21 | FAQ answers that depend on unpublished policy (costs/purchases/eligibility, prior experience, time commitment) state that the information is pending rather than answering. | §7 "Do not answer without policy"; truth rules. |
| 2026-11-21 | Seed upgrades only pages no admin has touched (no `created_by`/`updated_by` stamp); edited pages are kept and reported. | Keep admin edits intact while shipping new blueprint copy. |
| 2026-11-21 | Spline/3D hero network not built; abstract field + video + SVG strands instead. | §23 lists Spline direction and performance budget as an open P2 decision. |
| 2026-11-21 | Sitemaps segmented at `/sitemap/{pages,articles,journeys,offices,events,news}.xml`, all listed in robots.txt. | §19. Next 16 `generateSitemaps` has no automatic index file. |
| 2026-11-21 | Logo rendered only on Fresh Canopy/Cyprus surfaces (floating header, dark-section header, drawer, footer); text wordmark elsewhere. | §15.2. |
| 2026-11-21 | `/dev/office-preview` renders the office template with labelled sample data for QA screenshots; it 404s in production. | Lets the §11.2 layout be reviewed without inventing a real office. |
