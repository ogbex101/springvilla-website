"use client";

import { useRouter } from "next/navigation";
import { useState } from "react";
import { X, UserPlus } from "lucide-react";
import { ROLES, ROLE_LABELS, type Role } from "@/lib/auth/roles";
import { inviteUser, addRole, removeRole, setActive } from "@/app/admin/actions/users";
import { useToast } from "./Toast";
import { Panel, Badge, btn, input, label } from "./ui";
import { cn } from "@/lib/utils";

type User = { id: string; email: string; name: string | null; active: boolean; roles: { id: string; role: Role; office: string | null }[] };
type Office = { id: string; name: string };

function RolePicker({ offices, isSuper, onSubmit, submitLabel }: { offices: Office[]; isSuper: boolean; onSubmit: (role: string, office: string | null) => Promise<void>; submitLabel: string }) {
  const [role, setRole] = useState<string>("member");
  const [office, setOffice] = useState<string>("");
  const needsOffice = role === "office_admin" || role === "member";
  return (
    <div className="flex flex-wrap items-end gap-2">
      <div>
        <label className={label} htmlFor="role-sel">Role</label>
        <select id="role-sel" className={cn(input, "mt-1 w-auto")} value={role} onChange={(e) => setRole(e.target.value)}>
          {ROLES.filter((r) => r !== "super_admin" || isSuper).map((r) => <option key={r} value={r}>{ROLE_LABELS[r]}</option>)}
        </select>
      </div>
      {needsOffice && (
        <div>
          <label className={label} htmlFor="office-sel">Office{role === "office_admin" ? " *" : ""}</label>
          <select id="office-sel" className={cn(input, "mt-1 w-auto")} value={office} onChange={(e) => setOffice(e.target.value)}>
            <option value="">{role === "member" ? "No office yet" : "Choose…"}</option>
            {offices.map((o) => <option key={o.id} value={o.id}>{o.name}</option>)}
          </select>
        </div>
      )}
      <button type="button" className={btn.primary} onClick={() => onSubmit(role, office || null)}>{submitLabel}</button>
    </div>
  );
}

export function UsersManager({ users, offices, isSuper, me }: { users: User[]; offices: Office[]; isSuper: boolean; me: string }) {
  const router = useRouter();
  const toast = useToast();
  const [email, setEmail] = useState("");
  const [q, setQ] = useState("");
  const done = (r: { ok: boolean; error?: string; message?: string }, ok: string) => {
    toast(r.ok ? "success" : "error", r.ok ? r.message ?? ok : r.error ?? "Error");
    if (r.ok) router.refresh();
  };
  const shown = users.filter((u) => !q || `${u.email} ${u.name}`.toLowerCase().includes(q.toLowerCase()));
  return (
    <div className="space-y-6">
      <Panel title="Invite someone">
        <label className={label} htmlFor="inv-email">Email</label>
        <input id="inv-email" type="email" className={cn(input, "mt-1 max-w-md")} value={email} onChange={(e) => setEmail(e.target.value)} />
        <div className="mt-3"><RolePicker offices={offices} isSuper={isSuper} submitLabel="Send invitation" onSubmit={async (role, office) => { const r = await inviteUser({ email, role, office_id: office }); done(r, "Invited."); if (r.ok) setEmail(""); }} /></div>
        <p className="mt-2 text-caption text-canopy/75">They get an email to set a password. Super admins must also set up an authenticator app on first sign-in.</p>
      </Panel>
      <div>
        <label htmlFor="user-q" className="sr-only">Search users</label>
        <input id="user-q" className={cn(input, "max-w-sm")} placeholder="Search by name or email" value={q} onChange={(e) => setQ(e.target.value)} />
      </div>
      <ul className="space-y-3">
        {shown.map((u) => (
          <li key={u.id} className={cn("rounded-xl bg-white p-4 ring-1 ring-canopy/10", !u.active && "opacity-70")}>
            <div className="flex flex-wrap items-start justify-between gap-3">
              <div>
                <p className="font-semibold">{u.name || u.email} {!u.active && <Badge tone="bad">Deactivated</Badge>} {u.id === me && <Badge tone="info">You</Badge>}</p>
                <p className="text-small text-canopy/75">{u.email}</p>
              </div>
              {u.id !== me && <button className={u.active ? btn.danger : btn.secondary} onClick={async () => { if (!confirm(u.active ? "Deactivate this user? They will no longer be able to sign in." : "Reactivate this user?")) return; done(await setActive(u.id, !u.active), "Updated."); }}>{u.active ? "Deactivate" : "Reactivate"}</button>}
            </div>
            <ul className="mt-3 flex flex-wrap gap-2">
              {u.roles.length === 0 && <li className="text-small text-canopy/70">No roles</li>}
              {u.roles.map((r) => (
                <li key={r.id} className="inline-flex items-center gap-1 rounded-full bg-sand px-3 py-1 text-caption font-semibold">
                  {ROLE_LABELS[r.role]}{r.office ? ` · ${r.office}` : ""}
                  <button className="-mr-1 p-0.5 hover:text-[#7a1c1c]" aria-label={`Remove ${ROLE_LABELS[r.role]} role`} onClick={async () => { if (confirm("Remove this role?")) done(await removeRole(r.id), "Role removed."); }}><X className="size-3.5" /></button>
                </li>
              ))}
            </ul>
            <details className="mt-3">
              <summary className="inline-flex cursor-pointer items-center gap-1 text-small font-semibold"><UserPlus className="size-4" aria-hidden /> Add a role</summary>
              <div className="mt-2"><RolePicker offices={offices} isSuper={isSuper} submitLabel="Add role" onSubmit={async (role, office) => done(await addRole(u.id, { role, office_id: office }), "Role added.")} /></div>
            </details>
          </li>
        ))}
      </ul>
    </div>
  );
}
