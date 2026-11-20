/* Promote SUPER_ADMIN_EMAIL to super_admin. The user must already exist in Supabase Auth. */
import "dotenv/config";
import { config } from "dotenv";
import { createClient } from "@supabase/supabase-js";

config({ path: ".env.local" });

async function main() {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const key = process.env.SUPABASE_SERVICE_ROLE_KEY;
  const email = process.env.SUPER_ADMIN_EMAIL?.trim().toLowerCase();
  if (!url || !key || !email) {
    console.error("Set NEXT_PUBLIC_SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY and SUPER_ADMIN_EMAIL in .env.local first.");
    process.exit(1);
  }
  const db = createClient(url, key, { auth: { persistSession: false } });

  let userId: string | undefined;
  for (let page = 1; page < 50 && !userId; page++) {
    const { data, error } = await db.auth.admin.listUsers({ page, perPage: 200 });
    if (error) throw error;
    userId = data.users.find((u) => u.email?.toLowerCase() === email)?.id;
    if (data.users.length < 200) break;
  }
  if (!userId) {
    console.error(`No auth user with email ${email}. Create it in Supabase → Authentication → Users → Add user, then re-run.`);
    process.exit(1);
  }

  await db.from("profiles").upsert({ id: userId, email, is_active: true }, { onConflict: "id" });
  const { error } = await db.from("user_roles").upsert({ user_id: userId, role: "super_admin", office_id: null }, { onConflict: "user_id,role,office_id", ignoreDuplicates: true });
  if (error && !/duplicate/i.test(error.message)) throw error;
  console.log(`✓ ${email} is now a super admin. Sign in at /admin/login; you will be asked to set up an authenticator app.`);
}

main().catch((e) => {
  console.error(e.message ?? e);
  process.exit(1);
});
