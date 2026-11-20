"use client";

import { getBrowserClient } from "@/lib/supabase/browser";
import { SUPABASE_ANON_KEY, SUPABASE_URL } from "@/lib/supabase/env";
import { registerUpload, type AdminMedia } from "@/app/admin/actions/media";

export const VIDEO_WARN_BYTES = 15 * 1024 * 1024;

function slug(name: string) {
  const ext = (name.split(".").pop() ?? "bin").toLowerCase().replace(/[^a-z0-9]/g, "");
  const base = name.replace(/\.[^.]+$/, "").toLowerCase().replace(/[^a-z0-9]+/g, "-").replace(/^-|-$/g, "").slice(0, 50) || "file";
  return { base, ext };
}

async function readMediaMeta(file: File): Promise<{ width?: number; height?: number; duration?: number }> {
  if (!file.type.startsWith("video/")) return {};
  return new Promise((resolve) => {
    const v = document.createElement("video");
    v.preload = "metadata";
    v.onloadedmetadata = () => {
      resolve({ width: v.videoWidth, height: v.videoHeight, duration: Math.round(v.duration * 10) / 10 });
      URL.revokeObjectURL(v.src);
    };
    v.onerror = () => resolve({});
    v.src = URL.createObjectURL(file);
  });
}

/**
 * Uploads straight from the browser to Supabase Storage (XHR for progress),
 * then asks the server to validate, process and register the asset.
 */
export async function uploadFile(file: File, opts: { bucket?: string; replaceId?: string; onProgress?: (pct: number) => void } = {}): Promise<AdminMedia> {
  const bucket = opts.bucket ?? "public-media";
  const { data } = await getBrowserClient().auth.getSession();
  const token = data.session?.access_token;
  if (!token) throw new Error("Your session has expired. Please sign in again.");
  const { base, ext } = slug(file.name);
  const d = new Date();
  const path = `${d.getFullYear()}/${String(d.getMonth() + 1).padStart(2, "0")}/${crypto.randomUUID().slice(0, 8)}-${base}.${ext}`;

  await new Promise<void>((resolve, reject) => {
    const xhr = new XMLHttpRequest();
    xhr.open("POST", `${SUPABASE_URL}/storage/v1/object/${bucket}/${path}`);
    xhr.setRequestHeader("Authorization", `Bearer ${token}`);
    xhr.setRequestHeader("apikey", SUPABASE_ANON_KEY);
    xhr.setRequestHeader("x-upsert", "false");
    xhr.setRequestHeader("Content-Type", file.type || "application/octet-stream");
    xhr.upload.onprogress = (e) => e.lengthComputable && opts.onProgress?.(Math.round((e.loaded / e.total) * 95));
    xhr.onload = () => {
      if (xhr.status >= 200 && xhr.status < 300) return resolve();
      let msg = "Upload failed.";
      try {
        const body = JSON.parse(xhr.responseText);
        if (/exceeded|too large|413/i.test(body.message ?? body.error ?? "")) msg = "That file is larger than your storage plan allows (see OWNER_TODO).";
        else if (/mime/i.test(body.message ?? "")) msg = "That file type isn't allowed.";
        else if (/policy|unauthorized|403/i.test(body.message ?? body.error ?? "")) msg = "You don't have permission to upload files.";
      } catch {}
      reject(new Error(msg));
    };
    xhr.onerror = () => reject(new Error("Network error during upload. Check your connection and try again."));
    xhr.send(file);
  });

  const meta = await readMediaMeta(file);
  const res = await registerUpload({ bucket: bucket as "public-media", path, size: file.size, meta, replaceId: opts.replaceId });
  opts.onProgress?.(100);
  if (!res.ok) throw new Error(res.error);
  return res.data;
}

export function formatBytes(n: number) {
  if (n < 1024 * 1024) return `${Math.round(n / 1024)} KB`;
  return `${(n / 1024 / 1024).toFixed(1)} MB`;
}
