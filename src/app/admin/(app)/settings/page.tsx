import { Suspense } from "react";
import { requireAdminPage } from "@/lib/auth/session";
import { loadSettings } from "@/app/admin/actions/settings";
import { SettingsForm } from "@/components/admin/SettingsForm";
import { PageHeader } from "@/components/admin/ui";

export const metadata = { title: "Navigation & settings" };

async function Form() {
  await requireAdminPage("settings");
  return <SettingsForm initial={await loadSettings()} />;
}

export default function SettingsPage() {
  return (
    <>
      <PageHeader title="Navigation & settings" description="Menus, footer, contact details, social links, SEO defaults and privacy settings." />
      <Suspense fallback={<div className="h-96 animate-pulse rounded-xl bg-canopy/5" />}><Form /></Suspense>
    </>
  );
}
