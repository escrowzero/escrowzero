import React from 'react';
import { X, FileText } from 'lucide-react';

interface WhitepaperModalProps {
  isOpen: boolean;
  onClose: () => void;
}

const card = "p-5 bg-[#101916] border border-[rgba(130,245,173,0.16)] rounded-2xl text-[#d7f5e4]";

export const WhitepaperModal: React.FC<WhitepaperModalProps> = ({ isOpen, onClose }) => {
  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-5 bg-black/75 backdrop-blur-md">
      <div className="w-full max-w-4xl bg-[#0c1411] border border-[rgba(130,245,173,0.18)] rounded-3xl shadow-2xl p-5 sm:p-8 relative max-h-[94vh] flex flex-col text-[#d7f5e4]">
        <button
          onClick={onClose}
          className="absolute top-5 right-5 p-2 rounded-full text-[#9ecfb0] hover:bg-[#1b2e24] hover:text-[#d7f5e4]"
          title="Close Whitepaper"
        >
          <X className="w-5 h-5" />
        </button>

        <div className="flex items-center gap-3.5 pb-4 border-b border-[rgba(130,245,173,0.16)] mb-4 pr-10">
          <div className="p-3 rounded-2xl bg-[#82f5ad]/10 text-[#82f5ad]">
            <FileText className="w-7 h-7" />
          </div>
          <div>
            <h2 className="font-robotics text-xl sm:text-2xl font-medium tracking-tight text-[#82f5ad]">
              WHITE PAPER: ZERO ESCROW ($ZEC)
            </h2>
            <p className="text-sm text-[#9ecfb0] mt-1">
              Zero gas Settlement & P2P privacy escrow on Robinhood
            </p>
          </div>
        </div>

        <div className="flex-1 overflow-y-auto pr-1 flex flex-col gap-5 text-sm leading-relaxed">
          <section className={card}>
            <h3 className="font-bold text-[#82f5ad] mb-2">1. EXECUTIVE SUMMARY</h3>
            <p>
              ZERO ESCROW ($ZEC) is a next-generation P2P OTC and conditional settlement protocol built natively on Robinhood Chain L2. As tokenized equities and real-world assets such as TSLA, NVDA, AAPL, and SPY grow, traders and institutions need settlement that is fast, secure, surveillance-proof, and frictionless.
            </p>
            <p className="mt-2">
              ZERO ESCROW is a programmable, non-custodial smart vault. It holds $ETH, stock tokens, and stablecoins in a neutral state until the agreed conditions or milestones are met. Automated code replaces legal retainers and centralized middlemen, so the release is trustless, instant, and peer to peer.
            </p>
            <ul className="mt-3 list-disc pl-5 flex flex-col gap-2">
              <li><strong>Zero Escrow (Gasless).</strong> ERC-4337 paymasters sponsor the transaction fee, so a wallet does not need a native gas balance.</li>
              <li><strong>Privacy Escrow.</strong> Encrypted vaults hide trade size, valuation, and wallet metrics from public explorers, front-running, and competitor tracking.</li>
              <li><strong>Automated RWA dividend and yield routing.</strong> On vaults locked at least 7 days, dividends from tokenized equities and RWAs are captured and routed to the rightful party during the escrow.</li>
            </ul>
          </section>

          <section className={card}>
            <h3 className="font-bold text-[#82f5ad] mb-2">2. VISION, MISSION & NAMING</h3>
            <p><strong>Vision.</strong> The standard for conditional settlement of RWAs, ETH, and ZEC, connecting capital markets to decentralized speed, privacy, and efficiency.</p>
            <p className="mt-2"><strong>Mission.</strong> Remove the need to hold a gas token. Keep assets in non-custodial contracts. Let anyone settle tokenized equities, ETH, ZEC, and stablecoins with no slippage, no gas, and optional privacy. Keep locked assets productive by routing yield during the escrow.</p>
            <p className="mt-2"><strong>ZERO</strong> means zero gas, zero slippage, and zero visibility. <strong>ESCROW</strong> means the vault releases assets only when the agreed conditions are met on-chain.</p>
          </section>

          <section className={card}>
            <h3 className="font-bold text-[#82f5ad] mb-2">3. THE 3 CORE UTILITIES</h3>
            <p className="mb-2"><strong>Utility 1 — Zero Escrow.</strong> Approve, create, release, and refund are user operations, not raw transactions. The ZERO ESCROW paymaster sponsors the gas. Session keys let the terminal release a milestone when the condition hits, without another popup. Approve and deposit can be one signature at $0 gas.</p>
            <p className="mb-2"><strong>Utility 2 — Privacy Escrow.</strong> Amounts, terms, and payout values are encrypted at the vault. The contract still checks milestones and Pyth prices without showing the balance on a public explorer. Built for OTC trades in NVDA and TSLA and for confidential payroll.</p>
            <p><strong>Utility 3 — RWA yield routing.</strong> Active only when the vault is at least 7 days. Dividends paid in USDG or other stablecoins are captured and sent to the buyer, seller, or added as collateral, while the principal lock stays in place.</p>
          </section>

          <section className={card}>
            <h3 className="font-bold text-[#82f5ad] mb-2">4. TOKENOMICS & $ZEC</h3>
            <p className="mb-3">
              $ZEC is the utility, payment, governance, and value-capture asset. VIP is a wallet snapshot, not a stake. The line is 1,000,000 $ZEC, which is 0.1% of supply.
            </p>
            <div className="overflow-x-auto">
              <table className="w-full text-left text-xs border-collapse">
                <thead>
                  <tr className="border-b border-[rgba(130,245,173,0.2)] text-[#82f5ad]">
                    <th className="py-2 pr-3">Tier</th>
                    <th className="py-2 pr-3">Requirement</th>
                    <th className="py-2 pr-3">Platform fee</th>
                    <th className="py-2 pr-3">Paymaster</th>
                    <th className="py-2 pr-3">Privacy vaults</th>
                    <th className="py-2">Arbiter DAO</th>
                  </tr>
                </thead>
                <tbody>
                  <tr className="border-b border-[rgba(130,245,173,0.12)]">
                    <td className="py-2 pr-3 font-bold">Standard</td>
                    <td className="py-2 pr-3">Under 1,000,000 $ZEC</td>
                    <td className="py-2 pr-3">0.20%</td>
                    <td className="py-2 pr-3">Standard</td>
                    <td className="py-2 pr-3">Standard vaults</td>
                    <td className="py-2">Inactive</td>
                  </tr>
                  <tr>
                    <td className="py-2 pr-3 font-bold">VIP</td>
                    <td className="py-2 pr-3">1,000,000 $ZEC or more (0.1%)</td>
                    <td className="py-2 pr-3">0.00% (free)</td>
                    <td className="py-2 pr-3">High-priority zero gas</td>
                    <td className="py-2 pr-3">Unlimited</td>
                    <td className="py-2">Vote and earn</td>
                  </tr>
                </tbody>
              </table>
            </div>
            <ul className="mt-3 list-disc pl-5 flex flex-col gap-1">
              <li>1,000,000 $ZEC waives the protocol fee on $ETH, stock tokens, and stablecoins.</li>
              <li>$ZEC can be the asset locked for a milestone or a P2P swap.</li>
              <li>VIP holders vote on contested releases and can receive a share of settlement fees.</li>
            </ul>
          </section>

          <section className={card}>
            <h3 className="font-bold text-[#82f5ad] mb-2">5. PROTOCOL USE CASES</h3>
            <p className="mb-2"><strong>5.1 Multi-asset P2P OTC.</strong> Large NVDA, TSLA, ETH, or ZEC trades on a DEX move the price and can be front-run. Two parties lock a fixed rate in a privacy vault and refund automatically if it expires.</p>
            <p className="mb-2"><strong>5.2 Corporate milestone and freelance payroll.</strong> Pay in equities, ETH, or ZEC by milestone, with zero gas and private records.</p>
            <p><strong>5.3 Collateralized deals.</strong> Equities or ETH stay locked. Pyth checks the price. If the lock is 7 days or longer, dividends route through Utility 3.</p>
          </section>

          <section className={card}>
            <h3 className="font-bold text-[#82f5ad] mb-2">6. DEVELOPMENT ROADMAP</h3>
            <p className="mb-2"><strong>Phase 1 — Core engine.</strong> Robinhood Chain L2, ERC-4337 paymasters, 1-click deployment, TSLA, NVDA, AAPL, SPY, ETH, USDG, and ZEC, Pyth feeds, and the snapshot VIP waiver.</p>
            <p className="mb-2"><strong>Phase 2 — Privacy and DAO.</strong> Encrypted P2P vaults, session keys, and the arbiter DAO.</p>
            <p><strong>Phase 3 — RWA servicing.</strong> Dividend routing on vaults locked 7 days or more, and multi-sig vesting for startup milestone payouts.</p>
          </section>

          <section className="p-4 bg-[#2a2114] border border-[#8a6a32] rounded-2xl text-[13px] text-[#f3e6c4]">
            <h3 className="font-bold mb-1 text-[#f0d78c]">7. LEGAL & RISK DISCLAIMER</h3>
            <p>
              This whitepaper is informational. It is not a prospectus, investment advice, or an offer to sell securities. Smart contracts, tokenized equities (TSLA, NVDA, AAPL, SPY), ETH, and ZEC can lose value through volatility, contract bugs, or regulation. Tokenized equities here are synthetic or wrapped derivatives and do not grant shareholder votes unless a regulated custodian explicitly supports that. Users are responsible for their own legal compliance.
            </p>
          </section>
        </div>

        <div className="mt-4 pt-4 border-t border-[rgba(130,245,173,0.16)] flex items-center justify-between gap-3">
          <span className="text-[11px] font-mono text-[#9ecfb0]">ZERO ESCROW ($ZEC) · Robinhood Chain L2</span>
          <div className="flex items-center gap-2">
          <button onClick={onClose} className="px-4 py-2 bg-[#82f5ad] text-[#07110c] font-bold text-xs rounded-xl">
              Close
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};
