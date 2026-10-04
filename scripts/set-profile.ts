// Publish your community profile on an ENS name you own on Sepolia (one transaction).
//   PRIVATE_KEY=0x... npm run set-profile -- aiko.eth --bio "Rust compiler contributor" --skills "rust, wasm, mentoring" --availability open
import { createPublicClient, createWalletClient, encodeFunctionData, http, parseAbi, type Hex } from "viem";
import { privateKeyToAccount } from "viem/accounts";
import { sepolia } from "viem/chains";
import { namehash } from "viem/ens";
import { normalizeEnsName } from "../src/ens.ts";
import { AVAILABILITY, PROFILE_KEYS } from "../src/profile.ts";

const args = process.argv.slice(2);
const nameArg = args.shift();
const flags = new Map<string, string>();
for (let i = 0; i < args.length; i += 2) flags.set(args[i]!.replace(/^--/, ""), args[i + 1] ?? "");

const key = process.env.PRIVATE_KEY;
if (!nameArg || !key || flags.size === 0) {
  console.error('Usage: PRIVATE_KEY=0x... npm run set-profile -- <name.eth> --bio "..." --skills "a, b" --availability open|limited|unavailable');
  process.exit(1);
}
const availability = flags.get("availability");
if (availability && !(AVAILABILITY as readonly string[]).includes(availability)) {
  console.error(`availability must be one of: ${AVAILABILITY.join(", ")}`);
  process.exit(1);
}

const name = normalizeEnsName(nameArg);
const transport = http(process.env.SEPOLIA_RPC_URL || undefined);
const pub = createPublicClient({ chain: sepolia, transport });
const wallet = createWalletClient({ chain: sepolia, transport, account: privateKeyToAccount(key as Hex) });
const abi = parseAbi([
  "function setText(bytes32 node, string key, string value)",
  "function multicall(bytes[] data) returns (bytes[] results)",
]);
const node = namehash(name);
const calls = (["bio", "skills", "availability"] as const)
  .filter((f) => flags.has(f))
  .map((f) => encodeFunctionData({ abi, functionName: "setText", args: [node, PROFILE_KEYS[f], flags.get(f)!] }));

const resolver = await pub.getEnsResolver({ name });
const hash = await wallet.writeContract({ address: resolver, abi, functionName: "multicall", args: [calls] });
console.log(`Set ${calls.length} records on ${name}: ${hash}`);
