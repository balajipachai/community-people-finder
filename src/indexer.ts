import type { PublicClient } from "viem";
import { defaultClient, normalizeEnsName } from "./ens.ts";
import { PROFILE_KEYS, parseProfile, type Profile } from "./profile.ts";

export interface Index {
  profiles: Profile[];
  skipped: { name: string; reason: "invalid-name" | "no-profile" | "lookup-failed" }[];
  builtAt: number;
}

const CONCURRENCY = 8;

async function readOne(name: string, rpc: PublicClient): Promise<Profile | null> {
  const [bio, skills, availability, location] = await Promise.all(
    (Object.values(PROFILE_KEYS) as string[]).map((key) => rpc.getEnsText({ name, key })),
  );
  return parseProfile(name, { bio: bio ?? null, skills: skills ?? null, availability: availability ?? null, location: location ?? null });
}

/** Build the retrieval index from live ENS text record reads. One bad member never fails the build. */
export async function buildIndex(names: string[], rpc: PublicClient = defaultClient()): Promise<Index> {
  const index: Index = { profiles: [], skipped: [], builtAt: Date.now() };
  const seen = new Set<string>();
  const work: string[] = [];

  for (const raw of names) {
    let name: string;
    try {
      name = normalizeEnsName(raw);
    } catch {
      index.skipped.push({ name: String(raw).slice(0, 64), reason: "invalid-name" });
      continue;
    }
    if (!seen.has(name)) {
      seen.add(name);
      work.push(name);
    }
  }

  for (let i = 0; i < work.length; i += CONCURRENCY) {
    const batch = work.slice(i, i + CONCURRENCY);
    const results = await Promise.allSettled(batch.map((n) => readOne(n, rpc)));
    results.forEach((r, j) => {
      const name = batch[j]!;
      if (r.status === "rejected") index.skipped.push({ name, reason: "lookup-failed" });
      else if (r.value === null) index.skipped.push({ name, reason: "no-profile" });
      else index.profiles.push(r.value);
    });
  }
  return index;
}
