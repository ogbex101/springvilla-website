import { z } from "zod";

/**
 * Field builders for section schemas. Each attaches metadata the admin's
 * SchemaForm uses to render the right input. Every field has a default so a
 * partially filled section still renders (empty fields hide themselves).
 */
export type Widget =
  | "text"
  | "textarea"
  | "richtext"
  | "image"
  | "video"
  | "media"
  | "link"
  | "cta"
  | "boolean"
  | "number"
  | "select"
  | "stringList"
  | "list"
  | "imageList"
  | "ref"
  | "refMulti"
  | "date"
  | "datetime"
  | "decimal"
  | "privateFile";

export type RefKind = "offices" | "categories" | "tags" | "consent" | "courses" | "modules";

export type FieldMeta = {
  widget: Widget;
  label: string;
  help?: string;
  options?: { value: string; label: string }[];
  min?: number;
  max?: number;
  itemLabel?: string;
  ref?: RefKind;
  bucket?: string;
  required?: boolean;
};

const meta = (m: FieldMeta) => m;

export const f = {
  text: (label: string, help?: string, max = 300) =>
    z.string().max(max).default("").meta(meta({ widget: "text", label, help })),
  textarea: (label: string, help?: string, max = 2000) =>
    z.string().max(max).default("").meta(meta({ widget: "textarea", label, help })),
  richtext: (label: string, help?: string) =>
    z.string().max(60000).default("").meta(meta({ widget: "richtext", label, help })),
  image: (label: string, help?: string) =>
    z.string().uuid().nullable().default(null).meta(meta({ widget: "image", label, help })),
  video: (label: string, help?: string) =>
    z.string().uuid().nullable().default(null).meta(meta({ widget: "video", label, help })),
  link: (label: string, help?: string) =>
    z.string().max(500).default("").meta(meta({ widget: "link", label, help })),
  cta: (label: string, help?: string) =>
    z
      .object({ label: z.string().max(60).default(""), href: z.string().max(500).default("") })
      .default({ label: "", href: "" })
      .meta(meta({ widget: "cta", label, help })),
  boolean: (label: string, help?: string, def = false) =>
    z.boolean().default(def).meta(meta({ widget: "boolean", label, help })),
  number: (label: string, min: number, max: number, def: number, help?: string) =>
    z.number().min(min).max(max).default(def).meta(meta({ widget: "number", label, help, min, max })),
  select: <T extends string>(label: string, options: readonly { value: T; label: string }[], def: T, help?: string) =>
    z
      .enum(options.map((o) => o.value) as [T, ...T[]])
      .default(def as never)
      .meta(meta({ widget: "select", label, help, options: [...options] })),
  stringList: (label: string, help?: string, max = 20) =>
    z.array(z.string().max(200)).max(max).default([]).meta(meta({ widget: "stringList", label, help, max })),
  imageList: (label: string, help?: string, min = 0, max = 24) =>
    z.array(z.string().uuid()).max(max).default([]).meta(meta({ widget: "imageList", label, help, min, max })),
  ref: (label: string, ref: RefKind, help?: string) =>
    z.string().uuid().nullable().default(null).meta(meta({ widget: "ref", label, help, ref })),
  refMulti: (label: string, ref: RefKind, help?: string) =>
    z.array(z.string().uuid()).default([]).meta(meta({ widget: "refMulti", label, help, ref })),
  date: (label: string, help?: string) =>
    z.string().regex(/^(\d{4}-\d{2}-\d{2})?$/, "Use a valid date").nullable().default(null).meta(meta({ widget: "date", label, help })),
  datetime: (label: string, help?: string) =>
    z.string().regex(/^(\d{4}-\d{2}-\d{2}T\d{2}:\d{2})?$/, "Use a valid date and time").nullable().default(null).meta(meta({ widget: "datetime", label, help })),
  decimal: (label: string, help?: string) =>
    z.number().nullable().default(null).meta(meta({ widget: "decimal", label, help })),
  privateFile: (label: string, bucket: string, help?: string) =>
    z.string().max(300).nullable().default(null).meta(meta({ widget: "privateFile", label, help, bucket })),
  required: (label: string, help?: string, max = 200) =>
    z.string().trim().min(1, `${label} is required`).max(max).default("").meta(meta({ widget: "text", label, help, required: true })),
  list: <S extends z.ZodRawShape>(label: string, shape: S, itemLabel: string, help?: string, max = 24) =>
    z.array(z.object(shape)).max(max).default([]).meta(meta({ widget: "list", label, help, itemLabel, max })),
};

export type Cta = { label: string; href: string };
export const hasCta = (c: Cta | null | undefined): c is Cta => Boolean(c && c.label && c.href);
