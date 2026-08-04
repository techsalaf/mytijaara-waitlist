import { z } from "zod";

/**
 * Public waitlist signup schema.
 *
 * The backend agent should reuse this schema server-side (import from
 * `@/lib/schemas/waitlist`) so validation stays in one place.
 */

/**
 * Launch-city order is deliberate: Ibadan first (pilot city), then the rest in
 * rollout order. Only these cities plus "Other" are offered.
 */
export const NIGERIAN_CITIES = [
  "Ibadan",
  "Lagos",
  "Ogun",
  "Osun",
  "Abuja",
  "Kaduna",
  "Kano",
  "Enugu",
  "Other",
] as const;

export const WAITLIST_ROLES = ["customer", "vendor", "rider", "artisan"] as const;

export const waitlistSignupSchema = z.object({
  name: z
    .string()
    .trim()
    .min(2, { message: "Please enter your full name" })
    .max(100, { message: "Name must be less than 100 characters" }),
  email: z
    .string()
    .trim()
    .email({ message: "Enter a valid email address" })
    .max(255, { message: "Email must be less than 255 characters" }),
  phone: z
    .string()
    .trim()
    .max(20, { message: "Phone number too long" })
    .regex(/^$|^[+0-9 ()-]{7,20}$/, { message: "Enter a valid phone number" })
    .optional()
    .or(z.literal("")),
  city: z.enum(NIGERIAN_CITIES, { message: "Pick your city" }),
  role: z.enum(WAITLIST_ROLES).default("customer"),
  referralCode: z
    .string()
    .trim()
    .max(64)
    .optional()
    .or(z.literal("")),
  consent: z.literal(true, {
    message: "Please agree to receive launch updates",
  }),
  // Honeypot — must be empty. Bots fill hidden fields.
  website: z.literal("").optional(),
});

export type WaitlistSignupInput = z.input<typeof waitlistSignupSchema>;
export type WaitlistSignupData = z.output<typeof waitlistSignupSchema>;
