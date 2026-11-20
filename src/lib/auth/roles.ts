export const ROLES = [
  "super_admin",
  "central_admin",
  "office_admin",
  "blog_editor",
  "story_editor",
  "events_editor",
  "training_admin",
  "member_support",
  "member",
] as const;
export type Role = (typeof ROLES)[number];

export const ROLE_LABELS: Record<Role, string> = {
  super_admin: "Super admin",
  central_admin: "Central admin",
  office_admin: "Office admin",
  blog_editor: "Blog editor",
  story_editor: "Story editor",
  events_editor: "Events editor",
  training_admin: "Training admin",
  member_support: "Member support",
  member: "Member",
};

const CENTRAL: Role[] = ["super_admin", "central_admin"];

/** Capability → roles (mirrors docs/BUILD_PLAN.md §5 and the RLS policies). */
export const CAPABILITIES = {
  dashboard: ROLES.filter((r) => r !== "member"),
  siteContent: CENTRAL,
  hero: CENTRAL,
  media: [...CENTRAL, "office_admin", "blog_editor", "story_editor", "events_editor", "training_admin"],
  blog: [...CENTRAL, "blog_editor"],
  journeys: [...CENTRAL, "story_editor"],
  events: [...CENTRAL, "events_editor", "office_admin"],
  news: [...CENTRAL, "events_editor"],
  offices: [...CENTRAL, "office_admin"],
  inbox: [...CENTRAL, "office_admin", "member_support"],
  learning: [...CENTRAL, "training_admin"],
  announcements: [...CENTRAL, "training_admin", "office_admin"],
  settings: CENTRAL,
  users: CENTRAL,
  analytics: CENTRAL,
  audit: CENTRAL,
} satisfies Record<string, Role[]>;
export type Capability = keyof typeof CAPABILITIES;

export function can(roles: Role[], cap: Capability) {
  return roles.some((r) => (CAPABILITIES[cap] as Role[]).includes(r));
}

export const isStaffRole = (r: Role) => r !== "member";
