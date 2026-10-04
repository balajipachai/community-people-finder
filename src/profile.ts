import { z } from "zod";

// Profile records on each member's ENS name. `description` is the standard
// ENSIP-5 global key; the others are service keys in reverse-dot notation.
export const PROFILE_KEYS = {
  bio: "description",
  skills: "app.community.skills", // comma-separated, e.g. "rust, wasm, mentoring"
  availability: "app.community.availability", // open | limited | unavailable
} as const;

export const AVAILABILITY = ["open", "limited", "unavailable"] as const;
export type Availability = (typeof AVAILABILITY)[number] | "unknown";

export const MAX_BIO_CHARS = 500;
export const MAX_SKILLS = 12;
export const MAX_SKILL_CHARS = 32;

export interface Profile {
  name: string; // normalized ENS name
  bio: string;
  skills: string[];
  availability: Availability;
}

export interface RawProfile {
  bio: string | null;
  skills: string | null;
  availability: string | null;
}

const SKILL_RE = /^[\p{L}\p{N}][\p{L}\p{N} +#.\-]*$/u;
const availabilitySchema = z.enum(AVAILABILITY);

function cleanText(s: string): string {
  // eslint-disable-next-line no-control-regex
  return s.replace(/[\u0000-\u001f\u007f]+/g, " ").replace(/\s+/g, " ").trim();
}

export function parseSkills(raw: string | null): string[] {
  if (!raw) return [];
  const out = new Set<string>();
  for (const part of raw.split(",")) {
    const skill = cleanText(part).toLowerCase();
    if (skill.length === 0 || skill.length > MAX_SKILL_CHARS || !SKILL_RE.test(skill)) continue;
    out.add(skill);
    if (out.size >= MAX_SKILLS) break;
  }
  return [...out];
}

/** Validate raw ENS values into a Profile, or null if there is nothing usable. */
export function parseProfile(name: string, raw: RawProfile): Profile | null {
  const bio = raw.bio ? cleanText(raw.bio).slice(0, MAX_BIO_CHARS) : "";
  const skills = parseSkills(raw.skills);
  if (bio === "" && skills.length === 0) return null;
  const avail = availabilitySchema.safeParse(raw.availability?.trim().toLowerCase());
  return { name, bio, skills, availability: avail.success ? avail.data : "unknown" };
}
