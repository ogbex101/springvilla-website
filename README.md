# Springvilla website

Next.js 16 (App Router, Cache Components) · TypeScript · Tailwind v4 · Supabase · GSAP · Lenis · Playwright.

- Project rules: `CLAUDE.md` · Build plan: `docs/BUILD_PLAN.md` · Decisions: `docs/DECISIONS.md`
- **Owner setup steps: `docs/OWNER_TODO.md`** · **Admin guide: `docs/ADMIN_GUIDE.md`**

## Commands

| Command | What it does |
|---|---|
| `npm run dev` | Dev server on :3000 (works without Supabase using default copy) |
| `npm run build` / `npm start` | Production build / server |
| `npm run typecheck` · `npm run lint` | Checks |
| `npm run db:migrate` | Apply `supabase/migrations` to `DATABASE_URL` |
| `npm run db:setup-sql` | Regenerate `docs/supabase_setup.sql` (all migrations + seed, for the SQL Editor) |
| `npm run seed` | Seed page copy, settings and navigation (idempotent, never overwrites edits) |
| `npm run seed:admin` | Make `SUPER_ADMIN_EMAIL` a super admin |
| `npm run test:db` | RLS/permission tests on a throwaway local Postgres (`TEST_PG_URL`) |
| `npm run test:e2e` | Playwright (admin/Supabase tests run when credentials are set) |

## Layout

```
src/app/(public)     public site          src/app/admin      admin (/admin/login, /admin/(app)/…)
src/app/member       member workspace     src/app/api        track, preview, admin export
src/components/ui    primitives           src/components/sections  page sections + registries
src/lib/motion       motion engine        src/lib/content    schemas, defaults, cached queries
src/lib/supabase     browser / server / service / public clients (kept separate)
supabase/migrations  schema, RLS, storage, analytics RPCs
```
