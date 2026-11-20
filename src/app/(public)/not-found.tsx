import Link from "next/link";
import { Container, ButtonLink } from "@/components/ui";

export default function NotFound() {
  return (
    <section data-layer="canopy" className="relative flex min-h-[90svh] items-end overflow-hidden">
      <Container className="pb-24 pt-40">
        <p className="sv-eyebrow text-lime">404 · Page not found</p>
        <h1 className="mt-6 max-w-[14ch] text-display-xl font-semibold text-white">
          This path hasn&rsquo;t <em className="sv-serif-accent text-lime">grown</em> yet.
        </h1>
        <p className="mt-8 max-w-[46ch] text-lead text-white/85">The page you were looking for has moved or doesn&rsquo;t exist. Here are some good places to start instead.</p>
        <div className="mt-10 flex flex-wrap gap-3">
          <ButtonLink href="/">Back to home</ButtonLink>
          <ButtonLink href="/offices" variant="secondary">
            Find an Office
          </ButtonLink>
        </div>
        <ul className="mt-12 flex flex-wrap gap-x-6 gap-y-2 text-white/85">
          {[
            ["Discover", "/discover"],
            ["Our System", "/our-system"],
            ["Stories & Ideas", "/stories-and-ideas"],
            ["Contact", "/contact"],
          ].map(([l, h]) => (
            <li key={h}>
              <Link href={h} className="sv-link-underline inline-flex min-h-11 items-center">
                {l}
              </Link>
            </li>
          ))}
        </ul>
      </Container>
    </section>
  );
}
