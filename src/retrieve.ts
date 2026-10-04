import type { Profile } from "./profile.ts";

// Hard bound on how many profiles can ever enter a prompt.
export const TOP_K = 5;

const STOPWORDS = new Set(
  ("a an the and or of to for in on at is are was be been am i me my we our us you your who whom which what how " +
    "anyone anybody someone somebody here there any can could would should do does have has with about that this " +
    "good great know knows knowing need needs looking look want wants please find get help ask person people " +
    "community member members free available availability time month week spare capacity").split(" "),
);

const AVAILABILITY_INTENT = /\b(free|available|availability|spare|capacity|time|this (week|month))\b/i;

// Small domain vocabulary so "smart contracts" finds a Solidity profile. Expansion only adds
// query terms; the model and the membership check still decide what is returned.
const SYNONYMS: Record<string, string[]> = {
  contract: ["solidity"],
  security: ["audit", "audits"],
  audit: ["security"],
  frontend: ["react", "css", "ui"],
  backend: ["node", "api", "server"],
  design: ["ux", "ui", "figma"],
  designer: ["design", "ux", "ui", "figma"],
  ux: ["design"],
  ml: ["machine", "learning"],
  ai: ["ml", "machine", "learning"],
  mentor: ["mentoring"],
  wasm: ["webassembly"],
  js: ["javascript", "typescript"],
};

const stem = (t: string) => (t.length > 4 && t.endsWith("s") ? t.slice(0, -1) : t);

export function tokenize(text: string): string[] {
  return (text.toLowerCase().match(/[\p{L}\p{N}+#]+/gu) ?? []).map(stem);
}

export function queryTokens(query: string): string[] {
  const base = tokenize(query).filter((t) => t.length > 1 && !STOPWORDS.has(t));
  return [...new Set(base.flatMap((t) => [t, ...(SYNONYMS[t] ?? [])].map(stem)))];
}

export interface Candidate extends Profile {
  score: number;
}

/**
 * Rank profiles for a query and return at most `k` candidates.
 * Skill match outweighs bio match; if the query asks about availability,
 * unavailable members are excluded and open ones get a boost.
 */
export function retrieve(profiles: Profile[], query: string, k: number = TOP_K): Candidate[] {
  const tokens = queryTokens(query);
  if (tokens.length === 0) return [];
  const wantsAvailable = AVAILABILITY_INTENT.test(query);

  const scored: Candidate[] = [];
  for (const p of profiles) {
    if (wantsAvailable && p.availability === "unavailable") continue;
    const skillTokens = new Set(p.skills.flatMap(tokenize));
    const bioTokens = new Set(tokenize(p.bio));
    const locationTokens = new Set(tokenize(p.location));
    let score = 0;
    for (const t of tokens) {
      if (skillTokens.has(t)) score += 3;
      else if (locationTokens.has(t)) score += 2;
      else if (bioTokens.has(t)) score += 1;
    }
    if (score === 0) continue;
    if (wantsAvailable && p.availability === "open") score += 1;
    scored.push({ ...p, score });
  }
  return scored.sort((a, b) => b.score - a.score || a.name.localeCompare(b.name)).slice(0, k);
}
