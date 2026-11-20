import { joinSchema } from "../../src/lib/forms/schemas";
const r = joinSchema.safeParse({ fullName: "Ada", email: "not-an-email", phone: "", city: "", officeId: "", state: "", ageRange: "", currentSituation: "", howHeard: "", hopedOutcome: "", consentContact: true, website: "", consentPrivacy: false });
console.log(r.success ? "ok" : r.error.issues.map((i) => `${i.path} ${i.message}`));
