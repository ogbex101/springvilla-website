import { Suspense } from "react";
import { notFound } from "next/navigation";
import { requireAdminPage } from "@/lib/auth/session";
import { getEntity } from "@/lib/admin/entities";
import { loadEntity, loadRefs } from "@/app/admin/actions/entities";
import { EntityEditor } from "@/components/admin/EntityEditor";
import { defaultsFor, refKinds } from "@/lib/admin/form-helpers";
import { PageHeader } from "@/components/admin/ui";

type Props = { params: Promise<{ entity: string; id: string }>; searchParams: Promise<{ parent?: string }> };

async function Edit({ params, searchParams }: Props) {
  const { entity, id } = await params;
  const def = getEntity(entity);
  if (!def) notFound();
  const s = await requireAdminPage(def.cap);
  const isNew = id === "new";
  let initial: Record<string, unknown>;
  let meta: Record<string, unknown> | undefined;
  if (isNew) {
    initial = defaultsFor(def.schema);
    const { parent } = await searchParams;
    if (parent && entity === "modules") initial.course_id = parent;
    if (parent && entity === "lessons") initial.module_id = parent;
  } else {
    const r = await loadEntity(entity, id);
    if (!r.ok) notFound();
    meta = r.data;
    const keys = Object.keys(defaultsFor(def.schema));
    initial = Object.fromEntries(keys.map((k) => [k, r.data[k] ?? defaultsFor(def.schema)[k]]));
  }
  const refs = await loadRefs(refKinds(def.schema));
  const isCentral = s.roles.includes("super_admin") || s.roles.includes("central_admin");
  const title = isNew ? `New ${def.label.toLowerCase()}` : String(initial[def.titleField] || def.label);
  return (
    <>
      <PageHeader title={title} back={{ href: `/admin/${entity}`, label: def.plural }} />
      <EntityEditor entityKey={entity} id={isNew ? null : id} initial={initial} refs={refs} isCentral={isCentral} meta={meta} />
    </>
  );
}

export default function EditEntity(props: Props) {
  return (
    <Suspense fallback={<div className="h-96 animate-pulse rounded-xl bg-canopy/5" />}>
      <Edit {...props} />
    </Suspense>
  );
}
