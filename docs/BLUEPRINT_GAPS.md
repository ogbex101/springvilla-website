# Blueprint alignment: gaps found and how each was resolved

Source: `docs/Springvilla_Master_Website_Blueprint_v1.pdf` (v1.0, 20 Nov 2026), read end to end and compared with the build at commit `dd7d833`.

Status key: **Fixed** = changed in this pass · **Owner** = needs a decision or asset from Springvilla (shown as an empty / pending state, never invented) · **Deferred** = deliberately not built yet, with the reason.

> **Brand guide and logo files were not supplied with this pass.** Only the blueprint PDF reached the build environment; `docs/brand/` does not exist in the repo. Colour checks below use the blueprint's own §15.1–15.2 rules (which quote the brand guide). The logo swap is ready in code (Settings → Logo) but cannot be done until the official file is uploaded.

## 1. Brand (§15)

| # | Blueprint | Built | Gap | Status |
|---|---|---|---|---|
| B1 | §15.1 exact hex values for 5 layers | Same 10 hex values in `globals.css` | None | Matches |
| B2 | Max two layers per composition; accents ≤30%; no extra greens | Section layer system; two-paths uses Signal + Lime-on-Canopy | None | Matches |
| B3 | "White/cream text on dark backgrounds" | White `#FFFFFF` used on dark layers | Cream allowed; white is acceptable. No change | Matches |
| B4 | No Lime Sprout text on Mantis or Luminous Moss | Never paired | None | Matches |
| B5 | §15.2 logo: original file unchanged, only on Fresh Canopy or Cyprus, clear space, aspect ratio | Text wordmark in header; logo upload in Settings rendered on every header state, including the transparent header over light sections and the mobile drawer | Logo could appear over a light section; no clear-space rule; footer had no logo | **Fixed** (logo shown only on Canopy/Cyprus surfaces: floating header bar, dark-section header, drawer, footer; text wordmark otherwise; clear-space padding; aspect ratio from file). **Owner**: upload official file |
| B6 | Brand guide pp. 2–8 (pairing restrictions beyond §15) | Not available | Cannot verify rules not quoted in the blueprint | **Owner**: add `docs/brand/` |

## 2. Navigation and routes (§5)

| # | Blueprint | Built | Gap | Status |
|---|---|---|---|---|
| N1 | §5.2 URL map | All 26 routes exist | None | Matches |
| N2 | AI Studio aliases redirect | 308s for /about, /growth-system, /locations, /blog, /stories | None | Matches |
| N3 | §5.3 header, mobile drawer, 44px targets, footer rules | Built | None | Matches |
| N4 | Terminology: member, office, development community, office administrator | "development communities" missing from most copy | **Fixed** in seed copy |

## 3. Homepage (§6, §24)

| # | Section | Gap | Status |
|---|---|---|---|
| H1 | 01 Hero body | Copy differed from §6 / §24 | **Fixed** |
| H2 | 01 Hero 3D growth network (Spline) | Not built; abstract field + video instead | **Deferred**: §23 lists "Spline scene direction and performance budget" as an open P2 decision. Journey-words strands provide the abstract network motif meanwhile |
| H3 | 02 body + micro-explainer wording | Differed | **Fixed** |
| H4 | 03 heading "Two paths. One environment. Room to grow." + path descriptions | Differed | **Fixed** |
| H5 | 04 body; "social and welfare support" module | Differed / "Welfare" only | **Fixed** |
| H6 | 05 body; CTA "Read member journeys"; cards show date + office + milestone | Copy and CTA differed; card showed no headline milestone/date | **Fixed** (growth statement + latest milestone date on card) |
| H7 | 06 CTA "Explore stories & ideas"; useful editorial invitation when empty | Wording | **Fixed** |
| H8 | 07 body; reassurance line (§24) | Differed | **Fixed** |

## 4. Discover (§7)

| # | Gap | Status |
|---|---|---|
| D1 | Must follow the 9-part sequence (opening statement; official definition; why it exists; philosophy; how offices work; culture in action; leadership & story; ethical commitment; FAQ + office/contact action). Built version had 8 different parts | **Fixed**: rebuilt in exactly this order with anchored sub-navigation |
| D2 | Draft body copy (§7) not used; must not be presented as a founder quote | **Fixed** (used as body text, not a quotation) |
| D3 | FAQ must cover the 11 high-priority topics | Built version had 4 | **Fixed**: all 11. Two answers depend on unpublished policy (costs/eligibility; prior experience) and say so honestly → **Owner** |
| D4 | Why-it-exists copy is "pending leadership approval"; leadership only verified | Leadership grid hides when empty | **Owner** |

## 5. Our System (§8, §16.3)

| # | Gap | Status |
|---|---|---|
| S1 | 8-part structure (opening; relationship graphic with NeoLife only inside business pathway; digital pathway; network-marketing pathway; shared foundation; engagement; reality & responsibility; FAQ + next step) | **Fixed** |
| S2 | Shared foundation list is "confidence, communication, public speaking, discipline, teamwork and ongoing learning" | Built used the bridge list | **Fixed** |
| S3 | Engagement steps end "reflect and grow" | **Fixed** |
| S4 | §8.5 entity separation table (FHG / Springvilla / NeoLife / Freelancing / Network marketing; "do not imply") | Not built | **Fixed**: new *Comparison table* section type |
| S5 | §16.3 interactive two-path storytelling on Our System | Only on homepage | **Fixed**: the pinned two-path sequence now also renders on /our-system |
| S6 | Digital sub-page: §8.3 copy, heading "Build skills that create value", project lifecycle brief → learn → create → review → deliver, portfolio & client standards, boundaries between learning and paid work, active work areas only | Partial | **Fixed**; active areas of digital work → **Owner** (empty until verified) |
| S7 | Business sub-page: §8.4 copy, heading "Understand the business behind the business", 6-step pipeline, NeoLife infrastructure explanation, ethics warnings | Partial; pipeline steps had no text | **Fixed** |

## 6. Life Here (§9)

| # | Gap | Status |
|---|---|---|
| L1 | Seven experiences: Skills in practice; Business training; Public speaking; Leadership & teamwork; Community & welfare; Events & recognition; Learning alongside other responsibilities, each with "what to show" | Built had 6 different generic tiles with empty text | **Fixed** |
| L2 | "A day at Springvilla" 5 chapters (arrive and connect; learn; practise; apply; reflect/community), must be a documented real day or labelled illustrative | Homepage strip existed without the label rule | **Fixed**: label field + chapter defaults kept empty until a real day is documented → **Owner** |
| L3 | 8–15 approved photos, short clips, captions | **Owner** |

## 7. Stories & Ideas (§10)

| # | Gap | Status |
|---|---|---|
| E1 | Eight controlled article categories | None seeded | **Fixed**: seeded (idempotent) |
| E2 | Article: author role, citations/sources, related articles | Missing | **Fixed**: `author_role`, `sources`, `related_ids` + article template shows them |
| E3 | Workflow includes **revised**; store rejection reasons | Missing | **Fixed**: `revised` status + `review_notes` |
| E4 | Journey fields: growth statement, starting point, challenge, support received, actions, skills, current progress, advice, quote; story-page sequence | Only summary/body | **Fixed** (fields + page order per §10.3) |
| E5 | Anonymity levels incl. initials and pseudonym | 3 of 5 | **Fixed** |
| E6 | Separate consent for name, photo, video, office, quote, financial detail; minors stricter | Free-text scope | **Fixed**: fixed scope options, minor + guardian fields; publish blocked if a minor has no guardian consent |
| E7 | Separate review for earnings/health/strong claims | Not enforced for journeys | **Fixed**: "contains claims" flag requires central approval to publish |
| E8 | Events: category, organiser, capacity, eligibility, contact | Missing | **Fixed** |

## 8. Offices (§11)

| # | Gap | Status |
|---|---|---|
| O1 | 10-part office page in the §11.2 order | Built page had a different order and lacked several parts | **Fixed**: rebuilt in order |
| O2 | Accessible directions link | Map link only | **Fixed** |
| O3 | Preferred communication method | Missing | **Fixed** |
| O4 | Local announcements with freshness timestamps | Events only | **Fixed**: office news + "updated" dates |
| O5 | Representative details consent-controlled | No consent flag | **Fixed** |
| O6 | Visitor guidance: appointment, what to bring, eligibility/cost | Missing | **Fixed** (fields; hidden until filled) |
| O7 | CTAs "Ask about this office" / "Plan a visit" / "Apply with this office" (preselects office) | Different labels; no preselect | **Fixed** |
| O8 | §11.3 leader names are high-trust | Not in guard | **Fixed** (migration + server rule) |
| O9 | Directory shows "location status" | Verified/unverified only | Matches (verified status + date) |

## 9. Join and contact (§12)

| # | Gap | Status |
|---|---|---|
| J1 | 7-part page sequence (§12.1) | 4 parts | **Fixed** |
| J2 | Fields per §12.2: full name; email **or** phone (at least one); city/state; preferred office with "help me find one"; current occupation (student, employed, self-employed, other, prefer not to say); interests (digital, business, both, community/unsure); message; privacy acknowledgement; marketing opt-in **unchecked by default** | Phone + email both required; extra fields (age range, how heard, hopes); contact consent pre-ticked | **Fixed** (schema migration + form) |
| J3 | Age/eligibility confirmation is policy-dependent; no date of birth | Age range collected | **Fixed**: removed. **Owner**: eligibility policy |
| J4 | §12.3 store consent version; exact success copy; no response-time promise | Promised "within a week" | **Fixed** |
| J5 | §12.4 contact routes: general, media, partnership, office information, product-related, privacy request, technical support | Different set | **Fixed** (old values kept valid for existing rows) |
| J6 | Button microcopy "Submit Enquiry" (§24) | "Send my details" | **Fixed** |

## 10. Member workspace (§13)

| # | Gap | Status |
|---|---|---|
| M1 | **My Growth** area (voluntary goals, learning history) | Missing | **Fixed** |
| M2 | Announcements: priority, expiry, role targeting | No priority/expiry | **Fixed** (priority + expiry; role targeting **Deferred** until roles beyond member exist for members) |
| M3 | Dashboard: recommended resource, new article/story | Missing | **Fixed** |
| M4 | Onboarding sequence (§13.3) | Not built | **Owner**: blueprint marks it "proposed; validate with leadership" |
| M5 | Lesson types audio/PDF/download/quiz/external link; course prerequisites, version | Text + video only | **Deferred**: needs the training archive (§23 P1) to design against real material |

## 11. Admin (§14)

| # | Gap | Status |
|---|---|---|
| A1 | Roles and hard boundaries | Match; member-support scope is wider than "limited member records" | **Owner**: confirm whether support staff should see all enquiries or only assigned ones |
| A2 | Dashboard: verified office count, assets missing alt/consent, office freshness (monthly) | Missing | **Fixed** |

## 12. SEO, accessibility, performance (§19–20)

| # | Gap | Status |
|---|---|---|
| P1 | Sitemap segmented by pages / articles / stories / offices / events | Single sitemap | **Fixed** |
| P2 | Dates clear to Nigerian audiences; default timezone | UTC default | **Fixed**: default `Africa/Lagos` (editable) |
| P3 | Measurement: event registration, learning completion | Partial | **Fixed** (`lesson_complete`; registration via CTA tracking) |

## 13. Open items that stay empty until Springvilla supplies them (§23)

Official logo file · FHG full name and authorised description · legal entity · verified office list · eligibility/fees/purchases/age policy · programme inventory · photos/video with releases · approval chain · founding story/mission · first articles, journeys and events · NeoLife brand-use guidance · Spline direction.

## Verification (this pass)

- `npm run typecheck`, `npm run lint`, `npm run build`: pass.
- Database tests: **74 passed** (66 original + 8 blueprint rules: email-or-phone, leader names high-trust, minor guardian consent, strong-claims approval, public story fields).
- Playwright: **53 passed**, 4 skipped (need live Supabase credentials). New tests cover the Discover 9-part order, all 11 FAQ topics, the 7 Life Here experiences, the §8.5 table, the §12.2 join fields and validation, §12.4 contact routes and the segmented sitemaps.
- Seed upgrade tested on a database seeded with the old copy plus a simulated admin edit: untouched pages moved to blueprint copy, the edited page was kept, the second run changed nothing.
- Screenshots re-taken at 375/768/1440 for home, discover, our-system (+ both path pages), life-here, join, contact, faq and the office template (`dev_office-preview-*`), and reviewed.
