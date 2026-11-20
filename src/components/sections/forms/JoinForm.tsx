"use client";

import { useEffect, useRef, useState } from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { CheckCircle2 } from "lucide-react";
import { joinSchema, INTERESTS, OCCUPATIONS, CONTACT_METHODS, type JoinInput } from "@/lib/forms/schemas";
import { submitJoin } from "@/app/actions/forms";
import { TextField, TextareaField, SelectField, CheckboxField, RadioCards } from "@/components/ui/Field";
import { Button } from "@/components/ui";
import { track } from "@/lib/analytics/client";

type Office = { id: string; slug: string; name: string; city: string | null; state: string | null };
type Copy = { enquiryNote: string; successHeading: string; successBody: string; privacyLabel: string; marketingLabel: string; consentVersion: string };

/**
 * Join application (blueprint §12.2 / §12.3): minimum fields, email OR phone,
 * validation at submission then live, preserved input, duplicate-submit
 * protection, honeypot, server outcome shown only after success.
 */
export function JoinForm({ offices, copy }: { offices: Office[]; copy: Copy }) {
  const [serverError, setServerError] = useState<string | null>(null);
  const [done, setDone] = useState<null | { duplicate?: boolean }>(null);
  const started = useRef(false);
  const startedAt = useRef<number>(0);
  const successRef = useRef<HTMLHeadingElement>(null);

  const { register, handleSubmit, setError, setValue, formState } = useForm<JoinInput>({
    resolver: zodResolver(joinSchema),
    mode: "onSubmit",
    reValidateMode: "onChange",
    defaultValues: { fullName: "", email: "", phone: "", city: "", officeId: "", occupation: "", message: "", marketingOptIn: false, website: "" },
  });
  const { errors, isSubmitting } = formState;

  useEffect(() => {
    startedAt.current = Date.now();
    // "Apply with this office" links pass ?office=<slug>.
    const slug = new URLSearchParams(window.location.search).get("office");
    const match = slug ? offices.find((o) => o.slug === slug) : undefined;
    if (match) setValue("officeId", match.id);
  }, [offices, setValue]);
  useEffect(() => {
    if (done) successRef.current?.focus();
  }, [done]);

  const onFirstInteract = () => {
    if (started.current) return;
    started.current = true;
    track("join_started");
  };

  const submit = async (values: JoinInput) => {
    setServerError(null);
    const params = new URLSearchParams(window.location.search);
    const utm = Object.fromEntries(["utm_source", "utm_medium", "utm_campaign"].map((k) => [k, params.get(k) ?? ""]).filter(([, v]) => v));
    const res = await submitJoin({ ...values, startedAt: startedAt.current, sourcePath: window.location.pathname, utm, consentVersion: copy.consentVersion || undefined });
    if (res.ok) {
      track("join_submitted", { interest: values.interest, office: values.officeId ? "chosen" : "none" });
      setDone({ duplicate: res.duplicate });
      return;
    }
    setServerError(res.error);
    for (const [k, msg] of Object.entries(res.fieldErrors ?? {})) setError(k as keyof JoinInput, { message: msg });
  };

  if (done) {
    return (
      <div className="rounded-xl bg-white/70 p-8 ring-1 ring-line" role="status">
        <CheckCircle2 className="size-10" aria-hidden />
        <h3 ref={successRef} tabIndex={-1} className="mt-5 text-display-s font-semibold outline-none">
          {copy.successHeading}
        </h3>
        <p className="mt-3 max-w-[52ch] text-lead text-muted">
          {done.duplicate ? "We already received your details today, so there's no need to send them again. " : ""}
          {copy.successBody}
        </p>
      </div>
    );
  }

  const officeOptions = offices.map((o) => ({ value: o.id, label: [o.name, o.city].filter(Boolean).join(" · ") }));

  return (
    <form onSubmit={(e) => void handleSubmit(submit)(e)} onFocusCapture={onFirstInteract} noValidate className="space-y-8" aria-describedby={serverError ? "join-error" : undefined}>
      {/* Honeypot: hidden from people and assistive tech */}
      <div aria-hidden className="absolute -left-[9999px] h-0 w-0 overflow-hidden">
        <label>
          Website <input tabIndex={-1} autoComplete="off" {...register("website")} />
        </label>
      </div>

      <TextField label="Full name" required autoComplete="name" error={errors.fullName?.message} {...register("fullName")} />

      <fieldset>
        <legend className="text-small font-semibold">
          How can we reach you? <span className="font-normal text-muted">Give at least one.</span>
        </legend>
        <div className="mt-3 grid gap-6 md:grid-cols-2">
          <TextField label="Email" type="email" autoComplete="email" inputMode="email" error={errors.email?.message} {...register("email")} />
          <TextField label="Phone" type="tel" autoComplete="tel" inputMode="tel" error={errors.phone?.message} {...register("phone")} />
        </div>
      </fieldset>

      <RadioCards legend="Preferred contact method" name="preferredContact" required options={CONTACT_METHODS} error={errors.preferredContact?.message} register={(n) => register(n as "preferredContact")} />

      <div className="grid gap-6 md:grid-cols-2">
        <TextField label="City / state" required autoComplete="address-level2" hint="Used to connect you with the right office, not to locate you precisely." error={errors.city?.message} {...register("city")} />
        <SelectField label="Preferred office" hint="Optional." options={officeOptions} placeholder="Help me find one" error={errors.officeId?.message} {...register("officeId")} />
      </div>

      <RadioCards legend="What are you interested in?" name="interest" required options={INTERESTS} error={errors.interest?.message} register={(n) => register(n as "interest")} />

      <SelectField label="Current occupation" hint="Optional." options={[...OCCUPATIONS]} placeholder="Choose one" {...register("occupation")} />

      <TextareaField label="Question or message" hint="Optional. Up to 1500 characters." maxLength={1500} error={errors.message?.message} {...register("message")} />

      <div className="space-y-4">
        <CheckboxField label={<>{copy.privacyLabel} <a href="/privacy" className="underline">Read the privacy policy</a>.</>} error={errors.consentPrivacy?.message} {...register("consentPrivacy")} />
        <CheckboxField label={copy.marketingLabel} {...register("marketingOptIn")} />
      </div>

      {copy.enquiryNote && <p className="rounded-lg bg-chip p-4 text-small">{copy.enquiryNote}</p>}

      {serverError && (
        <p id="join-error" role="alert" className="rounded-lg border border-[#8a1c1c]/40 bg-white p-4 font-medium text-[#8a1c1c]">
          {serverError}
        </p>
      )}

      <Button type="submit" disabled={isSubmitting} arrow aria-busy={isSubmitting}>
        {isSubmitting ? "Submitting…" : "Submit Enquiry"}
      </Button>
    </form>
  );
}
