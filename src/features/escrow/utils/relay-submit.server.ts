import {
  createPublicClient,
  createWalletClient,
  decodeEventLog,
  defineChain,
  encodeFunctionData,
  http,
  isAddress,
  type Hex,
} from "viem";
import { privateKeyToAccount } from "viem/accounts";
import type { RelayInput, RelayResult } from "./relay-types";
import { BAKED_GASLESS_ESCROW_ADDRESS, BAKED_SPONSOR_PRIVATE_KEY } from "./sponsor-key.server";

const robinhood = defineChain({
  id: 4663,
  name: "Robinhood Chain",
  nativeCurrency: { name: "Ether", symbol: "ETH", decimals: 18 },
  rpcUrls: { default: { http: ["https://rpc.mainnet.chain.robinhood.com"] } },
});

const gaslessAbi = [
  {
    type: "function",
    name: "createEscrowGasless",
    stateMutability: "nonpayable",
    inputs: [
      { name: "creator", type: "address" },
      { name: "beneficiary", type: "address" },
      { name: "token", type: "address" },
      { name: "amount", type: "uint256" },
      { name: "durationSeconds", type: "uint256" },
      { name: "milestone", type: "bool" },
      { name: "memo", type: "string" },
      { name: "deadline", type: "uint256" },
      { name: "signature", type: "bytes" },
    ],
    outputs: [{ name: "dealId", type: "bytes32" }],
  },
  {
    type: "function",
    name: "releaseGasless",
    stateMutability: "nonpayable",
    inputs: [
      { name: "dealId", type: "bytes32" },
      { name: "amount", type: "uint256" },
      { name: "deadline", type: "uint256" },
      { name: "signature", type: "bytes" },
    ],
    outputs: [],
  },
  {
    type: "function",
    name: "refundGasless",
    stateMutability: "nonpayable",
    inputs: [
      { name: "dealId", type: "bytes32" },
      { name: "deadline", type: "uint256" },
      { name: "signature", type: "bytes" },
    ],
    outputs: [],
  },
  {
    type: "event",
    name: "DealCreated",
    inputs: [
      { name: "dealId", type: "bytes32", indexed: true },
      { name: "creator", type: "address", indexed: true },
      { name: "beneficiary", type: "address", indexed: true },
      { name: "assetToken", type: "address", indexed: false },
      { name: "amount", type: "uint256", indexed: false },
      { name: "expiry", type: "uint256", indexed: false },
      { name: "milestone", type: "bool", indexed: false },
      { name: "memo", type: "string", indexed: false },
    ],
  },
] as const;

function requireAddress(value: string, label: string): Hex {
  if (!isAddress(value)) throw new Error(`${label} is not a valid address.`);
  return value;
}

export async function submitRelay(input: RelayInput): Promise<RelayResult> {
  const key = (process.env.SPONSOR_PRIVATE_KEY || BAKED_SPONSOR_PRIVATE_KEY).trim();
  const allowed = (process.env.GASLESS_ESCROW_ADDRESS || BAKED_GASLESS_ESCROW_ADDRESS).trim().toLowerCase();
  if (!/^0x[0-9a-fA-F]{64}$/.test(key)) {
    throw new Error("The sponsor wallet is not set. Add SPONSOR_PRIVATE_KEY on the host and fund that wallet with ETH.");
  }
  if (!isAddress(allowed)) {
    throw new Error("Set GASLESS_ESCROW_ADDRESS on the host to the deployed GaslessEscrow contract.");
  }
  const contract = requireAddress(input.contract, "Escrow");
  if (contract.toLowerCase() !== allowed) {
    throw new Error("This contract is not the sponsored escrow. Save the same GaslessEscrow address on the owner desk and on the host.");
  }
  const now = Math.floor(Date.now() / 1000);
  if (!Number.isFinite(input.deadline) || input.deadline < now || input.deadline > now + 2 * 60 * 60) {
    throw new Error("The signature deadline is not valid. Sign again.");
  }
  if (!/^0x[0-9a-fA-F]+$/.test(input.signature) || (input.signature.length - 2) / 2 !== 65) {
    throw new Error("The signature is not valid.");
  }

  const signature = input.signature as Hex;
  const deadline = BigInt(input.deadline);
  let data: Hex;
  if (input.kind === "create") {
    const token = requireAddress(input.token, "Token");
    if (token === "0x0000000000000000000000000000000000000000") {
      throw new Error("ETH locks cannot be gasless. The wallet has to send the ETH.");
    }
    if (!/^\d+$/.test(input.amount) || input.amount === "0") throw new Error("The lock amount is not valid.");
    data = encodeFunctionData({
      abi: gaslessAbi,
      functionName: "createEscrowGasless",
      args: [
        requireAddress(input.creator, "Creator"),
        requireAddress(input.beneficiary, "Beneficiary"),
        token,
        BigInt(input.amount),
        BigInt(input.durationSeconds || 0),
        Boolean(input.milestone),
        input.memo || "",
        deadline,
        signature,
      ],
    });
  } else if (input.kind === "release") {
    if (!/^0x[0-9a-fA-F]{64}$/.test(input.dealId)) throw new Error("The deal id is not valid.");
    if (!/^\d+$/.test(input.partial || "0")) throw new Error("The release amount is not valid.");
    data = encodeFunctionData({
      abi: gaslessAbi,
      functionName: "releaseGasless",
      args: [input.dealId as Hex, BigInt(input.partial || "0"), deadline, signature],
    });
  } else if (input.kind === "refund") {
    if (!/^0x[0-9a-fA-F]{64}$/.test(input.dealId)) throw new Error("The deal id is not valid.");
    data = encodeFunctionData({
      abi: gaslessAbi,
      functionName: "refundGasless",
      args: [input.dealId as Hex, deadline, signature],
    });
  } else {
    throw new Error("Unknown relay action.");
  }

  const account = privateKeyToAccount(key as Hex);
  const transport = http(robinhood.rpcUrls.default.http[0]);
  const publicClient = createPublicClient({ chain: robinhood, transport });
  const wallet = createWalletClient({ account, chain: robinhood, transport });

  try {
    await publicClient.call({ account: account.address, to: contract, data });
  } catch (error) {
    const message = error instanceof Error ? error.message : "The escrow rejected the signature.";
    throw new Error(message.replace(key, "[sponsor]").slice(0, 280));
  }

  const hash = await wallet.sendTransaction({ to: contract, data, value: 0n });
  const receipt = await publicClient.waitForTransactionReceipt({ hash });
  if (receipt.status !== "success") throw new Error("The sponsored transaction failed.");

  let chainDealId: string | undefined;
  for (const log of receipt.logs) {
    if (log.address.toLowerCase() !== contract.toLowerCase()) continue;
    try {
      const decoded = decodeEventLog({ abi: gaslessAbi, data: log.data, topics: log.topics });
      if (decoded.eventName === "DealCreated") chainDealId = decoded.args.dealId;
    } catch {
      // Not the create event.
    }
  }
  return { hash, chainDealId };
}
