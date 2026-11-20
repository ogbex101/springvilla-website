/*
 * Builds docs/supabase_setup.sql: every migration in order + the seed, for pasting
 * into the Supabase SQL Editor when the database can't be reached from the CLI.
 *   npm run db:setup-sql
 */
import fs from "node:fs";
import path from "node:path";
import { DEFAULT_PAGES, DEFAULT_SETTINGS, DEFAULT_NAV, DEFAULT_CATEGORIES, SEED_VERSION } from "../src/content/defaults";
import { SECTION_SCHEMAS } from "../src/lib/content/schemas";

const dir = path.join(process.cwd(), "supabase/migrations");
const files = fs.readdirSync(dir).filter((f) => f.endsWith(".sql")).sort();
const lit = (s: string | null | undefined) => (s === null || s === undefined ? "null" : `'${s.replace(/'/g, "''")}'`);
const json = (v: unknown) => {
  const j = JSON.stringify(v);
  if (j.includes("$j$")) throw new Error("JSON contains dollar-quote tag");
  return `$j$${j}$j$::jsonb`;
};

let out = `-- =====================================================================
-- Springvilla: complete database setup (schema + seed)
-- Seed version: ${SEED_VERSION}
--
-- Paste this whole file into Supabase -> SQL Editor -> New query -> Run.
-- Run it ONCE on a fresh project. It creates every table, policy, function
-- and storage bucket, then seeds page copy, categories, settings and menus.
-- It never creates offices, people, stories, events or numbers.
-- Later schema changes: run \`npm run db:migrate\` from your own computer.
-- Regenerate with: npm run db:setup-sql
-- =====================================================================
`;
for (const f of files) {
  out += `\n-- ---------------------------------------------------------------------\n-- Migration: ${f}\n-- ---------------------------------------------------------------------\n`;
  out += fs.readFileSync(path.join(dir, f), "utf8").trim() + "\n";
}

out += `
-- ---------------------------------------------------------------------
-- Record applied migrations so \`npm run db:migrate\` skips them later
-- ---------------------------------------------------------------------
create schema if not exists ops;
create table if not exists ops.schema_migrations (name text primary key, applied_at timestamptz default now());
insert into ops.schema_migrations (name) values
${files.map((f) => `  (${lit(f)})`).join(",\n")}
on conflict (name) do nothing;

-- =====================================================================
-- Seed (only fills pages that have no sections yet; safe to re-run)
-- =====================================================================
`;

for (const p of DEFAULT_PAGES) {
  out += `\ninsert into public.pages (key, route, title, seo_title, seo_description, status) values (${lit(p.key)}, ${lit(p.route)}, ${lit(p.title)}, ${lit(p.seoTitle)}, ${lit(p.seoDescription)}, 'published') on conflict (key) do nothing;\n`;
  out += `do $seed$\ndeclare pid uuid; sid uuid;\nbegin\n  select id into pid from public.pages where key = ${lit(p.key)};\n  if not exists (select 1 from public.page_sections where page_id = pid) then\n`;
  p.sections.forEach((s, i) => {
    const content = SECTION_SCHEMAS[s.key].parse(s.content);
    const visible = s.visible !== false;
    out += `    insert into public.page_sections (page_id, section_key, sort_order, visible, palette_layer, content, status, published_at) values (pid, ${lit(s.key)}, ${i}, ${visible}, ${lit(s.layer)}, ${json(content)}, 'published', now()) returning id into sid;\n`;
    out += `    insert into public.section_revisions (section_id, content, palette_layer, visible, action) values (sid, ${json(content)}, ${lit(s.layer)}, ${visible}, 'seed');\n`;
  });
  out += `  end if;\nend $seed$;\n`;
}

out += `\n-- Article categories (blueprint section 10.1)\n`;
DEFAULT_CATEGORIES.forEach((c, i) => {
  out += `insert into public.categories (slug, name, description, sort_order) values (${lit(c.slug)}, ${lit(c.name)}, ${lit(c.description)}, ${i}) on conflict (slug) do nothing;\n`;
});

out += `
-- Site settings
update public.site_settings set
  site_name = coalesce(nullif(site_name, ''), ${lit(DEFAULT_SETTINGS.site_name)}),
  tagline = coalesce(tagline, ${lit(DEFAULT_SETTINGS.tagline)}),
  default_seo_title = coalesce(default_seo_title, ${lit(DEFAULT_SETTINGS.default_seo_title)}),
  default_seo_description = coalesce(default_seo_description, ${lit(DEFAULT_SETTINGS.default_seo_description)}),
  default_timezone = ${lit(DEFAULT_SETTINGS.default_timezone)},
  cookie_banner_text = coalesce(cookie_banner_text, ${lit(DEFAULT_SETTINGS.cookie_banner_text)}),
  footer = case when footer = '{}'::jsonb then ${json(DEFAULT_SETTINGS.footer)} else footer end
where id = 1;
`;

const nav = [
  ...DEFAULT_NAV.header.map((n, i) => [n.label, n.href, "header", null, i] as const),
  ...DEFAULT_NAV.footer.map((n, i) => [n.label, n.href, "footer", n.group, i] as const),
  ...DEFAULT_NAV.legal.map((n, i) => [n.label, n.href, "legal", null, i] as const),
];
out += `
-- Navigation (only if empty)
do $nav$
begin
  if not exists (select 1 from public.navigation_items) then
    insert into public.navigation_items (label, href, location, group_label, sort_order) values
${nav.map(([l, h, loc, g, i]) => `      (${lit(l)}, ${lit(h)}, ${lit(loc)}::public.nav_location, ${lit(g)}, ${i})`).join(",\n")};
  end if;
end $nav$;

create table if not exists ops.seed_runs (version text, ran_at timestamptz default now(), kept text[]);
insert into ops.seed_runs (version, kept) values (${lit(SEED_VERSION)}, '{}');

-- Done. Next: promote your account to super_admin (docs/OWNER_TODO.md, section C).
`;

fs.writeFileSync(path.join(process.cwd(), "docs/supabase_setup.sql"), out);
console.log(`docs/supabase_setup.sql written: ${files.length} migrations + seed for ${DEFAULT_PAGES.length} pages (${Math.round(out.length / 1024)} KB)`);
