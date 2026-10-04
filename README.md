# Community People Finder

> Ask in plain language, get back **real community members** with a reason for each, or an honest "nobody fits."

Kenji runs a builder community. Every member has an ENS name with a short profile. Instead of posting "is anyone good at Rust *and* free to mentor?" in the group chat, members ask this app and get real people from the community: never a made-up one.

## How it works

```
roster (ENS names) ──normalize──▶ getEnsText × 3 per member (Sepolia)   ← index built from live ENS reads
                      ──▶ validate/clean profiles (bad or empty ones are skipped)
question ──▶ retrieve top-k (k=5) by skill/bio match + availability
         ──▶ none? ──▶ explicit "no match" (model never called)
         ──▶ LLM sees ONLY those candidates (profiles in a user data message)
         ──▶ output checked: anyone not among the retrieved candidates is dropped
         ──▶ matches with reasons, or explicit "no match"
```

### Profile format (on each member's ENS name)

| text record key | meaning |
| --- | --- |
| `description` | short bio (standard ENSIP-5 key), max 500 chars |
| `app.community.skills` | comma-separated skills, e.g. `rust, wasm, mentoring` (max 12) |
| `app.community.availability` | `open`, `limited` or `unavailable` |

Publish yours in one transaction:

```bash
PRIVATE_KEY=0x... npm run set-profile -- aiko.eth \
  --bio "Rust compiler contributor, happy to mentor newcomers." \
  --skills "rust, compilers, mentoring" --availability open
```

Or edit the same text records in the ENS app (sepolia.app.ens.domains).

### Guarantees (and where they live)

- **No invented people.** `src/finder.ts` keeps only model-named people who are in the retrieved candidate set, deduplicated; everyone else is removed before display. If none remain: no-match.
- **Bounded prompt.** `TOP_K = 5` in `src/retrieve.ts` caps how many profiles ever reach the model.
- **Prompt isolation.** `src/prompt.ts`: the system prompt is app-authored. Profiles (untrusted, user-controlled) travel as JSON in a separate user message, and the system prompt tells the model to treat them as data.
- **Index from ENS.** `src/indexer.ts` reads each member's text records via viem; one failing or empty member never breaks the build.
- **Honest empty result.** No candidates → explicit no-match without calling the model; a model that says nobody fits, or returns garbage, → the same.
- **Timeout and config.** The model call has an explicit timeout (`LLM_TIMEOUT_MS`); model, endpoint and key come from env. No secrets are committed.

## Run it

```bash
npm install
cp .env.example .env     # add LLM_API_KEY
# put your community's ENS names in members.json: { "community": "...", "members": ["aiko.eth", ...] }
set -a; source .env; set +a
npm start                # http://localhost:3000
```

## Tests and recorded queries

```bash
npm test         # offline: indexing from (faked) ENS reads, retrieval bounds, prompt isolation, hallucination filter, recorded queries
npm run cases    # live: runs recorded queries through your real model
```

`cases/queries.json` records questions with the exact members expected (or `expectNoMatch`) against the fixture community in `test/fixtures/profiles.json`: e.g. *"good at Rust and free to mentor this month"* → `aiko.eth`, `fumi.eth` (and not `ben.eth`, who is marked unavailable); *"Does anyone know COBOL?"* → nobody.
