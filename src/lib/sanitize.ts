import "server-only";
import sanitize from "sanitize-html";
import { cacheLife } from "next/cache";

/*
 * Pure-JS allowlist sanitiser (no jsdom: it failed to load on Vercel's runtime
 * and took every server action that imported it down). Anything not listed is
 * removed, including all event handlers, style and script.
 */
const SAFE_URL = /^(?:(?:https?|mailto|tel):|\/(?!\/)|#)/i;

const RICH_TEXT: sanitize.IOptions = {
  allowedTags: ["p", "br", "strong", "b", "em", "i", "u", "s", "a", "ul", "ol", "li", "h2", "h3", "h4", "blockquote", "figure", "figcaption", "img", "hr", "div", "span", "code"],
  allowedAttributes: {
    a: ["href", "target", "rel", "title"],
    img: ["src", "alt", "width", "height", "loading", "title"],
    "*": ["class"],
  },
  allowedSchemes: ["http", "https", "mailto", "tel"],
  allowedSchemesAppliedToAttributes: ["href", "src"],
  allowProtocolRelative: false,
  disallowedTagsMode: "discard",
  exclusiveFilter: (frame) => (frame.tag === "a" || frame.tag === "img") && Boolean(frame.attribs.href ?? frame.attribs.src) && !SAFE_URL.test(frame.attribs.href ?? frame.attribs.src),
  transformTags: {
    a: (tagName, attribs) => {
      const out = { ...attribs };
      if (out.target && out.target !== "_blank") delete out.target;
      if (/^https?:/i.test(out.href ?? "") && !out.rel) out.rel = "noopener noreferrer";
      return { tagName, attribs: out };
    },
  },
};

/** Sanitise admin rich text before rendering. Allows editorial markup only. */
export async function sanitizeHtml(html: string) {
  "use cache";
  cacheLife("max");
  return sanitizeRichText(html);
}

export function sanitizeRichText(html: string) {
  return sanitize(html ?? "", RICH_TEXT);
}

const SVG_TAGS = ["svg", "g", "path", "circle", "ellipse", "rect", "line", "polyline", "polygon", "defs", "linearGradient", "radialGradient", "stop", "clipPath", "mask", "pattern", "title", "desc", "text", "tspan", "symbol"];
const SVG_ATTRS = [
  "id", "class", "viewBox", "width", "height", "x", "y", "x1", "y1", "x2", "y2", "cx", "cy", "r", "rx", "ry", "d", "points", "transform",
  "fill", "fill-rule", "fill-opacity", "stroke", "stroke-width", "stroke-linecap", "stroke-linejoin", "stroke-miterlimit", "stroke-dasharray", "stroke-dashoffset", "stroke-opacity", "opacity",
  "clip-path", "clip-rule", "mask", "offset", "stop-color", "stop-opacity", "gradientUnits", "gradientTransform", "patternUnits", "patternTransform", "spreadMethod", "fx", "fy",
  "preserveAspectRatio", "xmlns", "version", "font-family", "font-size", "font-weight", "text-anchor", "dominant-baseline", "letter-spacing", "role", "aria-label", "aria-hidden", "focusable",
];

/**
 * Sanitise an uploaded SVG: shapes, gradients and text only. Scripts, styles,
 * foreignObject, event handlers and every link (href / xlink:href) are removed.
 */
export function sanitizeSvg(svg: string) {
  return sanitize(svg, {
    allowedTags: SVG_TAGS,
    allowedAttributes: { "*": SVG_ATTRS },
    allowedSchemes: [],
    parser: { xmlMode: true, lowerCaseTags: false, lowerCaseAttributeNames: false },
    disallowedTagsMode: "discard",
    allowVulnerableTags: false,
  });
}

export function htmlToText(html: string) {
  return (html ?? "").replace(/<[^>]+>/g, " ").replace(/\s+/g, " ").trim();
}
