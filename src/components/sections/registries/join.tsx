import { parseSection } from "@/lib/content/schemas";
import type { Registry } from "../SectionRenderer";
import { sharedRegistry } from "./shared";
import { JoinFormSection } from "../forms/JoinFormSection";

export const joinRegistry: Registry = {
  ...sharedRegistry,
  join_form: (s) => <JoinFormSection layer={s.layer} content={parseSection("join_form", s.content)} />,
};
