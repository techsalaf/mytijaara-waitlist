import { useEffect, useState } from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { ArrowRight, Check } from "lucide-react";
import { toast } from "sonner";

import { waitlistApi } from "@/lib/api";
import {
  NIGERIAN_CITIES,
  WAITLIST_ROLES,
  waitlistSignupSchema,
  type WaitlistSignupInput,
  type WaitlistSignupData,
} from "@/lib/schemas/waitlist";

const ROLE_LABELS: Record<(typeof WAITLIST_ROLES)[number], string> = {
  customer: "I'm a customer",
  vendor: "I'm a vendor",
  rider: "I'm a rider",
  artisan: "I'm an artisan",
};

const inputCls =
  "w-full rounded-2xl border border-primary-foreground/20 bg-primary-foreground/10 px-4 py-3 text-sm text-primary-foreground placeholder:text-primary-foreground/50 outline-none focus:border-gold focus:bg-primary-foreground/15";

/** Read a referral code from `?ref=` once on mount. */
function useReferralCode() {
  const [code, setCode] = useState("");
  useEffect(() => {
    if (typeof window === "undefined") return;
    const params = new URLSearchParams(window.location.search);
    const ref = params.get("ref");
    if (ref) setCode(ref.slice(0, 64));
  }, []);
  return code;
}

export function WaitlistForm() {
  const referralCode = useReferralCode();
  const [submittedCity, setSubmittedCity] = useState<string | null>(null);
  const [position, setPosition] = useState<number | null>(null);

  const {
    register,
    handleSubmit,
    setValue,
    watch,
    formState: { errors, isSubmitting },
  } = useForm<WaitlistSignupInput, unknown, WaitlistSignupData>({
    resolver: zodResolver(waitlistSignupSchema),
    defaultValues: {
      name: "",
      email: "",
      phone: "",
      city: undefined,
      role: "customer",
      referralCode: "",
      consent: false as unknown as true,
      website: "",
    },
  });

  useEffect(() => {
    if (referralCode) setValue("referralCode", referralCode);
  }, [referralCode, setValue]);

  const role = watch("role");

  const onSubmit = handleSubmit(async (data) => {
    // Honeypot: silently drop bot submissions.
    if (data.website) {
      setSubmittedCity(data.city);
      return;
    }
    try {
      const res = await waitlistApi.create({
        name: data.name,
        email: data.email,
        phone: data.phone || undefined,
        city: data.city,
        role: data.role,
        source: data.referralCode ? "referral" : "organic",
        referralCode: data.referralCode || undefined,
        consent: data.consent,
        website: data.website,
      });
      setSubmittedCity(data.city);
      setPosition(res.data.position ?? null);
      toast.success("You're on the list! 🎉");
    } catch (err) {
      const message =
        err instanceof Error ? err.message : "Something went wrong. Please try again.";
      toast.error(message);
      console.error(err);
    }
  });

  if (submittedCity) {
    return (
      <div className="mt-10 rounded-2xl border border-primary-foreground/20 bg-primary-foreground/10 p-6 text-center">
        <div className="mx-auto grid h-12 w-12 place-items-center rounded-full bg-gold-gradient text-gold-foreground">
          <Check className="h-6 w-6" />
        </div>
        <p className="mt-4 font-display text-xl font-bold">You're on the list! 🎉</p>
        <p className="mt-2 text-sm text-primary-foreground/80">
          We'll message you as soon as MyTijaara launches in {submittedCity}.
        </p>
        {position !== null && (
          <p className="mt-1 text-xs text-primary-foreground/70">You're #{position} in line.</p>
        )}
      </div>
    );
  }

  return (
    <form onSubmit={onSubmit} className="mt-10 space-y-4 text-left" noValidate>
      {/* Role picker */}
      <div className="flex flex-wrap justify-center gap-2" role="radiogroup" aria-label="Role">
        {WAITLIST_ROLES.map((r) => (
          <button
            key={r}
            type="button"
            role="radio"
            aria-checked={role === r}
            onClick={() => setValue("role", r, { shouldValidate: false })}
            className={`cursor-pointer rounded-full px-4 py-2 text-xs font-semibold transition-all ${
              role === r
                ? "bg-gold-gradient text-gold-foreground shadow-soft"
                : "border border-primary-foreground/25 text-primary-foreground/85 hover:bg-primary-foreground/10"
            }`}
          >
            {ROLE_LABELS[r]}
          </button>
        ))}
      </div>

      <div className="grid gap-3 sm:grid-cols-2">
        <FieldW label="Full name" required htmlFor="wl-name" error={errors.name?.message}>
          <input
            id="wl-name"
            type="text"
            autoComplete="name"
            placeholder="Adaeze Okafor"
            aria-invalid={!!errors.name}
            className={inputCls}
            {...register("name")}
          />
        </FieldW>

        <FieldW label="Email" required htmlFor="wl-email" error={errors.email?.message}>
          <input
            id="wl-email"
            type="email"
            autoComplete="email"
            placeholder="you@email.com"
            aria-invalid={!!errors.email}
            className={inputCls}
            {...register("email")}
          />
        </FieldW>

        <FieldW label="WhatsApp number" htmlFor="wl-phone" error={errors.phone?.message}>
          <input
            id="wl-phone"
            type="tel"
            autoComplete="tel"
            placeholder="+234 803 000 0000"
            aria-invalid={!!errors.phone}
            className={inputCls}
            {...register("phone")}
          />
        </FieldW>

        <FieldW label="City" required htmlFor="wl-city" error={errors.city?.message}>
          <select
            id="wl-city"
            aria-invalid={!!errors.city}
            className={inputCls + " appearance-none"}
            defaultValue=""
            {...register("city")}
          >
            <option value="" className="text-neutral-900" disabled>
              Pick your city…
            </option>
            {NIGERIAN_CITIES.map((c) => (
              <option key={c} value={c} className="text-neutral-900">
                {c}
              </option>
            ))}
          </select>
        </FieldW>
      </div>

      {/* Referral code (visible + editable, prefilled from ?ref=) */}
      <FieldW label="Referral code" htmlFor="wl-ref" error={errors.referralCode?.message}>
        <input
          id="wl-ref"
          type="text"
          placeholder="Optional — paste a friend's code"
          className={inputCls}
          {...register("referralCode")}
        />
      </FieldW>

      {/* Consent */}
      <label className="flex items-start gap-3 text-xs text-primary-foreground/85">
        <input
          type="checkbox"
          className="mt-0.5 h-4 w-4 shrink-0 rounded border border-primary-foreground/40 bg-primary-foreground/10 accent-gold"
          aria-invalid={!!errors.consent}
          {...register("consent")}
        />
        <span>
          I agree to receive launch updates from MyTijaara. No spam — you can unsubscribe anytime.
        </span>
      </label>
      {errors.consent && <p className="text-xs text-gold">{errors.consent.message}</p>}

      {/* Honeypot — hidden from users, visible to bots */}
      <div aria-hidden="true" className="hidden">
        <label>
          Leave this field empty
          <input type="text" tabIndex={-1} autoComplete="off" {...register("website")} />
        </label>
      </div>

      <button
        type="submit"
        disabled={isSubmitting}
        className="mt-2 inline-flex w-full cursor-pointer items-center justify-center gap-2 rounded-full bg-gold-gradient px-6 py-3.5 text-sm font-bold text-gold-foreground shadow-soft transition-transform hover:scale-[1.02] disabled:opacity-70"
      >
        {isSubmitting ? (
          "Joining…"
        ) : (
          <>
            Join the waitlist <ArrowRight className="h-4 w-4" />
          </>
        )}
      </button>

      <p className="text-center text-xs text-primary-foreground/60">
        No spam. Just a launch update when we're live near you.
      </p>
    </form>
  );
}

function FieldW({
  label,
  required,
  htmlFor,
  error,
  children,
}: {
  label: string;
  required?: boolean;
  htmlFor: string;
  error?: string;
  children: React.ReactNode;
}) {
  return (
    <label htmlFor={htmlFor} className="block">
      <span className="mb-1.5 block text-xs font-semibold text-primary-foreground/80">
        {label}
        {required && <span className="text-gold"> *</span>}
      </span>
      {children}
      {error && <span className="mt-1 block text-xs text-gold">{error}</span>}
    </label>
  );
}
