import { z } from "zod";
import { f } from "./fields";

/* ------------------------------------------------------------------ shared bits */
const anchor = {
  anchor: f.text("Anchor id", "Used by the sticky sub-navigation, e.g. 'how-it-works'. Leave blank to omit.", 60),
  navLabel: f.text("Sub-navigation label", "Short label shown in the sticky sub-nav.", 40),
};
const heading = {
  eyebrow: f.text("Eyebrow", "Small label above the heading.", 80),
  heading: f.textarea("Heading", "Use a new line for a controlled line break.", 200),
  highlight: f.text("Highlighted word", "One word from the heading to set in the serif italic accent.", 40),
};
const PATH_LAYER = [
  { value: "signal", label: "Signal (digital, tech)" },
  { value: "canopy", label: "Primary (Fresh Canopy)" },
  { value: "cyprus", label: "Authority (Cyprus)" },
] as const;

/* ------------------------------------------------------------------ homepage */
export const homeHero = z.object({
  eyebrow: f.text("Eyebrow", undefined, 80),
  headline: f.textarea("Headline", "Use a new line for a controlled line break.", 160),
  highlight: f.text("Highlighted word", "Shown in Lime Sprout serif italic.", 40),
  body: f.textarea("Supporting copy", undefined, 400),
  primaryCta: f.cta("Primary button", "Use #what-is to scroll to section 02."),
  secondaryCta: f.cta("Secondary button"),
  poster: f.image("Poster image", "Shown instantly (this is what loads first) and on mobile. 1920×1080 recommended."),
  videoDesktop: f.video("Desktop video (MP4, H.264)", "10–20 second loop, 1080p, under 10MB."),
  videoDesktopWebm: f.video("Desktop video (WebM, optional)"),
  videoMobile: f.video("Mobile video (MP4)", "720p, under 4MB."),
  allowMobileVideo: f.boolean("Play the mobile video on phones", "Off = phones show the poster image only (fastest)."),
  overlay: f.number("Overlay strength (%)", 0, 80, 45, "Darkens the bottom-left so text stays readable."),
  badge: f.text("Rotating badge text", undefined, 60),
});

export const homeMarquee = z.object({
  rowOne: f.stringList("Row one phrases"),
  rowTwo: f.stringList("Row two phrases"),
});

export const homeWhatIs = z.object({
  ...anchor,
  ...heading,
  body: f.textarea("Body", undefined, 1200),
  image: f.image("Documentary photo"),
  nodesHeading: f.text("Explainer heading", undefined, 120),
  nodes: f.list("Explainer nodes", { title: f.text("Title", undefined, 60), body: f.textarea("Text", undefined, 300) }, "Node", "Three connected nodes, e.g. FHG / Springvilla / NeoLife.", 3),
  cta: f.cta("Button"),
});

export const homeTwoPaths = z.object({
  ...anchor,
  ...heading,
  intro: f.textarea("Intro", undefined, 600),
  cards: f.list(
    "Path cards",
    {
      label: f.text("Chip label", undefined, 40),
      title: f.text("Title", undefined, 80),
      body: f.textarea("Description", undefined, 500),
      image: f.image("Photo"),
      layer: f.select("Accent layer", PATH_LAYER, "canopy"),
      href: f.link("Link"),
    },
    "Path",
    "Exactly two cards.",
    2,
  ),
  bridge: f.textarea("Bridge statement", undefined, 300),
  comparisonHeading: f.text("Comparison heading", undefined, 120),
  leftLabel: f.text("Left column label", undefined, 40),
  rightLabel: f.text("Right column label", undefined, 40),
  rows: f.list("Comparison rows", { left: f.text("Left", undefined, 80), right: f.text("Right", undefined, 80) }, "Row", undefined, 10),
  disclaimer: f.textarea("No-guarantee line", undefined, 300),
  cta: f.cta("Button"),
});

export const homeJourneyWords = z.object({
  words: f.stringList("Words", "Shown one at a time. Five works best.", 7),
  caption: f.textarea("Caption", "Read by screen readers and shown under the words.", 200),
});

export const homeLifeInside = z.object({
  ...anchor,
  ...heading,
  body: f.textarea("Body", undefined, 800),
  tiles: f.imageList("Mosaic photos", "5 to 9 real photos. Each photo's caption says what happened.", 0, 9),
  chips: f.stringList("Module chips"),
  cta: f.cta("Button"),
  dayHeading: f.text("'A day at Springvilla' heading", "Leave the chapters empty to hide this strip.", 120),
  dayKind: f.select("What the day shows", [
    { value: "illustrative", label: "An illustrative routine (labelled as such on the site)" },
    { value: "documented", label: "One documented real day" },
  ] as const, "illustrative", "Blueprint §9: never present a staged timeline as a verified schedule."),
  dayDate: f.text("Date of the documented day", "Only for a documented real day, e.g. 14 March 2027.", 40),
  dayChapters: f.list("Day chapters", { title: f.text("Title", undefined, 40), body: f.textarea("Text", undefined, 300), image: f.image("Photo") }, "Chapter", undefined, 6),
});

export const homeJourneys = z.object({
  ...anchor,
  ...heading,
  body: f.textarea("Body", undefined, 600),
  emptyText: f.textarea("Text when no verified journeys exist", "Leave blank to hide the whole module instead.", 600),
  limit: f.number("Journeys to show", 1, 3, 3),
  cta: f.cta("Button"),
});

export const homeIdeas = z.object({
  ...anchor,
  ...heading,
  body: f.textarea("Body", undefined, 400),
  featuredSlug: f.text("Featured article slug (optional override)", "Blank = most recent featured article.", 120),
  showOfficeUpdate: f.boolean("Show latest office update", undefined, true),
  emptyText: f.textarea("Empty state text", undefined, 300),
  cta: f.cta("Button"),
});

export const homeFindPlace = z.object({
  ...anchor,
  ...heading,
  body: f.textarea("Body", undefined, 600),
  image: f.image("Warm photo"),
  previewHeading: f.text("Application preview heading", undefined, 120),
  previewSteps: f.stringList("Application preview steps", undefined, 6),
  enquiryNote: f.textarea("Enquiry note", "E.g. an enquiry is not automatic membership.", 300),
  primaryCta: f.cta("Primary button"),
  secondaryCta: f.cta("Secondary button"),
});

/* ------------------------------------------------------------------ shared page sections */
export const pageHero = z.object({
  ...heading,
  body: f.textarea("Body", undefined, 600),
  media: f.image("Background image"),
  video: f.video("Short loop video (optional)", "Only one autoplay video per page. Under 8MB."),
  variant: f.select("Style", [
    { value: "image", label: "Full-bleed image" },
    { value: "split", label: "Split: text and image" },
    { value: "typographic", label: "Typographic (no image)" },
  ] as const, "typographic"),
  primaryCta: f.cta("Primary button"),
  secondaryCta: f.cta("Secondary button"),
});

export const richText = z.object({ ...anchor, ...heading, html: f.richtext("Text") });

export const splitFeature = z.object({
  ...anchor,
  ...heading,
  body: f.textarea("Body", undefined, 1600),
  bullets: f.stringList("Bullet points", undefined, 8),
  image: f.image("Image"),
  imageSide: f.select("Image side", [{ value: "left", label: "Left" }, { value: "right", label: "Right" }] as const, "right"),
  cta: f.cta("Button"),
});

export const steps = z.object({
  ...anchor,
  ...heading,
  intro: f.textarea("Intro", undefined, 600),
  style: f.select("Style", [
    { value: "numbered", label: "Numbered grid" },
    { value: "pipeline", label: "Pipeline (drawn step by step)" },
    { value: "timeline", label: "Vertical timeline" },
  ] as const, "numbered"),
  items: f.list("Steps", { title: f.text("Title", undefined, 80), body: f.textarea("Text", undefined, 500) }, "Step", undefined, 12),
  cta: f.cta("Button"),
});

export const relationship = z.object({
  ...anchor,
  ...heading,
  intro: f.textarea("Intro", undefined, 800),
  nodes: f.list("Nodes (left to right)", { title: f.text("Title", undefined, 60), caption: f.textarea("Caption", undefined, 240) }, "Node", undefined, 4),
  note: f.textarea("Note under the graphic", undefined, 400),
});

export const pathways = z.object({
  ...anchor,
  ...heading,
  intro: f.textarea("Intro", undefined, 600),
  cards: homeTwoPaths.shape.cards,
  disclaimer: f.textarea("No-guarantee line", undefined, 300),
});

export const reality = z.object({
  ...anchor,
  ...heading,
  body: f.textarea("Body", undefined, 1200),
  points: f.stringList("Points", undefined, 10),
});

export const faq = z.object({
  ...anchor,
  ...heading,
  items: f.list("Questions", { question: f.text("Question", undefined, 200), answer: f.textarea("Answer", undefined, 1500) }, "Question", undefined, 30),
});

export const leadership = z.object({
  ...anchor,
  ...heading,
  intro: f.textarea("Intro", undefined, 600),
  people: f.list(
    "People (verified only)",
    {
      name: f.text("Name", undefined, 80),
      role: f.text("Role", undefined, 80),
      photo: f.image("Photo"),
      bio: f.textarea("Short bio", undefined, 500),
      verified: f.boolean("Verified (required to show)"),
    },
    "Person",
    "Only people marked verified are shown. The section hides when none are.",
    24,
  ),
});

export const gallery = z.object({
  ...anchor,
  ...heading,
  intro: f.textarea("Intro", undefined, 600),
  images: f.imageList("Photos", "Captions come from the media library.", 0, 24),
});

export const cardGrid = z.object({
  ...anchor,
  ...heading,
  intro: f.textarea("Intro", undefined, 600),
  cards: f.list("Cards", { title: f.text("Title", undefined, 80), body: f.textarea("Text", undefined, 400), image: f.image("Image"), href: f.link("Link") }, "Card", undefined, 12),
});

export const comparisonTable = z.object({
  ...anchor,
  ...heading,
  intro: f.textarea("Intro", undefined, 600),
  col1: f.text("Column 1 heading", undefined, 40),
  col2: f.text("Column 2 heading", undefined, 40),
  col3: f.text("Column 3 heading", undefined, 40),
  rows: f.list("Rows", { c1: f.text("Column 1", undefined, 80), c2: f.textarea("Column 2", undefined, 300), c3: f.textarea("Column 3", undefined, 300) }, "Row", undefined, 12),
});

export const ctaBand = z.object({
  ...heading,
  body: f.textarea("Body", undefined, 500),
  primaryCta: f.cta("Primary button"),
  secondaryCta: f.cta("Secondary button"),
});

export const listingIntro = z.object({
  ...heading,
  body: f.textarea("Body", undefined, 600),
  emptyText: f.textarea("Empty state text", undefined, 400),
});

export const legal = z.object({
  heading: f.text("Heading", undefined, 120),
  html: f.richtext("Text"),
  pendingReview: f.boolean("Mark as pending legal review", undefined, true),
  lastUpdated: f.text("Last updated (e.g. 20 November 2026)", undefined, 40),
});

export const joinForm = z.object({
  ...anchor,
  ...heading,
  intro: f.textarea("Intro", undefined, 600),
  privacyExplanation: f.textarea("Why we ask for these details", "Shown above the form (blueprint §12.1: clear privacy explanation).", 600),
  enquiryNote: f.textarea("Note above the submit button", undefined, 400),
  successHeading: f.text("Success heading", undefined, 120),
  successBody: f.textarea("Success message", undefined, 600),
  privacyLabel: f.textarea("Privacy acknowledgement label", undefined, 300),
  marketingLabel: f.textarea("Updates opt-in label (unticked by default)", undefined, 300),
  consentVersion: f.text("Privacy notice version", "Stored with each application, e.g. 2026-11-draft. Change it when the privacy policy changes.", 40),
});

export const contactForm = z.object({
  ...heading,
  intro: f.textarea("Intro", undefined, 600),
  types: f.list("Enquiry types", {
    value: f.select("Queue", [
      { value: "general", label: "General enquiry" },
      { value: "office_information", label: "Office information" },
      { value: "partnership", label: "Partnership" },
      { value: "media", label: "Media" },
      { value: "product", label: "Product-related enquiry" },
      { value: "privacy", label: "Privacy request" },
      { value: "technical", label: "Technical support" },
    ] as const, "general"),
    label: f.text("Label", undefined, 60),
    description: f.text("Description", undefined, 160),
  }, "Type", undefined, 7),
  successHeading: f.text("Success heading", undefined, 120),
  successBody: f.textarea("Success message", undefined, 600),
});

/* ------------------------------------------------------------------ registry */
export const SECTION_SCHEMAS = {
  "home.hero": homeHero,
  "home.marquee": homeMarquee,
  "home.what_is": homeWhatIs,
  "home.two_paths": homeTwoPaths,
  "home.journey_words": homeJourneyWords,
  "home.life_inside": homeLifeInside,
  "home.journeys": homeJourneys,
  "home.ideas": homeIdeas,
  "home.find_place": homeFindPlace,
  page_hero: pageHero,
  rich_text: richText,
  split_feature: splitFeature,
  steps,
  relationship,
  pathways,
  reality,
  faq,
  leadership,
  gallery,
  card_grid: cardGrid,
  comparison_table: comparisonTable,
  cta_band: ctaBand,
  listing_intro: listingIntro,
  legal,
  join_form: joinForm,
  contact_form: contactForm,
} as const;

export type SectionKey = keyof typeof SECTION_SCHEMAS;
export type SectionContent<K extends SectionKey> = z.output<(typeof SECTION_SCHEMAS)[K]>;

export const SECTION_LABELS: Record<SectionKey, string> = {
  "home.hero": "01 Hero video",
  "home.marquee": "Intro marquee",
  "home.what_is": "02 What Springvilla is",
  "home.two_paths": "03 Two paths, one environment",
  "home.journey_words": "Journey word sequence",
  "home.life_inside": "04 Life inside Springvilla",
  "home.journeys": "05 Real journeys",
  "home.ideas": "06 Ideas and happenings",
  "home.find_place": "07 Find your place",
  page_hero: "Page hero",
  rich_text: "Rich text",
  split_feature: "Text and image",
  steps: "Steps / pipeline",
  relationship: "Relationship graphic",
  pathways: "Pathway cards",
  reality: "Reality & Responsibility",
  faq: "FAQ",
  leadership: "Leadership",
  gallery: "Photo gallery",
  card_grid: "Card grid",
  comparison_table: "Comparison table",
  cta_band: "Call to action",
  listing_intro: "Listing intro",
  legal: "Legal text",
  join_form: "Join form",
  contact_form: "Contact form",
};

export function isSectionKey(k: string): k is SectionKey {
  return k in SECTION_SCHEMAS;
}

/** Parse stored JSON into a section's typed content; falls back to defaults on bad data. */
export function parseSection<K extends SectionKey>(key: K, raw: unknown): SectionContent<K> {
  const schema = SECTION_SCHEMAS[key];
  const r = schema.safeParse(raw ?? {});
  if (r.success) return r.data as SectionContent<K>;
  return schema.parse({}) as SectionContent<K>;
}

const UUID_RE = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
/** Every media id referenced anywhere in a content object. */
export function collectMediaIds(value: unknown, out = new Set<string>()): Set<string> {
  if (typeof value === "string") {
    if (UUID_RE.test(value)) out.add(value);
  } else if (Array.isArray(value)) value.forEach((v) => collectMediaIds(v, out));
  else if (value && typeof value === "object") Object.values(value).forEach((v) => collectMediaIds(v, out));
  return out;
}
