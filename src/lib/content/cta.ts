/** Zod-free so client components can import it without pulling zod into the bundle. */
export type Cta = { label: string; href: string };
export const hasCta = (c: Cta | null | undefined): c is Cta => Boolean(c && c.label && c.href);
