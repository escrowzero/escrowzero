import React, { useState } from 'react';
import { TokenAsset, EscrowDeal, TokenSymbol, EscrowStatus, VIPStatus } from '../types';
import { 
  Lock, 
  RotateCcw, 
  ExternalLink, 
  Search, 
  Fuel, 
  Check, 
  Coins,
  Award,
  ArrowRight,
  ShieldCheck,
  TrendingUp,
  CircleDollarSign
} from 'lucide-react';

import { SavedAppConfig } from '../utils/contractDeployer';

function formatBalance(value: number) {
  if (!Number.isFinite(value) || value === 0) return "0";
  if (value < 1) return value.toLocaleString("en-US", { maximumFractionDigits: 6 });
  if (value < 1000) return value.toLocaleString("en-US", { maximumFractionDigits: 4 });
  return value.toLocaleString("en-US", { maximumFractionDigits: 2 });
}

interface DAppTerminalProps {
  tokens: Record<string, TokenAsset>;
  deals: EscrowDeal[];
  walletConnected: boolean;
  walletAddress: string;
  isRealWallet: boolean;
  vipStatus: VIPStatus;
  appConfig?: SavedAppConfig;
  onOpenWalletModal: () => void;
  onClaimFaucet: () => void;
  onOpenWhitepaperModal?: () => void;
  onCreateDeal: (dealData: {
    memo: string;
    asset: TokenSymbol;
    amount: number;
    amountText: string;
    tokenAddress: string;
    beneficiary: string;
    beneficiaryLabel?: string;
    expiry: string;
    milestoneEnabled: boolean;
  }) => Promise<boolean>;
  onReleaseDeal: (dealId: string, partialAmount?: number) => void;
  onRefundDeal: (dealId: string) => void;
  onInspectDeal: (deal: EscrowDeal) => void;
}

export const DAppTerminal: React.FC<DAppTerminalProps> = ({
  tokens,
  deals,
  walletConnected,
  walletAddress,
  isRealWallet,
  vipStatus,
  appConfig,
  onOpenWalletModal,
  onClaimFaucet,
  onOpenWhitepaperModal,
  onCreateDeal,
  onReleaseDeal,
  onRefundDeal,
  onInspectDeal,
}) => {
  // Form State - default to ZEC or NVDA
  const [selectedAsset, setSelectedAsset] = useState<TokenSymbol>('ZEC');
  const [amountInput, setAmountInput] = useState<string>('50000');
  const [dealMemo, setDealMemo] = useState<string>('Protocol Milestone: Escrow Retainer in $ZEC');
  const [beneficiaryInput, setBeneficiaryInput] = useState<string>("");
  const [expirySelection, setExpirySelection] = useState<string>('24 Hours');
  const [milestoneEnabled, setMilestoneEnabled] = useState<boolean>(false);
  const [partialInputs, setPartialInputs] = useState<Record<string, string>>({});
  const [formError, setFormError] = useState<string | null>(null);
  const [isSubmitting, setIsSubmitting] = useState<boolean>(false);

  // Table Filter & Search State
  const [statusFilter, setStatusFilter] = useState<'ALL' | EscrowStatus>('ALL');
  const [searchQuery, setSearchQuery] = useState<string>('');

  const currentToken = tokens[selectedAsset] || tokens['ZEC'] || tokens['NVDA'];
  const numericAmount = parseFloat(amountInput) || 0;
  const calculatedUsd = numericAmount * (currentToken?.priceUsd || 0);
  const platformFeeUsd = vipStatus.isVIP ? 0 : calculatedUsd * vipStatus.feeRate;

  // Filtered Deals (PRIORS removed)
  const filteredDeals = deals.filter((deal) => {
    const matchesStatus = statusFilter === 'ALL' || deal.status === statusFilter;
    const query = searchQuery.toLowerCase().trim();
    const matchesSearch =
      !query ||
      deal.id.toLowerCase().includes(query) ||
      deal.memo.toLowerCase().includes(query) ||
      deal.asset.toLowerCase().includes(query) ||
      deal.beneficiary.toLowerCase().includes(query) ||
      (deal.beneficiaryLabel && deal.beneficiaryLabel.toLowerCase().includes(query));
    return matchesStatus && matchesSearch;
  });

  // Calculate totals
  const totalPortfolioValue = Object.values(tokens).reduce(
    (acc, t) => acc + t.balance * t.priceUsd,
    0
  );

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setFormError(null);

    if (!walletConnected) {
      onOpenWalletModal();
      return;
    }

    if (!numericAmount || numericAmount <= 0) {
      setFormError('Please enter a valid amount greater than 0.');
      return;
    }

    if (!isRealWallet && numericAmount > currentToken.balance) {
      setFormError(`Insufficient balance. You only hold ${currentToken.balance.toLocaleString()} ${currentToken.symbol}.`);
      return;
    }

    if (!beneficiaryInput || beneficiaryInput.length < 10) {
      setFormError('Please enter a valid recipient EVM address (0x...).');
      return;
    }

    setIsSubmitting(true);
    try {
      const success = await onCreateDeal({
        memo: dealMemo || `Escrow Lock: ${numericAmount} ${selectedAsset}`,
        asset: selectedAsset,
        amount: numericAmount,
        amountText: amountInput.trim(),
        tokenAddress: currentToken.contract,
        beneficiary: beneficiaryInput,
        expiry: expirySelection,
        milestoneEnabled,
      });
      if (success) {
        setAmountInput('');
        setDealMemo('');
      }
    } finally {
      setIsSubmitting(false);
    }
  };

  const isLiveMode = appConfig?.mode === 'LIVE';

  return (
    <div className="min-h-[calc(100vh-64px)] bg-[#d9fce8] text-[#3a5e3c] p-3 sm:p-6 flex flex-col gap-6 font-space">
      
      {/* Dynamic Non-Coder Mainnet Setup Notice */}
      <div className="p-4 bg-gradient-to-r from-white to-[#d9fce8] border border-[#82f5ad]/30 rounded-3xl flex flex-col lg:flex-row items-start lg:items-center justify-between gap-3 text-xs shadow-xs">
        <div className="flex items-center gap-3">
          <span className="w-2.5 h-2.5 rounded-full bg-[#82f5ad] led-blink-green shrink-0" />
          <div className="text-[#3a5e3c]">
            <div className="flex items-center gap-2 mb-0.5">
              <strong className="font-bold text-[#3a5e3c]">ROBINHOOD CHAIN MAINNET</strong>
              <span className={`text-[10px] font-mono px-2 py-0.5 rounded-full font-bold ${
                isLiveMode ? 'bg-[#3a5e3c]/15 text-[#145c32] border border-[#82f5ad]/30' : 'bg-amber-500/15 text-amber-800'
              }`}>
                {isLiveMode ? 'LIVE CONTRACT' : 'SIMULATION MODE'}
              </span>
            </div>
            <span className="text-[11px] text-[#1e3a2c] font-mono">
              Contract: {appConfig?.escrowContractAddress ? `${appConfig.escrowContractAddress.slice(0, 10)}...${appConfig.escrowContractAddress.slice(-6)}` : 'pending'}
            </span>
          </div>
        </div>
      </div>

      {/* 1. TOP PANEL: Live Wallet Balances Tracker & VIP Status Bar (Curved Dynamic Panel) */}
      <div className="bg-white border border-[rgba(58,94,60,0.14)] rounded-3xl p-4 sm:p-5 shadow-sm flex flex-col gap-4">
        
        {/* Header row */}
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-3 pb-3 border-b border-[rgba(58,94,60,0.12)]">
          <div className="flex items-center gap-2.5">
            <span className="w-2.5 h-2.5 rounded-full bg-[#82f5ad] led-blink-green" />
            <h2 className="font-robotics text-xs uppercase tracking-wider text-[#3a5e3c] font-black">
              PORTFOLIO ASSETS TRACKER (ROBINHOOD CHAIN L2)
            </h2>
            <span className="text-xs text-[#1e3a2c] font-mono hidden sm:inline">
              · Pyth Oracle Low-Latency Feeds
            </span>
          </div>

          <div className="flex items-center gap-3 self-end md:self-auto">
            <div className="font-mono text-xs text-[#1e3a2c]">
              EST. NET WORTH:{' '}
              <span className="text-[#3a5e3c] font-bold tabular-nums">
                ${totalPortfolioValue.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
              </span>
            </div>

            {!isRealWallet && (
            <button
              onClick={onClaimFaucet}
              className="px-3 py-1.5 bg-white hover:bg-[#c1d9bf] border border-[#82f5ad]/40 hover:border-[#82f5ad] text-[#145c32] rounded-xl font-robotics text-xs font-bold flex items-center gap-1.5 transition-all cursor-pointer shadow-xs"
              title="Claim testnet tokens: +100,000 $ZEC, +10 NVDA, +50 TSLA, +$5,000 USDG"
            >
              <Coins className="w-3.5 h-3.5" />
              <span>Claim Test Faucet</span>
            </button>
            )}
          </div>
        </div>

        {/* VIP STATUS BANNER IN TOP PANEL (Dynamic Capsule Styling) */}
        <div className="p-3 bg-gradient-to-r from-white to-[#e7f6ec] border border-[rgba(58,94,60,0.14)] rounded-2xl flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3 font-mono text-xs shadow-xs">
          <div className="flex items-center gap-2.5 flex-wrap">
            <Award className="w-4 h-4 text-[#145c32] shrink-0" />
            <span className="font-robotics font-bold text-[#3a5e3c]">
              VIP Status: [1,000,000 $ZEC Required for 0% Fee]
            </span>
            {vipStatus.isVIP ? (
              <span className="px-2.5 py-0.5 bg-[#3a5e3c] text-white font-robotics font-extrabold text-[10px] rounded-full flex items-center gap-1 shadow-xs">
                <Check className="w-3 h-3" />
                VIP ACTIVE
              </span>
            ) : (
              <span className="px-2.5 py-0.5 bg-amber-100 border border-amber-300 text-amber-900 font-robotics font-bold text-[10px] rounded-full">
                PROGRESS ({vipStatus.currentTokens.toLocaleString()} / 1,000,000)
              </span>
            )}
          </div>

          <div className="flex items-center gap-3 w-full sm:w-auto justify-between sm:justify-end">
            {/* Progress Bar Container */}
            <div className="w-32 sm:w-48 bg-[#c1d9bf] h-2.5 rounded-full overflow-hidden shrink-0 shadow-inner">
              <div 
                className={`h-full transition-all duration-500 rounded-full ${vipStatus.isVIP ? 'bg-[#3a5e3c]' : 'bg-[#007E8A]'}`}
                style={{ width: `${vipStatus.progressPercent}%` }}
              />
            </div>
            <span className="text-[11px] font-bold text-[#3a5e3c] tabular-nums shrink-0">
              {vipStatus.progressPercent}%
            </span>
          </div>
        </div>

        {/* Dynamic Asset Chips Grid (7 tokens: ZEC, USDG, ETH, NVDA, TSLA, AAPL, SPY) */}
        <div className="grid grid-cols-2 sm:grid-cols-4 lg:grid-cols-7 gap-2.5 pt-1">
          {Object.values(tokens).map((token) => (
            <div
              key={token.symbol}
              onClick={() => {
                setSelectedAsset(token.symbol);
                setAmountInput(Math.min(token.balance, token.symbol === 'ZEC' ? 50000 : token.symbol === 'USDG' ? 1000 : 5).toString());
              }}
              className={`p-3 rounded-2xl bg-white border transition-all cursor-pointer group shadow-xs hover:-translate-y-0.5 ${
                selectedAsset === token.symbol
                  ? 'border-[#82f5ad] ring-2 ring-[#82f5ad]/50 bg-white'
                  : 'border-[rgba(58,94,60,0.12)] hover:border-[rgba(58,94,60,0.28)]'
              }`}
            >
              <div className="flex items-center justify-between text-xs font-mono">
                <span className="font-robotics font-bold text-[#3a5e3c] group-hover:text-[#145c32] transition-colors flex items-center gap-1">
                  ${token.symbol}
                </span>
                <span
                  className={`text-[10px] font-bold tabular-nums ${
                    token.change24h == null
                      ? "text-[#1e3a2c]"
                      : token.change24h >= 0
                        ? "text-[#145c32]"
                        : "text-rose-700"
                  }`}
                >
                  {token.change24h == null
                    ? "—"
                    : `${token.change24h >= 0 ? "+" : ""}${token.change24h.toFixed(2)}%`}
                </span>
              </div>

              <div className="mt-1 font-mono text-sm font-bold text-[#3a5e3c] tabular-nums truncate">
                {token.balance.toLocaleString('en-US', { maximumFractionDigits: 4 })}
              </div>

              <div className="text-[10px] text-[#1e3a2c] font-mono tabular-nums flex items-center justify-between mt-1">
                <span>
                  {token.priceUsd > 0
                    ? `$${token.priceUsd < 1 ? token.priceUsd.toFixed(4) : token.priceUsd.toFixed(2)}`
                    : "—"}
                </span>
                <span className="text-[#1e3a2c]">
                  ${(token.balance * token.priceUsd).toLocaleString('en-US', { maximumFractionDigits: 0 })}
                </span>
              </div>
            </div>
          ))}
        </div>
      </div>

      {/* 2 & 3. MAIN TERMINAL WORKSPACE: Split Layout (Create Form & Active Ledger) */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 items-start">
        
        {/* LEFT PANEL: Form "CREATE ESCROW DEAL" (lg:col-span-5) */}
        <div className="lg:col-span-5 bg-white border border-[rgba(58,94,60,0.14)] rounded-3xl p-5 sm:p-6 shadow-sm">
          
          <div className="flex items-center justify-between pb-3.5 border-b border-[rgba(58,94,60,0.12)] mb-4">
            <div className="flex items-center gap-2">
              <Lock className="w-4 h-4 text-[#145c32]" />
              <h3 className="font-robotics text-xs sm:text-sm font-black text-[#3a5e3c] tracking-wide">
                CREATE ESCROW DEAL
              </h3>
            </div>
            <div className="flex items-center gap-1.5 px-2.5 py-0.5 bg-[#3a5e3c]/10 border border-[#82f5ad]/30 rounded-full text-[11px] font-mono text-[#145c32] font-bold">
              <Fuel className="w-3 h-3" />
              <span>Gasless Relayed</span>
            </div>
          </div>

          {/* VIP Status Widget inside Form */}
          <div className="mb-4 p-3 bg-gradient-to-r from-white to-[#e7f6ec] border border-[rgba(58,94,60,0.14)] rounded-2xl font-mono text-xs">
            <div className="flex items-center justify-between mb-1.5">
              <span className="font-robotics font-bold text-[#3a5e3c] text-[11px]">
                VIP Status: [1,000,000 $ZEC Required for 0% Fee]
              </span>
              {vipStatus.isVIP ? (
                <span className="px-2 py-0.5 bg-[#3a5e3c] text-white font-robotics font-extrabold text-[9px] rounded-full">
                  VIP ACTIVE
                </span>
              ) : (
                <span className="px-2 py-0.5 bg-amber-100 text-amber-900 font-robotics font-bold text-[9px] rounded-full border border-amber-300">
                  PROGRESS ({vipStatus.currentTokens.toLocaleString()} / 1,000,000)
                </span>
              )}
            </div>

            {/* Tiny progress bar */}
            <div className="w-full bg-[#c1d9bf] h-2 rounded-full overflow-hidden mb-1.5">
              <div 
                className={`h-full transition-all duration-300 rounded-full ${vipStatus.isVIP ? 'bg-[#3a5e3c]' : 'bg-[#007E8A]'}`}
                style={{ width: `${vipStatus.progressPercent}%` }}
              />
            </div>

            <div className="flex items-center justify-between text-[10px] text-[#1e3a2c]">
              <span>
                Protocol Fee Rate: <strong className="text-[#3a5e3c]">{vipStatus.isVIP ? '0.00% (VIP Free)' : '0.20% Standard'}</strong>
              </span>
            </div>
          </div>

          <form onSubmit={handleSubmit} className="flex flex-col gap-4 font-sans text-xs">
            
            {/* Memo / Agreement Title */}
            <div>
              <label className="block font-robotics text-[#3a5e3c] font-bold mb-1">
                DEAL TITLE / MEMO:
              </label>
              <input
                type="text"
                value={dealMemo}
                onChange={(e) => setDealMemo(e.target.value)}
                placeholder="e.g. OTC Block Trade 500 NVDA, Freelance Audit Deliverable"
                className="w-full bg-white border border-[rgba(58,94,60,0.16)] rounded-xl px-3.5 py-2.5 text-[#3a5e3c] font-mono text-xs focus:outline-none focus:border-[#82f5ad] transition-all"
                required
              />
            </div>

            {/* Asset Selector & Available Balance (ZEC, USDG, ETH prominent + Equities) */}
            <div>
              <div className="flex items-center justify-between mb-1.5 font-mono">
                <label className="font-robotics text-[#3a5e3c] font-bold">SELECT ESCROW ASSET:</label>
                <span className="text-[#1e3a2c]">
                  {!walletConnected
                    ? "Connect a wallet"
                    : isRealWallet
                      ? "Robinhood"
                      : "Preview"}
                  {walletConnected && (
                    <>
                      {": "}
                      <span className="text-[#3a5e3c] font-bold tabular-nums">
                        {formatBalance(currentToken?.balance || 0)} {currentToken?.symbol}
                      </span>
                    </>
                  )}
                </span>
              </div>

              {/* Category 1: Utility & Cryptos ($ZEC, USDG, ETH) */}
              <div className="mb-2">
                <div className="text-[10px] text-[#1e3a2c] font-mono font-bold mb-1 uppercase">
                  Crypto & Protocol Tokens:
                </div>
                <div className="grid grid-cols-3 gap-2">
                  {(['ZEC', 'USDG', 'ETH'] as TokenSymbol[]).map((sym) => (
                    <button
                      type="button"
                      key={sym}
                      onClick={() => {
                        setSelectedAsset(sym);
                        setAmountInput(Math.min(tokens[sym]?.balance || 0, sym === 'ZEC' ? 50000 : sym === 'USDG' ? 1000 : 1).toString());
                      }}
                      className={`py-2 px-2 rounded-xl font-robotics text-xs font-bold transition-all border cursor-pointer flex items-center justify-center gap-1 shadow-xs ${
                        selectedAsset === sym
                          ? 'bg-[#3a5e3c] text-white border-transparent scale-[1.02] shadow-sm'
                          : 'bg-white text-[#3a5e3c] border-[rgba(58,94,60,0.14)] hover:border-[rgba(58,94,60,0.28)]'
                      }`}
                    >
                      <span>${sym}</span>
                    </button>
                  ))}
                </div>
              </div>

              {/* Category 2: Wall Street Tokenized Equities */}
              <div>
                <div className="text-[10px] text-[#1e3a2c] font-mono font-bold mb-1 uppercase">
                  Wall Street Equities:
                </div>
                <div className="grid grid-cols-4 gap-1.5">
                  {(['NVDA', 'TSLA', 'AAPL', 'SPY'] as TokenSymbol[]).map((sym) => (
                    <button
                      type="button"
                      key={sym}
                      onClick={() => {
                        setSelectedAsset(sym);
                        setAmountInput(Math.min(tokens[sym]?.balance || 0, 5).toString());
                      }}
                      className={`py-2 px-1 rounded-xl font-robotics text-xs font-bold transition-all border cursor-pointer truncate shadow-xs ${
                        selectedAsset === sym
                          ? 'bg-[#3a5e3c] text-white border-transparent scale-[1.02] shadow-sm'
                          : 'bg-white text-[#3a5e3c] border-[rgba(58,94,60,0.14)] hover:border-[rgba(58,94,60,0.28)]'
                      }`}
                    >
                      ${sym}
                    </button>
                  ))}
                </div>
              </div>
            </div>

            {/* Amount Input with Auto USD Live Converter */}
            <div>
              <div className="flex items-center justify-between mb-1 font-mono">
                <label className="font-robotics text-[#3a5e3c] font-bold">LOCK AMOUNT:</label>
                <div className="flex items-center gap-1.5">
                  <button
                    type="button"
                    onClick={() => setAmountInput((currentToken.balance * 0.25).toFixed(2))}
                    className="px-2 py-0.5 bg-white hover:bg-[#c1d9bf] rounded-lg text-[10px] text-[#3a5e3c] border border-[rgba(58,94,60,0.12)] cursor-pointer"
                  >
                    25%
                  </button>
                  <button
                    type="button"
                    onClick={() => setAmountInput((currentToken.balance * 0.5).toFixed(2))}
                    className="px-2 py-0.5 bg-white hover:bg-[#c1d9bf] rounded-lg text-[10px] text-[#3a5e3c] border border-[rgba(58,94,60,0.12)] cursor-pointer"
                  >
                    50%
                  </button>
                  <button
                    type="button"
                    onClick={() => setAmountInput(currentToken.balance.toString())}
                    className="px-2 py-0.5 bg-white hover:bg-[#c1d9bf] rounded-lg text-[10px] text-[#145c32] font-bold border border-[rgba(58,94,60,0.12)] cursor-pointer"
                  >
                    MAX
                  </button>
                </div>
              </div>

              <div className="relative">
                <input
                  type="number"
                  step="any"
                  min="0.0001"
                  value={amountInput}
                  onChange={(e) => setAmountInput(e.target.value)}
                  placeholder="0.00"
                  className="w-full bg-white border border-[rgba(58,94,60,0.16)] rounded-xl px-3.5 py-2.5 text-[#3a5e3c] font-mono text-sm focus:outline-none focus:border-[#82f5ad] transition-all pr-24"
                  required
                />
                <div className="absolute right-3.5 top-1/2 -translate-y-1/2 font-robotics font-bold text-xs text-[#1e3a2c] pointer-events-none">
                  {currentToken.symbol}
                </div>
              </div>

              {/* Auto Live Pyth Oracle USD Price Converter & Platform Fee Breakdown */}
              <div className="mt-2 p-3 bg-white border border-[rgba(58,94,60,0.12)] rounded-2xl font-mono text-xs flex flex-col gap-1.5 shadow-xs">
                <div className="flex items-center justify-between">
                  <span className="text-[#1e3a2c]">Oracle Valuation (Pyth):</span>
                  <span className="text-[#145c32] font-bold tabular-nums text-sm">
                    ≈ ${calculatedUsd.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })} USD
                  </span>
                </div>
                <div className="flex items-center justify-between text-[11px] pt-1.5 border-t border-[rgba(75,55,35,0.08)]">
                  <span className="text-[#1e3a2c]">Platform Protocol Fee:</span>
                  <span className={`font-bold tabular-nums ${vipStatus.isVIP ? 'text-[#145c32]' : 'text-[#1e3a2c]'}`}>
                    {vipStatus.isVIP ? '$0.00 (0% VIP Waived)' : `$${platformFeeUsd.toFixed(2)} (0.2%)`}
                  </span>
                </div>
              </div>
            </div>

            {/* Beneficiary Address Input & Quick Presets */}
            <div>
              <div className="flex items-center justify-between mb-1 font-mono">
                <label className="font-robotics text-[#3a5e3c] font-bold">BENEFICIARY (RECIPIENT):</label>
                <span className="text-[10px] text-[#1e3a2c]">Robinhood L2 EVM</span>
              </div>

              <input
                type="text"
                value={beneficiaryInput}
                onChange={(e) => setBeneficiaryInput(e.target.value)}
                placeholder="0x..."
                className="w-full bg-white border border-[rgba(58,94,60,0.16)] rounded-xl px-3.5 py-2.5 text-[#3a5e3c] font-mono text-xs focus:outline-none focus:border-[#82f5ad] transition-all"
                required
              />
            </div>

            {/* Lock Duration / Expiry Time */}
            <div>
              <label className="block font-robotics text-[#3a5e3c] font-bold mb-1">
                EXPIRY / TIMEOUT DEADLINE:
              </label>
              <div className="grid grid-cols-4 gap-1.5 font-mono">
                {['1 Hour', '24 Hours', '7 Days', '30 Days'].map((duration) => (
                  <button
                    type="button"
                    key={duration}
                    onClick={() => setExpirySelection(duration)}
                    className={`py-2 rounded-xl text-xs transition-colors border cursor-pointer ${
                      expirySelection === duration
                        ? 'bg-[#82f5ad] text-[#121718] font-bold border-transparent'
                        : 'bg-white border-[rgba(58,94,60,0.12)] text-[#3a5e3c] hover:text-[#3a5e3c]'
                    }`}
                  >
                    {duration}
                  </button>
                ))}
              </div>
            </div>

            {/* Milestone Release Checkbox Option */}
            <div className="p-3 bg-white border border-[rgba(58,94,60,0.12)] rounded-2xl flex items-start gap-2.5">
              <input
                id="milestone"
                type="checkbox"
                checked={milestoneEnabled}
                onChange={(e) => setMilestoneEnabled(e.target.checked)}
                className="mt-0.5 w-4 h-4 rounded text-[#145c32] accent-[#00873E] cursor-pointer"
              />
              <label htmlFor="milestone" className="cursor-pointer select-none">
                <span className="font-robotics font-bold text-[#3a5e3c] block">
                  Enable partial milestone payments
                </span>
                <span className="text-[11px] text-[#1e3a2c] block mt-0.5">
                  Pay any amount to the beneficiary. The unpaid balance stays locked until you release or refund it.
                </span>
              </label>
            </div>

            {/* Error Message */}
            {formError && (
              <div className="p-3 bg-rose-100 border border-rose-300 text-rose-800 text-xs font-mono rounded-xl">
                ⚠ {formError}
              </div>
            )}

            {/* Submit Button */}
            <div className="pt-1">
              <button
                type="submit"
                disabled={isSubmitting}
                className="w-full py-3.5 bg-[#3a5e3c] hover:bg-[#2f4d31] disabled:opacity-50 text-white font-robotics font-bold text-xs sm:text-sm rounded-2xl shadow-sm hover:shadow-md transition-all flex items-center justify-center gap-2 cursor-pointer"
              >
                {isSubmitting ? (
                  <span>TRANSMITTING TO ROBINHOOD SEQUENCER...</span>
                ) : (
                  <>
                    <Lock className="w-4 h-4" />
                    <span>[ LOCK ASSETS (GASLESS) ]</span>
                  </>
                )}
              </button>

              <div className="flex items-center justify-between text-[10px] font-mono text-[#1e3a2c] mt-2 px-1">
                <span>Network: Robinhood Chain · 4663</span>
                <span className="text-[#145c32] font-bold">Token: sign only. ETH: wallet pays gas.</span>
              </div>
            </div>

          </form>
        </div>

        {/* RIGHT PANEL: "ACTIVE ESCROW LEDGER" (lg:col-span-7) */}
        <div className="lg:col-span-7 bg-white border border-[rgba(58,94,60,0.14)] rounded-3xl p-5 sm:p-6 shadow-sm flex flex-col min-h-[600px]">
          
          {/* Header of Ledger */}
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 pb-3.5 border-b border-[rgba(58,94,60,0.12)]">
            <div>
              <div className="flex items-center gap-2">
                <span className="w-2.5 h-2.5 rounded-full bg-[#82f5ad] led-blink-green" />
                <h3 className="font-robotics text-xs sm:text-sm font-black text-[#3a5e3c] tracking-wide">
                  ACTIVE ESCROW LEDGER
                </h3>
              </div>
              <p className="font-mono text-[11px] text-[#1e3a2c] mt-0.5">
                Non-custodial cryptographic vault states on Robinhood Chain L2
              </p>
            </div>

            {/* Search Bar */}
            <div className="relative w-full sm:w-60">
              <Search className="w-3.5 h-3.5 text-[#1e3a2c] absolute left-3 top-1/2 -translate-y-1/2" />
              <input
                type="text"
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                placeholder="Search deal ID, ticker, address..."
                className="w-full bg-white border border-[rgba(58,94,60,0.16)] rounded-xl pl-8 pr-3 py-2 text-[#3a5e3c] font-mono text-xs focus:outline-none focus:border-[#82f5ad] transition-all"
              />
            </div>
          </div>

          {/* Filter Status Tabs (Curved Pills) */}
          <div className="flex items-center gap-1.5 py-3 border-b border-[rgba(58,94,60,0.1)] overflow-x-auto text-xs font-mono">
            {(['ALL', 'PENDING', 'RELEASED', 'REFUNDED'] as const).map((tab) => {
              const count = tab === 'ALL'
                ? deals.length
                : deals.filter((d) => d.status === tab).length;

              return (
                <button
                  key={tab}
                  onClick={() => setStatusFilter(tab)}
                  className={`px-3.5 py-1.5 rounded-xl transition-all whitespace-nowrap flex items-center gap-1.5 cursor-pointer ${
                    statusFilter === tab
                      ? 'bg-[#82f5ad] text-[#121718] font-robotics font-bold shadow-xs'
                      : 'text-[#1e3a2c] hover:text-[#3a5e3c] hover:bg-[#c1d9bf]'
                  }`}
                >
                  <span>{tab}</span>
                  <span className="text-[10px] px-1.5 py-0.5 bg-black/10 rounded-full font-mono">
                    {count}
                  </span>
                </button>
              );
            })}
          </div>

          {/* Table Container */}
          <div className="flex-1 overflow-x-auto mt-2">
            <table className="w-full text-left font-mono text-xs">
              <thead>
                <tr className="border-b border-[rgba(58,94,60,0.12)] text-[10px] text-[#1e3a2c] font-robotics uppercase tracking-wider">
                  <th className="py-3 px-3">DEAL ID</th>
                  <th className="py-3 px-3">ASSET & AMOUNT</th>
                  <th className="py-3 px-3">USD VALUE</th>
                  <th className="py-3 px-3">BENEFICIARY</th>
                  <th className="py-3 px-3">STATUS</th>
                  <th className="py-3 px-3 text-right">ACTION</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-[rgba(75,55,35,0.08)]">
                {filteredDeals.length === 0 ? (
                  <tr>
                    <td colSpan={6} className="py-14 text-center text-[#1e3a2c] font-mono">
                      No escrows yet. Your own locks will show up here.
                    </td>
                  </tr>
                ) : (
                  filteredDeals.map((deal) => {
                    const isPending = deal.status === 'PENDING';
                    const isReleased = deal.status === 'RELEASED';
                    const isRefunded = deal.status === 'REFUNDED';

                    return (
                      <tr
                        key={deal.id}
                        className="hover:bg-[#c1d9bf]/45 transition-colors group"
                      >
                        {/* Deal ID */}
                        <td className="py-3.5 px-3">
                          <button
                            onClick={() => onInspectDeal(deal)}
                            className="font-robotics font-bold text-[#3a5e3c] hover:text-[#145c32] transition-colors text-left flex items-center gap-1 cursor-pointer"
                          >
                            <span>{deal.id}</span>
                            <ExternalLink className="w-3 h-3 text-[#1e3a2c] opacity-0 group-hover:opacity-100 transition-opacity" />
                          </button>
                          <div className="text-[10px] text-[#1e3a2c] truncate max-w-[140px]" title={deal.memo}>
                            {deal.memo}
                          </div>
                        </td>

                        {/* Asset & Amount */}
                        <td className="py-3.5 px-3">
                          <div className="font-bold text-[#3a5e3c] tabular-nums flex items-center gap-1.5">
                            <span>{deal.amount.toLocaleString()}</span>
                            <span className="text-[#145c32] font-robotics font-bold">${deal.asset}</span>
                          </div>
                          {deal.milestoneEnabled && (
                            <span className="text-[9px] text-[#145c32] font-bold block">
                              Paid {(deal.releasedAmount ?? 0).toLocaleString()} / {deal.amount.toLocaleString()}
                            </span>
                          )}
                        </td>

                        {/* USD Value */}
                        <td className="py-3.5 px-3 tabular-nums font-bold text-[#3a5e3c]">
                          ${deal.usdValue.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                        </td>

                        {/* Beneficiary */}
                        <td className="py-3.5 px-3">
                          <div className="text-[#3a5e3c] font-semibold truncate max-w-[120px]">
                            {deal.beneficiaryLabel || `${deal.beneficiary.slice(0, 6)}...${deal.beneficiary.slice(-4)}`}
                          </div>
                          <div className="text-[10px] text-[#1e3a2c] font-mono">
                            {deal.beneficiary.slice(0, 6)}...{deal.beneficiary.slice(-4)}
                          </div>
                        </td>

                        {/* Status (Curved Badges) */}
                        <td className="py-3.5 px-3">
                          {isPending && (
                            <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-[10px] font-robotics font-bold bg-amber-100 text-amber-800 border border-amber-300">
                              <span className="w-1.5 h-1.5 rounded-full bg-amber-600 animate-pulse" />
                              PENDING
                            </span>
                          )}
                          {isReleased && (
                            <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-[10px] font-robotics font-bold bg-emerald-100 text-[#145c32] border border-emerald-300">
                              <Check className="w-3 h-3" />
                              RELEASED
                            </span>
                          )}
                          {isRefunded && (
                            <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-[10px] font-robotics font-bold bg-stone-200 text-stone-700 border border-stone-300">
                              <RotateCcw className="w-3 h-3" />
                              REFUNDED
                            </span>
                          )}
                        </td>

                        {/* Action Buttons */}
                        <td className="py-3.5 px-3 text-right">
                          <div className="flex items-center justify-end gap-1.5">
                            {isPending ? (
                              <>
                                {deal.milestoneEnabled && (
                                  <input
                                    value={partialInputs[deal.id] ?? ''}
                                    onChange={(event) =>
                                      setPartialInputs((prev) => ({ ...prev, [deal.id]: event.target.value }))
                                    }
                                    inputMode="decimal"
                                    placeholder="Amount"
                                    className="w-16 rounded-lg border border-[rgba(58,94,60,0.16)] px-2 py-1 text-[10px]"
                                  />
                                )}
                                <button
                                  onClick={() => {
                                    const typed = Number(partialInputs[deal.id]);
                                    onReleaseDeal(deal.id, deal.milestoneEnabled && typed > 0 ? typed : undefined);
                                  }}
                                  className="px-3 py-1.5 bg-[#3a5e3c] hover:bg-[#2f4d31] text-white font-robotics font-bold rounded-xl text-[10px] transition-all cursor-pointer shadow-xs hover:shadow-sm"
                                  title={deal.milestoneEnabled ? 'Pay this amount, or the full remainder if the box is empty' : 'Release funds immediately to recipient'}
                                >
                                  {deal.milestoneEnabled ? 'PAY' : 'RELEASE'}
                                </button>
                                <button
                                  onClick={() => onRefundDeal(deal.id)}
                                  className="px-2.5 py-1.5 bg-white hover:bg-[#c1d9bf] text-[#3a5e3c] border border-[rgba(58,94,60,0.16)] rounded-xl text-[10px] font-robotics font-semibold transition-colors cursor-pointer"
                                  title="Refund funds back to your wallet"
                                >
                                  REFUND
                                </button>
                              </>
                            ) : (
                              <button
                                onClick={() => onInspectDeal(deal)}
                                className="px-3 py-1.5 bg-white hover:bg-[#c1d9bf] text-[#1e3a2c] border border-[rgba(58,94,60,0.16)] rounded-xl text-[10px] font-robotics font-semibold transition-colors cursor-pointer"
                              >
                                DETAILS
                              </button>
                            )}
                          </div>
                        </td>

                      </tr>
                    );
                  })
                )}
              </tbody>
            </table>
          </div>

          {/* Footer note in Ledger */}
          <div className="pt-3.5 border-t border-[rgba(58,94,60,0.12)] flex flex-col sm:flex-row items-center justify-between gap-2 text-[10px] font-mono text-[#1e3a2c]">
            <span>Robinhood Sequencer: Live Block #4,891,024</span>
            <div className="flex items-center gap-2">
              <span className="text-[#145c32] font-bold">✓ Paymaster Sponsored</span>
              <span>·</span>
              <span>Sub-Second Finality</span>
            </div>
          </div>

        </div>

      </div>

    </div>
  );
};
