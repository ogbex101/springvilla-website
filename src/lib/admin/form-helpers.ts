import type { z } from "zod";
import type { FieldMeta, RefKind } from "@/lib/content/fields";

type AnyZod = z.ZodType & { _zod: { def: Record<string, unknown> }; meta?: () => unknown };

function shape(schema: z.ZodType) {
  return (schema as unknown as { shape: Record<string, AnyZod> }).shape;
}

/** Default values; required fields start as empty strings (server-safe). */
export function defaultsFor(schema: z.ZodType): Record<string, unknown> {
  return Object.fromEntries(Object.entries(shape(schema)).map(([k, f]) => {
    const r = f.safeParse(undefined);
    return [k, r.success ? r.data : ""];
  }));
}

export function refKinds(schema: z.ZodType): RefKind[] {
  return Object.values(shape(schema))
    .map((f) => (f.meta?.() as FieldMeta | undefined)?.ref)
    .filter((x): x is RefKind => Boolean(x));
}
