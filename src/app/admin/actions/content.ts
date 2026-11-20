"use server";

import { z } from "zod";
import { requireCapability } from "@/lib/auth/session";
import { getServerClient } from "@/lib/supabase/server";
import { expire } from "@/lib/admin/revalidate";
import { SECTION_SCHEMAS, isSectionKey } from "@/lib/content/schemas";
import { PALETTE_LAYERS } from "@/components/ui/Section";

type R<T = undefined> = { ok: true; data: T } | { ok: false; error: string };
const fail = (e: unknown): { ok: false; error: string } => ({ ok: false, error: (e as Error).message || "Something went wrong" });

export type AdminSection = { id: string; section_key: string; sort_order: number; visible: boolean; palette_layer: string; content: Record<string, unknown>; draft_content: Record<string, unknown> | null; published_at: string | null; updated_at: string };

export async function loadSections(pageKey: string): Promise<R<AdminSection[]>> {
  try {
    await requireCapability("siteContent");
    const db = await getServerClient();
    const { data, error } = await db.rpc("admin_page_sections", { p_page_key: pageKey });
    if (error) throw new Error(error.message);
    return { ok: true, data: data as AdminSection[] };
  } catch (e) {
    return fail(e);
  }
}

async function keyFor(sectionId: string) {
  const db = await getServerClient();
  const { data } = await db.from("page_sections").select("section_key, pages(key)").eq("id", sectionId).single();
  const row = data as unknown as { section_key: string; pages: { key: string } } | null;
  if (!row) throw new Error("Section not found");
  return { sectionKey: row.section_key, pageKey: row.pages.key };
}

function validate(sectionKey: string, content: unknown) {
  if (!isSectionKey(sectionKey)) throw new Error("Unknown section type");
  const r = SECTION_SCHEMAS[sectionKey].safeParse(content);
  if (!r.success) throw new Error("Some fields are invalid: " + r.error.issues.slice(0, 3).map((i) => `${i.path.join(".")} ${i.message}`).join("; "));
  return r.data;
}

export async function saveDraft(sectionId: string, draft: unknown, layer?: string): Promise<R> {
  try {
    await requireCapability("siteContent");
    const { sectionKey } = await keyFor(sectionId);
    const clean = validate(sectionKey, draft);
    if (layer && !(PALETTE_LAYERS as readonly string[]).includes(layer)) throw new Error("Invalid palette layer");
    const db = await getServerClient();
    const { error } = await db.rpc("save_section_draft", { p_section: sectionId, p_draft: clean, p_layer: layer ?? null, p_visible: null });
    if (error) throw new Error(error.message);
    return { ok: true, data: undefined };
  } catch (e) {
    return fail(e);
  }
}

export async function publishSection(sectionId: string, draft?: unknown, layer?: string): Promise<R> {
  try {
    await requireCapability("siteContent");
    if (draft !== undefined) {
      const r = await saveDraft(sectionId, draft, layer);
      if (!r.ok) return r;
    }
    const db = await getServerClient();
    const { data: key, error } = await db.rpc("publish_section", { p_section: sectionId });
    if (error) throw new Error(error.message);
    expire(`page:${key}`, "pages");
    return { ok: true, data: undefined };
  } catch (e) {
    return fail(e);
  }
}

export async function discardDraft(sectionId: string): Promise<R> {
  try {
    await requireCapability("siteContent");
    const db = await getServerClient();
    const { error } = await db.from("page_sections").update({ draft_content: null }).eq("id", sectionId);
    if (error) throw new Error(error.message);
    return { ok: true, data: undefined };
  } catch (e) {
    return fail(e);
  }
}

export async function setVisible(sectionId: string, visible: boolean): Promise<R> {
  try {
    await requireCapability("siteContent");
    const { pageKey } = await keyFor(sectionId);
    const db = await getServerClient();
    const { error } = await db.from("page_sections").update({ visible }).eq("id", sectionId);
    if (error) throw new Error(error.message);
    expire(`page:${pageKey}`);
    return { ok: true, data: undefined };
  } catch (e) {
    return fail(e);
  }
}

export async function reorder(pageKey: string, ids: string[]): Promise<R> {
  try {
    await requireCapability("siteContent");
    const db = await getServerClient();
    const { data: page } = await db.from("pages").select("id").eq("key", pageKey).single();
    if (!page) throw new Error("Page not found");
    const { error } = await db.rpc("reorder_sections", { p_page: page.id, p_ids: z.array(z.string().uuid()).parse(ids) });
    if (error) throw new Error(error.message);
    expire(`page:${pageKey}`);
    return { ok: true, data: undefined };
  } catch (e) {
    return fail(e);
  }
}

export async function addSection(pageKey: string, sectionKey: string): Promise<R<string>> {
  try {
    await requireCapability("siteContent");
    if (!isSectionKey(sectionKey) || sectionKey.startsWith("home.") || sectionKey === "join_form" || sectionKey === "contact_form") throw new Error("That section type can't be added here.");
    const db = await getServerClient();
    const { data: page } = await db.from("pages").select("id").eq("key", pageKey).single();
    if (!page) throw new Error("Page not found");
    const { count } = await db.from("page_sections").select("id", { count: "exact", head: true }).eq("page_id", page.id);
    const { data, error } = await db.from("page_sections").insert({ page_id: page.id, section_key: sectionKey, sort_order: (count ?? 0) + 1, visible: false, content: SECTION_SCHEMAS[sectionKey].parse({}), palette_layer: "milky" }).select("id").single();
    if (error) throw new Error(error.message);
    return { ok: true, data: data.id };
  } catch (e) {
    return fail(e);
  }
}

export async function removeSection(sectionId: string): Promise<R> {
  try {
    await requireCapability("siteContent");
    const { pageKey, sectionKey } = await keyFor(sectionId);
    if (sectionKey.startsWith("home.")) throw new Error("Homepage sections can be hidden but not deleted.");
    const db = await getServerClient();
    const { error } = await db.from("page_sections").delete().eq("id", sectionId);
    if (error) throw new Error(error.message);
    expire(`page:${pageKey}`);
    return { ok: true, data: undefined };
  } catch (e) {
    return fail(e);
  }
}

export type Revision = { id: string; created_at: string; action: string; author: string | null; content: Record<string, unknown> };
export async function listRevisions(sectionId: string): Promise<R<Revision[]>> {
  try {
    await requireCapability("siteContent");
    const db = await getServerClient();
    const { data, error } = await db.from("section_revisions").select("id,created_at,action,author,content").eq("section_id", sectionId).order("created_at", { ascending: false }).limit(30);
    if (error) throw new Error(error.message);
    return { ok: true, data: data as Revision[] };
  } catch (e) {
    return fail(e);
  }
}

export async function restoreRevision(revisionId: string): Promise<R> {
  try {
    await requireCapability("siteContent");
    const db = await getServerClient();
    const { data: key, error } = await db.rpc("restore_section_revision", { p_revision: revisionId });
    if (error) throw new Error(error.message);
    expire(`page:${key}`);
    return { ok: true, data: undefined };
  } catch (e) {
    return fail(e);
  }
}

const seoSchema = z.object({ seo_title: z.string().max(70).nullable(), seo_description: z.string().max(170).nullable(), og_image_asset_id: z.string().uuid().nullable(), noindex: z.boolean() });
export async function savePageSeo(pageKey: string, input: z.input<typeof seoSchema>): Promise<R> {
  try {
    await requireCapability("siteContent");
    const d = seoSchema.parse(input);
    const db = await getServerClient();
    const { error } = await db.from("pages").update(d).eq("key", pageKey);
    if (error) throw new Error(error.message);
    expire(`page:${pageKey}`);
    return { ok: true, data: undefined };
  } catch (e) {
    return fail(e);
  }
}
