/*
 * Database permission tests. Creates a throwaway database on a local Postgres,
 * applies a Supabase stub + all migrations, then exercises RLS as each role.
 *
 *   TEST_PG_URL=postgresql://postgres@localhost:54329/postgres?host=/var/tmp/svpg npm run test:db
 */
import { Client } from "pg";
import { migrate } from "./migrate";

const admin = process.env.TEST_PG_URL ?? "postgresql://postgres@localhost:54329/postgres?host=/var/tmp/svpg";
const dbName = `sv_rls_${Date.now()}`;
const dbUrl = admin.replace(/\/postgres(\?|$)/, `/${dbName}$1`);

let passed = 0;
const failures: string[] = [];
function ok(cond: unknown, name: string) {
  if (cond) passed++;
  else failures.push(name);
  console.log(`${cond ? "  ✓" : "  ✗"} ${name}`);
}

type Who = { sub?: string; aal?: "aal1" | "aal2"; role?: "anon" | "authenticated" };

async function main() {
  const root = new Client({ connectionString: admin });
  await root.connect();
  await root.query(`create database ${dbName}`);
  await root.end();
  await migrate(dbUrl, { extra: [`${process.cwd()}/supabase/tests/supabase_stub.sql`], quiet: true });

  const db = new Client({ connectionString: dbUrl });
  await db.connect();

  /** Run fn as a given identity inside a rolled-back transaction. */
  async function as<T>(who: Who, fn: (q: (sql: string, params?: unknown[]) => Promise<{ rows: Record<string, unknown>[]; rowCount: number }>) => Promise<T>): Promise<T> {
    await db.query("begin");
    try {
      const role = who.role ?? (who.sub ? "authenticated" : "anon");
      await db.query(`set local role ${role}`);
      await db.query("select set_config('request.jwt.claims', $1, true)", [
        JSON.stringify(who.sub ? { sub: who.sub, role, aal: who.aal ?? "aal1", email: `${who.sub}@test` } : { role: "anon" }),
      ]);
      return await fn(async (sql, params) => {
        const r = await db.query(sql, params as unknown[]);
        return { rows: r.rows, rowCount: r.rowCount ?? 0 };
      });
    } finally {
      await db.query("rollback");
    }
  }
  async function fails(who: Who, sql: string, params?: unknown[]) {
    try {
      await as(who, (q) => q(sql, params));
      return false;
    } catch {
      return true;
    }
  }

  // ---------------------------------------------------------------- fixtures (superuser)
  const u = async (email: string) => (await db.query("insert into auth.users (email) values ($1) returning id", [email])).rows[0].id as string;
  const superId = await u("super@x");
  const centralId = await u("central@x");
  const officeAAdmin = await u("oa@x");
  const officeBAdmin = await u("ob@x");
  const blogEd = await u("blog@x");
  const storyEd = await u("story@x");
  const eventsEd = await u("events@x");
  const memberA = await u("ma@x");
  const memberB = await u("mb@x");

  const off = async (slug: string, status = "published") =>
    (await db.query("insert into offices (slug, name, status, city, phone) values ($1, $1, $2, 'City', '000') returning id", [slug, status])).rows[0].id as string;
  const officeA = await off("office-a");
  const officeB = await off("office-b");
  await off("office-draft", "draft");

  await db.query(
    `insert into user_roles (user_id, role, office_id) values
      ($1,'super_admin',null), ($2,'central_admin',null), ($3,'office_admin',$10), ($4,'office_admin',$11),
      ($5,'blog_editor',null), ($6,'story_editor',null), ($7,'events_editor',null), ($8,'member',null), ($9,'member',null)`,
    [superId, centralId, officeAAdmin, officeBAdmin, blogEd, storyEd, eventsEd, memberA, memberB, officeA, officeB],
  );
  await db.query("update profiles set office_id = $1 where id = $2", [officeA, memberA]);
  await db.query("update profiles set office_id = $1 where id = $2", [officeB, memberB]);

  const appA = (await db.query(
    "insert into join_applications (full_name,email,phone,city,office_id,interest,consent_contact,consent_privacy) values ('A','a@a','1','c',$1,'digital',true,true) returning id",
    [officeA],
  )).rows[0].id;
  const appB = (await db.query(
    "insert into join_applications (full_name,email,phone,city,office_id,interest,consent_contact,consent_privacy) values ('B','b@b','2','c',$1,'business',true,true) returning id",
    [officeB],
  )).rows[0].id;
  await db.query("insert into contact_enquiries (enquiry_type,name,email,message,consent_privacy,office_id) values ('general','X','x@x','hi',true,$1)", [officeB]);

  const page = (await db.query("insert into pages (key, route, title) values ('home','/','Home') returning id")).rows[0].id;
  const section = (await db.query(
    "insert into page_sections (page_id, section_key, content, draft_content) values ($1, 'hero', '{\"headline\":\"live\"}', '{\"headline\":\"secret draft\"}') returning id",
    [page],
  )).rows[0].id;
  await db.query("insert into blog_posts (slug,title,status,published_at) values ('live-post','Live','published', now() - interval '1 day'), ('draft-post','Draft','draft',null), ('future-post','Future','scheduled', now() + interval '2 days')");
  await db.query("insert into support_requests (user_id, subject, message, office_id) values ($1,'s','m',$2), ($3,'s','m',$4)", [memberA, officeA, memberB, officeB]);

  console.log("\nPublic visitor (anon)");
  await as({}, async (q) => {
    const offices = await q("select slug from offices");
    ok(offices.rows.length === 2 && !offices.rows.some((r) => r.slug === "office-draft"), "sees only published offices");
    const posts = await q("select slug from blog_posts");
    ok(posts.rows.length === 1 && posts.rows[0].slug === "live-post", "sees only published posts (not drafts or future-scheduled)");
    ok((await q("select * from join_applications")).rows.length === 0, "cannot read applications");
    ok((await q("select * from contact_enquiries")).rows.length === 0, "cannot read enquiries");
    ok((await q("select * from audit_log")).rows.length === 0, "cannot read audit log");
    ok((await q("select content from page_sections")).rows.length === 1, "can read published section content");
  });
  ok(await fails({}, "select draft_content from page_sections"), "anon cannot select draft_content");
  ok(await fails({}, "select person_name from member_journeys"), "anon cannot select a journey's private person_name");
  ok(await fails({}, "insert into join_applications (full_name,email,phone,city,interest,consent_contact,consent_privacy) values ('x','x','x','x','digital',true,true)"), "anon cannot insert applications directly (server-only)");
  ok(await fails({}, "select public.admin_page_sections('home')"), "anon cannot call admin_page_sections");

  console.log("\nOffice admin (office A)");
  await as({ sub: officeAAdmin }, async (q) => {
    const apps = await q("select id from join_applications");
    ok(apps.rows.length === 1 && apps.rows[0].id === appA, "sees only own office's applications");
    ok((await q("update join_applications set status='contacted' where id=$1", [appB])).rowCount === 0, "cannot update another office's application");
    ok((await q("update join_applications set status='contacted' where id=$1", [appA])).rowCount === 1, "can update own office's application");
    ok((await q("select * from contact_enquiries")).rows.length === 0, "cannot see office B enquiry");
    ok((await q("update offices set welcome='hi' where id=$1", [officeB])).rowCount === 0, "cannot edit office B");
    ok((await q("update offices set welcome='Welcome' where id=$1", [officeA])).rowCount === 1, "can edit low-trust fields on own office");
    ok((await q("update offices set pending_changes='{\"phone\":\"123\"}' where id=$1", [officeA])).rowCount === 1, "can submit high-trust changes as pending");
    ok((await q("select * from support_requests")).rows.length === 1, "sees only own office's support requests");
  });
  ok(await fails({ sub: officeAAdmin }, "update offices set phone='999' where id=$1", [officeA]), "cannot change high-trust phone directly");
  ok(await fails({ sub: officeAAdmin }, "insert into offices (slug,name) values ('new','New')"), "cannot create offices");
  ok(await fails({ sub: officeAAdmin }, "insert into user_roles (user_id, role) values ($1,'central_admin')", [memberA]), "cannot grant roles");
  ok(await fails({ sub: officeAAdmin }, "insert into events (slug,title,starts_at,office_id) values ('e','E',now(),$1)", [officeB]), "cannot create events for office B");
  ok(!(await fails({ sub: officeAAdmin }, "insert into events (slug,title,starts_at,office_id) values ('e','E',now(),$1)", [officeA])), "can create events for own office");

  console.log("\nEditors");
  ok(!(await fails({ sub: blogEd }, "insert into blog_posts (slug,title,status) values ('new','New','claims_review')")), "blog editor can create and send to claims review");
  ok(await fails({ sub: blogEd }, "update blog_posts set status='published' where slug='draft-post'"), "blog editor cannot publish past claims review");
  ok(await fails({ sub: blogEd }, "insert into events (slug,title,starts_at) values ('e','E',now())"), "blog editor cannot create events");
  await as({ sub: blogEd }, async (q) => ok((await q("select * from join_applications")).rows.length === 0, "blog editor cannot read applications"));
  ok(await fails({ sub: storyEd }, "insert into blog_posts (slug,title) values ('s','S')"), "story editor cannot write blog posts");
  ok(await fails({ sub: storyEd }, "insert into member_journeys (slug,title,status,verified) values ('j','J','published',true)"), "journey cannot publish without consent");
  ok(!(await fails({ sub: storyEd }, "with c as (insert into consent_records (subject_name, signed_on) values ('P', current_date) returning id) insert into member_journeys (slug,title,status,verified,consent_record_id) select 'j','J','published',true,id from c")), "journey publishes with valid consent + verification");
  ok(!(await fails({ sub: eventsEd }, "insert into events (slug,title,starts_at) values ('e2','E',now())")), "events editor can create events");
  ok(await fails({ sub: eventsEd }, "update site_settings set tagline='x'") === false, "events editor update on settings is silently filtered");
  await as({ sub: eventsEd }, async (q) => ok((await q("update site_settings set tagline='x'")).rowCount === 0, "events editor cannot change site settings"));

  console.log("\nMembers");
  await as({ sub: memberA }, async (q) => {
    const s = await q("select user_id from support_requests");
    ok(s.rows.length === 1 && s.rows[0].user_id === memberA, "member sees only own support requests");
    ok((await q("select * from join_applications")).rows.length === 0, "member cannot read applications");
    const p = await q("select id from profiles");
    ok(p.rows.length === 1 && p.rows[0].id === memberA, "member sees only own profile");
    ok((await q("update profiles set display_name='Me' where id=$1", [memberA])).rowCount === 1, "member can edit own profile name");
    ok((await q("update profiles set display_name='Hacked' where id=$1", [memberB])).rowCount === 0, "member cannot edit another profile");
  });
  ok(await fails({ sub: memberA }, "update profiles set office_id=$1 where id=$2", [officeB, memberA]), "member cannot move themselves to another office");
  ok(await fails({ sub: memberA }, "insert into support_requests (user_id, subject, message) values ($1,'s','m')", [memberB]), "member cannot file support as someone else");

  console.log("\nCentral and super admin");
  await as({ sub: centralId }, async (q) => {
    ok((await q("select * from join_applications")).rows.length === 2, "central sees all applications");
    ok((await q("select * from public.admin_page_sections('home')")).rows[0].draft_content !== null, "central reads drafts via RPC");
    ok((await q("update site_settings set tagline='Where growth begins'")).rowCount === 1, "central can edit settings");
    ok((await q("update offices set phone='111' where id=$1", [officeA])).rowCount === 1, "central can edit high-trust office fields");
  });
  ok(await fails({ sub: centralId }, "insert into user_roles (user_id, role) values ($1,'super_admin')", [memberA]), "central cannot grant super_admin");
  await as({ sub: superId, aal: "aal1" }, async (q) => ok((await q("update site_settings set tagline='x'")).rowCount === 0, "super admin WITHOUT MFA (aal1) has no admin powers"));
  await as({ sub: superId, aal: "aal2" }, async (q) => ok((await q("update site_settings set tagline='x'")).rowCount === 1, "super admin with MFA (aal2) can edit settings"));
  ok(!(await fails({ sub: superId, aal: "aal2" }, "insert into user_roles (user_id, role) values ($1,'super_admin')", [memberA])), "super admin (aal2) can grant super_admin");

  console.log("\nPage builder RPCs");
  await as({ sub: centralId }, async (q) => {
    await q("select public.save_section_draft($1, '{\"headline\":\"new\"}')", [section]);
    const k = await q("select public.publish_section($1) as k", [section]);
    ok(k.rows[0].k === "home", "publish returns page key for revalidation");
    const live = await q("select content from page_sections where id=$1", [section]);
    ok((live.rows[0].content as { headline: string }).headline === "new", "publish copies draft to content");
    ok((await q("select * from section_revisions where section_id=$1", [section])).rows.length === 1, "publish writes a revision");
    ok((await q("select * from audit_log where entity='page_sections'")).rows.length >= 1, "writes are audited");
  });
  ok(await fails({ sub: officeAAdmin }, "select public.publish_section($1)", [section]), "office admin cannot publish site sections");

  console.log("\nOffice approval");
  await as({ sub: centralId }, async (q) => {
    await q("update offices set pending_changes='{\"phone\":\"555\"}' where id=$1", [officeA]);
    await q("select public.approve_office_changes($1)", [officeA]);
    const o = await q("select phone, verification_status, pending_changes from offices where id=$1", [officeA]);
    ok(o.rows[0].phone === "555" && o.rows[0].verification_status === "verified" && o.rows[0].pending_changes === null, "central approval applies pending changes and verifies");
  });

  console.log("\nBlueprint rules (§10.4, §11.3, §12.2)");
  ok(!(await (async () => { try { await db.query("insert into join_applications (full_name,city,interest,consent_privacy,email) values ('E','c','digital',true,'e@e')"); return false; } catch { return true; } })()), "join application accepts email only (no phone)");
  ok(await (async () => { try { await db.query("insert into join_applications (full_name,city,interest,consent_privacy) values ('N','c','digital',true)"); return false; } catch { return true; } })(), "join application needs at least email or phone");
  ok(await fails({ sub: officeAAdmin }, "update offices set lead_contact_name='New Lead' where id=$1", [officeA]), "office admin cannot change leader name directly (high-trust)");
  ok(!(await fails({ sub: storyEd }, "with c as (insert into consent_records (subject_name, signed_on, subject_is_minor, guardian_consent) values ('Kid', current_date, true, true) returning id) insert into member_journeys (slug,title,status,verified,consent_record_id) select 'minor-ok','M','published',true,id from c")), "minor's journey publishes with guardian consent");
  ok(await fails({ sub: storyEd }, "with c as (insert into consent_records (subject_name, signed_on, subject_is_minor) values ('Kid', current_date, true) returning id) insert into member_journeys (slug,title,status,verified,consent_record_id) select 'minor-no','M','published',true,id from c"), "minor's journey cannot publish without guardian consent");
  ok(await fails({ sub: storyEd }, "with c as (insert into consent_records (subject_name, signed_on) values ('P', current_date) returning id) insert into member_journeys (slug,title,status,verified,consent_record_id,contains_claims) select 'claims','C','published',true,id,true from c"), "story editor cannot publish a journey with strong claims");
  ok(!(await fails({ sub: centralId }, "with c as (insert into consent_records (subject_name, signed_on) values ('P', current_date) returning id) insert into member_journeys (slug,title,status,verified,consent_record_id,contains_claims) select 'claims2','C','published',true,id,true from c")), "central admin can approve and publish a journey with claims");
  await as({}, async (q) => ok((await q("select growth_statement, quote from member_journeys")).rows !== undefined, "public can read journey story fields"));

  console.log("\nStorage");
  ok(!(await fails({ sub: officeAAdmin }, "insert into storage.objects (bucket_id, name, owner) values ('public-media','a.jpg',$1)", [officeAAdmin])), "office admin can upload public media");
  ok(await fails({ sub: memberA }, "insert into storage.objects (bucket_id, name, owner) values ('public-media','a.jpg',$1)", [memberA]), "member cannot upload public media");
  ok(await fails({ sub: storyEd }, "insert into storage.objects (bucket_id, name) values ('consent-proofs','p.pdf')"), "story editor cannot write consent proofs");
  ok(!(await fails({ sub: centralId }, "insert into storage.objects (bucket_id, name) values ('consent-proofs','p.pdf')")), "central can write consent proofs");
  await db.query("insert into storage.objects (bucket_id, name) values ('consent-proofs','x.pdf'), ('private-docs','d.pdf')");
  await as({ sub: memberA }, async (q) => {
    ok((await q("select * from storage.objects where bucket_id='consent-proofs'")).rows.length === 0, "member cannot read consent proofs");
    ok((await q("select * from storage.objects where bucket_id='private-docs'")).rows.length === 1, "member can read private docs");
  });
  await as({}, async (q) => ok((await q("select * from storage.objects where bucket_id='private-docs'")).rows.length === 0, "anon cannot read private docs"));

  console.log("\nRate limit + analytics");
  const rl = await db.query("select public.check_rate_limit('t',2,60) a, public.check_rate_limit('t',2,60) b, public.check_rate_limit('t',2,60) c");
  ok(rl.rows[0].a && rl.rows[0].b && !rl.rows[0].c, "rate limit blocks the 3rd call of 2/min");
  ok(await fails({}, "select public.check_rate_limit('x',1,1)"), "anon cannot call rate limiter");
  await db.query("insert into analytics_events (event_name, path, session_hash) values ('page_view','/','h1'),('page_view','/join','h1'),('join_started','/join','h1')");
  await as({}, async (q) => ok((await q("select * from analytics_events")).rows.length === 0, "anon cannot read analytics events"));
  ok(await fails({ sub: officeAAdmin }, "select public.analytics_report(now()-interval '1 day', now()+interval '1 day')"), "office admin cannot read analytics");
  await as({ sub: centralId }, async (q) => {
    const r = (await q("select public.analytics_report(now()-interval '1 day', now()+interval '1 day') r")).rows[0].r as { totals: { page_views: number }; funnel: { started: number } };
    ok(r.totals.page_views === 2 && r.funnel.started === 1, "central gets aggregated analytics");
  });

  await db.end();
  const cleanup = new Client({ connectionString: admin });
  await cleanup.connect();
  await cleanup.query(`drop database ${dbName}`);
  await cleanup.end();

  console.log(`\n${passed} passed, ${failures.length} failed`);
  if (failures.length) {
    console.log("Failed:\n - " + failures.join("\n - "));
    process.exit(1);
  }
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
