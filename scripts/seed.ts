/*
 * Seeds structural page copy, article categories, site settings and navigation
 * from src/content/defaults.ts.
 *
 * Idempotent and edit-safe:
 *  - A page with no sections gets the defaults.
 *  - A page whose sections have NEVER been touched by an admin (no created_by /
 *    updated_by stamp, which the audit triggers set for every signed-in change)
 *    is brought up to date with the current defaults, e.g. new blueprint copy.
 *  - A page an admin has edited is left exactly as it is, and reported.
 *  - Running it twice changes nothing the second time.
 * Never seeds offices, people, stories, events or numbers.
 *
 *   npm run seed            (uses DATABASE_URL from .env.local)
 */
import { config } from "dotenv";
import { Client } from "pg";
import { DEFAULT_PAGES, DEFAULT_SETTINGS, DEFAULT_NAV, DEFAULT_CATEGORIES, SEED_VERSION } from "../src/content/defaults";
import { SECTION_SCHEMAS } from "../src/lib/content/schemas";

config({ path: ".env.local" });
config();

type Row = { id: string; section_key: string; palette_layer: string; visible: boolean; content: unknown; created_by: string | null; updated_by: string | null };

const canon = (v: unknown): string => JSON.stringify(v, (_k, val) => (val && typeof val === "object" && !Array.isArray(val) ? Object.fromEntries(Object.entries(val).sort(([a], [b]) => a.localeCompare(b))) : val));

export async function seed(connectionString: string, log = console.log) {
  const db = new Client({ connectionString });
  await db.connect();
  const kept: string[] = [];
  try {
    await db.query("begin");
    for (const p of DEFAULT_PAGES) {
      const expected = p.sections.map((s) => ({ key: s.key, layer: s.layer, visible: s.visible !== false, content: SECTION_SCHEMAS[s.key].parse(s.content) }));

      const { rows: pageRows } = await db.query("select id, updated_by from public.pages where key = $1", [p.key]);
      let pageId: string;
      if (!pageRows.length) {
        const ins = await db.query(
          "insert into public.pages (key, route, title, seo_title, seo_description, status) values ($1,$2,$3,$4,$5,'published') returning id",
          [p.key, p.route, p.title, p.seoTitle, p.seoDescription],
        );
        pageId = ins.rows[0].id;
      } else {
        pageId = pageRows[0].id;
        // SEO fields only if no admin has edited the page record.
        if (!pageRows[0].updated_by) {
          await db.query("update public.pages set route = $2, title = $3, seo_title = $4, seo_description = $5 where id = $1 and (seo_title is distinct from $4 or seo_description is distinct from $5 or title is distinct from $3)", [pageId, p.route, p.title, p.seoTitle, p.seoDescription]);
        }
      }

      const { rows } = await db.query<Row>("select id, section_key, palette_layer, visible, content, created_by, updated_by from public.page_sections where page_id = $1 order by sort_order", [pageId]);
      const untouched = rows.every((r) => !r.created_by && !r.updated_by);
      const upToDate =
        rows.length === expected.length &&
        rows.every((r, i) => r.section_key === expected[i].key && r.palette_layer === expected[i].layer && r.visible === expected[i].visible && canon(r.content) === canon(expected[i].content));

      if (rows.length && upToDate) {
        log(`· ${p.route} up to date`);
        continue;
      }
      if (rows.length && !untouched) {
        kept.push(p.route);
        log(`! ${p.route} has admin edits — left unchanged (new default copy NOT applied)`);
        continue;
      }
      if (rows.length) await db.query("delete from public.page_sections where page_id = $1", [pageId]);
      let order = 0;
      for (const s of expected) {
        const { rows: sec } = await db.query(
          "insert into public.page_sections (page_id, section_key, sort_order, visible, palette_layer, content, status, published_at) values ($1,$2,$3,$4,$5,$6,'published', now()) returning id",
          [pageId, s.key, order++, s.visible, s.layer, JSON.stringify(s.content)],
        );
        await db.query("insert into public.section_revisions (section_id, content, palette_layer, visible, action) values ($1,$2,$3,$4,'seed')", [sec[0].id, JSON.stringify(s.content), s.layer, s.visible]);
      }
      log(`✓ ${p.route}: ${expected.length} sections${rows.length ? " (updated to current copy)" : ""}`);
    }

    // §10.1 controlled categories: add missing ones, never rename existing.
    for (const [i, c] of DEFAULT_CATEGORIES.entries()) {
      await db.query("insert into public.categories (slug, name, description, sort_order) values ($1,$2,$3,$4) on conflict (slug) do nothing", [c.slug, c.name, c.description, i]);
    }

    // Settings: fill blanks always; replace footer/SEO defaults only if no admin has saved settings.
    const { rows: st } = await db.query("select updated_by from public.site_settings where id = 1");
    const settingsUntouched = !st[0]?.updated_by;
    await db.query(
      `update public.site_settings set
         site_name = coalesce(nullif(site_name,''), $1),
         tagline = coalesce(tagline, $2),
         cookie_banner_text = coalesce(cookie_banner_text, $3)
       where id = 1`,
      [DEFAULT_SETTINGS.site_name, DEFAULT_SETTINGS.tagline, DEFAULT_SETTINGS.cookie_banner_text],
    );
    if (settingsUntouched) {
      await db.query(
        "update public.site_settings set default_seo_title = $1, default_seo_description = $2, default_timezone = $3, footer = $4::jsonb where id = 1",
        [DEFAULT_SETTINGS.default_seo_title, DEFAULT_SETTINGS.default_seo_description, DEFAULT_SETTINGS.default_timezone, JSON.stringify(DEFAULT_SETTINGS.footer)],
      );
    } else kept.push("site settings");

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

    await db.query("create schema if not exists ops; create table if not exists ops.seed_runs (version text, ran_at timestamptz default now(), kept text[])");
    await db.query("insert into ops.seed_runs (version, kept) values ($1, $2)", [SEED_VERSION, kept]);
    await db.query("commit");
    log(`Seed ${SEED_VERSION} complete.${kept.length ? ` Kept admin edits on: ${kept.join(", ")}.` : ""}`);
    return { kept };
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
