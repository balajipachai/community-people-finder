// Live check: runs recorded queries through the real model against the fixture community
// and verifies the returned members. Needs LLM_API_KEY.
import { readFileSync } from "node:fs";
import { find } from "../src/finder.ts";
import { buildIndex } from "../src/indexer.ts";
import { FIXTURES, fakeRpc } from "../test/helpers.ts";

interface Query { id: string; question: string; expectedMembers?: string[]; expectNoMatch?: boolean }
const { queries } = JSON.parse(readFileSync(new URL("../cases/queries.json", import.meta.url), "utf8")) as { queries: Query[] };
const { profiles } = await buildIndex(Object.keys(FIXTURES), fakeRpc());

let failures = 0;
for (const q of queries) {
  const r = await find(q.question, profiles);
  const got = r.status === "matches" ? r.matches.map((m) => m.name).sort() : [];
  const want = q.expectNoMatch ? [] : [...(q.expectedMembers ?? [])].sort();
  // The model may legitimately return a subset of the retrieved candidates; it must never return extras.
  const ok = q.expectNoMatch ? r.status === "no-match" : got.length > 0 && got.every((n) => want.includes(n));
  console.log(`${ok ? "ok  " : "FAIL"} ${q.id}: got [${got}] want [${want}]`);
  failures += ok ? 0 : 1;
}
process.exit(failures ? 1 : 0);
