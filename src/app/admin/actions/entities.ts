"use server";

import { requireCapability, getSession } from "@/lib/auth/session";
import { getServerClient } from "@/lib/supabase/server";
import { expire } from "@/lib/admin/revalidate";
import { getEntity, CENTRAL_ONLY_BLOG, type EntityDef } from "@/lib/admin/entities";
import type { RefKind } from "@/lib/content/fields";
import { readingTime, slugify } from "@/lib/utils";
import { htmlToText } from "@/lib/sanitize";

type R<T = undefined> = { ok: true; data: T } | { ok: false; error: string };
const fail = (e: unknown): { ok: false; error: string } => {
  const msg = (e as { message?: string }).message ?? "Something went wrong";
  if (/duplicate key.*slug/i.test(msg)) return { ok: false, error: "That web address (slug) is already used. Choose another." };
  if (/row-level security|permission denied/i.test(msg)) return { ok: false, error: "You don't have permission to make that change." };
  return { ok: false, error: msg };
};

const DATETIME_FIELDS = ["published_at", "starts_at", "ends_at", "expires_at"];
const HIGH_TRUST = ["name", "slug", "status", "address_line", "postcode", "city", "state", "country", "lat", "lng", "phone", "email", "whatsapp", "lead_contact_name", "lead_contact_role"];

/* ------------------------------------------------------------------ timezone helpers */
function tzOffsetMinutes(date: Date, tz: string) {
  const parts = new Intl.DateTimeFormat("en-US", { timeZone: tz, hourCycle: "h23", year: "numeric", month: "2-digit", day: "2-digit", hour: "2-digit", minute: "2-digit", second: "2-digit" }).formatToParts(date);
  const v = Object.fromEntries(parts.map((p) => [p.type, p.value]));
  const asUtc = Date.UTC(+v.year, +v.month - 1, +v.day, +v.hour, +v.minute, +v.second);
  return (asUtc - date.getTime()) / 60000;
}
/** "2026-11-20T18:00" in tz → ISO UTC. */
function localToUtc(local: string, tz: string) {
  const [d, t] = local.split("T");
  const [y, m, day] = d.split("-").map(Number);
  const [hh, mm] = t.split(":").map(Number);
  const guess = new Date(Date.UTC(y, m - 1, day, hh, mm));
  const off = tzOffsetMinutes(guess, tz);
  return new Date(guess.getTime() - off * 60000).toISOString();
}
function utcToLocal(iso: string, tz: string) {
  const d = new Date(iso);
  const local = new Date(d.getTime() + tzOffsetMinutes(d, tz) * 60000);
  return local.toISOString().slice(0, 16);
}
function validTz(tz: string | null | undefined) {
  try {
    if (!tz) return null;
    new Intl.DateTimeFormat("en-GB", { timeZone: tz });
    return tz;
  } catch {
    return null;
  }
}
async function defaultTz() {
  const db = await getServerClient();
  const { data } = await db.from("site_settings").select("default_timezone").eq("id", 1).maybeSingle();
  return validTz(data?.default_timezone) ?? "UTC";
}

/* ------------------------------------------------------------------ list */
export type ListRow = Record<string, unknown> & { id: string };

export async function listEntity(key: string, opts: { q?: string; status?: string; parent?: { column: string; id: string } } = {}): Promise<R<ListRow[]>> {
  try {
    const def = getEntity(key);
    if (!def) throw new Error("Unknown collection");
    await requireCapability(def.cap);
    const db = await getServerClient();
    const cols = Array.from(new Set(["id", def.titleField, ...def.columns.map((c) => c.key), def.slugFrom ? "slug" : "id"])).join(",");
    let q = db.from(def.table).select(cols).order(def.order.column, { ascending: def.order.ascending, nullsFirst: false }).limit(500);
    q = applyFilter(q, def);
    if (opts.status) q = q.eq("status", opts.status);
    if (opts.parent) q = q.eq(opts.parent.column, opts.parent.id);
    if (opts.q) q = q.ilike(def.titleField, `%${opts.q.replace(/[%,()]/g, " ")}%`);
    const { data, error } = await q;
    if (error) throw error;
    return { ok: true, data: (data ?? []) as unknown as ListRow[] };
  } catch (e) {
    return fail(e);
  }
}

// eslint-disable-next-line @typescript-eslint/no-explicit-any
function applyFilter(q: any, def: EntityDef) {
  for (const [k, v] of Object.entries(def.filter ?? {})) q = k.endsWith("!") ? q.neq(k.slice(0, -1), v) : q.eq(k, v);
  return q;
}

/* ------------------------------------------------------------------ load one */
export async function loadEntity(key: string, id: string): Promise<R<Record<string, unknown>>> {
  try {
    const def = getEntity(key);
    if (!def) throw new Error("Unknown collection");
    await requireCapability(def.cap);
    const db = await getServerClient();
    const { data, error } = await db.from(def.table).select("*").eq("id", id).single();
    if (error) throw error;
    const row = data as Record<string, unknown>;
    const tz = validTz(row.timezone as string) ?? (await defaultTz());
    for (const k of DATETIME_FIELDS) if (typeof row[k] === "string") row[k] = utcToLocal(row[k] as string, tz);
    if (key === "articles") {
      const { data: t } = await db.from("blog_post_tags").select("tag_id").eq("post_id", id);
      row.tag_ids = (t ?? []).map((x) => x.tag_id);
    }
    if (key === "consent") row.withdrawn = Boolean(row.withdrawn_at);
    if (key === "resources" && row.asset_id) {
      const { data: m } = await db.from("media_assets").select("path").eq("id", row.asset_id as string).maybeSingle();
      row.asset_path = m?.path ?? null;
    }
    return { ok: true, data: row };
  } catch (e) {
    return fail(e);
  }
}

/* ------------------------------------------------------------------ save */
export async function saveEntity(key: string, id: string | null, values: Record<string, unknown>): Promise<R<{ id: string; message?: string }>> {
  try {
    const def = getEntity(key);
    if (!def) throw new Error("Unknown collection");
    const session = await requireCapability(def.cap);
    const isCentral = session.roles.includes("super_admin") || session.roles.includes("central_admin");
    const parsed = def.schema.safeParse(values);
    if (!parsed.success) return { ok: false, error: parsed.error.issues.map((i) => `${i.path.join(".") || "Form"}: ${i.message}`).slice(0, 4).join(" · ") };
    const d: Record<string, unknown> = { ...parsed.data, ...(def.filter && !Object.keys(def.filter).some((k) => k.endsWith("!")) ? def.filter : {}) };
    const db = await getServerClient();

    // Slugs
    if ("slug" in d) d.slug = slugify(String(d.slug || d[def.slugFrom ?? def.titleField] || "")) || `item-${Date.now()}`;

    // Empty strings → null for nullable text columns, except required/body fields
    for (const [k, v] of Object.entries(d)) if (v === "" && !["body_html", def.titleField].includes(k)) d[k] = null;

    // Dates in the event's (or site's) timezone
    const tz = validTz(d.timezone as string) ?? (await defaultTz());
    if (key === "events") d.timezone = tz;
    for (const k of DATETIME_FIELDS) if (typeof d[k] === "string") d[k] = localToUtc(d[k] as string, tz);

    // Per-collection rules
    const extra: { tagIds?: string[] } = {};
    if (key === "articles") {
      extra.tagIds = (d.tag_ids as string[]) ?? [];
      delete d.tag_ids;
      d.reading_minutes = readingTime(htmlToText(String(d.body_html ?? "")));
      if (!isCentral && CENTRAL_ONLY_BLOG.includes(String(d.status))) return { ok: false, error: "Only a central admin can approve, schedule or publish. Set the status to Claims review." };
      if (d.status === "published" && !d.published_at) d.published_at = new Date().toISOString();
      if (d.status === "scheduled" && !d.published_at) return { ok: false, error: "Choose a publish date and time for a scheduled article." };
    }
    if ((key === "news" || key === "announcements") && d.status === "published" && !d.published_at) d.published_at = new Date().toISOString();
    if (key === "events") {
      if (!d.starts_at) return { ok: false, error: "Enter when the event starts." };
      if (d.status === "published" && !d.published_at) d.published_at = new Date().toISOString();
      if (!isCentral && !session.roles.includes("events_editor") && !d.office_id) return { ok: false, error: "Choose your office for this event." };
    }
    if (key === "consent") {
      if (!d.signed_on) return { ok: false, error: "Enter the date the consent was signed." };
      d.withdrawn_at = d.withdrawn ? new Date().toISOString() : null;
      delete d.withdrawn;
    }
    if (key === "resources") {
      if (!d.asset_path) return { ok: false, error: "Upload the file." };
      const { data: m } = await db.from("media_assets").select("id").eq("bucket", "private-docs").eq("path", d.asset_path as string).maybeSingle();
      if (!m) return { ok: false, error: "The uploaded file wasn't found. Upload it again." };
      d.asset_id = m.id;
      delete d.asset_path;
    }
    if (key === "journeys" && d.status === "published" && !(d.verified && d.consent_record_id)) {
      return { ok: false, error: "A journey needs a consent record and the 'verified' box ticked before it can be published." };
    }

    let message: string | undefined;
    let before: Record<string, unknown> | null = null;
    if (id) {
      const { data: prev } = await db.from(def.table).select("*").eq("id", id).single();
      before = prev as Record<string, unknown>;
      // Office admins: high-trust fields become a pending change for central approval.
      if (key === "offices" && !isCentral && before) {
        const pending: Record<string, unknown> = {};
        for (const k of HIGH_TRUST) {
          if (k in d && JSON.stringify(d[k] ?? null) !== JSON.stringify(before[k] ?? null)) {
            pending[k] = d[k];
            d[k] = before[k];
          }
        }
        if (Object.keys(pending).length) {
          d.pending_changes = { ...((before.pending_changes as object) ?? {}), ...pending };
          message = "Saved. Address and contact changes were sent to a central admin for approval.";
        }
      }
      const { error } = await db.from(def.table).update(d).eq("id", id);
      if (error) throw error;
    } else {
      const { data, error } = await db.from(def.table).insert(d).select("id").single();
      if (error) throw error;
      id = (data as { id: string }).id;
    }

    if (extra.tagIds) {
      await db.from("blog_post_tags").delete().eq("post_id", id);
      if (extra.tagIds.length) await db.from("blog_post_tags").insert(extra.tagIds.map((t) => ({ post_id: id, tag_id: t })));
    }
    if (key === "consent" && d.withdrawn_at) {
      await db.from("member_journeys").update({ status: "draft" }).eq("consent_record_id", id).eq("status", "published");
      message = "Consent withdrawn. Linked journeys were unpublished.";
    }

    expire(...def.tags({ ...d, id }), ...(before ? def.tags(before) : []));
    return { ok: true, data: { id: id!, message } };
  } catch (e) {
    return fail(e);
  }
}

export async function deleteEntity(key: string, id: string): Promise<R> {
  try {
    const def = getEntity(key);
    if (!def) throw new Error("Unknown collection");
    await requireCapability(def.cap);
    const db = await getServerClient();
    const { data: prev } = await db.from(def.table).select("*").eq("id", id).single();
    const { error, count } = await db.from(def.table).delete({ count: "exact" }).eq("id", id);
    if (error) throw error;
    if (!count) throw new Error("You don't have permission to delete this.");
    if (prev) expire(...def.tags(prev as Record<string, unknown>));
    return { ok: true, data: undefined };
  } catch (e) {
    return fail(e);
  }
}

/* ------------------------------------------------------------------ reference options */
export async function loadRefs(kinds: RefKind[]): Promise<Record<string, { value: string; label: string }[]>> {
  await requireCapability("dashboard");
  const db = await getServerClient();
  const out: Record<string, { value: string; label: string }[]> = {};
  for (const k of new Set(kinds)) {
    if (k === "offices") {
      const { data } = await db.from("offices").select("id,name,city").order("name");
      out[k] = (data ?? []).map((o) => ({ value: o.id, label: [o.name, o.city].filter(Boolean).join(" · ") }));
    } else if (k === "categories" || k === "tags") {
      const { data } = await db.from(k).select("id,name").order("name");
      out[k] = (data ?? []).map((o) => ({ value: o.id, label: o.name }));
    } else if (k === "consent") {
      const { data } = await db.from("consent_records").select("id,subject_name,signed_on,withdrawn_at").order("created_at", { ascending: false });
      out[k] = (data ?? []).filter((c) => !c.withdrawn_at).map((c) => ({ value: c.id, label: `${c.subject_name} (signed ${c.signed_on})` }));
    } else if (k === "posts") {
      const { data } = await db.from("blog_posts").select("id,title").order("updated_at", { ascending: false }).limit(200);
      out[k] = (data ?? []).map((o) => ({ value: o.id, label: o.title }));
    } else if (k === "consentScopes") {
      out[k] = [["name", "Name"], ["photograph", "Photograph"], ["video", "Video"], ["office", "Office"], ["quote", "Quote"], ["financial", "Any financial detail"], ["story", "Story text"]].map(([value, label]) => ({ value, label }));
    } else if (k === "courses") {
      const { data } = await db.from("courses").select("id,title").order("sort_order");
      out[k] = (data ?? []).map((o) => ({ value: o.id, label: o.title }));
    } else if (k === "modules") {
      const { data } = await db.from("modules").select("id,title,courses(title)").order("sort_order");
      out[k] = ((data ?? []) as unknown as { id: string; title: string; courses: { title: string } | null }[]).map((o) => ({ value: o.id, label: `${o.courses?.title ?? ""} › ${o.title}` }));
    }
  }
  return out;
}

/* ------------------------------------------------------------------ journey updates */
export async function addJourneyUpdate(journeyId: string, u: { occurred_on: string; title: string; body?: string; asset_id?: string | null }): Promise<R> {
  try {
    await requireCapability("journeys");
    if (!/^\d{4}-\d{2}-\d{2}$/.test(u.occurred_on) || !u.title.trim()) return { ok: false, error: "Add a date and a title." };
    const db = await getServerClient();
    const { error } = await db.from("journey_updates").insert({ journey_id: journeyId, occurred_on: u.occurred_on, title: u.title.trim().slice(0, 200), body: u.body?.slice(0, 1000) || null, asset_id: u.asset_id ?? null });
    if (error) throw error;
    const { data: j } = await db.from("member_journeys").select("slug").eq("id", journeyId).single();
    expire("journeys", `journey:${j?.slug}`);
    return { ok: true, data: undefined };
  } catch (e) {
    return fail(e);
  }
}
export async function listJourneyUpdates(journeyId: string) {
  await requireCapability("journeys");
  const db = await getServerClient();
  const { data } = await db.from("journey_updates").select("id,occurred_on,title,body").eq("journey_id", journeyId).order("occurred_on");
  return data ?? [];
}
export async function deleteJourneyUpdate(id: string): Promise<R> {
  try {
    await requireCapability("journeys");
    const db = await getServerClient();
    const { error } = await db.from("journey_updates").delete().eq("id", id);
    if (error) throw error;
    expire("journeys");
    return { ok: true, data: undefined };
  } catch (e) {
    return fail(e);
  }
}

/* ------------------------------------------------------------------ offices: central approval */
export async function approveOffice(officeId: string, verify: boolean): Promise<R> {
  try {
    await requireCapability("settings");
    const db = await getServerClient();
    const { error } = await db.rpc("approve_office_changes", { p_office: officeId, p_verify: verify });
    if (error) throw error;
    const { data } = await db.from("offices").select("slug").eq("id", officeId).single();
    expire("offices", `office:${data?.slug}`);
    return { ok: true, data: undefined };
  } catch (e) {
    return fail(e);
  }
}

export async function currentIsCentral() {
  const s = await getSession();
  return Boolean(s && (s.roles.includes("super_admin") || s.roles.includes("central_admin")));
}
