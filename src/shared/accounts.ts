import { z } from "zod";
export const reservedHandles = [
  "admin",
  "administrator",
  "support",
  "moderator",
  "peakunemployment",
  "official",
  "system",
];
export const usernameSchema = z
  .string()
  .trim()
  .toLowerCase()
  .regex(
    /^[a-z0-9_]{3,20}$/,
    "Use 3–20 lowercase letters, numbers, or underscores.",
  )
  .refine((v) => !reservedHandles.includes(v), "This username is reserved.");
export const moods = [
  "",
  "Available to chat",
  "Job hunting",
  "Building something",
  "Interview tomorrow",
  "Taking a break",
  "Just browsing",
] as const;
export const employmentStatuses = [
  "Currently unemployed",
  "Looking for a job",
  "Recently laid off",
  "Fresh graduate",
  "Employed, but exploring",
  "Changing careers",
  "Taking a career break",
  "Prefer not to say",
] as const;
export const detailsSchema = z
  .object({
    display_name: z
      .string()
      .trim()
      .max(40)
      .refine(
        (v) =>
          Array.from(v).every(
            (char) => char.charCodeAt(0) >= 32 && char.charCodeAt(0) !== 127,
          ),
        "Display names cannot contain control characters.",
      ),
    bio: z.string().max(300),
    mood: z.enum(moods),
    visibility: z.enum(["public", "members", "private"]),
  })
  .partial()
  .strict();
export const employmentSchema = z
  .object({
    status: z.enum(employmentStatuses),
    show_status: z.boolean(),
    show_history: z.boolean(),
  })
  .partial()
  .strict();
const month = z.string().regex(/^\d{4}-(0[1-9]|1[0-2])-01$/);
export const periodSchema = z
  .object({
    start_month: month,
    end_month: month.nullable(),
    note: z.string().max(200).default(""),
  })
  .strict()
  .refine(
    (v) => !v.end_month || v.end_month >= v.start_month,
    "End month must not be before start month.",
  )
  .refine(
    (v) =>
      v.start_month <= new Date().toISOString().slice(0, 7) + "-01" &&
      (!v.end_month ||
        v.end_month <= new Date().toISOString().slice(0, 7) + "-01"),
    "Dates cannot be in the future.",
  );
export function monthDuration(
  start: string,
  end: string | null,
  now = new Date(),
) {
  const last = end || now.toISOString().slice(0, 7);
  return (
    (Number(last.slice(0, 4)) - Number(start.slice(0, 4))) * 12 +
    Number(last.slice(5, 7)) -
    Number(start.slice(5, 7)) +
    1
  );
}
export interface ProfileDetails {
  profile_id: string;
  display_name: string;
  bio: string;
  mood: string;
  visibility: "public" | "members" | "private";
  avatar_path: string | null;
  banner_path: string | null;
}
export interface Employment {
  status: string;
  show_status: boolean;
  show_history: boolean;
}
export interface Period {
  id: string;
  start_month: string;
  end_month: string | null;
  note: string;
}
