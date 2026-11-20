import type { ReactNode } from "react";
import { Container, Section } from "@/components/ui";
import { StaggerCards } from "@/lib/motion";

export function ListingGrid({ children, empty, isEmpty, title }: { children: ReactNode; empty: string; isEmpty: boolean; title?: string }) {
  return (
    <Section layer="milky" spacing="sm">
      <Container>
        {title && <h2 className="mb-10 text-display-s font-semibold">{title}</h2>}
        {isEmpty ? (
          <p className="rounded-xl border border-dashed border-line p-8 text-lead text-muted">{empty}</p>
        ) : (
          <StaggerCards className="grid gap-x-8 gap-y-14 sm:grid-cols-2 lg:grid-cols-3">{children}</StaggerCards>
        )}
      </Container>
    </Section>
  );
}

export function GridSkeleton() {
  return (
    <Section layer="milky" spacing="sm" aria-busy>
      <Container className="grid gap-8 sm:grid-cols-2 lg:grid-cols-3">
        {[0, 1, 2].map((i) => (
          <div key={i} className="aspect-[4/3] animate-pulse rounded-xl bg-chip" />
        ))}
      </Container>
    </Section>
  );
}
