import { test } from "node:test";
import assert from "node:assert/strict";
import { find, NO_MATCH_MESSAGE } from "../src/finder.ts";
import { fixtureIndex } from "./helpers.ts";

const model = (obj: unknown) => async () => JSON.stringify(obj);

test("people the model invents are removed before display", async () => {
  const { profiles } = await fixtureIndex();
  const r = await find("Rust mentor?", profiles, {
    chat: model({ matches: [{ name: "aiko.eth", reason: "Mentors Rust." }, { name: "vitalik.eth", reason: "Famous." }] }),
  });
  assert.equal(r.status, "matches");
  if (r.status === "matches") {
    assert.deepEqual(r.matches.map((m) => m.name), ["aiko.eth"]);
    assert.equal(r.dropped, 1);
  }
});

test("a real member who was not retrieved for this query is also rejected", async () => {
  const { profiles } = await fixtureIndex();
  const r = await find("Rust mentor?", profiles, { chat: model({ matches: [{ name: "chika.eth", reason: "Solidity." }] }) });
  assert.equal(r.status, "no-match");
});

test("when nothing is retrieved the model is not called and no-match is explicit", async () => {
  const { profiles } = await fixtureIndex();
  let called = false;
  const r = await find("COBOL?", profiles, { chat: async () => ((called = true), "{}") });
  assert.equal(called, false);
  assert.deepEqual(r, { status: "no-match", message: NO_MATCH_MESSAGE, considered: 0, dropped: 0 });
});

test("model says nobody fits, or returns garbage: explicit no-match", async () => {
  const { profiles } = await fixtureIndex();
  assert.equal((await find("Rust mentor?", profiles, { chat: model({ matches: [] }) })).status, "no-match");
  assert.equal((await find("Rust mentor?", profiles, { chat: async () => "sorry, no idea" })).status, "no-match");
});

test("duplicate and differently-cased names are handled", async () => {
  const { profiles } = await fixtureIndex();
  const r = await find("Rust mentor?", profiles, {
    chat: model({ matches: [{ name: "AIKO.eth", reason: "a" }, { name: "aiko.eth", reason: "b" }] }),
  });
  assert.equal(r.status === "matches" && r.matches.length, 1);
});
