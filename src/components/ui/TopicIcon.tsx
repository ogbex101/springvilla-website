import {
  BookOpen,
  BriefcaseBusiness,
  CalendarDays,
  Clock,
  Compass,
  FolderKanban,
  GraduationCap,
  HeartHandshake,
  Lightbulb,
  Laptop,
  MapPin,
  MessageCircleQuestion,
  MessagesSquare,
  Mic,
  Network,
  Newspaper,
  Package,
  RefreshCcw,
  Route,
  ShieldCheck,
  Sprout,
  Target,
  Building2,
  Flag,
  Users,
  UserRound,
  BadgeCheck,
  Hammer,
  type LucideIcon,
} from "lucide-react";
import { resolveIcon, type IconName } from "@/lib/content/icons";
import { cn } from "@/lib/utils";

const MAP: Record<Exclude<IconName, "auto" | "none">, LucideIcon> = {
  learning: GraduationCap,
  lesson: BookOpen,
  digital: Laptop,
  business: BriefcaseBusiness,
  team: Users,
  leadership: Flag,
  speaking: Mic,
  support: HeartHandshake,
  growth: Sprout,
  discipline: ShieldCheck,
  office: Building2,
  location: MapPin,
  question: MessageCircleQuestion,
  practice: Hammer,
  reflect: RefreshCcw,
  orient: Compass,
  network: Network,
  product: Package,
  events: CalendarDays,
  news: Newspaper,
  ideas: Lightbulb,
  journey: Route,
  communication: MessagesSquare,
  projects: FolderKanban,
  goals: Target,
  time: Clock,
  verified: BadgeCheck,
  people: UserRound,
};

/**
 * A decorative icon chosen from an item's words (or an explicit admin choice).
 * Always aria-hidden: the text beside it carries the meaning.
 */
export function TopicIcon({ text, icon, variant = "badge", className }: { text: string; icon?: string | null; variant?: "badge" | "inline"; className?: string }) {
  const name = resolveIcon(text, icon);
  if (!name || name === "auto" || name === "none") return null;
  const Icon = MAP[name];
  if (variant === "inline") return <Icon aria-hidden strokeWidth={1.75} className={cn("size-4 shrink-0", className)} />;
  return (
    <span data-icon aria-hidden className={cn("relative z-10 inline-flex size-12 shrink-0 items-center justify-center rounded-2xl bg-accent/12 text-accent ring-1 ring-current/15", className)}>
      <Icon strokeWidth={1.6} className="size-[22px]" />
    </span>
  );
}
