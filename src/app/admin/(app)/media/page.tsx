import { Suspense } from "react";
import { requireAdminPage } from "@/lib/auth/session";
import { can } from "@/lib/auth/roles";
import { MediaLibrary } from "@/components/admin/MediaLibrary";
import { PageHeader } from "@/components/admin/ui";

export const metadata = { title: "Media library" };

async function Lib() {
  const s = await requireAdminPage("media");
  return <MediaLibrary canDelete={can(s.roles, "settings")} />;
}

export default function MediaPage() {
  return (
    <>
      <PageHeader title="Media library" description="Upload real photos and videos. Images are automatically converted to fast WebP/AVIF sizes. Only use photos of real Springvilla people and places with their consent." />
      <Suspense fallback={<div className="h-96 animate-pulse rounded-xl bg-canopy/5" />}>
        <Lib />
      </Suspense>
    </>
  );
}
