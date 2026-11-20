# Springvilla website: build plan

Governing context: `CLAUDE.md`, the owner's build brief (Phases 0 to 7), `docs/Springvilla_Master_Website_Blueprint_v1.pdf` and `docs/brand/`.
**Status at start of build:** the blueprint PDF and `docs/brand/` were not in the repo. Everything below that depends on them is marked **[BP]** and ships as an empty, admin-editable field until the files arrive (see `docs/OWNER_TODO.md`).

## 1. Sitemap

| Route | Page key | Notes |
|---|---|---|
| `/` | `home` | 7 sections + intro marquee + journey words |
| `/discover` | `discover` | editorial hero, 9-part sequence [BP 7], sub-nav, leadership (verified only), FAQ |
| `/our-system` | `our-system` | FHG → Springvilla → 2-in-1 graphic, pathways, pipeline, foundation, engagement steps, Reality & Responsibility |
| `/our-system/digital-skills` | `digital-skills` | Signal layer accents |
| `/our-system/business` | `business` | Primary layer |
| `/life-here` | `life-here` | gallery hero, experience sections [BP 9], lightbox |
| `/stories-and-ideas` | `stories-and-ideas` | hub |
| `/ideas`, `/ideas/[slug]` | `ideas` | search `?q=`, category `?category=`, load-more `?page=` |
| `/journeys`, `/journeys/[slug]` | `journeys` | verified + consented only |
| `/news`, `/news/[slug]` | `news` | announcements with `kind = news` |
| `/events`, `/events/[slug]` | `events` | timezone-aware |
| `/offices`, `/offices/[slug]` | `offices` | 10-part office page [BP 11.2] |
| `/join` | `join` | 7-part sequence + form [BP 12] |
| `/contact` | `contact` | enquiry-type routing |
| `/faq`, `/privacy`, `/terms` | | privacy/terms flagged "pending legal review" |
| `/login` | | member login (noindex) |
| `/member/*` | | member workspace (noindex) |
| `/admin/*` | | admin (noindex, not linked publicly) |
| `/dev/motion` | | dev only: returns 404 in production |

Permanent (308) redirects: `/about → /discover`, `/growth-system → /our-system`, `/locations → /offices`, `/blog → /ideas`, `/blog/:slug → /ideas/:slug`, `/stories → /journeys`, `/stories/:slug → /journeys/:slug`.

## 2. Component inventory

- **Primitives** (`src/components/ui`): Container, Section (palette layer → bg/fg pair), Eyebrow, DisplayHeading (highlight word in serif italic), Button (primary/secondary/ghost + sliding arrow), MediaFrame, SmartImage, Tag/Chip, OutlineNumeral, Marquee, Accordion, Field inputs.
- **Motion** (`src/lib/motion`): SmoothScroll, RevealText, RevealImage, StaggerCards, MagneticButton, CountUp, ColourShift, PageTransition, DrawLine (SVG stroke on scroll), useReducedMotion, gsap registration.
- **Layout** (`src/components/site`): Header (transparent → floating Fresh Canopy pill, hide on scroll down), MobileDrawer, Footer (curtain reveal), SkipLink, ConsentBanner, Tracker.
- **Home sections** (`src/components/sections/home`): Hero, IntroMarquee, WhatIs, TwoPaths, JourneyWords, LifeInside, RealJourneys, IdeasHappenings, FindYourPlace.
- **Shared sections** (`src/components/sections/shared`): PageHero, RichText, SplitFeature, StepsSequence, PipelineGraphic, RelationshipGraphic, RealityBlock, FaqSection, LeadershipGrid, Gallery + Lightbox, CardGrid, CtaBand.
- **Content**: ArticleCard, EventCard, JourneyCard, OfficeCard, Timeline, ReadingProgress, ShareLinks, OfficeSearch, OfficeMap (Leaflet, lazy).
- **Admin** (`src/components/admin`): Shell (sidebar), DataTable, Drawer, SchemaForm (from Zod section schemas), MediaPicker, Uploader, RichTextEditor (TipTap), RevisionList, ConfirmDialog, Toasts, UnsavedGuard.

## 3. Content architecture

- Every page is a row in `pages`; its content is ordered `page_sections` rows.
- `section_key` selects a Zod schema in `src/lib/content/schemas.ts`. The same schema validates admin input, renders the admin form and types the public component.
- `content` = published JSONB, `draft_content` = editor working copy. Publish copies draft → content, writes a `section_revisions` row and calls `revalidateTag('page:<key>', 'max')`.
- Public reads go through `'use cache'` functions tagged `page:<key>`, `collection:<type>`, `settings`, `nav`. Draft Mode (enabled only by an authenticated admin route) makes the same functions return `draft_content`.
- Media is referenced by `media_assets.id`; the resolver returns URL, alt, caption, dimensions, blur placeholder and variants.
- **No database configured:** the content layer falls back to `src/content/defaults.ts` (the same structural copy the seed script writes), so the site renders in development and in CI. Collections (posts, events, offices, journeys) return empty → honest empty states.

## 4. Database schema (summary; full SQL in `supabase/migrations`)

Shared columns on publishable rows: `id uuid pk`, `slug`, `status`, `created_at`, `updated_at`, `created_by`, `updated_by`, `published_at`.

- `offices` (name, slug, city, state, country, address, lat/lng, hours jsonb, phone, email, whatsapp, gallery uuid[], verification_status, last_verified_at, pending_changes jsonb for central approval, status)
- `profiles` (id = auth.users.id, display_name, avatar_asset_id, office_id, is_active)
- `user_roles` (user_id, role enum, office_id nullable) — unique (user_id, role, office_id)
- `site_settings` (single row, id = 1)
- `navigation_items`, `pages`, `page_sections`, `section_revisions`
- `media_assets`
- `categories`, `tags`, `blog_posts`, `blog_post_tags`
- `member_journeys`, `journey_updates`, `consent_records`
- `events`, `programmes`, `announcements` (kind: news / member / office), `announcement_reads`
- `join_applications`, `contact_enquiries`, `support_requests`
- `courses`, `modules`, `lessons`, `member_progress`, `resources`
- `analytics_events`, `login_attempts`, `rate_limits`, `audit_log`
- Views/RPC: `analytics_overview`, `analytics_timeseries`, `analytics_top(dimension)`, `analytics_funnel`, `analytics_scroll_depth`, `asset_usage(asset_id)`.

Blog workflow: `idea → draft → in_review → claims_review → approved → scheduled → published → archived`. Other content: `draft → in_review → published → archived`.

## 5. Role matrix

| Capability | super | central | office | blog_ed | story_ed | events_ed | training | support | member |
|---|---|---|---|---|---|---|---|---|---|
| Site content, nav, settings | ✓ | ✓ | | | | | | | |
| Hero manager | ✓ | ✓ | | | | | | | |
| Media library (upload/edit) | ✓ | ✓ | own office | ✓ | ✓ | ✓ | ✓ | | |
| Media delete | ✓ | ✓ | | | | | | | |
| Blog posts | ✓ | ✓ | | ✓ | | | | | |
| Journeys + consent | ✓ | ✓ | | | ✓ | | | | |
| Events / news | ✓ | ✓ | own office | | | ✓ | | | |
| Offices (edit) | ✓ | ✓ | own office (high-trust fields → pending approval) | | | | | | |
| Office verification approve | ✓ | ✓ | | | | | | | |
| Applications & enquiries | ✓ | ✓ | own office | | | | | ✓ | |
| Courses, resources, member announcements | ✓ | ✓ | own office announcements | | | | ✓ | | |
| Users & roles | ✓ | ✓ (cannot grant super) | | | | | | | |
| Analytics | ✓ | ✓ | | | | | | | |
| Audit log | ✓ | ✓ | | | | | | | |
| Consent proofs bucket | ✓ | ✓ | | | | | | | |
| Own member records | | | | | | | | | ✓ |

Enforced three times: proxy (optimistic redirect), server action/route handler role checks (`requireRole`), and RLS.

## 6. Animation storyboard

**Hero (01).** Server-rendered, fully visible without JS. On hydrate (`html.js`): 0ms eyebrow opacity 0→1 (500ms); 120ms headline lines rise from yPercent 110 with a 2° rotate, stagger 0.08 (900ms, power4.out); 600ms body + CTAs fade up 24px (700ms); 1100ms rotating "Scroll · Discover · Grow" badge scales in, then rotates 360° every 18s. Scroll (scrub, 0 → 100% of hero): video wrapper scale 1→1.08, darkening overlay +20%, copy yPercent 0→-30 and opacity 1→0. The poster `<img>` is the LCP element; `<video>` is attached after `load` + idle, paused when out of view (IntersectionObserver). Reduced motion / Save-Data / mobile (unless admin allows mobile clip): poster only.

**Two paths (03).** Desktop ≥1024px: section pinned for ~150vh (`end: "+=150%"`), one scrubbed timeline:
0–30% card 01 x -40vw→0 and card 02 x 40vw→0, images clip-reveal inset(100% 0 0 0)→inset(0); numerals stroke-dash in.
30–55% cards translate toward centre (gap shrinks), two SVG connector lines grow from each card's inner edge and meet in the middle.
55–75% bridge statement words reveal (opacity/y stagger) at the meeting point.
After unpin: comparison table rows fade up one by one (StaggerCards). Mobile/reduced: no pin; stacked cards with simple reveals; everything readable.

**Journey words.** Fresh Canopy, pinned ~200vh. Five words occupy the same grid cell; each word's letters (SplitText chars) rise in, hold, then rise out as the next enters. Behind, 5 SVG strands (cubic paths) extend via stroke-dashoffset in proportion to progress and converge toward one node. Reduced motion: no pin, words listed statically with strands fully drawn.

**Life Here (04).** Asymmetric 12-col mosaic, 5 to 9 tiles. Each tile: clip-path inset reveal from alternating sides with delay i×0.08; inner image scale 1.25→1; per-tile scrub parallax speed from [-6, 4, -10, 8, -4 …] yPercent. Caption bar always visible (truncated); hover/focus expands it (CSS grid-rows 0fr→1fr). Optional horizontal "A day at Springvilla" strip: pinned horizontal scroll of chapter cards, rendered only when the admin fills it.

**Page transitions.** Fresh Canopy curtain (scaleY 0→1 from bottom, 300ms, then 1→0 from top) via a client template keyed on pathname. Not run on the initial load. Disabled for reduced motion.

## 7. Assumptions

1. The blueprint and brand guide are absent. Section copy uses the owner's brief verbatim where it gives copy, and empty admin-editable fields elsewhere. No invented facts.
2. No official logo file: the header renders the site name as text until a logo is uploaded in **Settings** (it is never redrawn).
3. Fonts: Instrument Sans (variable) + Instrument Serif, self-hosted from `src/fonts`, because Fontshare is unreachable from the build environment. Swappable for Satoshi/General Sans by replacing the files.
4. No Supabase credentials yet: migrations are written and tested against a local Postgres 16 with a stubbed `auth`/`storage` schema; the app falls back to default content without env vars.
5. Map: Leaflet + OSM tiles, loaded only on interaction/visibility; list always works.
6. Rate limiting uses a Postgres `rate_limits` table (works on Vercel without Redis).
7. Country comes from the `x-vercel-ip-country` header only.
8. Hero video is served from the `public-media` bucket; Supabase free tier caps uploads at 50MB per file (see OWNER_TODO).
9. Next.js 16 with Cache Components: `proxy.ts` replaces middleware, public reads are `'use cache'` + `cacheTag`, request-dependent UI sits inside `<Suspense>`.
