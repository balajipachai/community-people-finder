import { readFile } from "node:fs/promises";
import { z } from "zod";
import { loadIndexTtlMs, loadMembersFile } from "./config.ts";
import { buildIndex, type Index } from "./indexer.ts";

const rosterSchema = z.object({ community: z.string().optional(), members: z.array(z.string()) });

export async function loadRoster(file = loadMembersFile()): Promise<{ community: string; members: string[] }> {
  const parsed = rosterSchema.parse(JSON.parse(await readFile(file, "utf8")));
  return { community: parsed.community ?? "Community", members: parsed.members };
}

let current: Index | undefined;
let building: Promise<Index> | undefined;

/** Cached index, rebuilt from ENS when older than INDEX_TTL_MS. Concurrent callers share one build. */
export async function getIndex(force = false): Promise<Index> {
  if (!force && current && Date.now() - current.builtAt < loadIndexTtlMs()) return current;
  building ??= loadRoster()
    .then((r) => buildIndex(r.members))
    .then((idx) => (current = idx))
    .finally(() => (building = undefined));
  return building;
}
