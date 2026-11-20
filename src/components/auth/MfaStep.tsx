"use client";

import { useEffect, useState } from "react";
import { getBrowserClient } from "@/lib/supabase/browser";
import { input, label, btn } from "@/components/admin/ui";
import { issueBackupCodes, redeemBackupCode } from "@/app/admin/actions/mfa";

/**
 * TOTP MFA for super admins. First visit: enrol (QR + secret), verify, then save
 * one-time backup codes. Later visits: verify a 6-digit code to reach aal2, or use
 * a backup code to reset a lost authenticator and enrol again.
 */
export function MfaStep({ next }: { next: string }) {
  const [mode, setMode] = useState<"loading" | "enrol" | "verify" | "codes" | "recover">("loading");
  const [codes, setCodes] = useState<string[]>([]);
  const [saved, setSaved] = useState(false);
  const [attempt, setAttempt] = useState(0);
  const [factorId, setFactorId] = useState("");
  const [qr, setQr] = useState("");
  const [secret, setSecret] = useState("");
  const [code, setCode] = useState("");
  const [error, setError] = useState("");
  const [busy, setBusy] = useState(false);

  useEffect(() => {
    const sb = getBrowserClient();
    void (async () => {
      setMode("loading");
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
  }, [attempt]);

  const dest = next.startsWith("/admin") ? next : "/admin";

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
    if (mode === "enrol") {
      // First-time setup: show one-time backup codes before continuing.
      const res = await issueBackupCodes();
      setBusy(false);
      if ("codes" in res) {
        setCodes(res.codes);
        setMode("codes");
        return;
      }
      setError(`${res.error} Your authenticator is set up; you can continue.`);
      setMode("codes");
      return;
    }
    window.location.assign(dest);
  };

  const recover = async (e: React.FormEvent) => {
    e.preventDefault();
    setBusy(true);
    setError("");
    const res = await redeemBackupCode(code);
    setBusy(false);
    if ("error" in res) return setError(res.error);
    setCode("");
    setAttempt((n) => n + 1); // re-run setup: the old authenticator has been removed
  };

  if (mode === "codes") {
    const text = `Springvilla admin backup codes\nEach code works once. Keep them somewhere safe.\n\n${codes.join("\n")}\n`;
    return (
      <div className="space-y-4 text-small">
        <h2 className="text-lg font-semibold">Save your backup codes</h2>
        {codes.length > 0 && (
          <>
            <p>If you lose your authenticator, each of these codes lets you reset it once. They won&rsquo;t be shown again.</p>
            <ul aria-label="Backup codes" className="grid grid-cols-2 gap-2 rounded-lg bg-canopy/8 p-3 font-mono text-caption">
              {codes.map((c) => <li key={c}>{c}</li>)}
            </ul>
            <div className="flex gap-2">
              <button type="button" className={btn.secondary} onClick={() => void navigator.clipboard?.writeText(text)}>Copy</button>
              <a className={btn.secondary} download="springvilla-backup-codes.txt" href={`data:text/plain;charset=utf-8,${encodeURIComponent(text)}`}>Download</a>
            </div>
            <label className="flex items-center gap-2">
              <input type="checkbox" checked={saved} onChange={(e) => setSaved(e.target.checked)} /> I&rsquo;ve saved these codes
            </label>
          </>
        )}
        {error && <p role="alert" className="rounded-lg bg-[#f6d9d9] p-3 text-small font-medium text-[#7a1c1c]">{error}</p>}
        <button type="button" className={`${btn.primary} w-full`} disabled={codes.length > 0 && !saved} onClick={() => window.location.assign(dest)}>Continue to admin</button>
      </div>
    );
  }

  if (mode === "recover") {
    return (
      <form onSubmit={recover} className="space-y-4">
        <p className="text-small">Enter one of the backup codes you saved when you set up your authenticator. This removes the old authenticator so you can set up a new one.</p>
        {error && <p role="alert" className="rounded-lg bg-[#f6d9d9] p-3 text-small font-medium text-[#7a1c1c]">{error}</p>}
        <div>
          <label htmlFor="backup" className={label}>Backup code</label>
          <input id="backup" autoComplete="off" required value={code} onChange={(e) => setCode(e.target.value)} className={`${input} mt-1.5 text-center font-mono tracking-widest`} />
        </div>
        <button className={`${btn.primary} w-full`} disabled={busy}>{busy ? "Checking…" : "Use backup code"}</button>
        <button type="button" className="w-full text-small underline" onClick={() => { setError(""); setCode(""); setMode("verify"); }}>Back to authenticator code</button>
      </form>
    );
  }

  if (mode === "loading") return <p role="status">Checking your authenticator…</p>;
  return (
    <form onSubmit={verify} className="space-y-4">
      {mode === "enrol" && (
        <div className="space-y-3 text-small">
          <h2 className="text-lg font-semibold">Set up your authenticator</h2>
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
      {mode === "verify" && (
        <button type="button" className="w-full text-small underline" onClick={() => { setError(""); setCode(""); setMode("recover"); }}>Lost your authenticator? Use a backup code</button>
      )}
    </form>
  );
}
