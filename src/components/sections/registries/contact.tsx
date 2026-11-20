import { parseSection } from "@/lib/content/schemas";
import type { Registry } from "../SectionRenderer";
import { sharedRegistry } from "./shared";
import { ContactFormSection } from "../forms/ContactFormSection";

export const contactRegistry: Registry = {
  ...sharedRegistry,
  contact_form: (s) => <ContactFormSection layer={s.layer} content={parseSection("contact_form", s.content)} />,
};
