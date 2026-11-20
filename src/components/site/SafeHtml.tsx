import { sanitizeHtml } from "@/lib/sanitize";

/** Server component: renders sanitised rich text. */
export async function SafeHtml({ html, className, id }: { html: string; className?: string; id?: string }) {
  const clean = await sanitizeHtml(html);
  return <div id={id} className={className} dangerouslySetInnerHTML={{ __html: clean }} />;
}
