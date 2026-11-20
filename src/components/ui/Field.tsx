import { forwardRef, useId, type InputHTMLAttributes, type SelectHTMLAttributes, type TextareaHTMLAttributes, type ReactNode } from "react";
import { cn } from "@/lib/utils";

const control =
  "w-full rounded-lg border border-line bg-white/80 px-4 text-[1rem] text-canopy placeholder:text-canopy/50 transition-colors focus:border-canopy focus:outline-2 focus:outline-offset-1 focus:outline-canopy aria-[invalid=true]:border-[#9b1c1c]";

type Wrap = { label: string; error?: string; hint?: string; required?: boolean; className?: string };

function FieldWrap({ id, label, error, hint, required, className, children }: Wrap & { id: string; children: ReactNode }) {
  return (
    <div className={className}>
      <label htmlFor={id} className="block text-small font-semibold">
        {label}
        {required && <span aria-hidden> *</span>}
      </label>
      {hint && (
        <p id={`${id}-hint`} className="mt-1 text-caption text-muted">
          {hint}
        </p>
      )}
      <div className="mt-2">{children}</div>
      {error && (
        <p id={`${id}-error`} role="alert" className="mt-2 text-small font-medium text-[#8a1c1c]">
          {error}
        </p>
      )}
    </div>
  );
}

const describe = (id: string, error?: string, hint?: string) => [hint && `${id}-hint`, error && `${id}-error`].filter(Boolean).join(" ") || undefined;

export const TextField = forwardRef<HTMLInputElement, Wrap & InputHTMLAttributes<HTMLInputElement>>(function TextField({ label, error, hint, required, className, ...rest }, ref) {
  const id = useId();
  return (
    <FieldWrap id={id} label={label} error={error} hint={hint} required={required} className={className}>
      <input ref={ref} id={id} aria-invalid={Boolean(error)} aria-required={required} aria-describedby={describe(id, error, hint)} className={cn(control, "min-h-12")} {...rest} />
    </FieldWrap>
  );
});

export const TextareaField = forwardRef<HTMLTextAreaElement, Wrap & TextareaHTMLAttributes<HTMLTextAreaElement>>(function TextareaField({ label, error, hint, required, className, ...rest }, ref) {
  const id = useId();
  return (
    <FieldWrap id={id} label={label} error={error} hint={hint} required={required} className={className}>
      <textarea ref={ref} id={id} rows={5} aria-invalid={Boolean(error)} aria-required={required} aria-describedby={describe(id, error, hint)} className={cn(control, "py-3")} {...rest} />
    </FieldWrap>
  );
});

export const SelectField = forwardRef<HTMLSelectElement, Wrap & SelectHTMLAttributes<HTMLSelectElement> & { options: { value: string; label: string }[]; placeholder?: string }>(function SelectField(
  { label, error, hint, required, className, options, placeholder, ...rest },
  ref,
) {
  const id = useId();
  return (
    <FieldWrap id={id} label={label} error={error} hint={hint} required={required} className={className}>
      <select ref={ref} id={id} aria-invalid={Boolean(error)} aria-required={required} aria-describedby={describe(id, error, hint)} className={cn(control, "min-h-12 appearance-none bg-[url('data:image/svg+xml;utf8,<svg xmlns=%22http://www.w3.org/2000/svg%22 width=%2214%22 height=%2214%22 viewBox=%220 0 24 24%22 fill=%22none%22 stroke=%22%232D3E2C%22 stroke-width=%222%22><path d=%22m6 9 6 6 6-6%22/></svg>')] bg-[position:right_1rem_center] bg-no-repeat pr-10")} {...rest}>
        {placeholder !== undefined && <option value="">{placeholder}</option>}
        {options.map((o) => (
          <option key={o.value} value={o.value}>
            {o.label}
          </option>
        ))}
      </select>
    </FieldWrap>
  );
});

export const CheckboxField = forwardRef<HTMLInputElement, { label: ReactNode; error?: string; className?: string } & InputHTMLAttributes<HTMLInputElement>>(function CheckboxField({ label, error, className, ...rest }, ref) {
  const id = useId();
  return (
    <div className={className}>
      <div className="flex items-start gap-3">
        <input ref={ref} id={id} type="checkbox" aria-invalid={Boolean(error)} aria-describedby={error ? `${id}-error` : undefined} className="mt-1 size-5 shrink-0 accent-[#2D3E2C]" {...rest} />
        <label htmlFor={id} className="text-small">
          {label}
        </label>
      </div>
      {error && (
        <p id={`${id}-error`} role="alert" className="mt-2 text-small font-medium text-[#8a1c1c]">
          {error}
        </p>
      )}
    </div>
  );
});

export function RadioCards({ legend, name, options, error, required, register }: { legend: string; name: string; options: readonly { value: string; label: string; description?: string }[]; error?: string; required?: boolean; register: (n: string) => Record<string, unknown> }) {
  const id = useId();
  return (
    <fieldset aria-describedby={error ? `${id}-error` : undefined}>
      <legend className="text-small font-semibold">
        {legend}
        {required && <span aria-hidden> *</span>}
      </legend>
      <div className="mt-3 grid gap-2 sm:grid-cols-2">
        {options.map((o) => (
          <label key={o.value} className="flex min-h-12 cursor-pointer items-start gap-3 rounded-lg border border-line bg-white/60 p-3.5 transition-colors has-[:checked]:border-canopy has-[:checked]:bg-canopy has-[:checked]:text-white has-[:focus-visible]:outline has-[:focus-visible]:outline-2 has-[:focus-visible]:outline-canopy">
            <input type="radio" value={o.value} className="sr-only" {...register(name)} />
            <span>
              <span className="block font-semibold">{o.label}</span>
              {o.description && <span className="block text-caption opacity-80">{o.description}</span>}
            </span>
          </label>
        ))}
      </div>
      {error && (
        <p id={`${id}-error`} role="alert" className="mt-2 text-small font-medium text-[#8a1c1c]">
          {error}
        </p>
      )}
    </fieldset>
  );
}
