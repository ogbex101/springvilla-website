/*
 * Upload an image (or MP4/WebM video) to the public media library from the command line, with the
 * same processing as Admin → Media (WebP 640/1280/1920/2560, AVIF 1280, blur).
 *
 *   npm run media:upload -- <file> --alt "…" [--caption "…"] [--date 2026-10-31]
 *        [--consent] [--restrict "…"] [--replace <media-id>] [--quality 84]
 *
 * --replace swaps the file behind an existing media id, so every page that uses
 * it shows the new version with no other change. Prints the media id.
 * Requires NEXT_PUBLIC_SUPABASE_URL and SUPABASE_SERVICE_ROLE_KEY (.env.local).
 */
import { config } from "dotenv";
import fs from "node:fs";
import path from "node:path";
import crypto from "node:crypto";
import sharp from "sharp";
import { createClient } from "@supabase/supabase-js";

config({ path: ".env.local", quiet: true });

function arg(name: string) {
  const i = process.argv.indexOf(`--${name}`);
  return i > -1 ? process.argv[i + 1] : undefined;
}
const file = process.argv[2];
if (!file || file.startsWith("--") || !fs.existsSync(file)) {
  console.error("Usage: npm run media:upload -- <file> --alt \"description\" [--caption …] [--date YYYY-MM-DD] [--consent] [--replace <id>]");
  process.exit(1);
}
const alt = arg("alt");
const replace = arg("replace");
if (!alt && !replace) {
  console.error("--alt is required: images without alt text are never shown publicly.");
  process.exit(1);
}
const quality = Number(arg("quality") ?? 84);

const svc = createClient(process.env.NEXT_PUBLIC_SUPABASE_URL!, process.env.SUPABASE_SERVICE_ROLE_KEY!, { auth: { persistSession: false } });
const BUCKET = "public-media";

async function put(p: string, buf: Buffer, type: string) {
  const { error } = await svc.storage.from(BUCKET).upload(p, buf, { contentType: type, upsert: true });
  if (error) throw new Error(`${p}: ${error.message}`);
}

async function uploadVideo() {
  const { execFileSync } = await import("node:child_process");
  const probe = JSON.parse(execFileSync("ffprobe", ["-v", "error", "-select_streams", "v:0", "-show_entries", "stream=width,height:format=duration", "-of", "json", file]).toString());
  const ext = path.extname(file).slice(1).toLowerCase();
  const mime = ext === "webm" ? "video/webm" : "video/mp4";
  const slug = path.basename(file).replace(/\.[^.]+$/, "").toLowerCase().replace(/[^a-z0-9]+/g, "-").slice(0, 60);
  const d = new Date();
  const p = `${d.getFullYear()}/${String(d.getMonth() + 1).padStart(2, "0")}/${crypto.randomUUID().slice(0, 8)}-${slug}.${ext}`;
  const buf = fs.readFileSync(file);
  await put(p, buf, mime);
  const cols: Record<string, unknown> = {
    bucket: BUCKET, path: p, type: "video", mime, width: probe.streams[0].width, height: probe.streams[0].height,
    duration: Number(probe.format.duration), size_bytes: buf.length, variants: [], alt_text: alt ?? null,
  };
  if (arg("caption")) cols.caption = arg("caption");
  if (arg("date")) cols.date_taken = arg("date");
  if (process.argv.includes("--consent")) cols.consent_confirmed = true;
  if (replace) {
    const { data: old } = await svc.from("media_assets").select("path").eq("id", replace).single();
    const { error } = await svc.from("media_assets").update(cols).eq("id", replace);
    if (error) throw error;
    if (old) await svc.storage.from(BUCKET).remove([old.path]);
    console.log(replace);
    return;
  }
  const { data, error } = await svc.from("media_assets").insert({ ...cols, uploaded_by: null }).select("id").single();
  if (error) throw error;
  console.log(data.id);
}

async function main() {
  if (/\.(mp4|webm)$/i.test(file)) return uploadVideo();
  const src = fs.readFileSync(file);
  const img = sharp(src).rotate();
  const meta = await img.metadata();
  const isPng = meta.format === "png";
  const ext = isPng ? "png" : "jpg";
  const slug = path.basename(file).replace(/\.[^.]+$/, "").toLowerCase().replace(/[^a-z0-9]+/g, "-").replace(/^-|-$/g, "").slice(0, 60);
  const d = new Date();
  const base = `${d.getFullYear()}/${String(d.getMonth() + 1).padStart(2, "0")}/${crypto.randomUUID().slice(0, 8)}-${slug}`;
  const original = isPng ? await img.png({ compressionLevel: 9 }).toBuffer() : await img.jpeg({ quality: 92, mozjpeg: true }).toBuffer();
  await put(`${base}.${ext}`, original, isPng ? "image/png" : "image/jpeg");

  const width = meta.autoOrient?.width ?? meta.width ?? 0;
  const height = meta.autoOrient?.height ?? meta.height ?? 0;
  const variants: { width: number; path: string; format: string }[] = [];
  for (const w of [640, 1280, 1920, 2560]) {
    if (w > width && w !== 640) continue;
    const vp = `${base}.w${w}.webp`;
    await put(vp, await sharp(src).rotate().resize({ width: w, withoutEnlargement: true }).webp({ quality, alphaQuality: 100, smartSubsample: true }).toBuffer(), "image/webp");
    variants.push({ width: w, path: vp, format: "webp" });
    if (w === 1280) {
      const ap = `${base}.w${w}.avif`;
      await put(ap, await sharp(src).rotate().resize({ width: w, withoutEnlargement: true }).avif({ quality: 60 }).toBuffer(), "image/avif");
      variants.push({ width: w, path: ap, format: "avif" });
    }
  }
  const blur = `data:image/webp;base64,${(await sharp(src).rotate().resize(16).webp({ quality: 40 }).toBuffer()).toString("base64")}`;
  const cols: Record<string, unknown> = {
    bucket: BUCKET, path: `${base}.${ext}`, type: "image", mime: isPng ? "image/png" : "image/jpeg",
    width, height, size_bytes: original.length, variants, blur_data_url: blur,
  };
  if (alt) cols.alt_text = alt;
  if (arg("caption")) cols.caption = arg("caption");
  if (arg("date")) cols.date_taken = arg("date");
  if (process.argv.includes("--consent")) cols.consent_confirmed = true;
  if (arg("restrict")) cols.usage_restrictions = arg("restrict");

  if (replace) {
    const { data: old, error: oldErr } = await svc.from("media_assets").select("path,variants").eq("id", replace).single();
    if (oldErr || !old) throw new Error(`No media with id ${replace}`);
    const { error } = await svc.from("media_assets").update(cols).eq("id", replace);
    if (error) throw error;
    const stale = [old.path, ...((old.variants ?? []) as { path: string }[]).map((v) => v.path)];
    await svc.storage.from(BUCKET).remove(stale);
    console.log(replace);
    return;
  }
  const { data, error } = await svc.from("media_assets").insert({ ...cols, uploaded_by: null }).select("id").single();
  if (error) throw error;
  console.log(data.id);
}

main().catch((e) => {
  console.error(e instanceof Error ? e.message : e);
  process.exit(1);
});
