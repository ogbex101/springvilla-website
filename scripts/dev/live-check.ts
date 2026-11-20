import { config } from "dotenv";
import { createClient } from "@supabase/supabase-js";
config({ path: ".env.local", quiet: true });
(async () => {
  const svc = createClient(process.env.NEXT_PUBLIC_SUPABASE_URL!, process.env.SUPABASE_SERVICE_ROLE_KEY!, { auth: { persistSession: false } });
  const pages = await svc.from("pages").select("key");
  const sections = await svc.from("page_sections").select("id");
  const cats = await svc.from("categories").select("slug");
  const roles = await svc.from("user_roles").select("user_id, role");
  const profiles = await svc.from("profiles").select("id, email, is_active");
  const email = (id: string) => profiles.data?.find((p) => p.id === id)?.email;
  console.log({ pages: pages.data?.length ?? pages.error, sections: sections.data?.length, categories: cats.data?.length, profiles: profiles.data?.length, roles: roles.data?.map((r) => `${email(r.user_id)}: ${r.role}`) ?? roles.error });
})();
