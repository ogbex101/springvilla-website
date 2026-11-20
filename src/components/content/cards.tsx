import { Card } from "./Card";
import type { PostCard, EventCard as EventCardT, NewsCard as NewsCardT, OfficeCard as OfficeCardT } from "@/lib/content/collections";
import { formatDate } from "@/lib/utils";
import { EventDate } from "./EventDate";

export function ArticleCard({ post, size = "md" }: { post: PostCard; size?: "md" | "lg" }) {
  return (
    <Card
      href={`/ideas/${post.slug}`}
      media={post.cover}
      ratio={size === "lg" ? "16/9" : "4/3"}
      size={size}
      eyebrow={post.category?.name ?? "Ideas"}
      title={post.title}
      meta={
        <>
          <time dateTime={post.publishedAt}>{formatDate(post.publishedAt)}</time> · {post.readingMinutes} min read
        </>
      }
    >
      {post.excerpt && <p className={size === "lg" ? "max-w-[60ch] text-lead" : "line-clamp-3"}>{post.excerpt}</p>}
    </Card>
  );
}

export function EventCard({ event }: { event: EventCardT }) {
  return (
    <Card
      href={`/events/${event.slug}`}
      media={event.cover}
      ratio="3/2"
      eyebrow={event.state !== "scheduled" ? <span className="text-ink">{event.state === "full" ? "Fully booked" : event.state[0].toUpperCase() + event.state.slice(1)}</span> : "Event"}
      title={event.title}
      meta={
        <>
          <EventDate start={event.startsAt} end={event.endsAt} timeZone={event.timezone} />
          {event.office ? ` · ${event.office.name}` : event.venue ? ` · ${event.venue}` : event.onlineUrl ? " · Online" : ""}
        </>
      }
    >
      {event.summary && <p className="line-clamp-2">{event.summary}</p>}
    </Card>
  );
}

export function NewsCard({ item }: { item: NewsCardT }) {
  return (
    <Card href={`/news/${item.slug}`} media={item.cover} ratio="3/2" eyebrow={item.office ? `${item.office.name} update` : "News"} title={item.title} meta={item.publishedAt ? <time dateTime={item.publishedAt}>{formatDate(item.publishedAt)}</time> : null}>
      {item.summary && <p className="line-clamp-2">{item.summary}</p>}
    </Card>
  );
}

export function OfficeCardView({ office }: { office: OfficeCardT }) {
  return (
    <Card href={`/offices/${office.slug}`} media={office.hero} ratio="3/2" eyebrow={[office.city, office.state].filter(Boolean).join(", ") || "Office"} title={office.name} meta={office.verified && office.lastVerifiedAt ? `Details verified ${formatDate(office.lastVerifiedAt)}` : "Details awaiting verification"}>
      {office.summary && <p className="line-clamp-2">{office.summary}</p>}
    </Card>
  );
}
