export type MediaVariant = { width: number; path: string; format: "webp" | "avif" };

export type Media = {
  id: string;
  type: "image" | "video" | "document";
  url: string;
  mime: string;
  width: number | null;
  height: number | null;
  alt: string;
  caption: string | null;
  credit: string | null;
  location: string | null;
  dateTaken: string | null;
  blurDataUrl: string | null;
  consentConfirmed: boolean;
};
