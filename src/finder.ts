import { z } from "zod";
import { chat } from "./llm.ts";
import { buildMessages, MAX_MATCHES, type ChatMessage } from "./prompt.ts";
import { retrieve, type Candidate } from "./retrieve.ts";
import type { Profile } from "./profile.ts";

export interface Match {
  name: string;
  reason: string;
  bio: string;
  skills: string[];
  availability: Profile["availability"];
}

export type FinderResult =
  | { status: "matches"; matches: Match[]; considered: number; dropped: number }
  | { status: "no-match"; message: string; considered: number; dropped: number };

export const NO_MATCH_MESSAGE = "Nobody in this community fits that request.";
const MAX_QUESTION_CHARS = 500;
const MAX_REASON_CHARS = 300;

const outputSchema = z.object({
  matches: z.array(z.object({ name: z.string(), reason: z.string() })),
});

function parseModelJson(text: string): z.infer<typeof outputSchema> | null {
  const start = text.indexOf("{");
  const end = text.lastIndexOf("}");
  if (start === -1 || end <= start) return null;
  try {
    const parsed = outputSchema.safeParse(JSON.parse(text.slice(start, end + 1)));
    return parsed.success ? parsed.data : null;
  } catch {
    return null;
  }
}

export async function find(
  question: string,
  profiles: Profile[],
  deps: { chat: (m: ChatMessage[]) => Promise<string> } = { chat: (m) => chat(m) },
): Promise<FinderResult> {
  const q = question.trim().slice(0, MAX_QUESTION_CHARS);
  const candidates: Candidate[] = retrieve(profiles, q);

  // Explicit no-match branch: nothing retrieved, so the model is never asked.
  if (candidates.length === 0) {
    return { status: "no-match", message: NO_MATCH_MESSAGE, considered: 0, dropped: 0 };
  }

  const output = parseModelJson(await deps.chat(buildMessages(q, candidates)));
  const byName = new Map(candidates.map((c) => [c.name, c]));
  const matches: Match[] = [];
  let dropped = 0;

  for (const m of output?.matches ?? []) {
    // Membership check: anyone not among the retrieved candidates is removed.
    const candidate = byName.get(m.name.trim().toLowerCase());
    if (!candidate || matches.some((x) => x.name === candidate.name)) {
      dropped++;
      continue;
    }
    if (matches.length >= MAX_MATCHES) break;
    matches.push({
      name: candidate.name,
      reason: m.reason.replace(/\s+/g, " ").trim().slice(0, MAX_REASON_CHARS),
      bio: candidate.bio,
      skills: candidate.skills,
      availability: candidate.availability,
    });
  }

  if (matches.length === 0) {
    return { status: "no-match", message: NO_MATCH_MESSAGE, considered: candidates.length, dropped };
  }
  return { status: "matches", matches, considered: candidates.length, dropped };
}
