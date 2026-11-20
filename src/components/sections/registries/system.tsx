import { parseSection } from "@/lib/content/schemas";
import type { Registry } from "../SectionRenderer";
import { sharedRegistry } from "./shared";
import { TwoPaths } from "../home/TwoPaths";

/** Our System (§16.3): adds the interactive two-path storytelling sequence. */
export const systemRegistry: Registry = {
  ...sharedRegistry,
  "home.two_paths": (s, media) => <TwoPaths layer={s.layer} media={media} content={parseSection("home.two_paths", s.content)} />,
};
