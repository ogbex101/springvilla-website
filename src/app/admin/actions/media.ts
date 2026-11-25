"use server";

import sharp from "sharp";
import { sanitizeSvg } from "@/lib/sanitize";
import { z } from "zod";
import { requireCapability } from "@/lib/auth/session";
import { getServerClient } from "@/lib/supabase/server";
import { getServiceClient } from "@/lib/supabase/service";
import { expire } from "@/lib/admin/revalidate";
import { MEDIA_COLUMNS, toMedia, type MediaRow } from "@/lib/content/queries";
import type { Media } from "@/lib/content/media-types";

export type AdminMedia = Media & { bucket: string; path: string; sizeBytes: number; createdAt: string; usageRestrictions: string | null; durationSeconds: number | null; thumbUrl: string };
type Result<T = undefined> = { ok: true; data: T } | { ok: false; error: string };

const LIMITS = { image: 15 * 1024 * 1024, video: 50 * 1024 * 1024, document: 25 * 1024 * 1024 };
const BUCKETS = ["public-media", "private-docs", "consent-proofs"] as const;

/* ------------------------------------------------------------------ MIME sniffing */
function sniff(buf: Buffer): { mime: string; type: "image" | "video" | "document" } | null {
  const hex = buf.subarray(0, 16).toString("hex");
  const ascii = buf.subarray(0, 64).toString("latin1");
  if (hex.startsWith("ffd8ff")) return { mime: "image/jpeg", type: "image" };
  if (hex.startsWith("89504e47")) return { mime: "image/png", type: "image" };
  if (ascii.startsWith("GIF8")) return { mime: "image/gif", type: "image" };
  if (ascii.startsWith("RIFF") && ascii.slice(8, 12) === "WEBP") return { mime: "image/webp", type: "image" };
  if (ascii.slice(4, 8) === "ftyp") {
    const brand = ascii.slice(8, 12);
    if (brand === "avif" || brand === "avis") return { mime: "image/avif", type: "image" };
    if (/^(heic|heix|mif1)/.test(brand)) return null; // HEIC not supported in browsers
    return { mime: "video/mp4", type: "video" };
  }
  if (hex.startsWith("1a45dfa3")) return { mime: "video/webm", type: "video" };
  if (ascii.startsWith("%PDF")) return { mime: "application/pdf", type: "document" };
  if (hex.startsWith("504b0304")) return { mime: "application/zip", type: "document" }; // docx/pptx/xlsx
  if (/^\s*(<\?xml[^>]*>\s*)?<svg[\s>]/i.test(buf.subarray(0, 512).toString("utf8"))) return { mime: "image/svg+xml", type: "image" };
  return null;
}

const OFFICE_MIME: Record<string, string> = {
  docx: "application/vnd.openxmlformats-officedocument.wordprocessingml.document",
  pptx: "application/vnd.openxmlformats-officedocument.presentationml.presentation",
  xlsx: "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
};

async function readObject(bucket: string, path: string, rangeBytes?: number) {
  const svc = getServiceClient();
  if (rangeBytes) {
    const { data } = await svc.storage.from(bucket).createSignedUrl(path, 60);
    if (!data) throw new Error("File not found in storage");
    const res = await fetch(data.signedUrl, { headers: { Range: `bytes=0-${rangeBytes - 1}` } });
    return Buffer.from(await res.arrayBuffer());
  }
  const { data, error } = await svc.storage.from(bucket).download(path);
  if (error || !data) throw new Error("File not found in storage");
  return Buffer.from(await data.arrayBuffer());
}

/** Validates the uploaded object, builds image variants, returns the columns to store. */
async function processObject(bucket: string, path: string, declaredSize: number, clientMeta: { width?: number; height?: number; duration?: number }) {
  const svc = getServiceClient();
  const ext = path.split(".").pop()?.toLowerCase() ?? "";
  const head = await readObject(bucket, path, 4096);
  const found = sniff(head);
  const reject = async (msg: string) => {
    await svc.storage.from(bucket).remove([path]);
    throw new Error(msg);
  };
  if (!found) return reject("That file type isn't supported. Use JPG, PNG, WebP or AVIF images, MP4/WebM video, or PDF/Office documents.");
  if (declaredSize > LIMITS[found.type]) return reject(`That file is too large. The limit for ${found.type}s is ${Math.round(LIMITS[found.type] / 1024 / 1024)}MB.`);
  if (bucket === "public-media" && found.type === "document") return reject("Documents belong in Resources (private), not the public media library.");

  let mime = found.mime;
  if (mime === "application/zip") {
    if (!OFFICE_MIME[ext]) return reject("Only .docx, .pptx and .xlsx files are allowed.");
    mime = OFFICE_MIME[ext];
  }

  const out = { type: found.type, mime, width: clientMeta.width ?? null, height: clientMeta.height ?? null, duration: clientMeta.duration ?? null, variants: [] as { width: number; path: string; format: string }[], blur: null as string | null };

  if (found.type === "image" && mime === "image/svg+xml") {
    const clean = sanitizeSvg((await readObject(bucket, path)).toString("utf8"));
    await svc.storage.from(bucket).upload(path, Buffer.from(clean), { contentType: mime, upsert: true });
    return out;
  }
  if (found.type === "image") {
    const full = await readObject(bucket, path);
    const img = sharp(full, { failOn: "error" }).rotate();
    const meta = await img.metadata();
    out.width = meta.autoOrient?.width ?? meta.width ?? null;
    out.height = meta.autoOrient?.height ?? meta.height ?? null;
    const base = path.replace(/\.[^.]+$/, "");
    for (const w of [640, 1280, 1920, 2560]) {
      if (out.width && w > out.width && w !== 640) continue;
      const webp = await sharp(full).rotate().resize({ width: w, withoutEnlargement: true }).webp({ quality: 84, smartSubsample: true }).toBuffer();
      const vp = `${base}.w${w}.webp`;
      await svc.storage.from(bucket).upload(vp, webp, { contentType: "image/webp", upsert: true });
      out.variants.push({ width: w, path: vp, format: "webp" });
      if (w === 1280) {
        const avif = await sharp(full).rotate().resize({ width: w, withoutEnlargement: true }).avif({ quality: 60 }).toBuffer();
        const ap = `${base}.w${w}.avif`;
        await svc.storage.from(bucket).upload(ap, avif, { contentType: "image/avif", upsert: true });
        out.variants.push({ width: w, path: ap, format: "avif" });
      }
    }
    const blur = await sharp(full).rotate().resize(16).webp({ quality: 40 }).toBuffer();
    out.blur = `data:image/webp;base64,${blur.toString("base64")}`;
  }
  return out;
}

function toAdmin(r: MediaRow & { size_bytes: number; created_at: string; usage_restrictions: string | null; duration: number | null }): AdminMedia {
  const m = toMedia(r);
  const small = (r.variants ?? []).find((v) => v.width === 640 && v.format === "webp");
  return {
    ...m,
    alt: r.alt_text ?? "",
    bucket: r.bucket,
    path: r.path,
    sizeBytes: r.size_bytes,
    createdAt: r.created_at,
    usageRestrictions: r.usage_restrictions,
    durationSeconds: r.duration,
    thumbUrl: small ? m.url.replace(/[^/]+$/, small.path.split("/").pop()!) : m.url,
  };
}
const ADMIN_COLS = `${MEDIA_COLUMNS},size_bytes,created_at,usage_restrictions,duration`;

/* ------------------------------------------------------------------ actions */
const registerSchema = z.object({
  bucket: z.enum(BUCKETS),
  path: z.string().min(3).max(300).regex(/^[a-z0-9/_.-]+$/),
  size: z.number().int().positive(),
  meta: z.object({ width: z.number().optional(), height: z.number().optional(), duration: z.number().optional() }).default({}),
  replaceId: z.string().uuid().optional(),
});

export async function registerUpload(input: z.input<typeof registerSchema>): Promise<Result<AdminMedia>> {
  try {
    await requireCapability("media");
    const d = registerSchema.parse(input);
    const p = await processObject(d.bucket, d.path, d.size, d.meta);
    const db = await getServerClient();
    const cols = { bucket: d.bucket, path: d.path, type: p.type, mime: p.mime, width: p.width, height: p.height, duration: p.duration, size_bytes: d.size, variants: p.variants, blur_data_url: p.blur };

    if (d.replaceId) {
      const { data: old } = await db.from("media_assets").select("bucket,path,variants,type").eq("id", d.replaceId).single();
      if (!old) throw new Error("The original file no longer exists.");
      if (old.type !== p.type) throw new Error(`Replace an ${old.type} with another ${old.type}.`);
      const { data, error } = await db.from("media_assets").update(cols).eq("id", d.replaceId).select(ADMIN_COLS).single();
      if (error) throw new Error(error.message);
      const oldPaths = [old.path, ...((old.variants ?? []) as { path: string }[]).map((v) => v.path)].filter((x) => x !== d.path);
      if (oldPaths.length) await getServiceClient().storage.from(old.bucket).remove(oldPaths);
      expire("media");
      return { ok: true, data: toAdmin(data as never) };
    }
    const { data, error } = await db.from("media_assets").insert(cols).select(ADMIN_COLS).single();
    if (error) throw new Error(error.message);
    return { ok: true, data: toAdmin(data as never) };
  } catch (e) {
    return { ok: false, error: (e as Error).message };
  }
}

export async function listMedia(opts: { type?: string; q?: string; consent?: string; from?: string; to?: string; bucket?: string; limit?: number } = {}): Promise<Result<AdminMedia[]>> {
  try {
    await requireCapability("media");
    const db = await getServerClient();
    let q = db.from("media_assets").select(ADMIN_COLS).eq("bucket", opts.bucket ?? "public-media").order("created_at", { ascending: false }).limit(opts.limit ?? 200);
    if (opts.type) q = q.eq("type", opts.type);
    if (opts.consent === "yes") q = q.eq("consent_confirmed", true);
    if (opts.consent === "no") q = q.eq("consent_confirmed", false);
    if (opts.from) q = q.gte("created_at", opts.from);
    if (opts.to) q = q.lte("created_at", `${opts.to}T23:59:59`);
    if (opts.q) {
      const s = opts.q.replace(/[%,()]/g, " ").trim();
      q = q.or(`alt_text.ilike.%${s}%,caption.ilike.%${s}%,path.ilike.%${s}%,location.ilike.%${s}%,credit.ilike.%${s}%`);
    }
    const { data, error } = await q;
    if (error) throw new Error(error.message);
    return { ok: true, data: (data ?? []).map((r) => toAdmin(r as never)) };
  } catch (e) {
    return { ok: false, error: (e as Error).message };
  }
}

export async function getMediaByIds(ids: string[]): Promise<AdminMedia[]> {
  if (!ids.length) return [];
  await requireCapability("dashboard");
  const db = await getServerClient();
  const { data } = await db.from("media_assets").select(ADMIN_COLS).in("id", ids.slice(0, 100));
  return (data ?? []).map((r) => toAdmin(r as never));
}

const updateSchema = z.object({
  alt_text: z.string().max(300).optional(),
  caption: z.string().max(500).optional(),
  credit: z.string().max(120).optional(),
  location: z.string().max(120).optional(),
  date_taken: z.string().regex(/^\d{4}-\d{2}-\d{2}$/).or(z.literal("")).optional(),
  consent_confirmed: z.boolean().optional(),
  usage_restrictions: z.string().max(500).optional(),
});

export async function updateMedia(id: string, fields: z.input<typeof updateSchema>): Promise<Result<AdminMedia>> {
  try {
    await requireCapability("media");
    const d = updateSchema.parse(fields);
    const db = await getServerClient();
    const { data, error } = await db.from("media_assets").update({ ...d, date_taken: d.date_taken || null }).eq("id", id).select(ADMIN_COLS).single();
    if (error) throw new Error(error.code === "PGRST116" ? "You can only edit files you uploaded." : error.message);
    expire("media");
    return { ok: true, data: toAdmin(data as never) };
  } catch (e) {
    return { ok: false, error: (e as Error).message };
  }
}

export async function mediaUsage(id: string): Promise<{ entity: string; entity_id: string; label: string }[]> {
  await requireCapability("media");
  const { data } = await getServiceClient().rpc("asset_usage", { p_asset: id });
  return (data ?? []) as { entity: string; entity_id: string; label: string }[];
}

export async function deleteMedia(id: string): Promise<Result> {
  try {
    await requireCapability("settings"); // central admins only (RLS enforces too)
    const usage = await mediaUsage(id);
    if (usage.length) return { ok: false, error: `This file is still used in ${usage.length} place${usage.length > 1 ? "s" : ""}. Remove it there first.` };
    const db = await getServerClient();
    const { data: row } = await db.from("media_assets").select("bucket,path,variants").eq("id", id).single();
    if (!row) throw new Error("Not found");
    const { error } = await db.from("media_assets").delete().eq("id", id);
    if (error) throw new Error(error.message);
    await getServiceClient().storage.from(row.bucket).remove([row.path, ...((row.variants ?? []) as { path: string }[]).map((v) => v.path)]);
    expire("media");
    return { ok: true, data: undefined };
  } catch (e) {
    return { ok: false, error: (e as Error).message };
  }
}
