import "server-only";
import { cacheLife, cacheTag } from "next/cache";
import { isSupabaseConfigured } from "@/lib/supabase/env";
import { getPublicClient } from "@/lib/supabase/public";
import { fetchMedia } from "./queries";
import type { Media } from "./media-types";

export const PAGE_SIZE = 9;

/* ------------------------------------------------------------------ posts */
export type PostCard = {
  id: string;
  slug: string;
  title: string;
  excerpt: string | null;
  cover: Media | null;
  category: { slug: string; name: string } | null;
  publishedAt: string;
  readingMinutes: number;
  featured: boolean;
  authorName: string | null;
};
export type Post = PostCard & {
  bodyHtml: string;
  keyTakeaways: string[];
  updatedAt: string;
  seoTitle: string | null;
  seoDescription: string | null;
  ogImage: Media | null;
  tags: { slug: string; name: string }[];
  authorRole: string | null;
  sources: { label: string; url: string }[];
  relatedIds: string[];
};

const POST_CARD_COLS = "id,slug,title,excerpt,cover_asset_id,published_at,reading_minutes,featured,author_name,categories(slug,name)";

type PostRow = {
  id: string;
  slug: string;
  title: string;
  excerpt: string | null;
  cover_asset_id: string | null;
  published_at: string;
  reading_minutes: number;
  featured: boolean;
  author_name: string | null;
  categories: { slug: string; name: string } | null;
};

async function hydratePosts(rows: PostRow[]): Promise<PostCard[]> {
  const media = await fetchMedia(getPublicClient(), rows.map((r) => r.cover_asset_id).filter(Boolean) as string[]);
  return rows.map((r) => ({
    id: r.id,
    slug: r.slug,
    title: r.title,
    excerpt: r.excerpt,
    cover: r.cover_asset_id ? media[r.cover_asset_id] ?? null : null,
    category: r.categories,
    publishedAt: r.published_at,
    readingMinutes: r.reading_minutes,
    featured: r.featured,
    authorName: r.author_name,
  }));
}

export async function searchPosts(q: string, category: string | undefined, page: number) {
  "use cache";
  cacheLife("hours");
  cacheTag("posts", "media");
  if (!isSupabaseConfigured) return { posts: [] as PostCard[], total: 0 };
  const db = getPublicClient();
  const limit = PAGE_SIZE * page;
  const sel = category ? POST_CARD_COLS.replace("categories(slug,name)", "categories!inner(slug,name)") : POST_CARD_COLS;
  let query = db.from("blog_posts").select(sel, { count: "exact" }).order("published_at", { ascending: false }).limit(limit);
  if (category) query = query.eq("categories.slug", category);
  const clean = q.replace(/[%,()*]/g, " ").trim();
  if (clean) query = query.or(`title.ilike.%${clean}%,excerpt.ilike.%${clean}%`);
  const { data, count } = await query;
  return { posts: await hydratePosts((data ?? []) as unknown as PostRow[]), total: count ?? 0 };
}

export async function getFeaturedPost(slug?: string) {
  "use cache";
  cacheLife("hours");
  cacheTag("posts", "media");
  if (!isSupabaseConfigured) return null;
  const db = getPublicClient();
  let q = db.from("blog_posts").select(POST_CARD_COLS).order("published_at", { ascending: false }).limit(1);
  q = slug ? q.eq("slug", slug) : q.eq("featured", true);
  const { data } = await q;
  const rows = (data ?? []) as unknown as PostRow[];
  if (!rows.length && !slug) return null;
  return (await hydratePosts(rows))[0] ?? null;
}

export async function getCategories() {
  "use cache";
  cacheLife("hours");
  cacheTag("posts");
  if (!isSupabaseConfigured) return [] as { slug: string; name: string }[];
  const { data } = await getPublicClient().from("categories").select("slug,name").order("sort_order");
  return (data ?? []) as { slug: string; name: string }[];
}

export async function getPost(slug: string): Promise<Post | null> {
  "use cache";
  cacheLife("hours");
  cacheTag("posts", `post:${slug}`, "media");
  if (!isSupabaseConfigured) return null;
  const db = getPublicClient();
  const { data } = await db
    .from("blog_posts")
    .select(POST_CARD_COLS + ",body_html,key_takeaways,updated_at,seo_title,seo_description,og_image_asset_id,author_role,sources,related_ids,blog_post_tags(tags(slug,name))")
    .eq("slug", slug)
    .maybeSingle();
  if (!data) return null;
  const r = data as unknown as PostRow & { body_html: string; key_takeaways: string[]; updated_at: string; seo_title: string | null; seo_description: string | null; og_image_asset_id: string | null; author_role: string | null; sources: { label: string; url: string }[] | null; related_ids: string[] | null; blog_post_tags: { tags: { slug: string; name: string } }[] };
  const [card] = await hydratePosts([r]);
  const og = r.og_image_asset_id ? (await fetchMedia(db, [r.og_image_asset_id]))[r.og_image_asset_id] ?? null : null;
  return {
    ...card,
    bodyHtml: r.body_html,
    keyTakeaways: r.key_takeaways ?? [],
    updatedAt: r.updated_at,
    seoTitle: r.seo_title,
    seoDescription: r.seo_description,
    ogImage: og ?? card.cover,
    tags: (r.blog_post_tags ?? []).map((t) => t.tags).filter(Boolean),
    authorRole: r.author_role,
    sources: (r.sources ?? []).filter((x) => x.label),
    relatedIds: r.related_ids ?? [],
  };
}

export async function getRelatedPosts(slug: string, categorySlug: string | null, pinnedIds: string[] = []) {
  "use cache";
  cacheLife("hours");
  cacheTag("posts", "media");
  if (!isSupabaseConfigured) return { related: [] as PostCard[], next: null as PostCard | null };
  const db = getPublicClient();
  const { data } = await db.from("blog_posts").select(POST_CARD_COLS).neq("slug", slug).order("published_at", { ascending: false }).limit(40);
  const all = await hydratePosts((data ?? []) as unknown as PostRow[]);
  // Editor-chosen related articles first (§10.1), then same category, then latest.
  const pinned = pinnedIds.map((id) => all.find((p) => p.id === id)).filter((p): p is PostCard => Boolean(p));
  const rest = [...all.filter((p) => categorySlug && p.category?.slug === categorySlug), ...all.filter((p) => !categorySlug || p.category?.slug !== categorySlug)].filter((p) => !pinned.includes(p));
  const related = [...pinned, ...rest].slice(0, 3);
  return { related, next: all[0] ?? null };
}

/* ------------------------------------------------------------------ events */
export type EventCard = {
  id: string;
  slug: string;
  title: string;
  summary: string | null;
  startsAt: string;
  endsAt: string | null;
  timezone: string;
  state: "scheduled" | "postponed" | "cancelled" | "full";
  venue: string | null;
  onlineUrl: string | null;
  registrationUrl: string | null;
  cover: Media | null;
  office: { slug: string; name: string; city: string | null } | null;
};
export type EventFull = EventCard & { bodyHtml: string; seoTitle: string | null; seoDescription: string | null; category: string | null; organiser: string | null; capacity: number | null; eligibility: string | null; contact: string | null };

type EventRow = { id: string; slug: string; title: string; summary: string | null; starts_at: string; ends_at: string | null; timezone: string; event_state: EventCard["state"]; venue: string | null; online_url: string | null; registration_url: string | null; cover_asset_id: string | null; offices: EventCard["office"] };
const EVENT_COLS = "id,slug,title,summary,starts_at,ends_at,timezone,event_state,venue,online_url,registration_url,cover_asset_id,offices(slug,name,city)";

async function hydrateEvents(rows: EventRow[]): Promise<EventCard[]> {
  const media = await fetchMedia(getPublicClient(), rows.map((r) => r.cover_asset_id).filter(Boolean) as string[]);
  return rows.map((r) => ({
    id: r.id,
    slug: r.slug,
    title: r.title,
    summary: r.summary,
    startsAt: r.starts_at,
    endsAt: r.ends_at,
    timezone: r.timezone,
    state: r.event_state,
    venue: r.venue,
    onlineUrl: r.online_url,
    registrationUrl: r.registration_url,
    cover: r.cover_asset_id ? media[r.cover_asset_id] ?? null : null,
    office: r.offices,
  }));
}

function hourIso() {
  const d = new Date();
  d.setMinutes(0, 0, 0);
  return d.toISOString();
}

/** Upcoming = not yet ended. "Now" is evaluated inside the hourly cache scope. */
export async function getUpcomingEvents(limit = 24, officeSlug?: string) {
  "use cache";
  cacheLife("hours");
  cacheTag("events", "media");
  const nowIso = hourIso();
  if (!isSupabaseConfigured) return [] as EventCard[];
  let q = getPublicClient().from("events").select(EVENT_COLS + (officeSlug ? ",offices!inner(slug,name,city)" : "")).eq("audience", "public").or(`ends_at.gte.${nowIso},and(ends_at.is.null,starts_at.gte.${nowIso})`).order("starts_at").limit(limit);
  if (officeSlug) q = q.eq("offices.slug", officeSlug);
  const { data } = await q;
  return hydrateEvents((data ?? []) as unknown as EventRow[]);
}

export async function getPastEvents(limit = 12) {
  "use cache";
  cacheLife("hours");
  cacheTag("events", "media");
  const nowIso = hourIso();
  if (!isSupabaseConfigured) return [] as EventCard[];
  const { data } = await getPublicClient().from("events").select(EVENT_COLS).eq("audience", "public").lt("starts_at", nowIso).order("starts_at", { ascending: false }).limit(limit);
  return hydrateEvents((data ?? []) as unknown as EventRow[]);
}

export async function getEvent(slug: string): Promise<EventFull | null> {
  "use cache";
  cacheLife("hours");
  cacheTag("events", `event:${slug}`, "media");
  if (!isSupabaseConfigured) return null;
  const { data } = await getPublicClient().from("events").select(EVENT_COLS + ",body_html,seo_title,seo_description,category,organiser,capacity,eligibility,contact").eq("slug", slug).eq("audience", "public").maybeSingle();
  if (!data) return null;
  const r = data as unknown as EventRow & { body_html: string; seo_title: string | null; seo_description: string | null; category: string | null; organiser: string | null; capacity: number | null; eligibility: string | null; contact: string | null };
  const [card] = await hydrateEvents([r]);
  return { ...card, bodyHtml: r.body_html, seoTitle: r.seo_title, seoDescription: r.seo_description, category: r.category, organiser: r.organiser, capacity: r.capacity, eligibility: r.eligibility, contact: r.contact };
}

/* ------------------------------------------------------------------ offices */
export type OfficeCard = {
  id: string;
  slug: string;
  name: string;
  city: string | null;
  state: string | null;
  country: string | null;
  addressLine: string | null;
  lat: number | null;
  lng: number | null;
  summary: string | null;
  hero: Media | null;
  verified: boolean;
  lastVerifiedAt: string | null;
};
export type OfficeFull = OfficeCard & {
  postcode: string | null;
  phone: string | null;
  email: string | null;
  whatsapp: string | null;
  hours: { day: string; opens?: string; closes?: string; note?: string }[];
  welcome: string | null;
  whatHappens: string | null;
  programmes: string | null;
  firstVisit: string | null;
  gettingThere: string | null;
  accessibility: string | null;
  leadContactName: string | null;
  leadContactRole: string | null;
  preferredContact: "phone" | "whatsapp" | "email" | "visit" | null;
  visitAppointment: string | null;
  whatToBring: string | null;
  eligibilityCosts: string | null;
  updatedAt: string;
  gallery: Media[];
  seoTitle: string | null;
  seoDescription: string | null;
};

type OfficeRow = Record<string, unknown> & { id: string; slug: string; name: string; hero_asset_id: string | null; gallery: string[] };
const OFFICE_CARD_COLS = "id,slug,name,city,state,country,address_line,lat,lng,summary,hero_asset_id,gallery,verification_status,last_verified_at";

function officeCard(r: OfficeRow, media: Record<string, Media>): OfficeCard {
  return {
    id: r.id,
    slug: r.slug,
    name: r.name,
    city: (r.city as string) ?? null,
    state: (r.state as string) ?? null,
    country: (r.country as string) ?? null,
    addressLine: (r.address_line as string) ?? null,
    lat: (r.lat as number) ?? null,
    lng: (r.lng as number) ?? null,
    summary: (r.summary as string) ?? null,
    hero: r.hero_asset_id ? media[r.hero_asset_id] ?? null : null,
    verified: r.verification_status === "verified",
    lastVerifiedAt: (r.last_verified_at as string) ?? null,
  };
}

export async function getOffices() {
  "use cache";
  cacheLife("hours");
  cacheTag("offices", "media");
  if (!isSupabaseConfigured) return [] as OfficeCard[];
  const db = getPublicClient();
  const { data } = await db.from("offices").select(OFFICE_CARD_COLS).order("state").order("city").order("name");
  const rows = (data ?? []) as OfficeRow[];
  const media = await fetchMedia(db, rows.map((r) => r.hero_asset_id).filter(Boolean) as string[]);
  return rows.map((r) => officeCard(r, media));
}

export async function getOffice(slug: string): Promise<OfficeFull | null> {
  "use cache";
  cacheLife("hours");
  cacheTag("offices", `office:${slug}`, "media");
  if (!isSupabaseConfigured) return null;
  const db = getPublicClient();
  const { data } = await db.from("offices").select("*").eq("slug", slug).maybeSingle();
  if (!data) return null;
  const r = data as OfficeRow;
  const media = await fetchMedia(db, [r.hero_asset_id, ...(r.gallery ?? [])].filter(Boolean) as string[]);
  return {
    ...officeCard(r, media),
    postcode: (r.postcode as string) ?? null,
    phone: (r.phone as string) ?? null,
    email: (r.email as string) ?? null,
    whatsapp: (r.whatsapp as string) ?? null,
    hours: (r.hours as OfficeFull["hours"]) ?? [],
    welcome: (r.welcome as string) ?? null,
    whatHappens: (r.what_happens as string) ?? null,
    programmes: (r.programmes as string) ?? null,
    firstVisit: (r.first_visit as string) ?? null,
    gettingThere: (r.getting_there as string) ?? null,
    accessibility: (r.accessibility as string) ?? null,
    // Representative details are consent-controlled (§11.2 part 6).
    leadContactName: r.lead_contact_consent ? ((r.lead_contact_name as string) ?? null) : null,
    leadContactRole: r.lead_contact_consent ? ((r.lead_contact_role as string) ?? null) : null,
    preferredContact: (r.preferred_contact as OfficeFull["preferredContact"]) ?? null,
    visitAppointment: (r.visit_appointment as string) ?? null,
    whatToBring: (r.what_to_bring as string) ?? null,
    eligibilityCosts: (r.eligibility_costs as string) ?? null,
    updatedAt: (r.updated_at as string) ?? "",
    gallery: (r.gallery ?? []).map((id) => media[id]).filter(Boolean),
    seoTitle: (r.seo_title as string) ?? null,
    seoDescription: (r.seo_description as string) ?? null,
  };
}

/* ------------------------------------------------------------------ journeys */
export type JourneyCard = {
  id: string;
  slug: string;
  title: string;
  publicName: string | null;
  path: string | null;
  summary: string | null;
  portrait: Media | null;
  office: { slug: string; name: string } | null;
  publishedAt: string | null;
  growthStatement: string | null;
  updates: { id: string; occurredOn: string; title: string; body: string | null; image: Media | null }[];
};
export type JourneyFull = JourneyCard & {
  bodyHtml: string;
  seoTitle: string | null;
  seoDescription: string | null;
  startingPoint: string | null;
  challenge: string | null;
  supportReceived: string | null;
  actionsTaken: string | null;
  skillsDeveloped: string[];
  currentProgress: string | null;
  advice: string | null;
  quote: string | null;
};

const JOURNEY_COLS = "id,slug,title,public_name,anonymity_level,path,summary,growth_statement,portrait_asset_id,published_at,featured,offices(slug,name),journey_updates(id,occurred_on,title,body,asset_id)";
type JourneyRow = { id: string; slug: string; title: string; public_name: string | null; anonymity_level: string; path: string | null; summary: string | null; growth_statement: string | null; portrait_asset_id: string | null; published_at: string | null; offices: { slug: string; name: string } | null; journey_updates: { id: string; occurred_on: string; title: string; body: string | null; asset_id: string | null }[] };

async function hydrateJourneys(rows: JourneyRow[]): Promise<JourneyCard[]> {
  const ids = rows.flatMap((r) => [r.portrait_asset_id, ...r.journey_updates.map((u) => u.asset_id)]).filter(Boolean) as string[];
  const media = await fetchMedia(getPublicClient(), ids);
  return rows.map((r) => ({
    id: r.id,
    slug: r.slug,
    title: r.title,
    publicName: r.anonymity_level === "anonymous" ? null : r.public_name,
    growthStatement: r.growth_statement,
    path: r.path,
    summary: r.summary,
    portrait: r.anonymity_level === "anonymous" ? null : r.portrait_asset_id ? media[r.portrait_asset_id] ?? null : null,
    office: r.offices,
    publishedAt: r.published_at,
    updates: [...r.journey_updates]
      .sort((a, b) => a.occurred_on.localeCompare(b.occurred_on))
      .map((u) => ({ id: u.id, occurredOn: u.occurred_on, title: u.title, body: u.body, image: u.asset_id ? media[u.asset_id] ?? null : null })),
  }));
}

export async function getJourneys(limit = 24, featuredFirst = false) {
  "use cache";
  cacheLife("hours");
  cacheTag("journeys", "media");
  if (!isSupabaseConfigured) return [] as JourneyCard[];
  let q = getPublicClient().from("member_journeys").select(JOURNEY_COLS).eq("status", "published").eq("verified", true).not("consent_record_id", "is", null);
  if (featuredFirst) q = q.order("featured", { ascending: false });
  const { data } = await q.order("published_at", { ascending: false }).limit(limit);
  return hydrateJourneys((data ?? []) as unknown as JourneyRow[]);
}

export async function getJourney(slug: string): Promise<JourneyFull | null> {
  "use cache";
  cacheLife("hours");
  cacheTag("journeys", `journey:${slug}`, "media");
  if (!isSupabaseConfigured) return null;
  const { data } = await getPublicClient()
    .from("member_journeys")
    .select(JOURNEY_COLS + ",body_html,seo_title,seo_description,starting_point,challenge,support_received,actions_taken,skills_developed,current_progress,advice,quote")
    .eq("slug", slug)
    .eq("status", "published")
    .eq("verified", true)
    .maybeSingle();
  if (!data) return null;
  const r = data as unknown as JourneyRow & Record<string, string | null> & { body_html: string; skills_developed: string[] | null };
  const [card] = await hydrateJourneys([r]);
  return {
    ...card,
    bodyHtml: r.body_html,
    seoTitle: r.seo_title,
    seoDescription: r.seo_description,
    startingPoint: r.starting_point,
    challenge: r.challenge,
    supportReceived: r.support_received,
    actionsTaken: r.actions_taken,
    skillsDeveloped: r.skills_developed ?? [],
    currentProgress: r.current_progress,
    advice: r.advice,
    quote: r.quote,
  };
}

/* ------------------------------------------------------------------ news (public announcements) */
export type NewsCard = { id: string; slug: string; title: string; summary: string | null; cover: Media | null; publishedAt: string | null; office: { slug: string; name: string } | null; kind: string };
export type NewsFull = NewsCard & { bodyHtml: string; seoTitle: string | null; seoDescription: string | null };
type NewsRow = { id: string; slug: string; title: string; summary: string | null; cover_asset_id: string | null; published_at: string | null; kind: string; offices: { slug: string; name: string } | null };
const NEWS_COLS = "id,slug,title,summary,cover_asset_id,published_at,kind,offices(slug,name)";

async function hydrateNews(rows: NewsRow[]): Promise<NewsCard[]> {
  const media = await fetchMedia(getPublicClient(), rows.map((r) => r.cover_asset_id).filter(Boolean) as string[]);
  return rows.map((r) => ({ id: r.id, slug: r.slug, title: r.title, summary: r.summary, cover: r.cover_asset_id ? media[r.cover_asset_id] ?? null : null, publishedAt: r.published_at, office: r.offices, kind: r.kind }));
}

export async function getNews(limit = 24, officeOnly = false, officeSlug?: string) {
  "use cache";
  cacheLife("hours");
  cacheTag("news", "media");
  if (!isSupabaseConfigured) return [] as NewsCard[];
  let q = getPublicClient().from("announcements").select(officeSlug ? NEWS_COLS.replace("offices(slug,name)", "offices!inner(slug,name)") : NEWS_COLS).eq("kind", "news").eq("status", "published");
  if (officeOnly) q = q.not("office_id", "is", null);
  if (officeSlug) q = q.eq("offices.slug", officeSlug);
  const { data } = await q.order("published_at", { ascending: false }).limit(limit);
  return hydrateNews((data ?? []) as unknown as NewsRow[]);
}

export async function getNewsItem(slug: string): Promise<NewsFull | null> {
  "use cache";
  cacheLife("hours");
  cacheTag("news", `news:${slug}`, "media");
  if (!isSupabaseConfigured) return null;
  const { data } = await getPublicClient().from("announcements").select(NEWS_COLS + ",body_html,seo_title,seo_description").eq("slug", slug).eq("kind", "news").eq("status", "published").maybeSingle();
  if (!data) return null;
  const r = data as unknown as NewsRow & { body_html: string; seo_title: string | null; seo_description: string | null };
  const [card] = await hydrateNews([r]);
  return { ...card, bodyHtml: r.body_html, seoTitle: r.seo_title, seoDescription: r.seo_description };
}

/* ------------------------------------------------------------------ sitemap */
export async function getSitemapEntries() {
  "use cache";
  cacheLife("hours");
  cacheTag("posts", "events", "offices", "journeys", "news");
  if (!isSupabaseConfigured) return [] as { path: string; updatedAt: string }[];
  const db = getPublicClient();
  const [p, e, o, j, n] = await Promise.all([
    db.from("blog_posts").select("slug,updated_at"),
    db.from("events").select("slug,updated_at").eq("audience", "public"),
    db.from("offices").select("slug,updated_at"),
    db.from("member_journeys").select("slug,updated_at").eq("status", "published").eq("verified", true),
    db.from("announcements").select("slug,updated_at").eq("kind", "news").eq("status", "published"),
  ]);
  const map = (rows: { slug: string; updated_at: string }[] | null, base: string) => (rows ?? []).map((r) => ({ path: `${base}/${r.slug}`, updatedAt: r.updated_at }));
  return [...map(p.data, "/ideas"), ...map(e.data, "/events"), ...map(o.data, "/offices"), ...map(j.data, "/journeys"), ...map(n.data, "/news")];
}

/* ------------------------------------------------------------------ static params */
const SLUG_SOURCES = {
  posts: { table: "blog_posts", filter: {} as Record<string, string> },
  events: { table: "events", filter: { status: "published", audience: "public" } },
  offices: { table: "offices", filter: { status: "published" } },
  journeys: { table: "member_journeys", filter: { status: "published" } },
  news: { table: "announcements", filter: { status: "published", kind: "news" } },
} as const;

/**
 * Published slugs to prerender at build time (full HTML, readable without JS).
 * Cache Components requires at least one entry, so a placeholder (→ 404) is
 * returned when there is no content yet; new slugs render on first visit.
 */
export async function getStaticSlugs(kind: keyof typeof SLUG_SOURCES): Promise<{ slug: string }[]> {
  "use cache";
  cacheLife("hours");
  cacheTag(kind === "posts" ? "posts" : kind);
  const placeholder = [{ slug: "__none" }];
  if (!isSupabaseConfigured) return placeholder;
  const src = SLUG_SOURCES[kind];
  let q = getPublicClient().from(src.table).select("slug").limit(500);
  for (const [k, v] of Object.entries(src.filter)) q = q.eq(k, v);
  const { data } = await q;
  const rows = (data ?? []) as { slug: string }[];
  return rows.length ? rows.map((r) => ({ slug: r.slug })) : placeholder;
}
