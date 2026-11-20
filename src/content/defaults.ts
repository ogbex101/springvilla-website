/**
 * Structural page copy, aligned to the Springvilla Master Website Blueprint v1.0
 * (docs/Springvilla_Master_Website_Blueprint_v1.pdf). `npm run seed` writes this
 * to Supabase; the site renders it when no database is configured.
 *
 * The blueprint marks its copy as DRAFT FOR APPROVAL (§6, §24). Facts marked
 * TO VERIFY (§2, §23) are never invented: they stay empty, or an answer says
 * plainly that the detail is pending.
 *
 * Bump SEED_VERSION whenever this copy changes. The seed only replaces pages
 * whose sections are still exactly as previously seeded (admin edits are kept).
 */
import type { PaletteLayer } from "@/components/ui/Section";
import type { SectionKey } from "@/lib/content/schemas";

export const SEED_VERSION = "2026-11-21.blueprint-v1";

export type DefaultSection = { key: SectionKey; layer: PaletteLayer; content: Record<string, unknown>; visible?: boolean };
export type DefaultPage = { key: string; route: string; title: string; seoTitle: string; seoDescription: string; sections: DefaultSection[] };

/* ------------------------------------------------------------------ shared wording */
const DEFINITION =
  "Springvilla is an organisation within FHG that operates offices and development communities, bringing people together to learn, practise and grow through a 2-in-1 system.";
const NO_GUARANTEE =
  "Participation never guarantees income, work, a promotion or any other result. Skill and business results are individual and uncertain, and they take work.";
const REASSURANCE = "Submitting an enquiry is a first step to receiving information, not a guarantee of membership, employment or earnings.";
const BRIDGE = "Communication, discipline, personal development, relationships and accountability strengthen both paths.";
const PENDING_POLICY = "This information is being confirmed by Springvilla leadership and will be published here. Until then, please ask the office you're interested in before applying.";

const pathCards = [
  {
    label: "Path A",
    title: "Digital Skills & Freelancing",
    body: "Develop useful digital skills, learn to deliver work professionally and explore client-facing opportunities.",
    image: null,
    layer: "signal",
    href: "/our-system/digital-skills",
  },
  {
    label: "Path B",
    title: "Network Marketing & Business",
    body: "Learn product education, customer acquisition, communication, follow-up, teamwork and leadership through a real business model.",
    image: null,
    layer: "canopy",
    href: "/our-system/business",
  },
];

const ENGAGE = [
  { title: "Orient", body: "Understand the environment, the two pathways and what is expected of members." },
  { title: "Learn", body: "Build knowledge through training sessions and guided study." },
  { title: "Practise", body: "Try what you've learned with peers: presentations, projects and conversations." },
  { title: "Apply", body: "Use your skills with real projects, clients or customers." },
  { title: "Reflect and grow", body: "Review what worked, ask for feedback and choose your next step." },
];

/** §7 high-priority FAQ topics. Policy-dependent answers say so honestly. */
const FAQ_ITEMS = [
  { question: "What is Springvilla? How does it relate to FHG?", answer: `${DEFINITION} FHG is the wider growth and training environment. Springvilla is not FHG, and it does not own FHG.` },
  { question: "What actually happens in an office?", answer: "Offices are places to practise: training sessions, peer collaboration, business activities, digital project work, public-speaking practice, office experiences, and social and welfare support. Activities vary by office; each office page lists what that office offers once it has been verified." },
  { question: "Is Springvilla only for students?", answer: "No. Members include students and people who are working, each managing growth alongside their other responsibilities. Eligibility details are being confirmed and will be published on the Join page." },
  { question: "What is the 2-in-1 system?", answer: `Two complementary paths in one environment: Digital Skills & Freelancing, and Network Marketing & Business. ${BRIDGE}` },
  { question: "Is it only network marketing?", answer: "No. Network marketing and business is one of the two paths. The other is digital skills and freelancing. Members can focus on one path or explore both." },
  { question: "Is NeoLife owned by Springvilla?", answer: "No. NeoLife is the company and business vehicle used in the network-marketing pathway. Springvilla does not own NeoLife or manufacture its products." },
  { question: "Can I visit before applying?", answer: "Visiting arrangements differ by office. Each verified office page explains whether you need an appointment; you can also ask an office directly using the contact page." },
  { question: "Are there costs, purchases, time commitments or eligibility requirements?", answer: PENDING_POLICY },
  { question: "What happens after an application?", answer: "An office representative contacts you, or sends approved next-step instructions, using the contact method you chose. Applying is not a promise of acceptance." },
  { question: "Do I need previous digital or business experience?", answer: PENDING_POLICY },
  { question: "Does participation guarantee income, work or a promotion?", answer: `No. ${NO_GUARANTEE} Any example we share is one person's experience, not a typical result.` },
];

export const DEFAULT_PAGES: DefaultPage[] = [
  /* ================================================================ HOME (§6) */
  {
    key: "home",
    route: "/",
    title: "Home",
    seoTitle: "Springvilla: where growth begins",
    seoDescription: DEFINITION,
    sections: [
      {
        key: "home.hero",
        layer: "canopy",
        content: {
          eyebrow: "Springvilla / Where growth begins",
          headline: "There's more in you.\nLet's grow it.",
          highlight: "grow",
          body: "Discover an environment built around practical skills, business development, personal growth and people who believe progress is something you work toward together.",
          primaryCta: { label: "Explore Springvilla", href: "#what-is" },
          secondaryCta: { label: "Find an Office", href: "/offices" },
          overlay: 45,
          allowMobileVideo: false,
          badge: "Scroll · Discover · Grow ·",
        },
      },
      { key: "home.marquee", layer: "canopy", content: { rowOne: ["Learn.", "Practise.", "Build.", "Grow."], rowTwo: ["Orient", "Learn", "Practise", "Apply", "Reflect"] } },
      {
        key: "home.what_is",
        layer: "sand",
        content: {
          anchor: "what-is",
          eyebrow: "What Springvilla is",
          heading: "More than a place to learn.",
          highlight: "learn",
          body: "Springvilla is an organisation within FHG that operates offices and development communities. Here, members learn practical digital and business skills, develop confidence, build relationships and practise the discipline of personal and professional growth.",
          nodesHeading: "How it fits together",
          nodes: [
            { title: "FHG", body: "The wider growth and training environment." },
            { title: "Springvilla", body: "Offices and communities within FHG." },
            { title: "NeoLife", body: "The business vehicle used in the network-marketing pathway." },
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
          heading: "Two paths. One environment.\nRoom to grow.",
          highlight: "grow",
          intro: "Digital skills and freelancing, and network marketing and business, are two complementary paths, not competing brands.",
          cards: pathCards,
          bridge: BRIDGE,
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
      { key: "home.journey_words", layer: "canopy", content: { words: ["Orient.", "Learn.", "Practise.", "Apply.", "Grow."], caption: "Every member's journey moves through the same steps: orient, learn, practise, apply, reflect and grow." } },
      {
        key: "home.life_inside",
        layer: "milky",
        content: {
          anchor: "life-inside",
          eyebrow: "Life inside Springvilla",
          heading: "Growth is something\nwe practise together.",
          highlight: "together",
          body: "An office can be more than desks and meetings. It can be a place to practise presenting, learn new skills, work on projects, ask better questions, build friendships and take responsibility for progress.",
          tiles: [],
          chips: ["Training", "Peer collaboration", "Business activities", "Digital project work", "Public speaking", "Office experiences", "Social and welfare support"],
          cta: { label: "Experience life here", href: "/life-here" },
          dayHeading: "A day at Springvilla",
          dayKind: "illustrative",
          dayDate: "",
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
          body: "A first presentation. A first completed project. A new responsibility. A skill finally put to use. We tell the real stories behind meaningful steps forward.",
          emptyText: "We only share journeys that are verified and told with the person's consent. As members choose to share their stories, they will appear here.",
          limit: 3,
          cta: { label: "Read member journeys", href: "/journeys" },
        },
      },
      {
        key: "home.ideas",
        layer: "milky",
        content: {
          eyebrow: "Ideas and happenings",
          heading: "Keep learning.\nKeep connected.",
          highlight: "connected",
          body: "Articles, member journeys, news and upcoming events from across Springvilla.",
          showOfficeUpdate: true,
          emptyText: "Our first articles and events are being prepared. In the meantime, explore how the 2-in-1 system works or find an office near you.",
          cta: { label: "Explore stories & ideas", href: "/stories-and-ideas" },
        },
      },
      {
        key: "home.find_place",
        layer: "canopy",
        content: {
          eyebrow: "Find your place",
          heading: "Your next step can start\nclose to home.",
          highlight: "home",
          body: "Explore official Springvilla offices and development communities, find contact information and learn what to expect before visiting.",
          previewHeading: "What applying looks like",
          previewSteps: ["Tell us a little about yourself", "Choose an office, or ask us to help you find one", "Receive next steps by your preferred contact method"],
          enquiryNote: REASSURANCE,
          primaryCta: { label: "Find an Office", href: "/offices" },
          secondaryCta: { label: "Join Springvilla", href: "/join" },
        },
      },
    ],
  },

  /* ================================================================ DISCOVER (§7: 9-part sequence) */
  {
    key: "discover",
    route: "/discover",
    title: "Discover",
    seoTitle: "Discover Springvilla",
    seoDescription: "Who Springvilla is, its place within FHG, how its offices work and the commitments behind it.",
    sections: [
      // 1. Opening statement
      { key: "page_hero", layer: "canopy", content: { eyebrow: "Discover", heading: "A place for people committed\nto becoming more capable.", highlight: "capable", body: "We believe growth is easier to pursue when people have a place to practise, ask questions, develop skills and move forward together. Springvilla brings that idea to life through development communities within FHG.", variant: "image" } },
      // 2. Official definition + place within FHG
      { key: "relationship", layer: "sand", content: { anchor: "who-we-are", navLabel: "Who we are", eyebrow: "Who we are", heading: "An organisation within FHG", highlight: "within", intro: DEFINITION, nodes: [{ title: "FHG", caption: "The wider growth and training environment." }, { title: "Springvilla", caption: "Offices and development communities within FHG." }, { title: "2-in-1 system", caption: "Digital skills and business, side by side." }], note: "Springvilla is an organisation within FHG. It is not FHG, it does not own FHG, and it does not operate all FHG activities." } },
      // 3. Why the organisation exists (draft, pending leadership approval)
      { key: "split_feature", layer: "milky", content: { anchor: "why", navLabel: "Why we exist", eyebrow: "Why Springvilla exists", heading: "A deliberate environment\nfor growth.", highlight: "deliberate", body: "Springvilla exists to be a deliberate environment for learning, opportunity, responsibility and shared growth: a place where people practise the skills, habits and relationships that progress depends on.", bullets: [], imageSide: "right" } },
      // 4. Philosophy
      { key: "steps", layer: "canopy", content: { anchor: "philosophy", navLabel: "Our philosophy", eyebrow: "Our philosophy", heading: "Six ideas we build on", highlight: "build", style: "numbered", items: [
        { title: "Environment", body: "Where you practise shapes how you grow." },
        { title: "Practice", body: "Skills develop through repeated, real attempts." },
        { title: "Skill", body: "Practical, useful abilities, not just inspiration." },
        { title: "Leadership", body: "Taking responsibility and helping others grow." },
        { title: "Community", body: "People who support, challenge and learn from one another." },
        { title: "Responsibility", body: "Owning your effort, your choices and your progress." },
      ] } },
      // 5. How the offices work
      { key: "split_feature", layer: "sand", content: { anchor: "offices", navLabel: "How offices work", eyebrow: "How the offices work", heading: "Local communities,\none shared standard.", highlight: "shared", body: "Each Springvilla office is a local development community. Offices share one identity, one set of standards and one way of working, while each brings its own people, activities and local events.", bullets: [], imageSide: "left", cta: { label: "Find an Office", href: "/offices" } } },
      // 6. Culture in action
      { key: "card_grid", layer: "milky", content: { anchor: "culture", navLabel: "Culture", eyebrow: "Culture in action", heading: "What our culture looks like", highlight: "culture", cards: [
        { title: "Training", body: "Regular sessions that build practical skills and knowledge.", href: "" },
        { title: "Relationships", body: "Friendships and working relationships built through shared effort.", href: "" },
        { title: "Welfare", body: "Looking out for one another, with practical help when it's needed.", href: "" },
        { title: "Accountability", body: "Clear expectations, honest feedback and following through.", href: "" },
        { title: "Celebration", body: "Marking real milestones and the effort behind them.", href: "" },
        { title: "Member support", body: "People teaching people, and help from those further along.", href: "" },
      ] } },
      // 7. Leadership and story (verified only; hides when empty)
      { key: "leadership", layer: "sand", content: { anchor: "leadership", navLabel: "Leadership", eyebrow: "Leadership and story", heading: "The people who lead", highlight: "lead", intro: "", people: [] } },
      // 8. Ethical commitment
      { key: "reality", layer: "canopy", content: { anchor: "commitment", navLabel: "Our commitment", eyebrow: "Ethical commitment", heading: "Honest about opportunity.", highlight: "Honest", body: "We explain opportunities transparently, make no income or health promises, and reach out to people respectfully.", points: ["Transparent explanations of every opportunity, including the effort involved.", "No promises of income, work, promotion or health outcomes.", "Respectful outreach: no pressure, no fear-based recruiting, and 'no' is always an acceptable answer.", "Stories we share are individual experiences, never presented as typical."] } },
      // 9. FAQ + clear office/contact action
      { key: "faq", layer: "milky", content: { anchor: "faq", navLabel: "FAQ", eyebrow: "Questions", heading: "Frequently asked questions", highlight: "", items: FAQ_ITEMS } },
      { key: "cta_band", layer: "canopy", content: { heading: "Find an office or ask us a question.", highlight: "question", body: "Find an office near you, or send an enquiry and the right team will reply.", primaryCta: { label: "Find an Office", href: "/offices" }, secondaryCta: { label: "Contact us", href: "/contact" } } },
    ],
  },

  /* ================================================================ OUR SYSTEM (§8: 8 parts) */
  {
    key: "our-system",
    route: "/our-system",
    title: "Our System",
    seoTitle: "Our System: the Springvilla 2-in-1 model",
    seoDescription: "How FHG, Springvilla, NeoLife, digital work and network marketing fit together, explained without jargon.",
    sections: [
      // 1. Opening
      { key: "page_hero", layer: "canopy", content: { eyebrow: "Our System", heading: "Practical skills and business\nknowledge both matter.", highlight: "both", body: "Skills help you create useful work. Business knowledge helps you serve customers and build something with others. Springvilla's 2-in-1 system develops both in one environment.", variant: "typographic" } },
      // 2. Relationship graphic (NeoLife only inside the business pathway)
      { key: "relationship", layer: "sand", content: { eyebrow: "How it fits together", heading: "FHG, Springvilla and the 2-in-1 model", highlight: "2-in-1", intro: "FHG is the wider environment. Springvilla is an office and development community within it. Inside Springvilla, members grow through the 2-in-1 development model.", nodes: [{ title: "FHG", caption: "The wider growth and training environment." }, { title: "Springvilla", caption: "Office and development community." }, { title: "2-in-1 model", caption: "Digital skills + network marketing & business." }], note: "NeoLife appears only inside the business pathway, as the company and business vehicle members work with. Springvilla does not own NeoLife or manufacture its products." } },
      // 3–4. The two pathways, with convergence (§16.3)
      { key: "home.two_paths", layer: "canopy", content: { eyebrow: "The two pathways", heading: "Two paths.\nOne environment.", highlight: "One", intro: "Each path starts separately. What connects them is the personal development both require.", cards: pathCards, bridge: BRIDGE, comparisonHeading: "", leftLabel: "Digital", rightLabel: "Business", rows: [], disclaimer: NO_GUARANTEE, cta: { label: "Find an Office", href: "/offices" } } },
      { key: "steps", layer: "milky", content: { eyebrow: "Digital-skills pathway", heading: "A realistic freelancing workflow", highlight: "realistic", intro: "Learning, a portfolio, service delivery and client communication.", style: "pipeline", items: [
        { title: "Brief", body: "Understand what the client actually needs." },
        { title: "Learn", body: "Build the skill the work requires." },
        { title: "Create", body: "Produce the work to a professional standard." },
        { title: "Review", body: "Check quality and ask for feedback." },
        { title: "Deliver", body: "Hand over on time and communicate clearly." },
      ], cta: { label: "Explore the digital path", href: "/our-system/digital-skills" } } },
      { key: "steps", layer: "sand", content: { eyebrow: "Network-marketing pathway", heading: "How the business path works", highlight: "works", intro: "NeoLife handles the product-side infrastructure. Members focus on customers, retention, trust, accurate product information, ethical follow-up and leadership. This is an educational model, not a guaranteed path to earnings.", style: "pipeline", items: [
        { title: "Learn the product", body: "Understand what it is, who it helps and what it does not do." },
        { title: "Connect with interested people", body: "Build genuine relationships; never pressure people who aren't interested." },
        { title: "Explain accurately", body: "Describe products and the opportunity honestly, without exaggerated claims." },
        { title: "Follow up respectfully", body: "Check in without pressure." },
        { title: "Serve the customer", body: "Look after customers so they get real value." },
        { title: "Support new team members", body: "Help newer people learn the same responsible habits." },
      ], cta: { label: "Explore the business path", href: "/our-system/business" } } },
      // 5. Shared foundation
      { key: "split_feature", layer: "canopy", content: { eyebrow: "The shared foundation", heading: "What strengthens\nboth paths", highlight: "both", body: "Whichever path you choose, the same personal foundation makes progress possible.", bullets: ["Confidence", "Communication", "Public speaking", "Discipline", "Teamwork", "Ongoing learning"], imageSide: "left" } },
      // 6. How members engage
      { key: "steps", layer: "milky", content: { eyebrow: "How members engage", heading: "Orient, learn, practise,\napply, reflect and grow.", highlight: "practise", style: "timeline", items: ENGAGE } },
      // §8.5 important separation
      { key: "comparison_table", layer: "sand", content: { eyebrow: "Who does what", heading: "Clear roles, no confusion", highlight: "Clear", intro: "What each part is, and what it is not.", col1: "Entity", col2: "What it is", col3: "What it does not mean", rows: [
        { c1: "FHG", c2: "The wider growth environment and support/training system.", c3: "Springvilla does not own FHG or represent all FHG entities." },
        { c1: "Springvilla", c2: "An organisation within FHG running offices and development communities.", c3: "Not a university, an accredited employer or a guaranteed-income scheme." },
        { c1: "NeoLife", c2: "The company and business vehicle used in the network-marketing pathway.", c3: "Springvilla does not manufacture, control or medically endorse NeoLife products." },
        { c1: "Freelancing", c2: "Skill-based services and professional client work.", c3: "Not every participant receives clients or earnings." },
        { c1: "Network marketing", c2: "Products, customers, ethical distribution, relationship-building and leadership.", c3: "Payments are not earned merely for recruiting people." },
      ] } },
      // 7. Reality and responsibility
      { key: "reality", layer: "canopy", content: { eyebrow: "Reality and responsibility", heading: "No shortcuts.\nNo guarantees.", highlight: "guarantees", body: NO_GUARANTEE, points: ["Results depend on your own effort, circumstances, access and training.", "We never promise income, jobs, promotion or health outcomes.", "Ask questions, take your time and decide for yourself."] } },
      // 8. FAQ and next step
      { key: "faq", layer: "milky", content: { eyebrow: "Questions", heading: "Common questions", highlight: "", items: FAQ_ITEMS.filter((q) => /2-in-1|only network|NeoLife|guarantee|experience/.test(q.question)) } },
      { key: "cta_band", layer: "sand", content: { heading: "Ready for a next step?", highlight: "next", body: "Find an office, read our latest ideas, or explore joining.", primaryCta: { label: "Find an Office", href: "/offices" }, secondaryCta: { label: "Explore joining Springvilla", href: "/join" } } },
    ],
  },

  /* ================================================================ DIGITAL PATH (§8.3) */
  {
    key: "digital-skills",
    route: "/our-system/digital-skills",
    title: "Digital Skills & Freelancing",
    seoTitle: "Digital Skills & Freelancing",
    seoDescription: "Learn skills that help you create useful work, and the habits that make professional work possible.",
    sections: [
      { key: "page_hero", layer: "signal", content: { eyebrow: "Path A · Digital Skills & Freelancing", heading: "Build skills that\ncreate value.", highlight: "value", body: "Learn skills that help you create useful work. Practise communicating with clients, solving problems, delivering projects and building the habits that make professional work possible.", variant: "split" } },
      { key: "card_grid", layer: "milky", content: { eyebrow: "Areas of digital work", heading: "What you can learn", highlight: "learn", intro: "Only areas currently offered are listed. This list is being confirmed with each office.", cards: [] } },
      { key: "steps", layer: "sand", content: { eyebrow: "Project lifecycle", heading: "Brief → learn → create\n→ review → deliver", highlight: "deliver", style: "pipeline", items: [
        { title: "Brief", body: "Understand the request and agree what 'done' means." },
        { title: "Learn", body: "Close the skill gap the project reveals." },
        { title: "Create", body: "Do the work carefully and keep the client informed." },
        { title: "Review", body: "Check quality against the brief; welcome feedback." },
        { title: "Deliver", body: "Hand over professionally and reflect on what to improve." },
      ] } },
      { key: "split_feature", layer: "milky", content: { eyebrow: "Portfolio and client standards", heading: "Work you can stand behind", highlight: "stand", body: "Members build portfolios from real practice projects and learn the standards clients expect: clear communication, honest timelines and dependable delivery. Training support is available as you learn.", bullets: ["Portfolio", "Client communication", "Problem solving", "Reliable delivery", "Training support"], imageSide: "right" } },
      { key: "reality", layer: "sand", content: { eyebrow: "Boundaries", heading: "Learning first.\nNo promise of gigs.", highlight: "gigs", body: "Learning projects and paid work are kept clearly separate. Springvilla does not promise clients, gigs or earnings; finding and keeping clients depends on your skills, effort and circumstances.", points: [] } },
      { key: "cta_band", layer: "signal", content: { heading: "Curious about the digital path?", highlight: "digital", primaryCta: { label: "Explore joining Springvilla", href: "/join" }, secondaryCta: { label: "Find an Office", href: "/offices" } } },
    ],
  },

  /* ================================================================ BUSINESS PATH (§8.4) */
  {
    key: "business",
    route: "/our-system/business",
    title: "Network Marketing & Business",
    seoTitle: "Network Marketing & Business",
    seoDescription: "Understand the business behind the business: products, customers, ethical follow-up and leadership.",
    sections: [
      { key: "page_hero", layer: "canopy", content: { eyebrow: "Path B · Network Marketing & Business", heading: "Understand the business\nbehind the business.", highlight: "behind", body: "Behind every product business are the people, systems and relationships that bring real value to customers. Members learn how to understand products, communicate responsibly, support customers and develop leadership within an established business model.", variant: "split" } },
      { key: "split_feature", layer: "milky", content: { eyebrow: "Who does what", heading: "NeoLife provides the\nproduct infrastructure.", highlight: "infrastructure", body: "NeoLife handles the product side: the products and company infrastructure. Members focus on customer acquisition, retention, trust and leadership duplication: helping others learn the same responsible habits. Springvilla does not own NeoLife or manufacture its products.", bullets: ["Customers", "Retention", "Trust", "Product information", "Ethical follow-up", "Leadership"], imageSide: "right" } },
      { key: "steps", layer: "sand", content: { eyebrow: "The business pipeline", heading: "Step by step", highlight: "step", intro: "An educational model, not a guaranteed path to earnings.", style: "pipeline", items: [
        { title: "Learn the product", body: "Understand what it is, who it helps and what it does not do." },
        { title: "Connect with interested people", body: "Build genuine relationships." },
        { title: "Explain accurately", body: "Describe products honestly, without exaggerated or health claims." },
        { title: "Follow up respectfully", body: "Check in without pressure." },
        { title: "Serve the customer", body: "Make sure customers receive real value." },
        { title: "Support new team members", body: "Help newer people learn responsibly." },
      ] } },
      { key: "reality", layer: "canopy", content: { eyebrow: "What we warn against", heading: "Honest by design", highlight: "Honest", body: NO_GUARANTEE, points: ["No manipulation or 'miracle money' framing.", "No pressuring people who aren't interested.", "No ignoring genuine product value.", "No health claims about products.", "Payments are never earned merely for recruiting people."] } },
      { key: "cta_band", layer: "sand", content: { heading: "Want to understand the business path?", highlight: "understand", primaryCta: { label: "Explore joining Springvilla", href: "/join" }, secondaryCta: { label: "Find an Office", href: "/offices" } } },
    ],
  },

  /* ================================================================ LIFE HERE (§9) */
  {
    key: "life-here",
    route: "/life-here",
    title: "Life Here",
    seoTitle: "Life at Springvilla",
    seoDescription: "An authentic look at everyday Springvilla life: practice, training, speaking, leadership, community and events.",
    sections: [
      { key: "page_hero", layer: "canopy", content: { eyebrow: "Life Here", heading: "Growth is something\nwe practise together.", highlight: "together", body: "An observable look at everyday Springvilla life, told through real experiences rather than adjectives.", variant: "image" } },
      { key: "card_grid", layer: "milky", content: { eyebrow: "Experiences", heading: "What happens here", highlight: "here", cards: [
        { title: "Skills in practice", body: "Screens, project reviews, workshops and client-simulation sessions.", href: "" },
        { title: "Business training", body: "Product education, presentation practice and customer communication.", href: "" },
        { title: "Public speaking", body: "Member presentations, feedback sessions and building confidence.", href: "" },
        { title: "Leadership & teamwork", body: "Planning sessions, accountability and people teaching people.", href: "" },
        { title: "Community & welfare", body: "Peer support, mentorship, social care and practical help.", href: "" },
        { title: "Events & recognition", body: "Office activities, training events, celebrations and milestones.", href: "" },
        { title: "Learning alongside other responsibilities", body: "Students and working members managing growth around their other commitments.", href: "" },
      ] } },
      { key: "gallery", layer: "sand", content: { eyebrow: "Gallery", heading: "Moments from inside", highlight: "inside", intro: "Every photo is captioned with what actually happened, where and when.", images: [] } },
      { key: "cta_band", layer: "canopy", content: { heading: "See it for yourself", highlight: "yourself", primaryCta: { label: "Find an Office", href: "/offices" }, secondaryCta: { label: "Explore joining Springvilla", href: "/join" } } },
    ],
  },

  listingPage("stories-and-ideas", "/stories-and-ideas", "Stories & Ideas", "Ideas, verified member journeys, news and events from Springvilla.", { eyebrow: "Stories & Ideas", heading: "Keep learning.\nKeep connected.", highlight: "connected", body: "Ideas (articles), Journeys (member stories) and Community (news and events).", emptyText: "" }),
  listingPage("ideas", "/ideas", "Ideas", "Articles on business, network-marketing education, digital skills, leadership, personal development and the Springvilla community.", { eyebrow: "Ideas", heading: "Read the latest ideas", highlight: "ideas", body: "Practical articles on skills, business, leadership and personal growth.", emptyText: "No articles have been published yet." }),
  listingPage("journeys", "/journeys", "Journeys", "Verified member journeys, shared with consent.", { eyebrow: "Journeys", heading: "Progress looks different\nfor everyone.", highlight: "different", body: "Every journey here is verified and shared with the person's consent. Each is one person's experience, not a typical result.", emptyText: "We only share journeys that are verified and told with consent. None have been published yet." }),
  listingPage("news", "/news", "News", "Verified news from Springvilla and its offices.", { eyebrow: "Community", heading: "News", highlight: "", body: "", emptyText: "No news has been published yet." }),
  listingPage("events", "/events", "Events", "Upcoming Springvilla events.", { eyebrow: "Community", heading: "See upcoming events", highlight: "upcoming", body: "Times are shown in each event's own timezone.", emptyText: "No upcoming events right now. Please check back soon." }),
  listingPage("offices", "/offices", "Find an Office", "Find an official Springvilla office or development community.", { eyebrow: "Find an Office", heading: "Your next step can start\nclose to home.", highlight: "home", body: "Search by city or state. Only verified offices are listed.", emptyText: "Office details are being verified and will appear here soon. You can still send an enquiry." }),

  /* ================================================================ JOIN (§12.1: 7 parts) */
  {
    key: "join",
    route: "/join",
    title: "Join Springvilla",
    seoTitle: "Join Springvilla",
    seoDescription: "Start by learning what Springvilla offers near you. Send an enquiry and an office will share the next steps.",
    sections: [
      // 1. Opening
      { key: "page_hero", layer: "canopy", content: { eyebrow: "Join Springvilla", heading: "Start by learning what\nSpringvilla offers near you.", highlight: "near you", body: REASSURANCE, variant: "typographic" } },
      // 2. What participation involves
      { key: "split_feature", layer: "milky", content: { eyebrow: "What participation involves", heading: "Learning, practice\nand two pathways", highlight: "practice", body: "Members take part in training, practise with peers and apply what they learn. You can focus on Digital Skills & Freelancing, on Network Marketing & Business, or explore both, with personal development running through everything.", bullets: ["Training", "Practice with peers", "Two pathways", "Personal development", "Clear expectations"], imageSide: "right", cta: { label: "See how the system works", href: "/our-system" } } },
      // 3. Who might benefit
      { key: "rich_text", layer: "sand", content: { eyebrow: "Who might benefit", heading: "People ready to put in the work", highlight: "work", html: "<p>Springvilla may suit people who want to build practical skills, understand business, grow in confidence and practise alongside others, including students and people who are working. It isn't the right fit for everyone, and eligibility is confirmed by each office.</p>" } },
      // 4. What is required (verified disclosures only)
      { key: "reality", layer: "milky", content: { eyebrow: "What is required", heading: "Fees, purchases, age\nand schedule", highlight: "schedule", body: "Any fees, purchases, eligibility rules, minimum age, schedule and steps will be listed here once they've been verified. We won't ask you to commit to anything before you understand it.", points: [] } },
      // 5. Form with privacy explanation and separate consent for updates
      { key: "join_form", layer: "sand", content: { anchor: "apply", eyebrow: "Enquiry form", heading: "Tell us about yourself", highlight: "", intro: "Fields marked * are required. It takes about two minutes.", privacyExplanation: "We use these details only to respond to your enquiry and connect you with an office. We don't sell your data or show it publicly. Updates by email or message are a separate, optional choice.", enquiryNote: REASSURANCE, successHeading: "Thank you for your interest.", successBody: "Your enquiry has been received. The next step will be shared using your preferred contact method.", privacyLabel: "I've read how Springvilla will use my details to respond to this enquiry.", marketingLabel: "Send me occasional updates from Springvilla (optional).", consentVersion: "2026-11-draft" } },
      // 6. What happens next
      { key: "steps", layer: "milky", content: { eyebrow: "What happens next", heading: "After you send the form", highlight: "after", style: "numbered", items: [
        { title: "We receive your enquiry", body: "It goes to the office you chose, or to the team that will help you find one." },
        { title: "An office representative responds", body: "They contact you, or send approved next-step instructions, by your preferred method." },
        { title: "You ask questions", body: "Learn what the office offers and what would be expected of you." },
        { title: "You decide", body: "Applying is not a promise of acceptance, and there's no obligation." },
      ] } },
      // 7. FAQs: cost, involvement, products, training, availability, results
      { key: "faq", layer: "sand", content: { eyebrow: "Before you apply", heading: "Questions about joining", highlight: "", items: [
        { question: "Does it cost anything?", answer: PENDING_POLICY },
        { question: "How much time is involved?", answer: PENDING_POLICY },
        { question: "Will I have to buy products?", answer: PENDING_POLICY },
        { question: "What training is available?", answer: "Training covers digital skills, business and personal development. The programmes offered vary by office and are listed on each office page once verified." },
        { question: "Is there an office near me?", answer: "See Find an Office. If there isn't one listed near you yet, send the form anyway and choose 'Help me find one'." },
        { question: "What results can I expect?", answer: NO_GUARANTEE },
      ] } },
    ],
  },

  /* ================================================================ CONTACT (§12.4) */
  {
    key: "contact",
    route: "/contact",
    title: "Contact",
    seoTitle: "Contact Springvilla",
    seoDescription: "Send an enquiry to the right Springvilla team.",
    sections: [
      { key: "contact_form", layer: "milky", content: { eyebrow: "Contact", heading: "How can we help?", highlight: "help", intro: "Choose what your enquiry is about so it reaches the right team. Existing members: please use Support inside My Springvilla for account questions.", types: [
        { value: "general", label: "General enquiry", description: "Anything about Springvilla." },
        { value: "office_information", label: "Office information", description: "Visiting, details or corrections for an office." },
        { value: "partnership", label: "Partnership", description: "Organisations that want to work with us." },
        { value: "media", label: "Media", description: "Press and interview requests." },
        { value: "product", label: "Product-related enquiry", description: "Questions about products on the business path." },
        { value: "privacy", label: "Privacy request", description: "Access, correction or deletion of your data." },
        { value: "technical", label: "Technical support", description: "Problems using this website." },
      ], successHeading: "Thank you. Your message has been received.", successBody: "The right team will reply using the details you provided." } },
    ],
  },
  {
    key: "faq",
    route: "/faq",
    title: "FAQ",
    seoTitle: "Frequently asked questions",
    seoDescription: "Answers to common questions about Springvilla, FHG, NeoLife and the 2-in-1 system.",
    sections: [
      { key: "page_hero", layer: "canopy", content: { eyebrow: "FAQ", heading: "Questions, answered.", highlight: "answered", variant: "typographic" } },
      { key: "faq", layer: "milky", content: { heading: "", items: FAQ_ITEMS } },
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
    sections: [{ key: "legal", layer: "milky", content: { heading: title, html: "<p>This document is being prepared and will be published after legal review, in line with applicable Nigerian data-protection requirements.</p>", pendingReview: true, lastUpdated: "" } }],
  };
}

/** §10.1 controlled article categories. */
export const DEFAULT_CATEGORIES = [
  { slug: "business-entrepreneurship", name: "Business & Entrepreneurship", description: "Customer acquisition, repeat customers, honest selling, systems, basic finance." },
  { slug: "network-marketing-education", name: "Network Marketing Education", description: "The business model explained, ethical outreach, follow-up, duplication, product value." },
  { slug: "digital-skills-freelancing", name: "Digital Skills & Freelancing", description: "Skill selection, service delivery, client communication, portfolios, project habits." },
  { slug: "leadership-communication", name: "Leadership & Communication", description: "Public speaking, feedback, listening, conflict, responsibility." },
  { slug: "mindset-personal-development", name: "Mindset & Personal Development", description: "Discipline, time, resilience, deliberate practice, growth habits." },
  { slug: "student-growth", name: "Student Growth", description: "Learning with academic and personal commitments." },
  { slug: "wellness-product-education", name: "Wellness & Product Education", description: "Evidence-aware product education with approved claims and qualified review." },
  { slug: "springvilla-community", name: "Springvilla Community", description: "Events, training recaps, office news, verified recognition." },
];

export const DEFAULT_SETTINGS = {
  site_name: "Springvilla",
  tagline: "Where growth begins",
  default_seo_title: "Springvilla",
  default_seo_description: DEFINITION,
  default_timezone: "Africa/Lagos",
  cookie_banner_text: "We'd like to measure how the site is used so we can improve it. We never sell data or use advertising trackers.",
  footer: {
    closing_statement: "There's more in you.\nLet's grow it.",
    highlight: "grow",
    disclaimers: [
      "Springvilla is an organisation within FHG that operates offices and development communities.",
      "NeoLife is the business vehicle used in the network-marketing pathway. Springvilla does not own NeoLife or manufacture its products.",
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
