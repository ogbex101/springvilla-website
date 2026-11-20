import { DEFAULT_PAGES } from "../../src/content/defaults";
import { SECTION_SCHEMAS } from "../../src/lib/content/schemas";
let bad = 0;
for (const p of DEFAULT_PAGES) for (const s of p.sections) { const r = SECTION_SCHEMAS[s.key].safeParse(s.content); if (!r.success) { bad++; console.log(p.key, s.key, r.error.issues.map((i) => i.path.join(".") + " " + i.message).join("; ")); } }
console.log(bad ? `${bad} invalid` : "all default sections valid");
