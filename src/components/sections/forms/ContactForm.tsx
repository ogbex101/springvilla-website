"use client";

import { useEffect, useRef, useState } from "react";
import { useForm, useWatch } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { CheckCircle2 } from "lucide-react";
import { contactSchema, type ContactInput } from "@/lib/forms/schemas";
import { submitContact } from "@/app/actions/forms";
import { TextField, TextareaField, SelectField, CheckboxField, RadioCards } from "@/components/ui/Field";
import { Button } from "@/components/ui";
import { track } from "@/lib/analytics/client";

type Office = { id: string; slug: string; name: string; city: string | null };

export function ContactForm({ types, offices, successHeading, successBody, defaultType }: { types: { value: string; label: string; description: string }[]; offices: Office[]; successHeading: string; successBody: string; defaultType?: string }) {
  const [serverError, setServerError] = useState<string | null>(null);
  const [done, setDone] = useState(false);
  const startedAt = useRef(0);
  const successRef = useRef<HTMLHeadingElement>(null);
  const { register, handleSubmit, setError, setValue, control, formState } = useForm<ContactInput>({
    resolver: zodResolver(contactSchema),
    mode: "onSubmit",
    reValidateMode: "onChange",
    defaultValues: { enquiryType: (defaultType as ContactInput["enquiryType"]) ?? undefined, name: "", email: "", message: "", officeId: "", phone: "", subject: "", website: "" },
  });
  const { errors, isSubmitting } = formState;
  const type = useWatch({ control, name: "enquiryType" });
  useEffect(() => {
    startedAt.current = Date.now();
    // Deep links such as /contact?type=feedback pre-select the queue.
    const qs = new URLSearchParams(window.location.search);
    const t = qs.get("type");
    if (t && types.some((x) => x.value === t)) setValue("enquiryType", t as ContactInput["enquiryType"]);
    const office = offices.find((o) => o.slug === qs.get("office"));
    if (office) setValue("officeId", office.id);
    if (qs.get("report")) setValue("subject", `Incorrect details${office ? `: ${office.name}` : ""}`);
  }, [setValue, types, offices]);
  useEffect(() => {
    if (done) successRef.current?.focus();
  }, [done]);

  const submit = async (values: ContactInput) => {
    setServerError(null);
    const res = await submitContact({ ...values, startedAt: startedAt.current, sourcePath: window.location.pathname });
    if (res.ok) {
      track("contact_submitted", { type: values.enquiryType });
      setDone(true);
      return;
    }
    setServerError(res.error);
    for (const [k, msg] of Object.entries(res.fieldErrors ?? {})) setError(k as keyof ContactInput, { message: msg });
  };

  if (done) {
    return (
      <div className="rounded-xl bg-white/70 p-8 ring-1 ring-line" role="status">
        <CheckCircle2 className="size-10" aria-hidden />
        <h2 ref={successRef} tabIndex={-1} className="mt-5 text-display-s font-semibold outline-none">
          {successHeading}
        </h2>
        <p className="mt-3 max-w-[52ch] text-lead text-muted">{successBody}</p>
      </div>
    );
  }

  return (
    <form onSubmit={(e) => void handleSubmit(submit)(e)} noValidate className="space-y-8">
      <div aria-hidden className="absolute -left-[9999px] h-0 w-0 overflow-hidden">
        <label>
          Website <input tabIndex={-1} autoComplete="off" {...register("website")} />
        </label>
      </div>
      <RadioCards legend="What is your enquiry about?" name="enquiryType" required options={types} error={errors.enquiryType?.message} register={(n) => register(n as "enquiryType")} />
      <div className="grid gap-6 md:grid-cols-2">
        <TextField label="Your name" required autoComplete="name" error={errors.name?.message} {...register("name")} />
        <TextField label="Email" required type="email" autoComplete="email" error={errors.email?.message} {...register("email")} />
        <TextField label="Phone" type="tel" autoComplete="tel" hint="Optional" error={errors.phone?.message} {...register("phone")} />
        {offices.length > 0 && (type === "office_information" || type === "product" || type === "office_visit" || type === "feedback") ? (
          <SelectField label="Which office?" options={offices.map((o) => ({ value: o.id, label: [o.name, o.city].filter(Boolean).join(" · ") }))} placeholder="Not office-specific" {...register("officeId")} />
        ) : (
          <TextField label="Subject" hint="Optional" error={errors.subject?.message} {...register("subject")} />
        )}
      </div>
      <TextareaField label="Message" required error={errors.message?.message} {...register("message")} />
      <CheckboxField label={<>I agree that Springvilla can store these details to reply to me, as described in the <a href="/privacy" className="underline">privacy policy</a>.</>} error={errors.consentPrivacy?.message} {...register("consentPrivacy")} />
      {serverError && (
        <p role="alert" className="rounded-lg border border-[#8a1c1c]/40 bg-white p-4 font-medium text-[#8a1c1c]">
          {serverError}
        </p>
      )}
      <Button type="submit" disabled={isSubmitting} arrow aria-busy={isSubmitting}>
        {isSubmitting ? "Sending…" : "Send message"}
      </Button>
    </form>
  );
}
