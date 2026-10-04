// Publish the seed community's profile records (seed/community.json) to ENS on Sepolia.
// Subnames must already exist (create <label>.<parent> in sepolia.app.ens.domains) and be owned by the key.
//   PRIVATE_KEY=0x... npm run seed            # publish all
//   PRIVATE_KEY=0x... npm run seed -- --dry   # print what would be written
import { readFileSync } from "node:fs";
import { createPublicClient, createWalletClient, encodeFunctionData, http, parseAbi, type Hex } from "viem";
import { privateKeyToAccount } from "viem/accounts";
import { sepolia } from "viem/chains";
import { namehash } from "viem/ens";
import { normalizeEnsName } from "../src/ens.ts";
import { PROFILE_KEYS } from "../src/profile.ts";

const seed = JSON.parse(readFileSync(new URL("../seed/community.json", import.meta.url), "utf8")) as {
  parent: string;
  members: { label: string; records: Partial<Record<keyof typeof PROFILE_KEYS, string>> }[];
};
const dry = process.argv.includes("--dry");
const key = process.env.PRIVATE_KEY;
if (!dry && !key) {
  console.error("Usage: PRIVATE_KEY=0x... npm run seed [-- --dry]");
  process.exit(1);
}

const abi = parseAbi([
  "function setText(bytes32 node, string key, string value)",
  "function multicall(bytes[] data) returns (bytes[] results)",
]);
const transport = http(process.env.SEPOLIA_RPC_URL || undefined);
const pub = createPublicClient({ chain: sepolia, transport });
const wallet = dry ? undefined : createWalletClient({ chain: sepolia, transport, account: privateKeyToAccount(key as Hex) });

for (const m of seed.members) {
  const name = normalizeEnsName(`${m.label}.${seed.parent}`);
  const entries = Object.entries(m.records) as [keyof typeof PROFILE_KEYS, string][];
  if (dry) {
    console.log(name, Object.fromEntries(entries.map(([f, v]) => [PROFILE_KEYS[f], v])));
    continue;
  }
  try {
    const node = namehash(name);
    const calls = entries.map(([f, v]) => encodeFunctionData({ abi, functionName: "setText", args: [node, PROFILE_KEYS[f], v] }));
    const resolver = await pub.getEnsResolver({ name });
    const hash = await wallet!.writeContract({ address: resolver, abi, functionName: "multicall", args: [calls] });
    console.log(`ok   ${name}: ${hash}`);
  } catch (err) {
    console.error(`FAIL ${name}: ${(err as { shortMessage?: string }).shortMessage ?? "error"}`);
  }
}
