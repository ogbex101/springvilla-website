"use client";

import { useEffect, useRef, useState } from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { CheckCircle2 } from "lucide-react";
import { joinSchema, INTERESTS, AGE_RANGES, SITUATIONS, HOW_HEARD, CONTACT_METHODS, type JoinInput } from "@/lib/forms/schemas";
import { submitJoin } from "@/app/actions/forms";
import { TextField, TextareaField, SelectField, CheckboxField, RadioCards } from "@/components/ui/Field";
import { Button } from "@/components/ui";
import { track } from "@/lib/analytics/client";

type Office = { id: string; name: string; city: string | null; state: string | null };
type Copy = { enquiryNote: string; successHeading: string; successBody: string; privacyLabel: string; contactLabel: string };

/** Join application: inline validation, preserved input, duplicate-submit protection, honeypot. */
export function JoinForm({ offices, copy }: { offices: Office[]; copy: Copy }) {
  const [serverError, setServerError] = useState<string | null>(null);
  const [done, setDone] = useState<null | { duplicate?: boolean }>(null);
  const started = useRef(false);
  const startedAt = useRef<number>(0);
  const successRef = useRef<HTMLHeadingElement>(null);

  const { register, handleSubmit, setError, formState } = useForm<JoinInput>({
    resolver: zodResolver(joinSchema),
    mode: "onTouched",
    defaultValues: { officeId: "", state: "", ageRange: "", currentSituation: "", howHeard: "", hopedOutcome: "", consentContact: true, website: "" },
  });
  const { errors, isSubmitting } = formState;

  useEffect(() => {
    startedAt.current = Date.now();
  }, []);
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
    const res = await submitJoin({ ...values, startedAt: startedAt.current, sourcePath: window.location.pathname, utm });
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
        <p className="mt-3 max-w-[52ch] text-lead text-muted">{done.duplicate ? "We already have your details from today, so there's no need to send them again. " : ""}{copy.successBody}</p>
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

      <div className="grid gap-6 md:grid-cols-2">
        <TextField label="Full name" required autoComplete="name" error={errors.fullName?.message} {...register("fullName")} />
        <TextField label="Email" required type="email" autoComplete="email" inputMode="email" error={errors.email?.message} {...register("email")} />
        <TextField label="Phone" required type="tel" autoComplete="tel" inputMode="tel" error={errors.phone?.message} {...register("phone")} />
        <SelectField label="How should we contact you?" required options={[...CONTACT_METHODS]} placeholder="Choose one" error={errors.preferredContact?.message} {...register("preferredContact")} />
        <TextField label="City or town" required autoComplete="address-level2" error={errors.city?.message} {...register("city")} />
        <TextField label="State / region" autoComplete="address-level1" error={errors.state?.message} {...register("state")} />
        {officeOptions.length > 0 && (
          <SelectField className="md:col-span-2" label="Preferred office" hint="Your details go to this office's team. Not sure? Leave it and we'll route you to the nearest one." options={officeOptions} placeholder="Not sure / nearest to me" error={errors.officeId?.message} {...register("officeId")} />
        )}
      </div>

      <RadioCards legend="What are you interested in?" name="interest" required options={INTERESTS} error={errors.interest?.message} register={(n) => register(n as "interest")} />

      <div className="grid gap-6 md:grid-cols-3">
        <SelectField label="Age range" options={AGE_RANGES.map((a) => ({ value: a, label: a }))} placeholder="Prefer not to say" {...register("ageRange")} />
        <SelectField label="Current situation" options={SITUATIONS.map((a) => ({ value: a, label: a }))} placeholder="Prefer not to say" {...register("currentSituation")} />
        <SelectField label="How did you hear about us?" options={HOW_HEARD.map((a) => ({ value: a, label: a }))} placeholder="Choose one" {...register("howHeard")} />
      </div>

      <TextareaField label="What would you like to get out of Springvilla?" hint="Optional. A sentence or two is plenty." error={errors.hopedOutcome?.message} {...register("hopedOutcome")} />

      <div className="space-y-4">
        <CheckboxField label={<>{copy.privacyLabel} <a href="/privacy" className="underline">Privacy policy</a>.</>} error={errors.consentPrivacy?.message} {...register("consentPrivacy")} />
        <CheckboxField label={copy.contactLabel} {...register("consentContact")} />
      </div>

      {copy.enquiryNote && <p className="rounded-lg bg-chip p-4 text-small">{copy.enquiryNote}</p>}

      {serverError && (
        <p id="join-error" role="alert" className="rounded-lg border border-[#8a1c1c]/40 bg-white p-4 font-medium text-[#8a1c1c]">
          {serverError}
        </p>
      )}

      <Button type="submit" disabled={isSubmitting} arrow aria-busy={isSubmitting}>
        {isSubmitting ? "Sending…" : "Send my details"}
      </Button>
    </form>
  );
}
