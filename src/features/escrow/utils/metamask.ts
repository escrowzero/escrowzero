import { previewPathPrefix } from "@/lib/preview-path-prefix";
import {
  addOrSwitchToRobinhoodL2,
  type Eip1193Provider,
  type NetworkSwitchResult,
} from "./web3";

export const WALLET_MESSAGE_SOURCE = "escrow-market";

export type WalletBridgeMessage = {
  source: typeof WALLET_MESSAGE_SOURCE;
  type: "connected" | "switched" | "rejected" | "failed" | "settled";
  address?: string;
  chainId?: string;
  detail?: string;
  id?: string;
  hash?: string;
  chainDealId?: string;
  error?: string;
};

type EthereumWindow = Window & {
  ethereum?: Eip1193Provider & {
    providers?: Eip1193Provider[];
    isMetaMask?: boolean;
    isBraveWallet?: boolean;
  };
};

function ethereumWindow(): EthereumWindow | undefined {
  if (typeof window === "undefined") return undefined;
  return window as EthereumWindow;
}

export const MM_STORAGE_KEY = "escrow-market-metamask";

export function pickMetaMaskProvider(): Eip1193Provider | undefined {
  const win = ethereumWindow();
  const ethereum = win?.ethereum;
  if (!ethereum) return undefined;
  const list = ethereum.providers?.length ? ethereum.providers : [ethereum];
  return (
    list.find((provider) => provider.isMetaMask && !(provider as { isBraveWallet?: boolean }).isBraveWallet) ??
    list.find((provider) => provider.isMetaMask)
  );
}

export function walletPopupUrl(action: "connect" | "switch" | "send" = "connect"): string {
  const prefix = previewPathPrefix(window.location.hostname, window.location.pathname) ?? "";
  const url = new URL(`${prefix}/wallet`, window.location.origin);
  url.searchParams.set("action", action);
  return url.toString();
}

export async function connectWithProvider(provider: Eip1193Provider): Promise<{
  address: string;
  chainId: string;
  network: NetworkSwitchResult;
}> {
  const accounts = (await provider.request({ method: "eth_requestAccounts" })) as string[];
  if (!accounts?.length) throw new Error("rejected");
  const network = await addOrSwitchToRobinhoodL2(provider);
  const chainId = (await provider.request({ method: "eth_chainId" })) as string;
  return { address: accounts[0], chainId, network };
}

export function saveWalletSession(address: string, chainId: string, type: "connected" | "switched") {
  const payload = { address, chainId, type, ts: Date.now() };
  localStorage.setItem(MM_STORAGE_KEY, JSON.stringify(payload));
  postWalletMessage({ type, address, chainId });
}

function postWalletMessage(message: Omit<WalletBridgeMessage, "source">) {
  const payload: WalletBridgeMessage = { source: WALLET_MESSAGE_SOURCE, ...message };
  if (window.opener && !window.opener.closed) {
    window.opener.postMessage(payload, window.location.origin);
  }
}

export function openMetaMaskPopup(action: "connect" | "switch"): Window | null {
  return window.open(
    walletPopupUrl(action),
    "escrow-metamask",
    "popup=yes,width=440,height=720",
  );
}
