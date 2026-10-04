import { test } from "node:test";
import assert from "node:assert/strict";
import { buildIndex } from "../src/indexer.ts";
import { PROFILE_KEYS } from "../src/profile.ts";
import { FIXTURES, fakeRpc, fixtureIndex } from "./helpers.ts";

test("index content comes from ENS text record reads", async () => {
  const calls: { name: string; key: string }[] = [];
  const idx = await buildIndex(["aiko.eth"], fakeRpc(FIXTURES, calls));
  assert.deepEqual(calls.map((c) => c.key).sort(), Object.values(PROFILE_KEYS).sort());
  assert.equal(idx.profiles[0]?.skills.includes("rust"), true);
});

test("names are normalized before reads; duplicates are read once", async () => {
  const calls: { name: string; key: string }[] = [];
  const idx = await buildIndex(["AIKO.eth", "aiko.eth"], fakeRpc(FIXTURES, calls));
  assert.equal(idx.profiles.length, 1);
  assert.ok(calls.every((c) => c.name === "aiko.eth"));
});

test("empty, invalid and failing members are skipped without failing the build", async () => {
  const idx = await buildIndex(["aiko.eth", "ghost.eth", "not a name", "broken.eth", "nobody.eth"], fakeRpc());
  assert.deepEqual(idx.profiles.map((p) => p.name), ["aiko.eth"]);
  const reasons = Object.fromEntries(idx.skipped.map((s) => [s.name, s.reason]));
  assert.equal(reasons["ghost.eth"], "no-profile");
  assert.equal(reasons["broken.eth"], "lookup-failed");
  assert.equal(reasons["nobody.eth"], "no-profile");
  assert.equal(reasons["not a name"], "invalid-name");
});

test("fixture community indexes the expected members", async () => {
  const idx = await fixtureIndex();
  assert.equal(idx.profiles.length, 7); // all but ghost.eth
});
