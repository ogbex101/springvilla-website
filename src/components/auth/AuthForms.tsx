"use client";

import Link from "next/link";
import { useActionState } from "react";
import { adminSignIn, requestPasswordReset, updatePassword, type AuthState } from "@/app/admin/actions/auth";
import { input, label, btn } from "@/components/admin/ui";

function Message({ state }: { state: AuthState }) {
  if (!state) return null;
  if (state.error) return <p role="alert" className="rounded-lg bg-[#f6d9d9] p-3 text-small font-medium text-[#7a1c1c]">{state.error}</p>;
  if (state.message) return <p role="status" className="rounded-lg bg-[#dff3d6] p-3 text-small font-medium text-[#1d4d14]">{state.message}</p>;
  return null;
}

export function AdminLoginForm({ next, notice }: { next?: string; notice?: string }) {
  const [state, action, pending] = useActionState(adminSignIn, null);
  return (
    <form action={action} className="space-y-4">
      {notice && <p role="status" className="rounded-lg bg-[#fbecc8] p-3 text-small text-[#6b4a00]">{notice}</p>}
      <Message state={state} />
      <input type="hidden" name="next" value={next ?? ""} />
      <div>
        <label htmlFor="email" className={label}>Email</label>
        <input id="email" name="email" type="email" autoComplete="username" required className={`${input} mt-1.5`} />
      </div>
      <div>
        <label htmlFor="password" className={label}>Password</label>
        <input id="password" name="password" type="password" autoComplete="current-password" required className={`${input} mt-1.5`} />
      </div>
      <button className={`${btn.primary} w-full`} disabled={pending} aria-busy={pending}>{pending ? "Signing in…" : "Sign in"}</button>
      <p className="text-center text-small"><Link href="/admin/forgot" className="underline underline-offset-4">Forgot your password?</Link></p>
    </form>
  );
}

export function ForgotForm() {
  const [state, action, pending] = useActionState(requestPasswordReset, null);
  return (
    <form action={action} className="space-y-4">
      <Message state={state} />
      <div>
        <label htmlFor="email" className={label}>Email</label>
        <input id="email" name="email" type="email" autoComplete="email" required className={`${input} mt-1.5`} />
      </div>
      <button className={`${btn.primary} w-full`} disabled={pending}>{pending ? "Sending…" : "Send reset link"}</button>
    </form>
  );
}

export function ResetForm() {
  const [state, action, pending] = useActionState(updatePassword, null);
  return (
    <form action={action} className="space-y-4">
      <Message state={state} />
      <div>
        <label htmlFor="password" className={label}>New password</label>
        <input id="password" name="password" type="password" autoComplete="new-password" minLength={12} required className={`${input} mt-1.5`} />
        <p className="mt-1 text-caption text-canopy/75">At least 12 characters.</p>
      </div>
      <div>
        <label htmlFor="confirm" className={label}>Confirm new password</label>
        <input id="confirm" name="confirm" type="password" autoComplete="new-password" required className={`${input} mt-1.5`} />
      </div>
      <button className={`${btn.primary} w-full`} disabled={pending}>{pending ? "Saving…" : "Set new password"}</button>
    </form>
  );
}
