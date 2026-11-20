import Link from "next/link";
import { Container } from "@/components/ui";
import { RevealText } from "@/lib/motion";
import { renderHighlighted } from "@/components/ui/DisplayHeading";
import { ConsentLink } from "./Analytics";
import { Logo } from "./Logo";
import type { Chrome } from "@/lib/content/queries";

/**
 * Closing footer. On large screens it sits underneath the page and is revealed
 * as the last section scrolls away (sticky curtain). On small screens it flows normally.
 */
export function Footer({ chrome }: { chrome: Chrome }) {
  const groups = chrome.nav.footer.reduce<Record<string, { label: string; href: string }[]>>((acc, l) => {
    const g = l.group || "Explore";
    (acc[g] ??= []).push(l);
    return acc;
  }, {});

  return (
    <footer data-layer="canopy" className="relative z-0 lg:sticky lg:bottom-0" aria-labelledby="footer-heading">
      <Container className="pb-10 pt-section-sm">
        <h2 id="footer-heading" className="sr-only">
          Site footer
        </h2>
        {/* Footer is Fresh Canopy: an approved logo surface. */}
        {chrome.logo && <Logo logo={chrome.logo} siteName={chrome.siteName} onBrandSurface size="lg" className="-m-4 mb-10" />}
        {chrome.footer.closingStatement && (
          <RevealText as="p" className="max-w-[16ch] text-display-l font-semibold text-white">
            {renderHighlighted(chrome.footer.closingStatement, chrome.footer.highlight)}
          </RevealText>
        )}

        <div className="mt-16 grid gap-10 border-t border-line pt-10 sm:grid-cols-2 lg:grid-cols-[repeat(3,minmax(0,1fr))_minmax(0,1.3fr)]">
          {Object.entries(groups).map(([group, links]) => (
            <nav key={group} aria-label={group}>
              <p className="sv-eyebrow text-lime">{group}</p>
              <ul className="mt-4 space-y-1">
                {links.map((l) => (
                  <li key={l.href}>
                    <Link href={l.href} className="sv-link-underline inline-flex min-h-10 items-center text-white/90 hover:text-white">
                      {l.label}
                    </Link>
                  </li>
                ))}
              </ul>
            </nav>
          ))}

          <div className="space-y-6">
            <div>
              <p className="sv-eyebrow text-lime">Members</p>
              <Link href="/login" className="sv-link-underline mt-4 inline-flex min-h-10 items-center text-white/90 hover:text-white">
                Member Login
              </Link>
            </div>
            {chrome.newsletterEnabled && chrome.newsletterActionUrl && (
              <form action={chrome.newsletterActionUrl} method="post" className="max-w-sm">
                <label htmlFor="newsletter-email" className="sv-eyebrow text-lime">
                  Newsletter
                </label>
                <div className="mt-4 flex gap-2">
                  <input id="newsletter-email" name="email" type="email" required autoComplete="email" placeholder="you@example.com" className="min-h-12 w-full rounded-full border border-line bg-white/5 px-5 text-white placeholder:text-white/50" />
                  <button className="min-h-12 shrink-0 rounded-full bg-lime px-5 font-semibold text-canopy">Sign up</button>
                </div>
              </form>
            )}
            {(chrome.contact.email || chrome.contact.phone) && (
              <div className="text-white/85">
                <p className="sv-eyebrow text-lime">Contact</p>
                <ul className="mt-4 space-y-1">
                  {chrome.contact.email && (
                    <li>
                      <a className="sv-link-underline" href={`mailto:${chrome.contact.email}`}>
                        {chrome.contact.email}
                      </a>
                    </li>
                  )}
                  {chrome.contact.phone && (
                    <li>
                      <a className="sv-link-underline" href={`tel:${chrome.contact.phone.replace(/\s/g, "")}`}>
                        {chrome.contact.phone}
                      </a>
                    </li>
                  )}
                </ul>
              </div>
            )}
            {chrome.social.length > 0 && (
              <ul className="flex flex-wrap gap-2" aria-label="Social media">
                {chrome.social.map((s) => (
                  <li key={s.url}>
                    <a href={s.url} target="_blank" rel="noopener noreferrer" className="inline-flex min-h-10 items-center rounded-full border border-line px-4 text-small text-white/90 hover:bg-white/10">
                      {s.platform}
                    </a>
                  </li>
                ))}
              </ul>
            )}
          </div>
        </div>

        {chrome.footer.disclaimers.length > 0 && (
          <ul className="mt-14 max-w-3xl space-y-2 text-caption text-white/75">
            {chrome.footer.disclaimers.map((d) => (
              <li key={d}>{d}</li>
            ))}
          </ul>
        )}

        <div className="mt-10 flex flex-col gap-4 border-t border-line pt-6 text-caption text-white/75 sm:flex-row sm:items-center sm:justify-between">
          <p>
            © {chrome.year} {chrome.footer.legalName || chrome.siteName}
          </p>
          <ul className="flex flex-wrap gap-x-5 gap-y-1">
            {chrome.nav.legal.map((l) => (
              <li key={l.href}>
                <Link href={l.href} className="sv-link-underline inline-flex min-h-10 items-center">
                  {l.label}
                </Link>
              </li>
            ))}
            {chrome.cookieBannerEnabled && (
              <li>
                <ConsentLink />
              </li>
            )}
          </ul>
        </div>
      </Container>
    </footer>
  );
}

