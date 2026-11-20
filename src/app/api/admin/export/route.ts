import { NextResponse, type NextRequest } from "next/server";
import { getSession } from "@/lib/auth/session";
import { can } from "@/lib/auth/roles";
import { getServerClient } from "@/lib/supabase/server";

function csv(rows: Record<string, unknown>[]) {
  if (!rows.length) return "";
  const cols = Object.keys(rows[0]);
  const esc = (v: unknown) => {
    let s = v === null || v === undefined ? "" : typeof v === "object" ? JSON.stringify(v) : String(v);
    if (/^[=+\-@]/.test(s)) s = `'${s}`; // prevent spreadsheet formula injection
    return /[",\n]/.test(s) ? `"${s.replace(/"/g, '""')}"` : s;
  };
  return [cols.join(","), ...rows.map((r) => cols.map((c) => esc(r[c])).join(","))].join("\n");
}

/** CSV export. Rows are limited by RLS to what the signed-in admin may see. */
export async function GET(req: NextRequest) {
  const s = await getSession();
  const kind = req.nextUrl.searchParams.get("kind");
  const sp = req.nextUrl.searchParams;
  if (!s || s.needsMfa) return new NextResponse("Not allowed", { status: 403 });
  const db = await getServerClient();
  let rows: Record<string, unknown>[] = [];
  if (kind === "applications" || kind === "enquiries") {
    if (!can(s.roles, "inbox")) return new NextResponse("Not allowed", { status: 403 });
    const table = kind === "applications" ? "join_applications" : "contact_enquiries";
    const cols = kind === "applications"
      ? "created_at,status,full_name,email,phone,city,state,interest,age_range,current_situation,hoped_outcome,how_heard,preferred_contact,consent_contact,offices(name)"
      : "created_at,status,enquiry_type,name,email,phone,subject,message,offices(name)";
    let q = db.from(table).select(cols).order("created_at", { ascending: false }).limit(10000);
    if (sp.get("status")) q = q.eq("status", sp.get("status")!);
    if (sp.get("office")) q = q.eq("office_id", sp.get("office")!);
    if (sp.get("from")) q = q.gte("created_at", sp.get("from")!);
    if (sp.get("to")) q = q.lte("created_at", `${sp.get("to")}T23:59:59`);
    if (kind === "applications" && sp.get("interest")) q = q.eq("interest", sp.get("interest")!);
    if (kind === "enquiries" && sp.get("type")) q = q.eq("enquiry_type", sp.get("type")!);
    const { data } = await q;
    rows = ((data ?? []) as unknown as Record<string, unknown>[]).map(({ offices, ...r }) => ({ ...r, office: (offices as { name?: string } | null)?.name ?? "" }));
  } else if (kind === "analytics") {
    if (!can(s.roles, "analytics")) return new NextResponse("Not allowed", { status: 403 });
    const { data } = await db.rpc("analytics_export", { p_from: sp.get("from"), p_to: sp.get("to") });
    rows = (data ?? []) as Record<string, unknown>[];
  } else return new NextResponse("Unknown export", { status: 400 });

  return new NextResponse(csv(rows), {
    headers: { "content-type": "text/csv; charset=utf-8", "content-disposition": `attachment; filename="springvilla-${kind}-${new Date().toISOString().slice(0, 10)}.csv"`, "cache-control": "no-store" },
  });
}
