/**
 * Structural page copy. This is what `npm run seed` writes to Supabase and what
 * the site renders when no database is configured.
 *
 * Source: the owner's build brief + CLAUDE.md language rules. Blueprint-only copy
 * (sections 7, 9, 11.2, 12, 24) is NOT invented: those fields are left empty or
 * hold neutral structural wording to be replaced from the admin. Facts marked
 * TO VERIFY in the blueprint are always empty here.
 */
import type { PaletteLayer } from "@/components/ui/Section";
import type { SectionKey } from "@/lib/content/schemas";

export type DefaultSection = { key: SectionKey; layer: PaletteLayer; content: Record<string, unknown>; visible?: boolean };
export type DefaultPage = { key: string; route: string; title: string; seoTitle: string; seoDescription: string; sections: DefaultSection[] };

const NO_GUARANTEE =
  "Springvilla does not guarantee income, employment, promotion or any other outcome. Progress depends on your own consistent effort.";

const FOUNDATION = "Communication, discipline, personal development, relationships and accountability strengthen both paths.";

const pathCards = [
  {
    label: "Path 01",
    title: "Digital Skills & Freelancing",
    body: "Learn practical digital skills, practise them on real projects and learn how to find clients and deliver services well.",
    image: null,
    layer: "signal",
    href: "/our-system/digital-skills",
  },
  {
    label: "Path 02",
    title: "Network Marketing & Business",
    body: "Learn products, how to explain them accurately, follow up respectfully, serve customers and support a team. NeoLife is the business vehicle on this path.",
    image: null,
    layer: "canopy",
    href: "/our-system/business",
  },
];

export const DEFAULT_PAGES: DefaultPage[] = [
  {
    key: "home",
    route: "/",
    title: "Home",
    seoTitle: "Springvilla: where growth begins",
    seoDescription:
      "Springvilla is an organisation within FHG where people learn, practise and grow through two paths: digital skills and freelancing, and network marketing and business.",
    sections: [
      {
        key: "home.hero",
        layer: "canopy",
        content: {
          eyebrow: "Springvilla / Where growth begins",
          headline: "There's more in you.\nLet's grow it.",
          highlight: "grow",
          body: "A community where people learn practical skills, practise them together and build steady, honest progress.",
          primaryCta: { label: "Explore Springvilla", href: "#what-is" },
          secondaryCta: { label: "Find an Office", href: "/offices" },
          overlay: 45,
          allowMobileVideo: false,
          badge: "Scroll · Discover · Grow ·",
        },
      },
      {
        key: "home.marquee",
        layer: "canopy",
        content: {
          rowOne: ["Learn.", "Practise.", "Build.", "Grow."],
          rowTwo: ["Orient", "Learn", "Practise", "Apply", "Reflect"],
        },
      },
      {
        key: "home.what_is",
        layer: "sand",
        content: {
          anchor: "what-is",
          eyebrow: "What Springvilla is",
          heading: "More than a place to learn.",
          highlight: "learn",
          body: "Springvilla is an organisation within FHG. It brings people together to learn useful skills, practise them in a supportive environment and apply them with honesty and care.",
          nodesHeading: "How it fits together",
          nodes: [
            { title: "FHG", body: "The wider group Springvilla belongs to." },
            { title: "Springvilla", body: "An organisation within FHG: the learning and growth environment." },
            { title: "NeoLife", body: "The business vehicle used on the network-marketing path. Not a Springvilla product." },
          ],
          cta: { label: "Discover our story", href: "/discover" },
        },
      },
      {
        key: "home.two_paths",
        layer: "canopy",
        content: {
          anchor: "two-paths",
          eyebrow: "Two paths, one environment",
          heading: "Two paths.\nOne place to grow.",
          highlight: "grow",
          intro: "People choose the path that suits them. Some walk both. The environment, the habits and the support are shared.",
          cards: pathCards,
          bridge: FOUNDATION,
          comparisonHeading: "How the two paths compare",
          leftLabel: "Digital",
          rightLabel: "Business",
          rows: [
            { left: "Learn skills", right: "Learn products" },
            { left: "Find clients", right: "Find customers" },
            { left: "Deliver services", right: "Serve and lead a team" },
          ],
          disclaimer: NO_GUARANTEE,
          cta: { label: "See how the system works", href: "/our-system" },
        },
      },
      {
        key: "home.journey_words",
        layer: "canopy",
        content: {
          words: ["Orient.", "Learn.", "Practise.", "Apply.", "Grow."],
          caption: "Every journey at Springvilla moves through the same five steps.",
        },
      },
      {
        key: "home.life_inside",
        layer: "milky",
        content: {
          anchor: "life-inside",
          eyebrow: "Life inside Springvilla",
          heading: "Growth is something\nwe practise together.",
          highlight: "together",
          body: "Training sessions, peer collaboration, business activity, digital project work and public speaking all happen side by side.",
          tiles: [],
          chips: ["Training", "Peer collaboration", "Business activities", "Digital project work", "Public speaking", "Office experiences", "Welfare"],
          cta: { label: "Experience life here", href: "/life-here" },
          dayHeading: "A day at Springvilla",
          dayChapters: [],
        },
      },
      {
        key: "home.journeys",
        layer: "sand",
        content: {
          eyebrow: "Real journeys",
          heading: "Progress looks different\nfor everyone.",
          highlight: "different",
          body: "Every story shared here is real, verified and told with the person's consent.",
          emptyText:
            "We only share journeys that are verified and shared with consent. As members choose to tell their stories, they will appear here.",
          limit: 3,
          cta: { label: "Read more journeys", href: "/journeys" },
        },
      },
      {
        key: "home.ideas",
        layer: "milky",
        content: {
          eyebrow: "Ideas and happenings",
          heading: "Keep learning.\nKeep connected.",
          highlight: "connected",
          body: "Articles, news and upcoming events from across Springvilla.",
          showOfficeUpdate: true,
          emptyText: "New articles and events will appear here soon.",
          cta: { label: "Explore Stories & Ideas", href: "/stories-and-ideas" },
        },
      },
      {
        key: "home.find_place",
        layer: "canopy",
        content: {
          eyebrow: "Find your place",
          heading: "Your next step can start\nclose to home.",
          highlight: "home",
          body: "Search for an office near you, visit, ask questions and decide at your own pace.",
          previewHeading: "What applying looks like",
          previewSteps: ["Tell us a little about yourself", "Choose an office and a path you're curious about", "Someone from that office gets in touch"],
          enquiryNote: "Sending an enquiry is not automatic membership. It starts a conversation.",
          primaryCta: { label: "Find an Office", href: "/offices" },
          secondaryCta: { label: "Join Springvilla", href: "/join" },
        },
      },
    ],
  },
  {
    key: "discover",
    route: "/discover",
    title: "Discover",
    seoTitle: "Discover Springvilla",
    seoDescription: "Who Springvilla is, how it relates to FHG and how people grow here.",
    sections: [
      { key: "page_hero", layer: "canopy", content: { eyebrow: "Discover", heading: "An organisation built\naround growth.", highlight: "growth", body: "Springvilla is an organisation within FHG. Here is who we are, how we work and what you can expect.", variant: "image" } },
      { key: "split_feature", layer: "milky", content: { anchor: "who-we-are", navLabel: "Who we are", eyebrow: "Who we are", heading: "A place to learn,\npractise and grow.", highlight: "practise", body: "", imageSide: "right" } },
      { key: "relationship", layer: "sand", content: { anchor: "fhg", navLabel: "FHG & Springvilla", eyebrow: "How we fit", heading: "Springvilla within FHG", highlight: "within", intro: "Springvilla is an organisation within FHG. It is not FHG and it does not own FHG.", nodes: [{ title: "FHG", caption: "The wider group." }, { title: "Springvilla", caption: "An organisation within FHG." }, { title: "2-in-1 system", caption: "Two growth paths in one environment." }] } },
      { key: "pathways", layer: "milky", content: { anchor: "paths", navLabel: "Two paths", eyebrow: "What you can do here", heading: "Two paths, one environment", highlight: "one", cards: pathCards, disclaimer: NO_GUARANTEE } },
      { key: "steps", layer: "canopy", content: { anchor: "how", navLabel: "How it works", eyebrow: "How people engage", heading: "Orient, learn, practise,\napply, reflect.", highlight: "practise", style: "numbered", items: [
        { title: "Orient", body: "Understand the environment, the paths and what is expected." },
        { title: "Learn", body: "Build knowledge through training and guided study." },
        { title: "Practise", body: "Try what you have learned with peers, safely." },
        { title: "Apply", body: "Use your skills with real clients, customers or projects." },
        { title: "Reflect", body: "Review what worked, ask for feedback and set the next step." },
      ] } },
      { key: "reality", layer: "sand", content: { anchor: "reality", navLabel: "Reality", eyebrow: "Reality & Responsibility", heading: "Honest about what\ngrowth takes.", highlight: "honest", body: NO_GUARANTEE, points: ["Results depend on your own consistent effort.", "We describe products and opportunities accurately.", "You can ask questions and take your time before committing."] } },
      { key: "leadership", layer: "milky", content: { anchor: "leadership", navLabel: "Leadership", eyebrow: "Leadership", heading: "The people who lead", highlight: "lead", people: [] } },
      { key: "faq", layer: "milky", content: { anchor: "faq", navLabel: "FAQ", eyebrow: "Questions", heading: "Frequently asked questions", highlight: "", items: [
        { question: "Is Springvilla the same as FHG?", answer: "No. Springvilla is an organisation within FHG." },
        { question: "Is NeoLife a Springvilla product?", answer: "No. NeoLife is the business vehicle used on the network-marketing and business path." },
        { question: "Will I earn money by joining?", answer: NO_GUARANTEE },
        { question: "Does sending an enquiry make me a member?", answer: "No. An enquiry starts a conversation with an office. Membership is a separate step." },
      ] } },
      { key: "cta_band", layer: "canopy", content: { heading: "Ready to take a first step?", highlight: "first", body: "Find an office near you or tell us a little about yourself.", primaryCta: { label: "Join Springvilla", href: "/join" }, secondaryCta: { label: "Find an Office", href: "/offices" } } },
    ],
  },
  {
    key: "our-system",
    route: "/our-system",
    title: "Our System",
    seoTitle: "Our System",
    seoDescription: "How Springvilla's 2-in-1 growth system works: two pathways built on one shared foundation.",
    sections: [
      { key: "page_hero", layer: "canopy", content: { eyebrow: "Our System", heading: "Two pathways.\nOne shared foundation.", highlight: "foundation", body: "How learning, practice and support fit together at Springvilla.", variant: "typographic" } },
      { key: "relationship", layer: "sand", content: { eyebrow: "The relationship", heading: "From FHG to the 2-in-1 system", highlight: "2-in-1", intro: "Springvilla is an organisation within FHG. Inside Springvilla, people grow through a 2-in-1 system.", nodes: [{ title: "FHG", caption: "The wider group." }, { title: "Springvilla", caption: "An organisation within FHG." }, { title: "2-in-1", caption: "Digital skills and business, side by side." }] } },
      { key: "pathways", layer: "milky", content: { eyebrow: "The two pathways", heading: "Choose a path.\nOr walk both.", highlight: "both", cards: pathCards, disclaimer: NO_GUARANTEE } },
      { key: "steps", layer: "milky", content: { eyebrow: "The business pipeline", heading: "How the business path works", highlight: "works", style: "pipeline", items: [
        { title: "Learn the product", body: "Understand what it is, who it is for and what it is not." },
        { title: "Connect", body: "Build genuine relationships." },
        { title: "Explain accurately", body: "Describe products and the opportunity honestly, without exaggeration." },
        { title: "Follow up respectfully", body: "Check in without pressure." },
        { title: "Serve", body: "Look after customers well." },
        { title: "Support new members", body: "Help newer people learn the same habits." },
      ] } },
      { key: "split_feature", layer: "canopy", content: { eyebrow: "The shared foundation", heading: "What strengthens\nboth paths", highlight: "both", body: FOUNDATION, bullets: ["Communication", "Discipline", "Personal development", "Relationships", "Accountability"], imageSide: "left" } },
      { key: "steps", layer: "sand", content: { eyebrow: "How people engage", heading: "Orient, learn, practise, apply, reflect", highlight: "", style: "timeline", items: [
        { title: "Orient", body: "Understand the environment and the paths." },
        { title: "Learn", body: "Training and guided study." },
        { title: "Practise", body: "Try it with peers." },
        { title: "Apply", body: "Real clients, customers and projects." },
        { title: "Reflect", body: "Review, get feedback, set the next step." },
      ] } },
      { key: "reality", layer: "milky", content: { eyebrow: "Reality & Responsibility", heading: "No shortcuts.\nNo guarantees.", highlight: "guarantees", body: NO_GUARANTEE, points: ["Your progress depends on your effort and consistency.", "We never promise income, jobs, promotion or health outcomes.", "Ask questions. Take your time. Decide for yourself."] } },
    ],
  },
  {
    key: "digital-skills",
    route: "/our-system/digital-skills",
    title: "Digital Skills & Freelancing",
    seoTitle: "Digital Skills & Freelancing",
    seoDescription: "The digital skills and freelancing path at Springvilla.",
    sections: [
      { key: "page_hero", layer: "signal", content: { eyebrow: "Path 01", heading: "Digital Skills\n& Freelancing", highlight: "Freelancing", body: "Learn skills, find clients, deliver services.", variant: "split" } },
      { key: "steps", layer: "milky", content: { eyebrow: "How the path works", heading: "Learn. Find clients. Deliver.", highlight: "Deliver", style: "numbered", items: [
        { title: "Learn skills", body: "Build practical, in-demand digital skills." },
        { title: "Find clients", body: "Learn how to present your work and find people who need it." },
        { title: "Deliver services", body: "Do the work well, on time and with good communication." },
      ] } },
      { key: "reality", layer: "sand", content: { eyebrow: "Reality & Responsibility", heading: "What to expect", highlight: "expect", body: NO_GUARANTEE, points: [] } },
      { key: "cta_band", layer: "signal", content: { heading: "Curious about the digital path?", highlight: "digital", primaryCta: { label: "Join Springvilla", href: "/join" }, secondaryCta: { label: "Find an Office", href: "/offices" } } },
    ],
  },
  {
    key: "business",
    route: "/our-system/business",
    title: "Network Marketing & Business",
    seoTitle: "Network Marketing & Business",
    seoDescription: "The network marketing and business path at Springvilla, where NeoLife is the business vehicle.",
    sections: [
      { key: "page_hero", layer: "canopy", content: { eyebrow: "Path 02", heading: "Network Marketing\n& Business", highlight: "Business", body: "Learn products, find customers, serve and lead a team. NeoLife is the business vehicle on this path; it is not a Springvilla product.", variant: "split" } },
      { key: "steps", layer: "milky", content: { eyebrow: "The business pipeline", heading: "Step by step", highlight: "step", style: "pipeline", items: [
        { title: "Learn the product", body: "" },
        { title: "Connect", body: "" },
        { title: "Explain accurately", body: "" },
        { title: "Follow up respectfully", body: "" },
        { title: "Serve", body: "" },
        { title: "Support new members", body: "" },
      ] } },
      { key: "reality", layer: "sand", content: { eyebrow: "Reality & Responsibility", heading: "Honest by design", highlight: "honest", body: NO_GUARANTEE, points: ["No guaranteed income.", "No health claims about products.", "No pressure to buy or recruit."] } },
      { key: "cta_band", layer: "canopy", content: { heading: "Want to understand the business path?", highlight: "understand", primaryCta: { label: "Join Springvilla", href: "/join" }, secondaryCta: { label: "Find an Office", href: "/offices" } } },
    ],
  },
  {
    key: "life-here",
    route: "/life-here",
    title: "Life Here",
    seoTitle: "Life at Springvilla",
    seoDescription: "What day-to-day life inside Springvilla looks like.",
    sections: [
      { key: "page_hero", layer: "canopy", content: { eyebrow: "Life Here", heading: "Growth is something\nwe practise together.", highlight: "together", body: "", variant: "image" } },
      { key: "card_grid", layer: "milky", content: { eyebrow: "Experiences", heading: "What happens here", highlight: "here", cards: [
        { title: "Training", body: "", href: "" },
        { title: "Peer collaboration", body: "", href: "" },
        { title: "Business activities", body: "", href: "" },
        { title: "Digital project work", body: "", href: "" },
        { title: "Public speaking", body: "", href: "" },
        { title: "Welfare", body: "", href: "" },
      ] } },
      { key: "gallery", layer: "sand", content: { eyebrow: "Gallery", heading: "Moments from inside", highlight: "inside", images: [] } },
      { key: "cta_band", layer: "canopy", content: { heading: "See it for yourself", highlight: "yourself", primaryCta: { label: "Find an Office", href: "/offices" }, secondaryCta: { label: "Join Springvilla", href: "/join" } } },
    ],
  },
  listingPage("stories-and-ideas", "/stories-and-ideas", "Stories & Ideas", "Ideas, journeys, news and events from Springvilla.", { eyebrow: "Stories & Ideas", heading: "Keep learning.\nKeep connected.", highlight: "connected", body: "Articles, real member journeys, news and events.", emptyText: "" }),
  listingPage("ideas", "/ideas", "Ideas", "Articles on learning, skills, business and personal growth.", { eyebrow: "Ideas", heading: "Ideas worth practising", highlight: "practising", body: "", emptyText: "No articles have been published yet." }),
  listingPage("journeys", "/journeys", "Journeys", "Real, verified member journeys, shared with consent.", { eyebrow: "Journeys", heading: "Progress looks different\nfor everyone.", highlight: "different", body: "Every journey here is verified and shared with the person's consent.", emptyText: "We only share journeys that are verified and shared with consent. None have been published yet." }),
  listingPage("news", "/news", "News", "News from Springvilla.", { eyebrow: "News", heading: "News", highlight: "", body: "", emptyText: "No news has been published yet." }),
  listingPage("events", "/events", "Events", "Upcoming Springvilla events.", { eyebrow: "Events", heading: "What's coming up", highlight: "up", body: "", emptyText: "No upcoming events right now. Check back soon." }),
  listingPage("offices", "/offices", "Find an Office", "Find a Springvilla office near you.", { eyebrow: "Find an Office", heading: "Your next step can start\nclose to home.", highlight: "home", body: "Search by city or state.", emptyText: "Office details are being verified and will appear here soon. You can still send an enquiry." }),
  {
    key: "join",
    route: "/join",
    title: "Join Springvilla",
    seoTitle: "Join Springvilla",
    seoDescription: "Tell us a little about yourself and an office near you will get in touch.",
    sections: [
      { key: "page_hero", layer: "canopy", content: { eyebrow: "Join Springvilla", heading: "Start a conversation.", highlight: "conversation", body: "Tell us a little about yourself. Someone from your chosen office will get in touch.", variant: "typographic" } },
      { key: "steps", layer: "milky", content: { eyebrow: "What happens next", heading: "What to expect", highlight: "expect", style: "numbered", items: [
        { title: "You send this form", body: "It takes about three minutes." },
        { title: "An office gets in touch", body: "By your preferred contact method." },
        { title: "You visit and ask questions", body: "There is no obligation." },
        { title: "You decide", body: "In your own time." },
      ] } },
      { key: "join_form", layer: "sand", content: { anchor: "apply", eyebrow: "Your details", heading: "Tell us about yourself", highlight: "", intro: "Fields marked * are required.", enquiryNote: "Sending this form is not automatic membership. It starts a conversation with an office.", successHeading: "Thank you. We've received your details.", successBody: "Someone from your chosen office will contact you. If you don't hear back within a week, use the contact page.", privacyLabel: "I agree that Springvilla can store these details to respond to my application, as described in the privacy policy.", contactLabel: "I'm happy to be contacted about my application." } },
      { key: "reality", layer: "milky", content: { eyebrow: "Before you apply", heading: "Good to know", highlight: "", body: NO_GUARANTEE, points: [] } },
    ],
  },
  {
    key: "contact",
    route: "/contact",
    title: "Contact",
    seoTitle: "Contact Springvilla",
    seoDescription: "Send an enquiry to the right Springvilla team.",
    sections: [
      { key: "contact_form", layer: "milky", content: { eyebrow: "Contact", heading: "How can we help?", highlight: "help", intro: "Choose what your enquiry is about so it reaches the right team.", types: [
        { value: "general", label: "General question", description: "Anything about Springvilla." },
        { value: "office_visit", label: "Visiting an office", description: "Arrange or ask about a visit." },
        { value: "member_support", label: "Member support", description: "Help for existing members." },
        { value: "partnership", label: "Partnership", description: "Organisations wanting to work with us." },
        { value: "media", label: "Media", description: "Press and interview requests." },
        { value: "feedback", label: "Feedback or concern", description: "Tell us what we could do better." },
      ], successHeading: "Thanks, your message is on its way.", successBody: "The right team will reply as soon as they can." } },
    ],
  },
  {
    key: "faq",
    route: "/faq",
    title: "FAQ",
    seoTitle: "Frequently asked questions",
    seoDescription: "Answers to common questions about Springvilla.",
    sections: [
      { key: "page_hero", layer: "canopy", content: { eyebrow: "FAQ", heading: "Questions, answered.", highlight: "answered", variant: "typographic" } },
      { key: "faq", layer: "milky", content: { heading: "", items: [
        { question: "Is Springvilla the same as FHG?", answer: "No. Springvilla is an organisation within FHG." },
        { question: "Is NeoLife a Springvilla product?", answer: "No. NeoLife is the business vehicle used on the network-marketing and business path." },
        { question: "Will I earn money by joining?", answer: NO_GUARANTEE },
        { question: "Does sending an enquiry make me a member?", answer: "No. An enquiry starts a conversation with an office. Membership is a separate step." },
      ] } },
    ],
  },
  legalPage("privacy", "/privacy", "Privacy policy"),
  legalPage("terms", "/terms", "Terms of use"),
];

function listingPage(key: string, route: string, title: string, desc: string, intro: Record<string, unknown>): DefaultPage {
  return { key, route, title, seoTitle: title, seoDescription: desc, sections: [{ key: "listing_intro", layer: "canopy", content: intro }] };
}

function legalPage(key: string, route: string, title: string): DefaultPage {
  return {
    key,
    route,
    title,
    seoTitle: title,
    seoDescription: `Springvilla ${title.toLowerCase()}.`,
    sections: [
      {
        key: "legal",
        layer: "milky",
        content: {
          heading: title,
          html: "<p>This document is being prepared and will be published after legal review.</p>",
          pendingReview: true,
          lastUpdated: "",
        },
      },
    ],
  };
}

export const DEFAULT_SETTINGS = {
  site_name: "Springvilla",
  tagline: "Where growth begins",
  default_seo_title: "Springvilla",
  default_seo_description: DEFAULT_PAGES[0].seoDescription,
  cookie_banner_text:
    "We'd like to measure how the site is used so we can improve it. We never sell data or use advertising trackers.",
  footer: {
    closing_statement: "There's more in you.\nLet's grow it.",
    highlight: "grow",
    disclaimers: [
      "Springvilla is an organisation within FHG.",
      "NeoLife is the business vehicle used on the network-marketing path and is not a Springvilla product.",
      NO_GUARANTEE,
    ],
    legal_name: "",
  },
};

export const DEFAULT_NAV = {
  header: [
    { label: "Discover", href: "/discover" },
    { label: "Our System", href: "/our-system" },
    { label: "Life Here", href: "/life-here" },
    { label: "Stories & Ideas", href: "/stories-and-ideas" },
    { label: "Find an Office", href: "/offices" },
  ],
  footer: [
    { group: "Explore", label: "Discover", href: "/discover" },
    { group: "Explore", label: "Our System", href: "/our-system" },
    { group: "Explore", label: "Life Here", href: "/life-here" },
    { group: "Explore", label: "Stories & Ideas", href: "/stories-and-ideas" },
    { group: "Take part", label: "Find an Office", href: "/offices" },
    { group: "Take part", label: "Join Springvilla", href: "/join" },
    { group: "Take part", label: "Events", href: "/events" },
    { group: "Take part", label: "Contact", href: "/contact" },
    { group: "Read", label: "Ideas", href: "/ideas" },
    { group: "Read", label: "Journeys", href: "/journeys" },
    { group: "Read", label: "News", href: "/news" },
    { group: "Read", label: "FAQ", href: "/faq" },
  ],
  legal: [
    { label: "Privacy", href: "/privacy" },
    { label: "Terms", href: "/terms" },
  ],
};
