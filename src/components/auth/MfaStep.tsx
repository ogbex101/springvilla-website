"use client";

import { useEffect, useState } from "react";
import { getBrowserClient } from "@/lib/supabase/browser";
import { input, label, btn } from "@/components/admin/ui";

/**
 * TOTP MFA for super admins. First visit: enrol (QR + secret) and verify.
 * Later visits: verify a 6-digit code to reach aal2.
 */
export function MfaStep({ next }: { next: string }) {
  const [mode, setMode] = useState<"loading" | "enrol" | "verify">("loading");
  const [factorId, setFactorId] = useState("");
  const [qr, setQr] = useState("");
  const [secret, setSecret] = useState("");
  const [code, setCode] = useState("");
  const [error, setError] = useState("");
  const [busy, setBusy] = useState(false);

  useEffect(() => {
    const sb = getBrowserClient();
    void (async () => {
      const { data } = await sb.auth.mfa.listFactors();
      const verified = data?.totp?.find((f) => f.status === "verified");
      if (verified) {
        setFactorId(verified.id);
        setMode("verify");
        return;
      }
      // Remove stale unverified factors, then enrol a fresh one.
      for (const f of (data?.all ?? []) as { id: string; status: string }[]) if (f.status !== "verified") await sb.auth.mfa.unenroll({ factorId: f.id });
      const { data: enrol, error } = await sb.auth.mfa.enroll({ factorType: "totp", friendlyName: `Springvilla ${new Date().toISOString().slice(0, 10)}` });
      if (error || !enrol) return setError("Couldn't start authenticator setup. Refresh the page to try again.");
      setFactorId(enrol.id);
      setQr(enrol.totp.qr_code);
      setSecret(enrol.totp.secret);
      setMode("enrol");
    })();
  }, []);

  const verify = async (e: React.FormEvent) => {
    e.preventDefault();
    setBusy(true);
    setError("");
    const sb = getBrowserClient();
    const { data: ch, error: chErr } = await sb.auth.mfa.challenge({ factorId });
    if (chErr || !ch) {
      setBusy(false);
      return setError("Couldn't create a challenge. Try again.");
    }
    const { error: vErr } = await sb.auth.mfa.verify({ factorId, challengeId: ch.id, code: code.replace(/\s/g, "") });
    if (vErr) {
      setBusy(false);
      return setError("That code didn't work. Check your authenticator app's time and try the newest code.");
    }
    window.location.assign(next.startsWith("/admin") ? next : "/admin");
  };

  if (mode === "loading") return <p role="status">Checking your authenticator…</p>;
  return (
    <form onSubmit={verify} className="space-y-4">
      {mode === "enrol" && (
        <div className="space-y-3 text-small">
          <p>Super admins must use an authenticator app (for example Google Authenticator, 1Password or Authy). Scan this code, then enter the 6-digit code it shows.</p>
          {/* eslint-disable-next-line @next/next/no-img-element */}
          {qr && <img src={qr} alt="QR code for your authenticator app" className="mx-auto size-48 rounded-lg bg-white p-2" />}
          <p className="break-all rounded-lg bg-canopy/8 p-3 font-mono text-caption">Can&rsquo;t scan? Enter this key: {secret}</p>
        </div>
      )}
      {error && <p role="alert" className="rounded-lg bg-[#f6d9d9] p-3 text-small font-medium text-[#7a1c1c]">{error}</p>}
      <div>
        <label htmlFor="code" className={label}>6-digit code</label>
        <input id="code" inputMode="numeric" autoComplete="one-time-code" pattern="[0-9 ]{6,7}" required value={code} onChange={(e) => setCode(e.target.value)} className={`${input} mt-1.5 text-center text-lg tracking-[0.4em]`} />
      </div>
      <button className={`${btn.primary} w-full`} disabled={busy}>{busy ? "Verifying…" : "Verify"}</button>
    </form>
  );
}
