import { test } from "node:test";
import assert from "node:assert/strict";
import { TOP_K, retrieve } from "../src/retrieve.ts";
import type { Profile } from "../src/profile.ts";
import { fixtureIndex } from "./helpers.ts";

test("only top-k candidates are returned, however many profiles match", () => {
  const many: Profile[] = Array.from({ length: 40 }, (_, i) => ({
    name: `m${i}.eth`, bio: "", location: "", skills: ["rust"], availability: "open",
  }));
  assert.equal(retrieve(many, "rust help").length, TOP_K);
  assert.equal(retrieve(many, "rust help", 2).length, 2);
});

test("availability questions exclude unavailable members", async () => {
  const { profiles } = await fixtureIndex();
  const names = retrieve(profiles, "Anyone good at Rust and free this month?").map((c) => c.name);
  assert.ok(names.includes("aiko.eth"));
  assert.ok(!names.includes("ben.eth"));
});

test("no overlap or only stopwords yields no candidates", async () => {
  const { profiles } = await fixtureIndex();
  assert.deepEqual(retrieve(profiles, "COBOL"), []);
  assert.deepEqual(retrieve(profiles, "is anyone here able to help me"), []);
});

test("domain synonyms and location widen retrieval without bypassing the cap", async () => {
  const { profiles } = await fixtureIndex();
  assert.deepEqual(retrieve(profiles, "who does smart contract work?").map((c) => c.name), ["chika.eth"]);
  assert.ok(retrieve(profiles, "someone in Kyoto").map((c) => c.name).includes("daichi.eth"));
});
