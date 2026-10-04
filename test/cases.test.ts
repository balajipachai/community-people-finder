import { test } from "node:test";
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { find } from "../src/finder.ts";
import { retrieve } from "../src/retrieve.ts";
import { fixtureIndex } from "./helpers.ts";

interface Query { id: string; question: string; expectedMembers?: string[]; mustNotInclude?: string[]; expectNoMatch?: boolean }
const { queries } = JSON.parse(
  readFileSync(new URL("../cases/queries.json", import.meta.url), "utf8"),
) as { queries: Query[] };

for (const q of queries) {
  test(`recorded query ${q.id}`, async () => {
    const { profiles } = await fixtureIndex();
    const got = retrieve(profiles, q.question).map((c) => c.name).sort();
    if (q.expectNoMatch) {
      assert.deepEqual(got, []);
      // Even a model that tries to name someone cannot produce an answer.
      const r = await find(q.question, profiles, { chat: async () => '{"matches":[{"name":"aiko.eth","reason":"x"}]}' });
      assert.equal(r.status, "no-match");
    } else {
      assert.deepEqual(got, [...(q.expectedMembers ?? [])].sort());
    }
    for (const n of q.mustNotInclude ?? []) assert.ok(!got.includes(n));
  });
}
