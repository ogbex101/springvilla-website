"use server";

import { z } from "zod";
import { requireCapability } from "@/lib/auth/session";
import { getServerClient } from "@/lib/supabase/server";

type R = { ok: true } | { ok: false; error: string };
const TABLES = { applications: "join_applications", enquiries: "contact_enquiries", support: "support_requests" } as const;
type Kind = keyof typeof TABLES;

export async function updateInboxItem(kind: Kind, id: string, patch: { status?: string; assigned_to?: string | null }): Promise<R> {
  try {
    await requireCapability("inbox");
    const p = z.object({ status: z.enum(["new", "contacted", "visited", "closed"]).optional(), assigned_to: z.string().uuid().nullable().optional() }).parse(patch);
    if (kind === "support") delete p.assigned_to;
    const db = await getServerClient();
    const { error, count } = await db.from(TABLES[kind]).update(p, { count: "exact" }).eq("id", id);
    if (error) throw error;
    if (!count) throw new Error("You can't change this item.");
    return { ok: true };
  } catch (e) {
    return { ok: false, error: (e as Error).message };
  }
}

export async function addInboxNote(kind: Kind, id: string, text: string): Promise<R> {
  try {
    const s = await requireCapability("inbox");
    const clean = text.trim().slice(0, 2000);
    if (!clean) return { ok: false, error: "Write a note first." };
    const db = await getServerClient();
    const { data: row } = await db.from(TABLES[kind]).select("notes").eq("id", id).single();
    if (!row) throw new Error("Not found");
    const notes = [...((row.notes as unknown[]) ?? []), { author: s.userId, author_name: s.displayName || s.email, text: clean, at: new Date().toISOString() }];
    const { error } = await db.from(TABLES[kind]).update({ notes }).eq("id", id);
    if (error) throw error;
    return { ok: true };
  } catch (e) {
    return { ok: false, error: (e as Error).message };
  }
}
