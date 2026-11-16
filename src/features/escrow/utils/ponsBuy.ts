import { encodeFunctionData, formatUnits, parseEther, type Hex } from "viem";
import type { Eip1193Provider } from "./web3";

export const PONS_FACTORY = "0x7eD598BcEf8bd9Edd8C97A195C6d13f40801EC7e" as const;
const RPC_URL = "https://rpc.mainnet.chain.robinhood.com";

const factoryAbi = [
  {
    type: "function",
    name: "getLaunchedToken",
    stateMutability: "view",
    inputs: [{ name: "token", type: "address" }],
    outputs: [
      { name: "token", type: "address" },
      { name: "curve", type: "address" },
      { name: "creator", type: "address" },
      { name: "pairToken", type: "address" },
      { name: "extra0", type: "uint256" },
      { name: "extra1", type: "uint256" },
      { name: "extra2", type: "uint256" },
      { name: "extra3", type: "uint256" },
      { name: "extra4", type: "uint256" },
      { name: "extra5", type: "uint256" },
      { name: "extra6", type: "uint256" },
      { name: "extra7", type: "uint256" },
      { name: "extra8", type: "uint256" },
      { name: "extra9", type: "uint256" },
      { name: "extra10", type: "uint256" },
    ],
  },
] as const;

const curveAbi = [
  {
    type: "function",
    name: "buy",
    stateMutability: "payable",
    inputs: [
      { name: "amountIn", type: "uint256" },
      { name: "minOut", type: "uint256" },
      { name: "recipient", type: "address" },
    ],
    outputs: [{ name: "tokensOut", type: "uint256" }],
  },
] as const;

const tokenAbi = [
  {
    type: "function",
    name: "balanceOf",
    stateMutability: "view",
    inputs: [{ name: "account", type: "address" }],
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

async function ethCall(to: string, data: Hex, value?: bigint) {
  const response = await fetch(RPC_URL, {
    method: "POST",
    headers: { "content-type": "application/json" },
    body: JSON.stringify({
      jsonrpc: "2.0",
      id: 1,
      method: "eth_call",
      params: [{ to, data, value: value === undefined ? undefined : `0x${value.toString(16)}` }, "latest"],
    }),
  });
  const body = (await response.json()) as { result?: Hex; error?: { message?: string } };
  if (!body.result) throw new Error(body.error?.message || "Robinhood Chain did not answer.");
  return body.result;
}

export async function readPonsCurve(token: string) {
  if (!/^0x[a-fA-F0-9]{40}$/.test(token)) return null;
  const data = encodeFunctionData({ abi: factoryAbi, functionName: "getLaunchedToken", args: [token as Hex] });
  const raw = await ethCall(PONS_FACTORY, data);
  const curve = `0x${raw.slice(2 + 64 + 24, 2 + 128)}` as Hex;
  if (/^0x0{40}$/i.test(curve)) return null;
  return curve;
}

export async function quotePonsBuy(token: string, amountEth: string, recipient: string) {
  const curve = await readPonsCurve(token);
  if (!curve) throw new Error("This token is not a Pons launch. Launch it on Pons, then save that token address.");
  if (!/^0x[a-fA-F0-9]{40}$/.test(recipient)) throw new Error("Connect MetaMask before quoting a buy.");
  const amountIn = parseEther(amountEth);
  if (amountIn <= 0n) throw new Error("Enter an ETH amount greater than 0.");
  const data = encodeFunctionData({
    abi: curveAbi,
    functionName: "buy",
    args: [amountIn, 0n, recipient as Hex],
  });
  const raw = await ethCall(curve, data, amountIn);
  const tokensOut = BigInt(raw);
  const minOut = (tokensOut * 99n) / 100n;
  return { curve, amountIn, tokensOut, minOut, tokensLabel: formatUnits(tokensOut, 18) };
}

export function encodePonsBuy(curve: Hex, amountIn: bigint, minOut: bigint, recipient: Hex) {
  return {
    to: curve,
    data: encodeFunctionData({
      abi: curveAbi,
      functionName: "buy",
      args: [amountIn, minOut, recipient],
    }),
    value: `0x${amountIn.toString(16)}`,
  };
}

export async function readNativeBalance(account: string, provider?: Eip1193Provider) {
  if (provider) {
    try {
      const chainId = (await provider.request({ method: "eth_chainId" })) as string;
      if (Number.parseInt(chainId, 16) === 4663) {
        const raw = (await provider.request({
          method: "eth_getBalance",
          params: [account, "latest"],
        })) as string;
        return Number(formatUnits(BigInt(raw), 18));
      }
    } catch {
      // Fall through to the Robinhood RPC.
    }
  }
  const response = await fetch(RPC_URL, {
    method: "POST",
    headers: { "content-type": "application/json" },
    body: JSON.stringify({
      jsonrpc: "2.0",
      id: 1,
      method: "eth_getBalance",
      params: [account, "latest"],
    }),
  });
  const body = (await response.json()) as { result?: Hex; error?: { message?: string } };
  if (!body.result) throw new Error(body.error?.message || "Could not read the ETH balance.");
  return Number(formatUnits(BigInt(body.result), 18));
}

export async function readTokenBalance(token: string, account: string) {
  const data = encodeFunctionData({ abi: tokenAbi, functionName: "balanceOf", args: [account as Hex] });
  const raw = await ethCall(token, data);
  let decimals = 18;
  try {
    const decData = encodeFunctionData({ abi: tokenAbi, functionName: "decimals" });
    decimals = Number(BigInt(await ethCall(token, decData)));
  } catch {
    decimals = 18;
  }
  return Number(formatUnits(BigInt(raw), decimals));
}

export async function sendPonsBuy(provider: Eip1193Provider, from: Hex, token: string, amountEth: string) {
  const quote = await quotePonsBuy(token, amountEth, from);
  const tx = encodePonsBuy(quote.curve, quote.amountIn, quote.minOut, from);
  let hash: string;
  try {
    hash = (await provider.request({
      method: "eth_sendTransaction",
      params: [{ from, to: tx.to, data: tx.data, value: tx.value }],
    })) as string;
  } catch (error) {
    const code = (error as { code?: number }).code;
    if (code === 4001) throw new Error("You declined the buy in MetaMask.");
    throw error instanceof Error ? error : new Error("MetaMask rejected the buy.");
  }
  for (let attempt = 0; attempt < 40; attempt += 1) {
    const receipt = (await provider.request({ method: "eth_getTransactionReceipt", params: [hash] })) as { status?: string } | null;
    if (receipt) {
      if (receipt.status === "0x0") throw new Error("The buy failed on Robinhood Chain.");
      return { hash, tokensLabel: quote.tokensLabel };
    }
    await new Promise((resolve) => window.setTimeout(resolve, 2000));
  }
  throw new Error("The buy was sent, but the receipt did not arrive in time.");
}
