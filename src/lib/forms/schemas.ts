import { z } from "zod";

const phone = z
  .string()
  .trim()
  .min(7, "Enter a phone number we can reach you on")
  .max(25, "That phone number looks too long")
  .regex(/^[+()\d\s-]+$/, "Use digits, spaces and + only");

export const INTERESTS = [
  { value: "digital", label: "Digital Skills & Freelancing" },
  { value: "business", label: "Network Marketing & Business" },
  { value: "both", label: "Both paths" },
  { value: "not_sure", label: "Not sure yet" },
] as const;
export const AGE_RANGES = ["16-17", "18-24", "25-34", "35-44", "45+"] as const;
export const SITUATIONS = ["Student", "Employed", "Self-employed", "Looking for work", "Other"] as const;
export const HOW_HEARD = ["Friend or family", "Social media", "An event", "Walked past an office", "Search engine", "Other"] as const;
export const CONTACT_METHODS = [
  { value: "phone", label: "Phone call" },
  { value: "whatsapp", label: "WhatsApp" },
  { value: "email", label: "Email" },
] as const;

export const joinSchema = z.object({
  fullName: z.string().trim().min(2, "Enter your full name").max(120),
  email: z.string().trim().toLowerCase().email("Enter a valid email address").max(200),
  phone,
  city: z.string().trim().min(2, "Enter your city or town").max(80),
  state: z.string().trim().max(80).optional().default(""),
  officeId: z.string().uuid().or(z.literal("")).optional().default(""),
  interest: z.enum(["digital", "business", "both", "not_sure"], { message: "Choose what you're interested in" }),
  ageRange: z.enum(AGE_RANGES).or(z.literal("")).optional().default(""),
  currentSituation: z.string().max(60).optional().default(""),
  hopedOutcome: z.string().trim().max(1000, "Please keep this under 1000 characters").optional().default(""),
  howHeard: z.string().max(60).optional().default(""),
  preferredContact: z.enum(["phone", "whatsapp", "email"], { message: "Choose how we should contact you" }),
  consentPrivacy: z.literal(true, { message: "Please agree so we can store your details" }),
  consentContact: z.boolean().default(false),
  // anti-abuse
  website: z.string().max(0).optional().default(""),
  startedAt: z.number().int().optional(),
  sourcePath: z.string().max(200).optional(),
  utm: z.record(z.string(), z.string()).optional(),
});
export type JoinInput = z.input<typeof joinSchema>;

export const ENQUIRY_TYPES = ["general", "office_visit", "partnership", "media", "member_support", "feedback", "safeguarding"] as const;

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
