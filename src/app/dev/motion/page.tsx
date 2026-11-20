import { Container, Section, Eyebrow, DisplayHeading, ButtonLink, Button, Chip, OutlineNumeral, Marquee, MediaFrame, PALETTE_LAYERS } from "@/components/ui";
import { RevealText, RevealImage, StaggerCards, MagneticButton, CountUp, ColourShift, DrawLine } from "@/lib/motion";

export const metadata = { title: "Motion lab" };

export default function MotionLab() {
  return (
    <main>
      <Section layer="canopy" className="min-h-[90svh] flex items-end">
        <Container>
          <Eyebrow>Dev / Motion lab</Eyebrow>
          <RevealText as="h1" immediate className="mt-6 text-display-xl font-semibold">
            Every primitive and motion component, in one place.
          </RevealText>
          <div className="mt-10 flex flex-wrap gap-4">
            <MagneticButton>
              <ButtonLink href="#layers">Primary button</ButtonLink>
            </MagneticButton>
            <ButtonLink href="#layers" variant="secondary">
              Secondary
            </ButtonLink>
            <ButtonLink href="#layers" variant="ghost">
              Ghost
            </ButtonLink>
          </div>
        </Container>
      </Section>

      <Section layer="canopy" spacing="sm" className="border-t border-line text-display-s text-lime">
        <Marquee items={["Learn.", "Practise.", "Build.", "Grow."]} />
        <Marquee items={["Orient", "Apply", "Reflect", "Connect"]} reverse className="mt-4 opacity-80" />
      </Section>

      <div id="layers">
        {PALETTE_LAYERS.map((layer) => (
          <Section key={layer} layer={layer} spacing="sm">
            <Container className="grid gap-6 md:grid-cols-[1fr_auto] md:items-end">
              <div>
                <Eyebrow>Layer: {layer}</Eyebrow>
                <DisplayHeading text={"Growth is something\nwe practise together."} highlight="practise" size="m" className="mt-4" />
                <p className="mt-4 max-w-xl text-muted">Muted body copy on this layer stays above WCAG AA. Accent is used for the highlight and primary button only.</p>
              </div>
              <div className="flex flex-wrap gap-3">
                <Chip>Chip</Chip>
                <Chip active>Active chip</Chip>
                <Button>Button</Button>
              </div>
            </Container>
          </Section>
        ))}
      </div>

      <Section layer="milky">
        <Container className="grid gap-10 md:grid-cols-2">
          <RevealImage parallax={8}>
            <MediaFrame media={null} ratio="4/5" />
          </RevealImage>
          <div className="self-center">
            <OutlineNumeral value={1} className="text-canopy" />
            <RevealText as="h2" className="mt-4 text-display-m font-semibold">
              RevealImage opens with a clip-path while the inner media scales from 1.25.
            </RevealText>
            <RevealText as="p" className="mt-6 text-lead text-muted">
              RevealText splits by line inside masks. Lines rise from 110% with a slight rotate, stagger 0.08, power4.out, at 80% of the viewport.
            </RevealText>
          </div>
        </Container>
      </Section>

      <Section layer="sand">
        <Container>
          <RevealText as="h2" mode="words" className="text-display-m font-semibold">
            Stagger cards
          </RevealText>
          <StaggerCards className="mt-10 grid gap-6 md:grid-cols-3">
            {[1, 2, 3].map((n) => (
              <article key={n} className="group rounded-xl bg-milky p-4 text-canopy shadow-soft transition-transform duration-300 hover:-translate-y-1">
                <div className="overflow-hidden rounded-lg">
                  <div className="transition-transform duration-700 ease-[var(--ease-out-expo)] group-hover:scale-[1.06]">
                    <MediaFrame media={null} ratio="4/3" rounded="none" />
                  </div>
                </div>
                <h3 className="mt-4 text-xl font-semibold">
                  <span className="bg-[linear-gradient(var(--sv-lime),var(--sv-lime))] bg-[length:0%_6px] bg-[position:0_90%] bg-no-repeat transition-[background-size] duration-500 group-hover:bg-[length:100%_6px]">
                    Card title {n}
                  </span>
                </h3>
              </article>
            ))}
          </StaggerCards>
          <p className="mt-10 text-display-s font-semibold">
            CountUp (dev sample value only): <CountUp value={1280} />
          </p>
        </Container>
      </Section>

      <ColourShift>
        <Section layer="milky" className="min-h-[70vh]">
          <Container>
            <h2 className="text-display-m font-semibold">ColourShift: Milky</h2>
          </Container>
        </Section>
        <Section layer="canopy" className="min-h-[70vh]">
          <Container>
            <h2 className="text-display-m font-semibold">…morphs into Fresh Canopy</h2>
          </Container>
        </Section>
        <Section layer="cyprus" className="min-h-[70vh]">
          <Container>
            <h2 className="text-display-m font-semibold">…and into Cyprus</h2>
          </Container>
        </Section>
      </ColourShift>

      <Section layer="canopy">
        <Container>
          <h2 className="text-display-m font-semibold">DrawLine</h2>
          <DrawLine className="mt-10">
            <svg viewBox="0 0 1000 120" className="w-full text-lime" fill="none">
              <path data-draw d="M10 60 H 990" stroke="currentColor" strokeWidth="2" />
              <path data-draw d="M10 100 C 300 0, 700 120, 990 20" stroke="currentColor" strokeWidth="1.5" />
            </svg>
          </DrawLine>
        </Container>
      </Section>
    </main>
  );
}
