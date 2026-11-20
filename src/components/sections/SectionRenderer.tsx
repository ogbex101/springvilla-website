import type { ReactNode } from "react";
import type { PageData, SectionRow } from "@/lib/content/queries";
import type { SectionKey } from "@/lib/content/schemas";
import { AnchorNav } from "./shared/AnchorNav";

export type Renderer = (section: SectionRow, media: PageData["media"]) => ReactNode;
/**
 * A registry maps section types to renderers. Each route imports only the
 * registry it needs, so client code (forms, homepage motion) only ships to
 * the pages that can render it.
 */
export type Registry = Partial<Record<SectionKey, Renderer>>;

/** Renders one stored section with its typed content. Unknown/empty sections render nothing. */
export function RenderSection({ section, media, registry }: { section: SectionRow; media: PageData["media"]; registry: Registry }) {
  const r = registry[section.key];
  return r ? <>{r(section, media)}</> : null;
}

/** Renders all sections of a page, inserting the sticky anchor sub-nav after the hero when sections define anchors. */
export function PageSections({ page, registry, from = 0, to, subnav = false }: { page: PageData; registry: Registry; from?: number; to?: number; subnav?: boolean }) {
  const sections = page.sections.slice(from, to);
  const anchors = subnav
    ? page.sections
        .map((s) => s.content as { anchor?: string; navLabel?: string })
        .filter((c) => c.anchor && c.navLabel)
        .map((c) => ({ id: c.anchor as string, label: c.navLabel as string }))
    : [];
  return (
    <>
      {page.preview && (
        <div role="status" className="fixed bottom-4 left-1/2 z-[95] -translate-x-1/2 rounded-full bg-lime px-5 py-2 text-small font-semibold text-canopy shadow-lift">
          Draft preview
        </div>
      )}
      {sections.map((s, i) => (
        <div key={s.id} className="contents">
          <RenderSection section={s} media={page.media} registry={registry} />
          {i === 0 && anchors.length > 1 && <AnchorNav items={anchors} />}
        </div>
      ))}
    </>
  );
}
