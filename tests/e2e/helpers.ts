export const hasSupabase = Boolean(process.env.NEXT_PUBLIC_SUPABASE_URL && process.env.SUPABASE_SERVICE_ROLE_KEY);
export const adminCreds = { email: process.env.E2E_ADMIN_EMAIL ?? "", password: process.env.E2E_ADMIN_PASSWORD ?? "" };
export const hasAdmin = hasSupabase && Boolean(adminCreds.email && adminCreds.password);
export const PUBLIC_ROUTES = ["/", "/discover", "/our-system", "/our-system/digital-skills", "/our-system/business", "/life-here", "/stories-and-ideas", "/ideas", "/journeys", "/news", "/events", "/offices", "/join", "/contact", "/faq", "/privacy", "/terms"];
