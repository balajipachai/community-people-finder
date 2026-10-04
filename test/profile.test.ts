import { test } from "node:test";
import assert from "node:assert/strict";
import { MAX_BIO_CHARS, MAX_SKILLS, parseProfile, parseSkills } from "../src/profile.ts";

test("skills are normalized, deduplicated and bounded", () => {
  assert.deepEqual(parseSkills(" Rust, rust ,WASM,, <script>"), ["rust", "wasm"]);
  assert.equal(parseSkills(Array.from({ length: 50 }, (_, i) => `s${i}`).join(",")).length, MAX_SKILLS);
});

test("bio is cleaned and capped", () => {
  const p = parseProfile("a.eth", { bio: "x\n\ny".padEnd(2000, "z"), skills: null, availability: null });
  assert.ok(p && p.bio.length <= MAX_BIO_CHARS && !p.bio.includes("\n"));
});

test("unknown availability becomes 'unknown'; empty profiles are rejected", () => {
  assert.equal(parseProfile("a.eth", { bio: "hi", skills: null, availability: "maybe" })?.availability, "unknown");
  assert.equal(parseProfile("a.eth", { bio: null, skills: null, availability: "open" }), null);
});
