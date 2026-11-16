import React from 'react';
import { AsciiField } from './AsciiField';
import { VaultAscii } from './VaultAscii';
import { Link } from '@tanstack/react-router';
import {
  Zap,
  Award,
  ArrowRight,
  Check,
  FileText,
} from 'lucide-react';

interface LandingPageProps {
  onOpenContractModal: () => void;
  onOpenWhitepaperModal: () => void;
}

export const LandingPage: React.FC<LandingPageProps> = ({
  onOpenContractModal,
  onOpenWhitepaperModal,
}) => {
  return (
    <div className="relative min-h-screen bg-[#07110c] text-[#d7f5e4] font-space">
      <AsciiField />
      <div className="relative z-10">
      <section className="relative pt-10 sm:pt-16 pb-16 sm:pb-24 text-[#3a5e3c] overflow-hidden">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 relative z-10">
          <div className="grid grid-cols-1 lg:grid-cols-12 gap-10 sm:gap-14 items-center">
            <div className="lg:col-span-7 flex flex-col gap-6">
              <div className="inline-flex items-center gap-2.5 px-4 py-1.5 bg-white border border-[rgba(58,94,60,0.16)] rounded-full w-fit shadow-xs">
                <span className="w-2.5 h-2.5 rounded-full bg-[#82f5ad] led-blink-green" />
                <span className="font-robotics text-xs text-[#3a5e3c] font-bold">ROBINHOOD CHAIN L2</span>
                <span className="text-[#1e3a2c]">/</span>
                <span className="font-robotics text-xs text-[#145c32] font-bold">ERC-4337 GASLESS ESCROW</span>
              </div>

              <h1 className="font-robotics text-3xl sm:text-5xl md:text-6xl font-medium tracking-[-0.04em] leading-[1.05] text-[#3a5e3c]">
                ZERO ESCROW <span className="text-[#145c32]">($ZEC)</span>
              </h1>
              <p className="text-lg sm:text-xl text-[#145c32] leading-snug max-w-2xl">
                Zero-Gas Settlement & P2P Privacy Escrow on Robinhood Chain L2
              </p>
              <p className="text-base sm:text-lg text-[#1e3a2c] leading-relaxed max-w-2xl font-normal">
                ZERO ESCROW is a programmable, non-custodial smart vault system that holds multi-asset funds ($ETH, stock tokens, stablecoins) in a secure, neutral state until specific, pre-agreed conditions or milestones are fulfilled. By replacing costly legal retainers and centralized middlemen with automated code, ZERO ESCROW ensures trustless, instant, and peer-to-peer transaction execution.
              </p>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3.5">
                <div className="p-3.5 bg-gradient-to-r from-white to-[#e7f6ec] border border-[#82f5ad]/30 rounded-2xl font-mono text-xs text-[#3a5e3c] flex items-start gap-3 shadow-xs">
                  <div className="p-2 bg-[#3a5e3c]/10 rounded-xl text-[#145c32] shrink-0 mt-0.5">
                    <Zap className="w-4 h-4" />
                  </div>
                  <div>
                    <span className="text-[#145c32] font-robotics font-bold block">100% SPONSORED GAS</span>
                    <span className="text-[#1e3a2c] text-[11px]">Relayed via ERC-4337 Paymaster. Zero ETH needed for fees.</span>
                  </div>
                </div>

                <div className="p-3.5 bg-gradient-to-r from-white to-[#e7f6ec] border border-[#82f5ad]/30 rounded-2xl font-mono text-xs text-[#3a5e3c] flex items-start gap-3 shadow-xs">
                  <div className="p-2 bg-[#007E8A]/10 rounded-xl text-[#145c32] shrink-0 mt-0.5">
                    <Award className="w-4 h-4" />
                  </div>
                  <div>
                    <span className="text-[#145c32] font-robotics font-bold block">$ZEC VIP TIER</span>
                    <span className="text-[#1e3a2c] text-[11px]">Hold 1,000,000 tokens (0.1% supply) for lifetime 0% fee waiver.</span>
                  </div>
                </div>
              </div>

              <div className="flex flex-wrap items-center gap-3 pt-2">
                <Link
                  to="/"
                  search={{ view: 'dapp' }}
                  className="px-6 py-3.5 bg-[#3a5e3c] hover:bg-[#2f4d31] text-white font-robotics font-bold text-xs sm:text-sm rounded-2xl shadow-md hover:shadow-lg transition-all flex items-center gap-2 cursor-pointer group hover:-translate-y-0.5"
                >
                  <span>Launch dApp</span>
                  <ArrowRight className="w-4 h-4 group-hover:translate-x-1 transition-transform" />
                </Link>
                <button
                  onClick={onOpenWhitepaperModal}
                  className="px-5 py-3.5 bg-white hover:bg-[#c1d9bf] border border-[rgba(217,252,232,0.18)] text-[#3a5e3c] font-robotics font-bold text-xs sm:text-sm rounded-2xl transition-all flex items-center gap-2 cursor-pointer shadow-xs hover:border-[#82f5ad] hover:-translate-y-0.5"
                >
                  <FileText className="w-4 h-4 text-[#145c32]" />
                  <span>Whitepaper</span>
                </button>
              </div>

              <div className="pt-2 flex flex-wrap items-center gap-5 text-xs font-mono text-[#1e3a2c]">
                <div className="flex items-center gap-1.5">
                  <Check className="w-3.5 h-3.5 text-[#145c32]" />
                  <span>Pyth Oracle Sub-second Feeds</span>
                </div>
                <div className="flex items-center gap-1.5">
                  <Check className="w-3.5 h-3.5 text-[#145c32]" />
                  <span>Audited Non-Custodial Multi-sig</span>
                </div>
                <div className="flex items-center gap-1.5">
                  <Check className="w-3.5 h-3.5 text-[#145c32]" />
                  <span>Official Whitepaper Attached</span>
                </div>
              </div>
            </div>

            <div className="lg:col-span-5 flex flex-col gap-4">
              <div className="relative rounded-[32px] p-2 bg-gradient-to-tr from-[#3a5e3c]/30 via-[rgba(58,94,60,0.16)] to-[#007E8A]/30 shadow-2xl">
                <div className="rounded-[28px] overflow-hidden bg-white relative border border-[rgba(58,94,60,0.14)]">
                  <VaultAscii />
                  <div className="px-4 pb-4 flex flex-wrap gap-2">
                    <div className="px-3 py-1 bg-[#d9fce8] border border-[#3a5e3c]/20 rounded-full text-[#3a5e3c] text-[11px] font-mono flex items-center gap-1.5">
                      <span className="w-2 h-2 rounded-full bg-[#3a5e3c]" />
                      <span>$ZEC (VIP 0%)</span>
                    </div>
                    <div className="px-3 py-1 bg-[#d9fce8] border border-[#3a5e3c]/20 rounded-full text-[#3a5e3c] text-[11px] font-mono flex items-center gap-1.5">
                      <span className="w-2 h-2 rounded-full bg-[#2775CA]" />
                      <span>USDG & $ETH</span>
                    </div>
                    <div className="px-3 py-1 bg-[#d9fce8] border border-[#3a5e3c]/20 rounded-full text-[#3a5e3c] text-[11px] font-mono flex items-center gap-1.5">
                      <span className="w-2 h-2 rounded-full bg-[#82f5ad]" />
                      <span>$NVDA / $TSLA</span>
                    </div>
                  </div>
                  <div className="p-4 border-t border-[rgba(58,94,60,0.12)] flex items-center justify-between text-xs font-mono bg-white/80">
                    <div>
                      <span className="text-[#1e3a2c] text-[10px] block">SMART CONTRACT VAULT:</span>
                      <span className="font-bold text-[#3a5e3c]">Robinhood L2 Sequencer</span>
                    </div>
                    <button
                      onClick={onOpenContractModal}
                      className="px-3 py-1 bg-[#3a5e3c]/10 hover:bg-[#3a5e3c]/20 text-[#145c32] font-robotics font-bold rounded-xl text-[10px] transition-colors cursor-pointer"
                    >
                      [ View Verified ABI ]
                    </button>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>
      </section>

      <section className="py-16 sm:py-20 border-b border-[#3a5e3c]/15">
        <div className="max-w-7xl mx-auto px-4 sm:px-6">
          <div className="mb-8 max-w-2xl">
            <h2 className="text-2xl sm:text-4xl font-medium tracking-[-0.03em] text-[#3a5e3c]">How Escrow Market Works in 3 Steps</h2>
            <p className="mt-3 text-base leading-7 text-[#1e3a2c]">Bilateral security without centralized counterparty escrow middlemen.</p>
          </div>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-5">
            <article className="flex h-full flex-col p-6 sm:p-7 rounded-2xl bg-white border border-[rgba(58,94,60,0.14)]">
              <div className="font-mono text-xs tracking-[0.18em] text-[#145c32] mb-4">01</div>
              <p className="text-[11px] font-bold uppercase tracking-[0.14em] text-[#145c32]">Deposit phase</p>
              <h3 className="mt-2 text-xl font-medium tracking-tight text-[#3a5e3c]">Deposit & Lock Assets</h3>
              <p className="mt-3 text-sm leading-7 text-[#1e3a2c]">Choose tokenized equities ($NVDA, $TSLA), $ZEC, $USDG, or ETH. Specify lock amount with live Pyth oracle valuation.</p>
              <p className="mt-auto pt-5 font-mono text-[11px] leading-5 text-[#145c32]">createDeal(beneficiary, asset, amount)</p>
            </article>
            <article className="flex h-full flex-col p-6 sm:p-7 rounded-2xl bg-white border border-[rgba(58,94,60,0.14)]">
              <div className="font-mono text-xs tracking-[0.18em] text-[#145c32] mb-4">02</div>
              <p className="text-[11px] font-bold uppercase tracking-[0.14em] text-[#145c32]">Conditional stage</p>
              <h3 className="mt-2 text-xl font-medium tracking-tight text-[#3a5e3c]">Set Beneficiary & Expiry</h3>
              <p className="mt-3 text-sm leading-7 text-[#1e3a2c]">Specify recipient EVM address and timeout deadline (1h, 24h, 7d, 30d). Optionally enable partial milestone payments.</p>
              <p className="mt-auto pt-5 font-mono text-[11px] leading-5 text-[#145c32]">milestoneEnabled: true | false</p>
            </article>
            <article className="flex h-full flex-col p-6 sm:p-7 rounded-2xl bg-white border border-[rgba(58,94,60,0.14)]">
              <div className="font-mono text-xs tracking-[0.18em] text-[#145c32] mb-4">03</div>
              <p className="text-[11px] font-bold uppercase tracking-[0.14em] text-[#145c32]">Settlement</p>
              <h3 className="mt-2 text-xl font-medium tracking-tight text-[#3a5e3c]">Instant Release or Refund</h3>
              <p className="mt-3 text-sm leading-7 text-[#1e3a2c]">Transfer shares directly to recipient upon satisfaction, or trigger automatic refunds back to depositor upon timeout expiry.</p>
              <p className="mt-auto pt-5 font-mono text-[11px] leading-5 text-[#145c32]">releaseFunds() | refundFunds()</p>
            </article>
          </div>
        </div>
      </section>

      <section className="py-16 sm:py-20 border-b border-[#3a5e3c]/15">
        <div className="max-w-7xl mx-auto px-4 sm:px-6">
          <div className="mb-8 max-w-2xl">
            <h2 className="text-2xl sm:text-4xl font-medium tracking-[-0.03em] text-[#3a5e3c]">Core Utilities</h2>
          </div>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-5">
            <article className="flex h-full flex-col p-6 sm:p-7 rounded-2xl bg-white border border-[rgba(58,94,60,0.14)]">
              <p className="text-[11px] font-bold uppercase tracking-[0.14em] text-[#145c32]">01</p>
              <h3 className="mt-3 text-xl font-medium tracking-tight text-[#3a5e3c]">Zero Escrow (Gasless Robotic Engine)</h3>
              <ul className="mt-4 text-sm leading-7 text-[#1e3a2c] list-disc pl-4 flex flex-col gap-2">
                <li><span className="font-medium text-[#145c32]">0% Gas Fees:</span> Powered by ERC-4337 Account Abstraction and Native Paymasters for 100% sponsored transaction fees on Robinhood Chain L2.</li>
                <li><span className="font-medium text-[#145c32]">1-Click Contract Deployment:</span> Deploy and manage non-custodial escrow smart contracts instantly without developer tools or complex setups.</li>
                <li><span className="font-medium text-[#145c32]">Automated Session Keys:</span> Batch multiple steps (Approve + Deposit) into a single signature with zero out-of-pocket gas cost.</li>
              </ul>
            </article>
            <article className="flex h-full flex-col p-6 sm:p-7 rounded-2xl bg-white border border-[rgba(58,94,60,0.14)]">
              <p className="text-[11px] font-bold uppercase tracking-[0.14em] text-[#145c32]">02</p>
              <h3 className="mt-3 text-xl font-medium tracking-tight text-[#3a5e3c]">Privacy Escrow (Zero-Visibility Vaults)</h3>
              <ul className="mt-4 text-sm leading-7 text-[#1e3a2c] list-disc pl-4 flex flex-col gap-2">
                <li><span className="font-medium text-[#145c32]">Metadata Encryption:</span> Encrypt trade amounts, contract conditions, and valuations directly at the vault level.</li>
                <li><span className="font-medium text-[#145c32]">Surveillance-Proof:</span> Keep wallet balances and financial deals safe from block explorer tracking, front-running, and competitive analysis.</li>
                <li><span className="font-medium text-[#145c32]">Ideal for OTC & Payroll:</span> Built specifically for high-value institutional block trades and private corporate payroll.</li>
              </ul>
            </article>
            <article className="flex h-full flex-col p-6 sm:p-7 rounded-2xl bg-white border border-[rgba(58,94,60,0.14)]">
              <p className="text-[11px] font-bold uppercase tracking-[0.14em] text-[#145c32]">03</p>
              <h3 className="mt-3 text-xl font-medium tracking-tight text-[#3a5e3c]">Automated RWA Dividend & Yield Routing</h3>
              <ul className="mt-4 text-sm leading-7 text-[#1e3a2c] list-disc pl-4 flex flex-col gap-2">
                <li><span className="font-medium text-[#145c32]">Capital Productivity:</span> Keeps locked collateral active and earning during extended escrow periods (minimum 7-day lockup).</li>
                <li><span className="font-medium text-[#145c32]">Smart Yield Capture:</span> Automatically captures dividend yields from tokenized equities and RWAs without altering core escrow locks.</li>
                <li><span className="font-medium text-[#145c32]">Direct Distribution:</span> Routes distributions directly in stablecoins (USDG) to designated stakeholders during the vault lifespan.</li>
              </ul>
            </article>
          </div>
        </div>
      </section>

      <section className="py-16 sm:py-20 border-b border-[#3a5e3c]/15">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 flex flex-col gap-16">
          <div>
            <h2 className="text-2xl sm:text-4xl font-medium tracking-[-0.03em] text-[#3a5e3c]">Tokenomics & VIP Tier Engine</h2>
            <div className="mt-6 grid grid-cols-1 md:grid-cols-2 gap-5 text-[15px] sm:text-base leading-7 text-[#1e3a2c]">
              <p className="h-full rounded-2xl bg-white border border-[rgba(58,94,60,0.14)] p-6">
                The $ZEC token serves as the primary core utility, payment medium, and value-capture asset for the ZERO ESCROW protocol on Robinhood Chain L2. To deliver a seamless user experience without locking up liquidity through complex staking mechanisms, the protocol utilizes Snapshot-Based Holding Verification at a threshold of 1,000,000 $ZEC (representing 0.1% of Total Supply).
              </p>
              <p className="h-full rounded-2xl bg-white border border-[rgba(58,94,60,0.14)] p-6">
                Users in the Standard Tier (holding under 1,000,000 $ZEC) are charged a 0.20% platform fee, receive standard Paymaster routing, and access standard vaults. Conversely, users qualifying for the VIP Tier (holding 1,000,000 $ZEC or more) enjoy a 0.00% (FREE) platform fee waiver across all supported asset trades ($ETH, tokenized stocks, and stablecoins). VIP holders also benefit from high-priority Zero Gas Paymaster execution, unlimited access to Privacy Vaults, and protocol revenue shares.
              </p>
            </div>
          </div>

          <div>
            <h2 className="text-2xl sm:text-4xl font-medium tracking-[-0.03em] text-[#3a5e3c] mb-6">Development Roadmap</h2>
            <div className="grid grid-cols-1 md:grid-cols-3 gap-5">
              <article className="flex h-full flex-col p-6 rounded-2xl bg-white border border-[rgba(58,94,60,0.14)]">
                <p className="text-[11px] font-bold uppercase tracking-[0.14em] text-[#145c32]">Phase 1</p>
                <h3 className="mt-3 text-lg font-medium tracking-tight text-[#3a5e3c]">Core Engine & Zero Escrow Launch</h3>
                <ul className="mt-4 text-sm leading-7 text-[#1e3a2c] list-disc pl-4 flex flex-col gap-2">
                  <li>Deployment on Robinhood Chain L2 with native ERC-4337 Paymasters.</li>
                  <li>1-Click Smart Contract deployment & multi-asset support ($TSLA, $NVDA, $AAPL, $SPY, $ETH, $USDG, $ZEC).</li>
                  <li>Pyth Network Oracle integration for real-time asset feeds.</li>
                  <li>Snapshot-based VIP Tier verification & 0% Fee Waiver logic.</li>
                </ul>
              </article>
              <article className="flex h-full flex-col p-6 rounded-2xl bg-white border border-[rgba(58,94,60,0.14)]">
                <p className="text-[11px] font-bold uppercase tracking-[0.14em] text-[#145c32]">Phase 2</p>
                <h3 className="mt-3 text-lg font-medium tracking-tight text-[#3a5e3c]">Privacy Escrow & DAO Governance</h3>
                <ul className="mt-4 text-sm leading-7 text-[#1e3a2c] list-disc pl-4 flex flex-col gap-2">
                  <li>Rollout of Privacy Escrow Engine for encrypted P2P OTC trading.</li>
                  <li>Session Keys integration for single-signature automated executions.</li>
                  <li>Activation of Decentralized Arbiter DAO for dispute resolution.</li>
                </ul>
              </article>
              <article className="flex h-full flex-col p-6 rounded-2xl bg-white border border-[rgba(58,94,60,0.14)]">
                <p className="text-[11px] font-bold uppercase tracking-[0.14em] text-[#145c32]">Phase 3</p>
                <h3 className="mt-3 text-lg font-medium tracking-tight text-[#3a5e3c]">Active RWA Servicing & Yield Routing</h3>
                <ul className="mt-4 text-sm leading-7 text-[#1e3a2c] list-disc pl-4 flex flex-col gap-2">
                  <li>Implementation of Automated RWA Dividend & Yield Routing (for 7-day+ locked vaults).</li>
                  <li>Multi-sig corporate vesting suite for startups and venture milestone disbursements.</li>
                </ul>
              </article>
            </div>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
            <article className="p-6 rounded-2xl bg-white border border-[rgba(58,94,60,0.14)]">
              <h2 className="text-xl font-medium tracking-tight text-[#3a5e3c]">Built for Security & Decentralization</h2>
              <ul className="mt-4 text-sm leading-7 text-[#1e3a2c] flex flex-col gap-3">
                <li><span className="font-medium text-[#145c32]">Non-Custodial.</span> Your assets stay locked in transparent smart contracts, never held by intermediaries.</li>
                <li><span className="font-medium text-[#145c32]">Pyth Network Powered.</span> Real-time price oracle integration ensures precise trigger execution and collateral health monitoring.</li>
              </ul>
            </article>
            <article className="p-6 rounded-2xl border border-[rgba(58,94,60,0.14)] bg-[#e7f6ec]">
              <h2 className="text-xl font-medium tracking-tight text-[#3a5e3c]">Disclaimer</h2>
              <p className="mt-4 text-sm leading-7 text-[#1e3a2c]">
                ZERO ESCROW ($ZEC) is an experimental Web3 protocol built on Robinhood Chain L2. Tokenized equities represent synthetic derivatives. Please practice proper risk management.
              </p>
            </article>
          </div>
        </div>
      </section>

      <footer className="border-t border-[#3a5e3c]/15 py-8 text-sm">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 flex flex-col sm:flex-row sm:items-center justify-between gap-4">
          <p className="text-[#1e3a2c]">
            <span className="font-medium text-[#3a5e3c]">ZERO ESCROW</span>
            <span className="mx-2">·</span>
            Robinhood Chain L2
          </p>
          <div className="flex items-center gap-5">
            <button onClick={onOpenWhitepaperModal} className="font-medium text-[#145c32] hover:underline">Whitepaper</button>
            <button onClick={onOpenContractModal} className="font-medium text-[#145c32] hover:underline">Contracts</button>
          </div>
        </div>
      </footer>
      </div>
    </div>
  );
};
