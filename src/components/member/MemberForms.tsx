"use client";

import Link from "next/link";
import { useActionState, useEffect } from "react";
import { memberSignIn, createSupport, saveProfile, changePassword, type State } from "@/app/member/actions";
import { input, label, btn } from "@/components/admin/ui";
import { track } from "@/lib/analytics/client";

function Msg({ s }: { s: State }) {
  if (!s) return null;
  return s.error ? <p role="alert" className="rounded-lg bg-[#f6d9d9] p-3 text-small font-medium text-[#7a1c1c]">{s.error}</p> : <p role="status" className="rounded-lg bg-[#dff3d6] p-3 text-small font-medium text-[#1d4d14]">{s.message}</p>;
}

export function MemberLoginForm({ next, notice }: { next?: string; notice?: string }) {
  const [s, action, pending] = useActionState(memberSignIn, null);
  return (
    <form action={action} className="space-y-4">
      {notice && <p role="status" className="rounded-lg bg-[#fbecc8] p-3 text-small text-[#6b4a00]">{notice}</p>}
      <Msg s={s} />
      <input type="hidden" name="next" value={next ?? ""} />
      <div><label htmlFor="email" className={label}>Email</label><input id="email" name="email" type="email" autoComplete="username" required className={`${input} mt-1.5 min-h-12`} /></div>
      <div><label htmlFor="password" className={label}>Password</label><input id="password" name="password" type="password" autoComplete="current-password" required className={`${input} mt-1.5 min-h-12`} /></div>
      <button className={`${btn.primary} min-h-12 w-full`} disabled={pending}>{pending ? "Signing in…" : "Sign in"}</button>
      <p className="text-center text-small"><Link href="/admin/forgot" className="underline underline-offset-4">Forgot your password?</Link></p>
    </form>
  );
}

/** Fires login_success once after redirect from sign-in. */
export function LoginTracker() {
  useEffect(() => {
    const u = new URL(location.href);
    if (u.searchParams.get("signed_in")) {
      (window as unknown as { __svNoTrack?: boolean }).__svNoTrack = false;
      track("login_success");
      u.searchParams.delete("signed_in");
      history.replaceState(null, "", u.pathname + u.search);
    }
  }, []);
  return null;
}

export function SupportForm() {
  const [s, action, pending] = useActionState(createSupport, null);
  return (
    <form action={action} className="space-y-4">
      <Msg s={s} />
      <div><label htmlFor="cat" className={label}>Topic</label>
        <select id="cat" name="category" className={`${input} mt-1.5`}>{[["general", "General"], ["learning", "Learning"], ["office", "My office"], ["account", "My account"], ["wellbeing", "Wellbeing"]].map(([v, l]) => <option key={v} value={v}>{l}</option>)}</select></div>
      <div><label htmlFor="subj" className={label}>Subject</label><input id="subj" name="subject" required className={`${input} mt-1.5`} /></div>
      <div><label htmlFor="msg" className={label}>How can we help?</label><textarea id="msg" name="message" rows={5} required className={`${input} mt-1.5 py-2`} /></div>
      <button className={btn.primary} disabled={pending}>{pending ? "Sending…" : "Send request"}</button>
    </form>
  );
}

export function ProfileForm({ name, phone, showName }: { name: string; phone: string; showName: boolean }) {
  const [s, action, pending] = useActionState(saveProfile, null);
  return (
    <form action={action} className="space-y-4">
      <Msg s={s} />
      <div><label htmlFor="dn" className={label}>Your name</label><input id="dn" name="display_name" defaultValue={name} required className={`${input} mt-1.5`} /></div>
      <div><label htmlFor="ph" className={label}>Phone</label><input id="ph" name="phone" type="tel" defaultValue={phone} className={`${input} mt-1.5`} /></div>
      <label className="flex items-start gap-2 text-small"><input type="checkbox" name="show_name_to_office" defaultChecked={showName} className="mt-0.5 size-4 accent-[#2D3E2C]" /> Let my office team see my name in member lists</label>
      <button className={btn.primary} disabled={pending}>{pending ? "Saving…" : "Save"}</button>
    </form>
  );
}

export function PasswordForm() {
  const [s, action, pending] = useActionState(changePassword, null);
  return (
    <form action={action} className="space-y-4">
      <Msg s={s} />
      <div><label htmlFor="pw" className={label}>New password</label><input id="pw" name="password" type="password" autoComplete="new-password" minLength={12} required className={`${input} mt-1.5`} /></div>
      <div><label htmlFor="pw2" className={label}>Confirm</label><input id="pw2" name="confirm" type="password" autoComplete="new-password" required className={`${input} mt-1.5`} /></div>
      <button className={btn.secondary} disabled={pending}>{pending ? "Saving…" : "Change password"}</button>
    </form>
  );
}
