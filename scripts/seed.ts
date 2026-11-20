/*
 * Seeds structural page copy, site settings and navigation from src/content/defaults.ts.
 * Idempotent: pages that already have sections are left alone (admin edits are never overwritten).
 * Never seeds offices, people, stories, events or numbers.
 *
 *   npm run seed            (uses DATABASE_URL from .env.local)
 */
import { config } from "dotenv";
import { Client } from "pg";
import { DEFAULT_PAGES, DEFAULT_SETTINGS, DEFAULT_NAV } from "../src/content/defaults";
import { SECTION_SCHEMAS } from "../src/lib/content/schemas";

config({ path: ".env.local" });
config();

export async function seed(connectionString: string, log = console.log) {
  const db = new Client({ connectionString });
  await db.connect();
  try {
    await db.query("begin");
    for (const p of DEFAULT_PAGES) {
      const { rows } = await db.query(
        `insert into public.pages (key, route, title, seo_title, seo_description, status)
         values ($1,$2,$3,$4,$5,'published')
         on conflict (key) do update set route = excluded.route
         returning id`,
        [p.key, p.route, p.title, p.seoTitle, p.seoDescription],
      );
      const pageId = rows[0].id;
      const { rows: existing } = await db.query("select count(*)::int as n from public.page_sections where page_id = $1", [pageId]);
      if (existing[0].n > 0) {
        log(`· ${p.route} already has sections — left unchanged`);
        continue;
      }
      let order = 0;
      for (const s of p.sections) {
        const content = SECTION_SCHEMAS[s.key].parse(s.content); // validate + fill defaults
        const { rows: sec } = await db.query(
          `insert into public.page_sections (page_id, section_key, sort_order, visible, palette_layer, content, status, published_at)
           values ($1,$2,$3,$4,$5,$6,'published', now()) returning id`,
          [pageId, s.key, order++, s.visible !== false, s.layer, JSON.stringify(content)],
        );
        await db.query("insert into public.section_revisions (section_id, content, palette_layer, visible, action) values ($1,$2,$3,$4,'seed')", [sec[0].id, JSON.stringify(content), s.layer, s.visible !== false]);
      }
      log(`✓ ${p.route}: ${p.sections.length} sections`);
    }

    await db.query(
      `update public.site_settings set
         site_name = coalesce(nullif(site_name,''), $1),
         tagline = coalesce(tagline, $2),
         default_seo_title = coalesce(default_seo_title, $3),
         default_seo_description = coalesce(default_seo_description, $4),
         cookie_banner_text = coalesce(cookie_banner_text, $5),
         footer = case when footer = '{}'::jsonb then $6::jsonb else footer end
       where id = 1`,
      [DEFAULT_SETTINGS.site_name, DEFAULT_SETTINGS.tagline, DEFAULT_SETTINGS.default_seo_title, DEFAULT_SETTINGS.default_seo_description, DEFAULT_SETTINGS.cookie_banner_text, JSON.stringify(DEFAULT_SETTINGS.footer)],
    );
    const { rows: navCount } = await db.query("select count(*)::int as n from public.navigation_items");
    if (navCount[0].n === 0) {
      const items = [
        ...DEFAULT_NAV.header.map((n, i) => [n.label, n.href, "header", null, i]),
        ...DEFAULT_NAV.footer.map((n, i) => [n.label, n.href, "footer", n.group, i]),
        ...DEFAULT_NAV.legal.map((n, i) => [n.label, n.href, "legal", null, i]),
      ];
      for (const it of items) await db.query("insert into public.navigation_items (label, href, location, group_label, sort_order) values ($1,$2,$3,$4,$5)", it);
      log(`✓ navigation: ${items.length} links`);
    }
    await db.query("commit");
    log("Seed complete.");
  } catch (e) {
    await db.query("rollback");
    throw e;
  } finally {
    await db.end();
  }
}

if (process.argv[1]?.endsWith("seed.ts")) {
  const url = process.env.DATABASE_URL;
  if (!url) {
    console.error("DATABASE_URL is not set. See docs/OWNER_TODO.md section B.");
    process.exit(1);
  }
  seed(url).catch((e) => {
    console.error(e.message);
    process.exit(1);
  });
}
