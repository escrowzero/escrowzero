import { createFileRoute } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import {
  connectWithProvider,
  pickMetaMaskProvider,
  saveWalletSession,
  WALLET_MESSAGE_SOURCE,
  walletPopupUrl,
} from "@/features/escrow/utils/metamask";
import { executeSettlement, TX_INTENT_KEY, TX_RESULT_KEY, type SettlementIntent } from "@/features/escrow/utils/escrowChain";
import { addOrSwitchToRobinhoodL2 } from "@/features/escrow/utils/web3";

export const Route = createFileRoute("/wallet")({ component: WalletPopup });

function WalletPopup() {
  const [action, setAction] = useState<"connect" | "switch" | "send">("connect");
  const [status, setStatus] = useState(
    "Click the button. MetaMask only opens from a click, and it cannot attach inside the preview frame.",
  );
  const [busy, setBusy] = useState(false);
  const [outsideHref, setOutsideHref] = useState("/wallet");

  useEffect(() => {
    const param = new URLSearchParams(window.location.search).get("action");
    const next = param === "switch" || param === "send" ? param : "connect";
    setAction(next);
    setOutsideHref(walletPopupUrl(next));
  }, []);

  const handleClick = async () => {
    setBusy(true);
    setStatus("Waiting for MetaMask…");
    const provider = await waitForMetaMask();
    if (!provider) {
      setBusy(false);
      setStatus("MetaMask is not installed in this browser. Install the extension, then click again.");
      return;
    }

    try {
      if (action === "send") {
        const raw = localStorage.getItem(TX_INTENT_KEY);
        if (!raw) throw new Error("No settlement is waiting. Go back and click Lock, Release, or Refund again.");
        const intent = JSON.parse(raw) as SettlementIntent;
        const result = await executeSettlement(provider, intent);
        localStorage.setItem(TX_RESULT_KEY, JSON.stringify(result));
        const payload = { source: WALLET_MESSAGE_SOURCE, type: "settled" as const, ...result };
        if (window.opener && !window.opener.closed) window.opener.postMessage(payload, window.location.origin);
        setStatus("Transaction confirmed. Go back to Escrow Market.");
      } else if (action === "switch") {
        const network = await addOrSwitchToRobinhoodL2(provider);
        if (network === "rejected") throw new Error("rejected");
        if (network !== "switched") throw new Error("failed");
        const accounts = (await provider.request({ method: "eth_accounts" })) as string[];
        const chainId = (await provider.request({ method: "eth_chainId" })) as string;
        if (accounts?.[0]) saveWalletSession(accounts[0], chainId, "switched");
        setStatus("Robinhood Chain is selected. Go back to Escrow Market.");
      } else {
        const result = await connectWithProvider(provider);
        saveWalletSession(result.address, result.chainId, "connected");
        setStatus(`Connected ${shortAddress(result.address)}. Go back to Escrow Market.`);
      }
    } catch (error) {
      const message = error instanceof Error ? error.message : "MetaMask could not finish. Click the button to try again.";
      if (action === "send") {
        try {
          const raw = localStorage.getItem(TX_INTENT_KEY);
          const id = raw ? (JSON.parse(raw) as { id?: string }).id : undefined;
          if (id) {
            const result = { id, hash: "", error: message };
            localStorage.setItem(TX_RESULT_KEY, JSON.stringify(result));
            if (window.opener && !window.opener.closed) {
              window.opener.postMessage({ source: WALLET_MESSAGE_SOURCE, type: "settled", ...result }, window.location.origin);
            }
          }
        } catch {
          // The opener will time out if this result cannot be stored.
        }
      }
      setStatus(message);
    } finally {
      setBusy(false);
    }
  };

  return (
    <main className="min-h-screen bg-[#d9fce8] text-[#3a5e3c] flex items-center justify-center p-6">
      <section className="w-full max-w-sm rounded-3xl border border-[rgba(58,94,60,0.14)] bg-white p-6 shadow-lg">
        <p className="text-xs font-bold tracking-wide text-[#145c32]">ESCROW MARKET</p>
        <h1 className="mt-2 text-xl font-bold">{action === "send" ? "Sign settlement" : "Connect MetaMask"}</h1>
        <p className="mt-3 text-sm leading-relaxed text-[#1e3a2c]">{status}</p>
        <button
          type="button"
          disabled={busy}
          onClick={() => void handleClick()}
          className="mt-6 w-full rounded-xl bg-[#3a5e3c] px-4 py-3 text-sm font-bold text-white disabled:opacity-60"
        >
          {busy ? "Waiting for MetaMask…" : action === "send" ? "Sign transaction" : action === "switch" ? "Add Robinhood Chain" : "Continue in MetaMask"}
        </button>
        <a
          href={outsideHref}
          target="_blank"
          rel="opener"
          className="mt-3 block text-center text-xs font-bold text-[#145c32] underline"
        >
          Open this page in a new tab
        </a>
      </section>
    </main>
  );
}

function shortAddress(address: string) {
  return `${address.slice(0, 6)}…${address.slice(-4)}`;
}

async function waitForMetaMask() {
  const started = Date.now();
  while (Date.now() - started < 1500) {
    const provider = pickMetaMaskProvider();
    if (provider) return provider;
    await new Promise((resolve) => window.setTimeout(resolve, 100));
  }
  return undefined;
}
