/**
 * Icon vocabulary for illustrative copy (cards, steps, nodes, chips).
 * Names only, so content schemas can offer them in the admin without pulling
 * in the icon library. "auto" picks an icon from the item's own words.
 * Deliberately no money, trophy or luxury icons (blueprint no-hype rule).
 */
export const ICON_NAMES = [
  "auto",
  "learning",
  "lesson",
  "digital",
  "business",
  "team",
  "leadership",
  "speaking",
  "support",
  "growth",
  "discipline",
  "office",
  "location",
  "question",
  "practice",
  "reflect",
  "orient",
  "network",
  "product",
  "events",
  "news",
  "ideas",
  "journey",
  "communication",
  "projects",
  "goals",
  "time",
  "verified",
  "people",
  "none",
] as const;
export type IconName = (typeof ICON_NAMES)[number];

/** Keyword → icon. First match wins, so specific words come before general ones. */
const RULES: [RegExp, IconName][] = [
  [/\bfhg\b/i, "network"],
  [/springvilla/i, "growth"],
  [/neolife|product/i, "product"],
  [/public speaking|speak|present|voice/i, "speaking"],
  [/digital|freelanc|client|online|tech|design|website/i, "digital"],
  [/business|customer|sales|enterpris|market/i, "business"],
  [/lead/i, "leadership"],
  [/welfare|support|care|wellbeing|help/i, "support"],
  [/team|peer|collaborat|together|communit|relationship|friend|member/i, "team"],
  [/communicat|follow-up|conversation/i, "communication"],
  [/train|learn|course|skill|education|study|knowledge/i, "learning"],
  [/lesson|session|class|workshop/i, "lesson"],
  [/project|portfolio|deliver|work you/i, "projects"],
  [/practi[sc]e|apply|hands-on|exercise/i, "practice"],
  [/reflect|evaluat|review|feedback/i, "reflect"],
  [/orient|start|begin|first|welcome|discover/i, "orient"],
  [/discipline|accountab|responsib|standard|integrity|honest|commit/i, "discipline"],
  [/goal|target|focus|purpose/i, "goals"],
  [/time|schedule|hours|routine|day/i, "time"],
  [/office|space|environment|place/i, "office"],
  [/near|local|city|location|find/i, "location"],
  [/question|ask|answer|faq|enquir/i, "question"],
  [/event|calendar|meeting/i, "events"],
  [/news|update|announce/i, "news"],
  [/idea|article|insight|read/i, "ideas"],
  [/journey|story|progress|path/i, "journey"],
  [/verif|confirm|safe|trust/i, "verified"],
  [/grow|develop|confiden|potential|better/i, "growth"],
  [/people|person|who/i, "people"],
];

export function resolveIcon(text: string, explicit?: string | null): IconName | null {
  if (explicit && explicit !== "auto") return explicit === "none" ? null : (explicit as IconName);
  for (const [re, name] of RULES) if (re.test(text)) return name;
  return null;
}

export const ICON_OPTIONS = ICON_NAMES.map((n) => ({ value: n, label: n === "auto" ? "Automatic (from the words)" : n === "none" ? "No icon" : n[0].toUpperCase() + n.slice(1) }));
