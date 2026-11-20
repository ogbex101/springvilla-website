# Owner to-do

Things only you can provide or do. The site keeps working without them: empty fields hide themselves or show an honest empty state.

## A. Files still missing from the repo

- [x] Blueprint PDF: added at `docs/Springvilla_Master_Website_Blueprint_v1.pdf`; alignment results in `docs/BLUEPRINT_GAPS.md`.
- [ ] Add `docs/brand/` (Brand Colour Guide v1.0 + **official logo files**: transparent SVG preferred). These did not arrive with the blueprint. Then upload the logo in **Admin → Navigation & settings → Logo**: it will appear unchanged on Fresh Canopy/Cyprus surfaces only.
- [ ] Optional: licensed Satoshi or General Sans `.woff2` files if you prefer them to Instrument Sans.

## B. Create the Supabase project (about 15 minutes)

1. Go to https://supabase.com, sign in, **New project**. Name: `springvilla`. Region: closest to most visitors (e.g. `eu-west-2` London or `eu-central-1`). Save the database password somewhere safe.
2. **Project Settings → API**: copy the Project URL, `anon` public key and `service_role` key.
3. **Project Settings → Database → Connection string → URI**: copy it (replace `[YOUR-PASSWORD]`). This is `DATABASE_URL`.
4. In the repo, copy `.env.example` to `.env.local` and fill in every value. Generate `ANALYTICS_SALT` with `openssl rand -hex 32`. Set `SUPER_ADMIN_EMAIL` to your own email.
5. Run the migrations (creates every table, policy and storage bucket):
   ```bash
   npm run db:migrate
   ```
   Alternatively, paste each file in `supabase/migrations/` in order into **SQL Editor → New query → Run**.
6. Seed the structural page copy (homepage sections, settings, navigation):
   ```bash
   npm run seed
   ```
7. **Authentication → Providers → Email**: keep Email enabled, turn **Confirm email** on. **Authentication → URL Configuration**: Site URL = your domain; add `https://<your-domain>/auth/callback` and `http://localhost:3000/auth/callback` to Redirect URLs.
8. **Authentication → Multi-Factor**: make sure TOTP is enabled.

### Storage buckets

The migration creates them; check under **Storage** that these exist:

| Bucket | Access | Limit |
|---|---|---|
| `public-media` | public read, admin write | images 15MB, video 50MB |
| `private-docs` | signed-in members and admins | 25MB, PDF/Office/images |
| `consent-proofs` | super + central admin only | 15MB, PDF/images |

**Storage plan limit:** the Supabase Free plan caps a single upload at **50MB** and total storage at **1GB**. A 10MB desktop hero loop + 4MB mobile loop is well within that. If you plan many videos, upgrade to Pro (100GB, per-file limit configurable up to 500GB) under **Project Settings → Billing**.

## C. Create the first super admin

1. Create your user in Supabase: **Authentication → Users → Add user → Create new user**, enter `SUPER_ADMIN_EMAIL` and a strong password (12+ characters), tick **Auto confirm**.
2. Run:
   ```bash
   npm run seed:admin
   ```
   This gives that user the `super_admin` role.
3. Sign in at `/admin/login`. You will be asked to set up an authenticator app (TOTP) the first time. Super admins cannot skip this.

## D. Verified facts and assets still needed

Fill these in the admin; until then each module hides itself.

- [ ] Official logo (Settings → Brand)
- [ ] Hero video: desktop MP4 (10–20s loop, 1080p, H.264, under 10MB), mobile MP4 (720p, under 4MB), poster image (1920×1080 JPG/WebP) — Admin → Hero
- [ ] Real documentary photos with consent confirmed: what-is section, two path cards, 5–9 Life Here tiles, office photos
- [ ] Offices: name, address, hours, contacts, map pin, verification date (none are seeded)
- [ ] Leadership: names, roles, photos (verified only)
- [ ] Member journeys with signed consent records
- [ ] Contact channels and social links (Settings)
- [ ] FHG / NeoLife relationship wording reviewed by the right people [blueprint TO VERIFY items]
- [ ] Privacy policy and terms reviewed by a lawyer (currently marked "pending legal review")
- [ ] Legal entity name and registration details for the footer disclaimer

## E. Things I could not verify in the build environment

- [ ] **Run the end-to-end admin tests against your real Supabase project.** Docker images and a local Supabase stack were not available in the build environment, so the following are written and typechecked but have only been verified up to the database layer (the 66 RLS/permission tests pass on real Postgres 16):
  - admin login, MFA enrolment, editing → publishing → seeing it live, media upload with WebP/AVIF processing, the join form saving to the inbox with duplicate protection.
  - How: create a central admin user (not a super admin, which needs a TOTP code), then run
    ```bash
    E2E_ADMIN_EMAIL=you@example.com E2E_ADMIN_PASSWORD='…' npx playwright test
    ```
- [ ] **Run `npm run db:migrate` then `npm run seed`** after pulling this version. The migration adds the blueprint fields; the seed updates page copy to the blueprint wording **only on pages you haven't edited** and prints the pages it left alone.
- [ ] **Answer the pending-policy FAQs** (costs/purchases/eligibility, prior experience, time commitment): edit them under Site content → FAQ / Join.
- [ ] Confirm whether member-support staff should see all enquiries or only those assigned to them (blueprint §14.1 says "limited member records").
- [ ] Confirm the member onboarding sequence (§13.3, marked "proposed; validate with leadership").
- [ ] Hero video, poster and all photos (none are bundled; abstract brand fields show until you upload).

## F. Deploy (Vercel)

See the final section of `docs/ADMIN_GUIDE.md` → "Deploying". Short version: import the repo in Vercel, add the env vars from `.env.example`, deploy, add your domain, then set the Supabase Site URL and redirect URL.
