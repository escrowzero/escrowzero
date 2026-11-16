import { createFileRoute } from "@tanstack/react-router";
import { useEffect, useState, type FormEvent } from "react";
import { getSavedAppConfig, realTokenAddress, resolveEscrowAddress, saveAppConfig, TOKEN_ADDRESS_FIELDS, type SavedAppConfig } from "@/features/escrow/utils/contractDeployer";
import { unlockDesk } from "@/features/escrow/utils/desk-auth";

const TICKET_KEY = "escrow_desk_ticket";

type DeskSearch = { k: string };

export const Route = createFileRoute("/desk")({
  validateSearch: (search: Record<string, unknown>): DeskSearch => ({
    k: typeof search.k === "string" ? search.k : "",
  }),
  component: OwnerDesk,
});

function OwnerDesk() {
  return <DeskGate />;
}

function DeskGate() {
  const [mode, setMode] = useState<"checking" | "enter" | "editor">("checking");

  useEffect(() => {
    const ticket = sessionStorage.getItem(TICKET_KEY) || "";
    if (!ticket) {
      setMode("enter");
      return;
    }
    let stopped = false;
    void unlockDesk({ data: { ticket } }).then((result) => {
      if (stopped) return;
      if (result.ok) setMode("editor");
      else {
        sessionStorage.removeItem(TICKET_KEY);
        setMode("enter");
      }
    }).catch(() => {
      if (!stopped) setMode("enter");
    });
    return () => {
      stopped = true;
    };
  }, []);

  if (mode === "editor") return <OwnerEditor />;
  if (mode === "checking") return <main className="min-h-screen bg-[#07110c]" />;
  return <PasswordForm onDone={() => setMode("editor")} />;
}

function PasswordForm({ onDone }: { onDone: () => void }) {
  const [password, setPassword] = useState("");
  const [error, setError] = useState("");
  const [pending, setPending] = useState(false);

  const onSubmit = async (event: FormEvent) => {
    event.preventDefault();
    setError("");
    setPending(true);
    try {
      const result = await unlockDesk({ data: { password } });
      if (!result.ok || !("ticket" in result) || !result.ticket) {
        setError("Wrong password.");
        return;
      }
      sessionStorage.setItem(TICKET_KEY, result.ticket);
      onDone();
    } catch {
      setError("Could not check the password.");
    } finally {
      setPending(false);
    }
  };

  return (
    <main className="min-h-screen bg-[#07110c] text-[#d7f5e4] flex items-center justify-center p-6">
      <form onSubmit={onSubmit} className="w-full max-w-lg rounded-3xl border border-[rgba(130,245,173,0.18)] bg-[#101916] p-6">
        <p className="text-xs font-bold tracking-wide text-[#82f5ad]">OWNER ONLY</p>
        <h1 className="mt-2 text-xl font-bold">Enter password</h1>
        <p className="mt-2 text-sm text-[#9ecfb0]">
          This password is fixed. A visitor cannot create or change it.
        </p>
        <label className="mt-5 block text-xs font-bold text-[#d7f5e4]">
          Password
          <input
            type="password"
            value={password}
            onChange={(event) => setPassword(event.target.value)}
            autoComplete="current-password"
            className="mt-1 w-full rounded-xl border border-[rgba(130,245,173,0.2)] bg-[#07110c] px-3 py-2 text-sm text-[#d7f5e4]"
          />
        </label>
        {error && <p className="mt-3 text-xs text-rose-300">{error}</p>}
        <button type="submit" disabled={pending} className="mt-5 rounded-xl bg-[#82f5ad] px-4 py-2.5 text-sm font-bold text-[#07110c] disabled:opacity-60">
          {pending ? "Checking" : "Unlock"}
        </button>
      </form>
    </main>
  );
}

function OwnerEditor() {
  const saved = getSavedAppConfig();
  const [escrow, setEscrow] = useState(resolveEscrowAddress(saved.escrowContractAddress));
  const [tokens, setTokens] = useState<Record<string, string>>(() =>
    Object.fromEntries(TOKEN_ADDRESS_FIELDS.map((field) => [field.key, realTokenAddress(saved[field.key])])),
  );
  const [savedNote, setSavedNote] = useState("");

  const onSave = (event: FormEvent) => {
    event.preventDefault();
    const nextEscrow = escrow.trim();
    if (nextEscrow && !resolveEscrowAddress(nextEscrow)) {
      setSavedNote("That escrow address is empty or retired. Paste the new GaslessEscrow address.");
      return;
    }
    const nextTokens: Partial<SavedAppConfig> = {};
    for (const field of TOKEN_ADDRESS_FIELDS) {
      const raw = (tokens[field.key] || "").trim();
      if (!raw) {
        nextTokens[field.key] = "";
        continue;
      }
      const clean = realTokenAddress(raw);
      if (!clean) {
        setSavedNote(`${field.label} needs a real 40-character contract address.`);
        return;
      }
      nextTokens[field.key] = clean;
    }
    const next = saveAppConfig({
      mode: "LIVE",
      escrowContractAddress: resolveEscrowAddress(nextEscrow),
      ...nextTokens,
    });
    setEscrow(next.escrowContractAddress);
    setSavedNote("Saved on this browser.");
  };

  return (
    <main className="min-h-screen bg-[#07110c] text-[#d7f5e4] flex items-center justify-center p-6">
      <form onSubmit={onSave} className="w-full max-w-lg rounded-3xl border border-[rgba(130,245,173,0.18)] bg-[#101916] p-6">
        <p className="text-xs font-bold tracking-wide text-[#82f5ad]">OWNER ONLY</p>
        <h1 className="mt-2 text-xl font-bold">Token addresses</h1>
        <p className="mt-2 text-sm text-[#9ecfb0]">
          Paste the real Robinhood Chain contract for each asset. Leave a box empty until that token exists.
          Sample addresses are ignored. ETH has no token address.
        </p>
        <label className="mt-5 block text-xs font-bold text-[#d7f5e4]">
          Escrow contract
          <input
            value={escrow}
            onChange={(event) => setEscrow(event.target.value)}
            placeholder="GaslessEscrow address"
            className="mt-1 w-full rounded-xl border border-[rgba(130,245,173,0.2)] bg-[#07110c] px-3 py-2 font-mono text-xs text-[#d7f5e4]"
          />
        </label>
        {TOKEN_ADDRESS_FIELDS.map((field) => (
          <label key={field.key} className="mt-4 block text-xs font-bold text-[#d7f5e4]">
            {field.label} contract address
            <input
              value={tokens[field.key] || ""}
              onChange={(event) => setTokens((current) => ({ ...current, [field.key]: event.target.value }))}
              placeholder="0x… leave empty if not launched"
              className="mt-1 w-full rounded-xl border border-[rgba(130,245,173,0.2)] bg-[#07110c] px-3 py-2 font-mono text-xs text-[#d7f5e4]"
            />
          </label>
        ))}
        <button type="submit" className="mt-5 rounded-xl bg-[#82f5ad] px-4 py-2.5 text-sm font-bold text-[#07110c]">
          Save
        </button>
        {savedNote && <p className="mt-3 text-xs font-mono text-[#82f5ad]">{savedNote}</p>}
      </form>
    </main>
  );
}
