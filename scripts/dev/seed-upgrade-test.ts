/* Proves the seed upgrade is edit-safe: v1-seeded DB → simulate an admin edit on /faq → run v2 seed twice. */
import { Client } from "pg";
import { seed } from "../seed";
const url = "postgresql://postgres@localhost:54329/sv_test?host=/var/tmp/svpg";
(async () => {
  const db = new Client({ connectionString: url });
  await db.connect();
  const admin = (await db.query("insert into auth.users (email) values ('seedtest-' || gen_random_uuid() || '@x') returning id")).rows[0].id;
  // Simulate an admin editing the FAQ page (the trigger stamps updated_by from the JWT).
  await db.query("begin");
  await db.query("select set_config('request.jwt.claims', $1, true)", [JSON.stringify({ sub: admin })]);
  await db.query("update page_sections set content = jsonb_set(content, '{heading}', '\"Edited by admin\"') where page_id = (select id from pages where key='faq') and section_key='faq'");
  await db.query("commit");
  const r1 = await seed(url, () => {});
  const r2 = await seed(url, () => {});
  const faq = await db.query("select content->>'heading' h from page_sections where page_id=(select id from pages where key='faq') and section_key='faq'");
  const discover = await db.query("select count(*)::int n, min(content->>'heading') filter (where section_key='page_hero') h from page_sections where page_id=(select id from pages where key='discover')");
  const join = await db.query("select content->>'successBody' b from page_sections where page_id=(select id from pages where key='join') and section_key='join_form'");
  const cats = await db.query("select count(*)::int n from categories");
  const tz = await db.query("select default_timezone from site_settings");
  console.log({ keptRun1: r1.kept, keptRun2: r2.kept, faqHeading: faq.rows[0].h, discoverSections: discover.rows[0].n, discoverHero: discover.rows[0].h, joinSuccess: join.rows[0].b, categories: cats.rows[0].n, tz: tz.rows[0].default_timezone });
  await db.end();
})().catch((e) => { console.error(e); process.exit(1); });
