import "server-only";
import { updateTag } from "next/cache";

/** Expire public caches immediately after an admin write (Server Actions only). */
export function expire(...tags: string[]) {
  for (const t of new Set(tags)) updateTag(t);
}
