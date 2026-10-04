import { readFileSync } from "node:fs";
import type { PublicClient } from "viem";
import { buildIndex } from "../src/indexer.ts";

export const FIXTURES = JSON.parse(
  readFileSync(new URL("./fixtures/profiles.json", import.meta.url), "utf8"),
) as Record<string, Record<string, string>>;

/** Fake viem client serving ENS text records from the fixtures. */
export function fakeRpc(data: Record<string, Record<string, string>> = FIXTURES, calls?: { name: string; key: string }[]) {
  return {
    getEnsText: async ({ name, key }: { name: string; key: string }) => {
      calls?.push({ name, key });
      if (name === "broken.eth") throw new Error("rpc down");
      return data[name]?.[key] ?? null;
    },
  } as unknown as PublicClient;
}

export async function fixtureIndex() {
  return buildIndex(Object.keys(FIXTURES), fakeRpc());
}
