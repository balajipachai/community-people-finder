import { test } from "node:test";
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { parseProfile, PROFILE_KEYS } from "../src/profile.ts";
import { loadRoster } from "../src/store.ts";

const seed = JSON.parse(readFileSync(new URL("../seed/community.json", import.meta.url), "utf8")) as {
  parent: string;
  members: { label: string; records: Record<keyof typeof PROFILE_KEYS, string> }[];
};

test("seed community has at least 8 members under one parent, with an adversarial bio", () => {
  assert.ok(seed.members.length >= 8);
  assert.ok(seed.members.some((m) => /ignore all previous instructions/i.test(m.records.bio ?? (m.records as { description?: string }).description ?? "")));
});

test("every seed profile is valid and the roster lists exactly the seed names", async () => {
  const names = seed.members.map((m) => `${m.label}.${seed.parent}`);
  for (const m of seed.members) {
    const r = m.records as Record<string, string>;
    assert.ok(parseProfile(`${m.label}.${seed.parent}`, { bio: r.description ?? null, skills: r.skills ?? null, availability: r.availability ?? null, location: r.location ?? null }));
  }
  const roster = await loadRoster(new URL("../members.json", import.meta.url).pathname);
  assert.deepEqual(roster.members, names);
});
