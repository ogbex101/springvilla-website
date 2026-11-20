import "server-only";
import DOMPurify from "isomorphic-dompurify";
import { cacheLife } from "next/cache";

/** Sanitise admin rich text before rendering. Allows editorial markup only. */
export async function sanitizeHtml(html: string) {
  "use cache";
  cacheLife("max");
  return DOMPurify.sanitize(html ?? "", {
    ALLOWED_TAGS: ["p", "br", "strong", "b", "em", "i", "u", "s", "a", "ul", "ol", "li", "h2", "h3", "h4", "blockquote", "figure", "figcaption", "img", "hr", "div", "span", "code"],
    ALLOWED_ATTR: ["href", "target", "rel", "src", "alt", "width", "height", "class", "title", "loading"],
    ALLOWED_URI_REGEXP: /^(?:(?:https?|mailto|tel):|\/|#)/i,
    ADD_ATTR: ["target"],
  }).replace(/<a ([^>]*href="https?:[^"]+"[^>]*)>/g, (m, attrs: string) => (/rel=/.test(attrs) ? m : `<a ${attrs} rel="noopener noreferrer">`));
}

export function htmlToText(html: string) {
  return (html ?? "").replace(/<[^>]+>/g, " ").replace(/\s+/g, " ").trim();
}
