# Owner to-do

Things only you can provide or do. The site keeps working without them: empty fields hide themselves or show an honest empty state.

## A. Files missing from the repo (blocking quality, not the build)

- [ ] Add `docs/Springvilla_Master_Website_Blueprint_v1.pdf`. Copy for blueprint sections 7, 9, 11.2, 12 and 24 is waiting on it.
- [ ] Add `docs/brand/` (Brand Colour Guide + official logo files: SVG preferred, plus PNG on Fresh Canopy and on Cyprus).
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

1. Visit `/admin/login` → it says no account exists for unknown emails, so first create your user: in Supabase **Authentication → Users → Add user → Create new user**, enter `SUPER_ADMIN_EMAIL` and a strong password, tick **Auto confirm**.
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

## E. Deploy (Vercel)

See the final section of `docs/ADMIN_GUIDE.md` → "Deploying".
