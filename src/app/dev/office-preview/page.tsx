import { OfficeLayout } from "@/components/content/OfficeLayout";
import type { OfficeFull } from "@/lib/content/collections";

export const metadata = { title: "QA: office page layout", robots: { index: false, follow: false } };

/**
 * DEV-ONLY QA fixture (404s in production via app/dev/layout.tsx). Renders the
 * §11.2 office template with obviously labelled sample data so the layout can be
 * screenshot-reviewed before real offices exist. Never published.
 */
const SAMPLE: OfficeFull = {
  id: "00000000-0000-0000-0000-000000000000",
  slug: "sample-office",
  name: "SAMPLE — Layout test office",
  city: "Sample City",
  state: "Sample State",
  country: "Sample Country",
  addressLine: "1 Example Street (not a real address)",
  postcode: "000000",
  lat: null,
  lng: null,
  summary: "Layout fixture for QA screenshots only. Not a real Springvilla office.",
  hero: null,
  verified: false,
  lastVerifiedAt: null,
  phone: "+000 000 0000",
  email: "sample@example.com",
  whatsapp: null,
  hours: [{ day: "Monday–Friday", opens: "09:00", closes: "17:00" }, { day: "Saturday" }],
  welcome: "Sample paragraph standing in for the office's verified welcome text.",
  whatHappens: "Sample paragraph standing in for verified activities.",
  programmes: null,
  firstVisit: "Sample first-visit guidance.",
  gettingThere: null,
  accessibility: null,
  leadContactName: null,
  leadContactRole: null,
  preferredContact: "phone",
  visitAppointment: "Sample: whether an appointment is needed.",
  whatToBring: null,
  eligibilityCosts: null,
  updatedAt: "",
  gallery: [],
  seoTitle: null,
  seoDescription: null,
};

export default function OfficePreview() {
  return <OfficeLayout o={SAMPLE} events={[]} news={[]} slug={SAMPLE.slug} />;
}
