import { z } from "zod";

export const INTERESTS = [
  { value: "digital", label: "Digital skills" },
  { value: "business", label: "Business" },
  { value: "both", label: "Both" },
  { value: "not_sure", label: "Community / unsure" },
] as const;
export const OCCUPATIONS = [
  { value: "student", label: "Student" },
  { value: "employed", label: "Employed" },
  { value: "self_employed", label: "Self-employed" },
  { value: "other", label: "Other" },
  { value: "prefer_not_to_say", label: "Prefer not to say" },
] as const;
export const CONTACT_METHODS = [
  { value: "email", label: "Email" },
  { value: "phone", label: "Phone call" },
  { value: "whatsapp", label: "WhatsApp" },
] as const;

/**
 * Blueprint §12.2: full name; email or phone (at least one); city/state; optional
 * preferred office; optional occupation; interests; optional message; privacy
 * acknowledgement; separate updates opt-in (unticked by default). No date of birth.
 */
export const joinSchema = z
  .object({
    fullName: z.string().trim().min(2, "Enter your full name").max(120),
    email: z.string().trim().toLowerCase().max(200).refine((v) => !v || z.string().email().safeParse(v).success, "Enter a valid email address").default(""),
    phone: z.string().trim().max(25).refine((v) => !v || (/^[+()\d\s-]+$/.test(v) && v.replace(/\D/g, "").length >= 7), "Enter a valid phone number (digits, spaces and + only)").default(""),
    preferredContact: z.enum(["email", "phone", "whatsapp"], { message: "Choose how we should contact you" }),
    city: z.string().trim().min(2, "Enter your city and state").max(120),
    officeId: z.string().uuid().or(z.literal("")).optional().default(""),
    occupation: z.enum(["student", "employed", "self_employed", "other", "prefer_not_to_say"]).or(z.literal("")).optional().default(""),
    interest: z.enum(["digital", "business", "both", "not_sure"], { message: "Choose what you're interested in" }),
    message: z.string().trim().max(1500, "Please keep this under 1500 characters").optional().default(""),
    consentPrivacy: z.literal(true, { message: "Please confirm you've read how we use your details" }),
    marketingOptIn: z.boolean().default(false),
    // anti-abuse + provenance
    website: z.string().max(0).optional().default(""),
    startedAt: z.number().int().optional(),
    sourcePath: z.string().max(200).optional(),
    utm: z.record(z.string(), z.string()).optional(),
    consentVersion: z.string().max(40).optional(),
  })
  .superRefine((d, ctx) => {
    // Runs even when other fields are invalid (see `when` below), so every error shows at once.
    if (!d.email && !d.phone) {
      ctx.addIssue({ code: "custom", path: ["email"], message: "Give us an email address or a phone number" });
      ctx.addIssue({ code: "custom", path: ["phone"], message: "Give us an email address or a phone number" });
      return;
    }
    if (d.preferredContact === "email" && !d.email) ctx.addIssue({ code: "custom", path: ["preferredContact"], message: "Add your email address to be contacted by email" });
    if ((d.preferredContact === "phone" || d.preferredContact === "whatsapp") && !d.phone) ctx.addIssue({ code: "custom", path: ["preferredContact"], message: "Add your phone number to be contacted this way" });
  }, { when: () => true });
export type JoinInput = z.input<typeof joinSchema>;

export const ENQUIRY_TYPES = ["general", "office_information", "partnership", "media", "product", "privacy", "technical", "office_visit", "member_support", "feedback", "safeguarding"] as const;

export const contactSchema = z.object({
  enquiryType: z.enum(ENQUIRY_TYPES, { message: "Choose what your enquiry is about" }),
  name: z.string().trim().min(2, "Enter your name").max(120),
  email: z.string().trim().toLowerCase().email("Enter a valid email address").max(200),
  phone: z.string().trim().max(25).regex(/^[+()\d\s-]*$/, "Use digits, spaces and + only").optional().default(""),
  officeId: z.string().uuid().or(z.literal("")).optional().default(""),
  subject: z.string().trim().max(160).optional().default(""),
  message: z.string().trim().min(10, "Tell us a little more (at least 10 characters)").max(4000, "Please keep this under 4000 characters"),
  consentPrivacy: z.literal(true, { message: "Please agree so we can reply" }),
  website: z.string().max(0).optional().default(""),
  startedAt: z.number().int().optional(),
  sourcePath: z.string().max(200).optional(),
});
export type ContactInput = z.input<typeof contactSchema>;

export type FormResult = { ok: true; duplicate?: boolean } | { ok: false; error: string; fieldErrors?: Record<string, string> };
