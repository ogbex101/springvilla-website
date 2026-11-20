import { config } from "dotenv";
import { createClient } from "@supabase/supabase-js";
config({ path: ".env.local" });
(async () => {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL!;
  const pub = createClient(url, process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!, { auth: { persistSession: false } });
  const svc = createClient(url, process.env.SUPABASE_SERVICE_ROLE_KEY!, { auth: { persistSession: false } });
  const a = await pub.auth.signInWithPassword({ email: "nobody-key-check@example.com", password: "wrong-password-123" });
  console.log("publishable auth reachable:", a.error ? `yes (expected error: ${a.error.message})` : "unexpected success");
  const u = await svc.auth.admin.listUsers({ page: 1, perPage: 50 });
  console.log("secret key admin API:", u.error ? `FAILED ${u.error.message}` : `ok, ${u.data.users.length} user(s)`);
  const target = process.env.E2E_ADMIN_EMAIL?.toLowerCase();
  const me = u.data?.users.find((x) => x.email?.toLowerCase() === target);
  console.log("admin account exists:", me ? `yes (confirmed: ${Boolean(me.email_confirmed_at)})` : "no");
  const r = await svc.from("site_settings").select("id").limit(1);
  console.log("secret key REST:", r.error ? r.error.code + " " + r.error.message : "ok");
  const b = await svc.storage.listBuckets();
  console.log("secret key storage:", b.error ? b.error.message : b.data.map((x) => x.id).join(",") || "(no buckets yet)");
})();
