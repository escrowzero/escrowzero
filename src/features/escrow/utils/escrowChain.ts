import {
  decodeEventLog,
  decodeFunctionResult,
  encodeEventTopics,
  encodeFunctionData,
  keccak256,
  maxUint256,
  parseUnits,
  toBytes,
  type Hex,
} from "viem";
import { pickMetaMaskProvider, walletPopupUrl, WALLET_MESSAGE_SOURCE, type WalletBridgeMessage } from "./metamask";
import { sendPonsBuy } from "./ponsBuy";
import { relayGasless } from "./relay";
import { addOrSwitchToRobinhoodL2, type Eip1193Provider } from "./web3";

export const TX_INTENT_KEY = "escrow-market-settlement";
export const TX_RESULT_KEY = "escrow-market-settlement-result";

const BLOCKED_CONTRACTS = new Set([
  "0x88e5c40192a992f021239912048e1920b60ca288",
  "0x3a2199f6de42b8c6ac2a1d5b7262d9fa40889c4b",
  "0xf4aa8e53f9c76e2a783f160724c4c60389187c35",
]);

const ZERO = "0x0000000000000000000000000000000000000000" as const;

const erc20Abi = [
  {
    type: "function",
    name: "approve",
    stateMutability: "nonpayable",
    inputs: [
      { name: "spender", type: "address" },
      { name: "amount", type: "uint256" },
    ],
    outputs: [{ name: "", type: "bool" }],
  },
  {
    type: "function",
    name: "allowance",
    stateMutability: "view",
    inputs: [
      { name: "owner", type: "address" },
      { name: "spender", type: "address" },
    ],
    outputs: [{ name: "", type: "uint256" }],
  },
  {
    type: "function",
    name: "decimals",
    stateMutability: "view",
    inputs: [],
    outputs: [{ name: "", type: "uint8" }],
  },
] as const;

const escrowAbi = [
  {
    type: "function",
    name: "createDeal",
    stateMutability: "payable",
    inputs: [
      { name: "beneficiary", type: "address" },
      { name: "assetToken", type: "address" },
      { name: "amount", type: "uint256" },
      { name: "durationSeconds", type: "uint256" },
      { name: "milestone", type: "bool" },
      { name: "memo", type: "string" },
    ],
    outputs: [{ name: "dealId", type: "bytes32" }],
  },
  {
    type: "function",
    name: "releasePartial",
    stateMutability: "nonpayable",
    inputs: [
      { name: "dealId", type: "bytes32" },
      { name: "amount", type: "uint256" },
    ],
    outputs: [],
  },
  {
    type: "function",
    name: "releaseFunds",
    stateMutability: "nonpayable",
    inputs: [{ name: "dealId", type: "bytes32" }],
    outputs: [],
  },
  {
    type: "function",
    name: "refundFunds",
    stateMutability: "nonpayable",
    inputs: [{ name: "dealId", type: "bytes32" }],
    outputs: [],
  },
  {
    type: "function",
    name: "getDeal",
    stateMutability: "view",
    inputs: [{ name: "dealId", type: "bytes32" }],
    outputs: [
      {
        name: "",
        type: "tuple",
        components: [
          { name: "creator", type: "address" },
          { name: "beneficiary", type: "address" },
          { name: "assetToken", type: "address" },
          { name: "amount", type: "uint256" },
          { name: "released", type: "uint256" },
          { name: "expiry", type: "uint256" },
          { name: "milestone", type: "bool" },
          { name: "status", type: "uint8" },
          { name: "memo", type: "string" },
        ],
      },
    ],
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

export type SettlementIntent =
  | {
      id: string;
      kind: "lock";
      contract: string;
      beneficiary: string;
      asset: string;
      tokenAddress: string;
      amount: string;
      durationSeconds: number;
      milestone: boolean;
      memo: string;
      ts: number;
    }
  | {
      id: string;
      kind: "release" | "refund";
      contract: string;
      dealId: string;
      partialAmount?: string;
      asset?: string;
      tokenAddress?: string;
      ts: number;
    }
  | {
      id: string;
      kind: "pons-buy";
      token: string;
      amountEth: string;
      ts: number;
    };

export type SettlementResult = {
  id: string;
  hash: string;
  chainDealId?: string;
  tokensLabel?: string;
  sponsored?: boolean;
  error?: string;
};

export function assertUsableContract(address: string) {
  const normalized = address.trim().toLowerCase();
  if (!/^0x[a-f0-9]{40}$/.test(normalized) || BLOCKED_CONTRACTS.has(normalized)) {
    throw new Error("Deploy GaslessEscrow and save that address on the owner desk. The old escrow contract is no longer used.");
  }
}

export function expiryToSeconds(label: string) {
  if (label.startsWith("30")) return 30 * 24 * 60 * 60;
  if (label.startsWith("7")) return 7 * 24 * 60 * 60;
  if (label.startsWith("24")) return 24 * 60 * 60;
  return 60 * 60;
}

export async function runSettlement(intent: SettlementIntent): Promise<SettlementResult> {
  if (intent.kind !== "pons-buy") assertUsableContract(intent.contract);
  const provider = pickMetaMaskProvider();
  if (provider) return executeSettlement(provider, intent);

  localStorage.setItem(TX_INTENT_KEY, JSON.stringify(intent));
  const popup = window.open(walletPopupUrl("send"), "_blank");
  if (!popup) {
    throw new Error("The MetaMask tab was blocked. Allow popups, or open Connect MetaMask once so this browser can see the extension.");
  }
  return waitForSettlement(intent.id);
}

export async function executeSettlement(provider: Eip1193Provider, intent: SettlementIntent): Promise<SettlementResult> {
  if (intent.kind !== "pons-buy") assertUsableContract(intent.contract);
  const accounts = (await provider.request({ method: "eth_requestAccounts" })) as string[];
  if (!accounts?.length) throw new Error("Connect MetaMask first.");
  const network = await addOrSwitchToRobinhoodL2(provider);
  if (network === "rejected") throw new Error("Switch to Robinhood Chain (4663) in MetaMask.");
  if (network !== "switched") throw new Error("MetaMask is not on Robinhood Chain (4663).");

  const from = accounts[0] as Hex;

  if (intent.kind === "pons-buy") {
    const bought = await sendPonsBuy(provider, from, intent.token, intent.amountEth);
    return { id: intent.id, hash: bought.hash, tokensLabel: bought.tokensLabel };
  }

  const contract = intent.contract as Hex;

  if (intent.kind === "lock") {
    if (intent.asset !== "ETH" && (await supportsGasless(provider, contract))) {
      const token = intent.tokenAddress as Hex;
      if (!/^0x[a-fA-F0-9]{40}$/.test(token) || token === ZERO) {
        throw new Error(`${intent.asset} has no token address on Robinhood Chain. Lock ETH, or paste the token address on the owner desk.`);
      }
      const decimals = await readDecimals(provider, token);
      const amount = parseUnits(intent.amount, decimals);
      const allowance = await readUint(provider, token, encodeFunctionData({
        abi: erc20Abi,
        functionName: "allowance",
        args: [from, contract],
      }));
      if (allowance < amount) {
        const approveHash = await sendTx(
          provider,
          from,
          token,
          encodeFunctionData({ abi: erc20Abi, functionName: "approve", args: [contract, maxUint256] }),
          "0x0",
        );
        await waitForReceipt(provider, approveHash);
      }
      const relayed = await relaySigned(provider, from, {
        kind: "create",
        contract,
        creator: from,
        beneficiary: intent.beneficiary,
        token,
        amount: amount.toString(),
        durationSeconds: intent.durationSeconds,
        milestone: intent.milestone,
        memo: intent.memo,
        dealId: `0x${"0".repeat(64)}`,
        partial: "0",
        primaryType: "CreateEscrow",
        message: (nonce, deadline, memoHash) => ({
          creator: from,
          beneficiary: intent.beneficiary,
          token,
          amount: amount.toString(),
          duration: String(intent.durationSeconds),
          milestone: intent.milestone,
          memoHash,
          nonce: nonce.toString(),
          deadline: String(deadline),
        }),
      });
      return { id: intent.id, hash: relayed.hash, chainDealId: relayed.chainDealId ?? relayed.hash, sponsored: true };
    }

    const steps = await buildLockSteps(provider, intent, contract);
    let hash = "";
    for (const step of steps) {
      hash = await sendTx(provider, from, step.to, step.data, step.value);
      const receipt = await waitForReceipt(provider, hash);
      if (step.to.toLowerCase() === contract.toLowerCase()) {
        return { id: intent.id, hash, chainDealId: dealIdFromReceipt(contract, receipt) ?? hash };
      }
    }
    return { id: intent.id, hash };
  }

  if (await supportsGasless(provider, contract)) {
    const partial = intent.kind === "release" && intent.partialAmount ? (await partialUnits(provider, intent)).toString() : "0";
    const relayed = await relaySigned(provider, from, {
      kind: intent.kind,
      contract,
      creator: from,
      beneficiary: ZERO,
      token: ZERO,
      amount: "0",
      durationSeconds: 0,
      milestone: false,
      memo: "",
      dealId: intent.dealId,
      partial,
      primaryType: intent.kind === "release" ? "Release" : "Refund",
      message: (nonce, deadline) => {
        const base = { creator: from, dealId: intent.dealId, nonce: nonce.toString(), deadline: String(deadline) };
        return intent.kind === "release" ? { ...base, amount: partial } : base;
      },
    });
    return { id: intent.id, hash: relayed.hash, sponsored: true };
  }

  const data =
    intent.kind === "release" && intent.partialAmount
      ? encodeFunctionData({
          abi: escrowAbi,
          functionName: "releasePartial",
          args: [intent.dealId as Hex, await partialUnits(provider, intent)],
        })
      : encodeFunctionData({
          abi: escrowAbi,
          functionName: intent.kind === "release" ? "releaseFunds" : "refundFunds",
          args: [intent.dealId as Hex],
        });
  const hash = await sendTx(provider, from, contract, data, "0x0");
  await waitForReceipt(provider, hash);
  return { id: intent.id, hash };
}

const typedDomain = [
  { name: "name", type: "string" },
  { name: "version", type: "string" },
  { name: "chainId", type: "uint256" },
  { name: "verifyingContract", type: "address" },
] as const;

const createTypes = [
  { name: "creator", type: "address" },
  { name: "beneficiary", type: "address" },
  { name: "token", type: "address" },
  { name: "amount", type: "uint256" },
  { name: "duration", type: "uint256" },
  { name: "milestone", type: "bool" },
  { name: "memoHash", type: "bytes32" },
  { name: "nonce", type: "uint256" },
  { name: "deadline", type: "uint256" },
] as const;

const releaseTypes = [
  { name: "creator", type: "address" },
  { name: "dealId", type: "bytes32" },
  { name: "amount", type: "uint256" },
  { name: "nonce", type: "uint256" },
  { name: "deadline", type: "uint256" },
] as const;

const refundTypes = [
  { name: "creator", type: "address" },
  { name: "dealId", type: "bytes32" },
  { name: "nonce", type: "uint256" },
  { name: "deadline", type: "uint256" },
] as const;

async function supportsGasless(provider: Eip1193Provider, contract: Hex) {
  try {
    const data = encodeFunctionData({
      abi: [{ type: "function", name: "gaslessVersion", stateMutability: "pure", inputs: [], outputs: [{ type: "uint8" }] }],
      functionName: "gaslessVersion",
    });
    const raw = (await provider.request({ method: "eth_call", params: [{ to: contract, data }, "latest"] })) as Hex;
    return raw === "0x0000000000000000000000000000000000000000000000000000000000000001";
  } catch {
    return false;
  }
}

async function readUint(provider: Eip1193Provider, to: Hex, data: Hex) {
  const raw = (await provider.request({ method: "eth_call", params: [{ to, data }, "latest"] })) as Hex;
  return BigInt(raw);
}

async function relaySigned(
  provider: Eip1193Provider,
  from: Hex,
  request: {
    kind: "create" | "release" | "refund";
    contract: Hex;
    creator: Hex;
    beneficiary: string;
    token: string;
    amount: string;
    durationSeconds: number;
    milestone: boolean;
    memo: string;
    dealId: string;
    partial: string;
    primaryType: "CreateEscrow" | "Release" | "Refund";
    message: (nonce: bigint, deadline: number, memoHash: Hex) => Record<string, string | boolean>;
  },
) {
  const nonce = await readUint(
    provider,
    request.contract,
    encodeFunctionData({
      abi: [
        {
          type: "function",
          name: "nonces",
          stateMutability: "view",
          inputs: [{ name: "account", type: "address" }],
          outputs: [{ type: "uint256" }],
        },
      ],
      functionName: "nonces",
      args: [from],
    }),
  );
  const deadline = Math.floor(Date.now() / 1000) + 60 * 60;
  const memoHash = keccak256(toBytes(request.memo));
  const types =
    request.primaryType === "CreateEscrow" ? createTypes : request.primaryType === "Release" ? releaseTypes : refundTypes;
  const signature = (await provider.request({
    method: "eth_signTypedData_v4",
    params: [
      from,
      JSON.stringify({
        types: { EIP712Domain: typedDomain, [request.primaryType]: types },
        primaryType: request.primaryType,
        domain: { name: "ZERO ESCROW", version: "1", chainId: 4663, verifyingContract: request.contract },
        message: request.message(nonce, deadline, memoHash),
      }),
    ],
  })) as Hex;
  return relayGasless({
    data: {
      kind: request.kind,
      contract: request.contract,
      creator: request.creator,
      beneficiary: request.beneficiary,
      token: request.token,
      amount: request.amount,
      durationSeconds: request.durationSeconds,
      milestone: request.milestone,
      memo: request.memo,
      dealId: request.dealId,
      partial: request.partial,
      deadline,
      signature,
    },
  });
}

async function buildLockSteps(provider: Eip1193Provider, intent: Extract<SettlementIntent, { kind: "lock" }>, contract: Hex) {
  const beneficiary = intent.beneficiary as Hex;
  if (intent.asset === "ETH") {
    const amount = parseUnits(intent.amount, 18);
    return [
      {
        to: contract,
        data: encodeFunctionData({
          abi: escrowAbi,
          functionName: "createDeal",
          args: [beneficiary, ZERO, amount, BigInt(intent.durationSeconds), intent.milestone, intent.memo],
        }),
        value: `0x${amount.toString(16)}`,
      },
    ];
  }

  const token = intent.tokenAddress as Hex;
  if (!/^0x[a-fA-F0-9]{40}$/.test(token) || token === ZERO) {
    throw new Error(`${intent.asset} has no token address on Robinhood Chain. Lock ETH, or paste the token address on the owner desk.`);
  }
  const decimals = await readDecimals(provider, token);
  const amount = parseUnits(intent.amount, decimals);
  return [
    {
      to: token,
      data: encodeFunctionData({ abi: erc20Abi, functionName: "approve", args: [contract, amount] }),
      value: "0x0",
    },
    {
      to: contract,
      data: encodeFunctionData({
        abi: escrowAbi,
        functionName: "createDeal",
        args: [beneficiary, token, amount, BigInt(intent.durationSeconds), intent.milestone, intent.memo],
      }),
      value: "0x0",
    },
  ];
}

async function partialUnits(
  provider: Eip1193Provider,
  intent: { partialAmount?: string; asset?: string; tokenAddress?: string },
) {
  const token = (intent.tokenAddress || "") as Hex;
  const decimals = intent.asset === "ETH" || !/^0x[a-fA-F0-9]{40}$/.test(token) || token === ZERO ? 18 : await readDecimals(provider, token);
  return parseUnits(intent.partialAmount || "0", decimals);
}

async function readDecimals(provider: Eip1193Provider, token: Hex) {
  try {
    const data = encodeFunctionData({ abi: erc20Abi, functionName: "decimals" });
    const raw = (await provider.request({ method: "eth_call", params: [{ to: token, data }, "latest"] })) as Hex;
    const decoded = decodeFunctionResult({ abi: erc20Abi, functionName: "decimals", data: raw });
    return Number(decoded);
  } catch {
    return 18;
  }
}

async function sendTx(provider: Eip1193Provider, from: Hex, to: Hex, data: Hex, value: string) {
  try {
    return (await provider.request({
      method: "eth_sendTransaction",
      params: [{ from, to, data, value }],
    })) as string;
  } catch (error) {
    const code = (error as { code?: number }).code;
    if (code === 4001) throw new Error("You declined the transaction in MetaMask.");
    throw error instanceof Error ? error : new Error("MetaMask rejected the transaction.");
  }
}

async function waitForReceipt(provider: Eip1193Provider, hash: string) {
  for (let attempt = 0; attempt < 40; attempt += 1) {
    const receipt = (await provider.request({ method: "eth_getTransactionReceipt", params: [hash] })) as {
      status?: string;
      logs?: { address: string; data: Hex; topics: Hex[] }[];
    } | null;
    if (receipt) {
      if (receipt.status === "0x0") throw new Error("The transaction failed on Robinhood Chain.");
      return receipt;
    }
    await new Promise((resolve) => window.setTimeout(resolve, 2000));
  }
  throw new Error("The transaction was sent, but the receipt did not arrive in time. Check the explorer.");
}

function dealIdFromReceipt(contract: string, receipt: { logs?: { address: string; data: Hex; topics: Hex[] }[] }) {
  for (const log of receipt.logs ?? []) {
    if (log.address.toLowerCase() !== contract.toLowerCase() || !log.topics?.length) continue;
    try {
      const decoded = decodeEventLog({ abi: escrowAbi, data: log.data, topics: log.topics as [Hex, ...Hex[]] });
      if (decoded.eventName === "DealCreated") return decoded.args.dealId;
    } catch {
      // Not this event.
    }
  }
  return undefined;
}

function waitForSettlement(id: string) {
  return new Promise<SettlementResult>((resolve, reject) => {
    const finish = (result: SettlementResult | undefined) => {
      if (!result || result.id !== id) return;
      cleanup();
      if (result.error) reject(new Error(result.error));
      else resolve(result);
    };
    const onStorage = (event: StorageEvent) => {
      if (event.key !== TX_RESULT_KEY || !event.newValue) return;
      try {
        finish(JSON.parse(event.newValue) as SettlementResult);
      } catch {
        // Ignore a bad payload.
      }
    };
    const onMessage = (event: MessageEvent) => {
      if (event.origin !== window.location.origin) return;
      const data = event.data as WalletBridgeMessage & SettlementResult;
      if (!data || data.source !== WALLET_MESSAGE_SOURCE || data.type !== "settled") return;
      finish(data);
    };
    const timer = window.setTimeout(() => {
      cleanup();
      reject(new Error("Timed out waiting for MetaMask. Confirm the transaction in the other tab."));
    }, 180000);
    const cleanup = () => {
      window.clearTimeout(timer);
      window.removeEventListener("storage", onStorage);
      window.removeEventListener("message", onMessage);
    };
    window.addEventListener("storage", onStorage);
    window.addEventListener("message", onMessage);
  });
}

const CHAIN_RPC = "https://rpc.mainnet.chain.robinhood.com";

async function chainRpc(method: string, params: unknown[]) {
  const response = await fetch(CHAIN_RPC, {
    method: "POST",
    headers: { "content-type": "application/json" },
    body: JSON.stringify({ jsonrpc: "2.0", id: 1, method, params }),
  });
  const body = (await response.json()) as { result?: unknown; error?: { message?: string } };
  if (body.error) throw new Error(body.error.message || "Robinhood Chain did not answer.");
  return body.result;
}

export type ChainDeal = {
  dealId: Hex;
  txHash: Hex;
  creator: string;
  beneficiary: string;
  assetToken: string;
  amount: bigint;
  released: bigint;
  expiry: bigint;
  milestone: boolean;
  status: number;
  memo: string;
};

export async function readAccountDeals(contract: string, account: string): Promise<ChainDeal[]> {
  if (!/^0x[a-fA-F0-9]{40}$/.test(contract) || !/^0x[a-fA-F0-9]{40}$/.test(account)) return [];
  const latest = BigInt((await chainRpc("eth_blockNumber", [])) as string);
  const span = 5_000_000n;
  const from = latest > span ? latest - span : 0n;
  const topic = encodeEventTopics({ abi: escrowAbi, eventName: "DealCreated" })[0];
  const padded = `0x${account.slice(2).toLowerCase().padStart(64, "0")}` as Hex;
  const range = { address: contract, fromBlock: `0x${from.toString(16)}`, toBlock: "latest" };
  const [created, received] = await Promise.all([
    chainRpc("eth_getLogs", [{ ...range, topics: [topic, null, padded] }]),
    chainRpc("eth_getLogs", [{ ...range, topics: [topic, null, null, padded] }]),
  ]);
  const logs = [...(created as Log[]), ...(received as Log[])];
  const seen = new Set<string>();
  const deals: ChainDeal[] = [];
  for (const log of logs) {
    let decoded: ReturnType<typeof decodeEventLog<typeof escrowAbi, "DealCreated">>;
    try {
      decoded = decodeEventLog({ abi: escrowAbi, eventName: "DealCreated", data: log.data, topics: log.topics });
    } catch {
      continue;
    }
    const dealId = decoded.args.dealId;
    const key = dealId.toLowerCase();
    if (seen.has(key)) continue;
    seen.add(key);
    const data = encodeFunctionData({ abi: escrowAbi, functionName: "getDeal", args: [dealId] });
    const raw = (await chainRpc("eth_call", [{ to: contract, data }, "latest"])) as Hex;
    const deal = decodeFunctionResult({ abi: escrowAbi, functionName: "getDeal", data: raw });
    deals.push({
      dealId,
      txHash: log.transactionHash,
      creator: deal.creator,
      beneficiary: deal.beneficiary,
      assetToken: deal.assetToken,
      amount: deal.amount,
      released: deal.released,
      expiry: deal.expiry,
      milestone: deal.milestone,
      status: Number(deal.status),
      memo: deal.memo,
    });
  }
  return deals.reverse();
}

type Log = { data: Hex; topics: [Hex, ...Hex[]]; transactionHash: Hex };
