import React, { useState } from 'react';
import { EscrowDeal } from '../types';
import { X, Check, Copy, ShieldCheck, RotateCcw, ArrowRight } from 'lucide-react';

interface DealInspectorModalProps {
  deal: EscrowDeal | null;
  onClose: () => void;
  onReleaseDeal: (dealId: string, partialAmount?: number) => void;
  onRefundDeal: (dealId: string) => void;
}

export const DealInspectorModal: React.FC<DealInspectorModalProps> = ({
  deal,
  onClose,
  onReleaseDeal,
  onRefundDeal,
}) => {
  const [copied, setCopied] = useState<boolean>(false);
  const [partial, setPartial] = useState('');

  if (!deal) return null;

  const copyHash = (hash: string) => {
    navigator.clipboard?.writeText(hash);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  const isPending = deal.status === 'PENDING';

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/75 backdrop-blur-md animate-in fade-in duration-200">
      <div className="w-full max-w-lg bg-white border border-[rgba(58,94,60,0.16)] rounded-3xl shadow-2xl p-6 sm:p-7 relative max-h-[90vh] overflow-y-auto text-[#3a5e3c]">
        
        {/* Close Button */}
        <button
          onClick={onClose}
          className="absolute top-5 right-5 p-2 rounded-full text-[#1e3a2c] hover:text-[#3a5e3c] hover:bg-[#e7f6ec] transition-colors cursor-pointer"
        >
          <X className="w-5 h-5" />
        </button>

        {/* Modal Header */}
        <div className="flex items-center gap-2 mb-4 pb-3 border-b border-[rgba(58,94,60,0.12)]">
          <div className="p-1.5 rounded bg-[#3a5e3c]/10 border border-[#82f5ad]/30 text-[#145c32]">
            <ShieldCheck className="w-5 h-5" />
          </div>
          <div>
            <h3 className="font-robotics text-base font-bold text-[#3a5e3c] flex items-center gap-2">
              <span>{deal.id}</span>
              <span className={`text-[10px] px-2 py-0.5 rounded font-robotics font-bold ${
                deal.status === 'PENDING'
                  ? 'bg-amber-100 text-amber-800 border border-amber-300'
                  : deal.status === 'RELEASED'
                  ? 'bg-emerald-100 text-[#145c32] border border-emerald-300'
                  : 'bg-stone-200 text-stone-700'
              }`}>
                {deal.status}
              </span>
            </h3>
            <p className="text-xs font-mono text-[#1e3a2c]">
              Robinhood Chain L2 Smart Contract State
            </p>
          </div>
        </div>

        {/* Details List */}
        <div className="flex flex-col gap-3 font-mono text-xs">
          
          {/* Memo */}
          <div className="p-3 bg-white border border-[rgba(58,94,60,0.12)] rounded">
            <span className="text-[10px] text-[#1e3a2c] uppercase font-robotics block">MEMO / AGREEMENT PURPOSE:</span>
            <span className="text-[#3a5e3c] font-sans text-sm font-semibold">{deal.memo}</span>
          </div>

          {/* Asset & Valuation Grid */}
          <div className="grid grid-cols-2 gap-2">
            <div className="p-3 bg-white border border-[rgba(58,94,60,0.12)] rounded">
              <span className="text-[10px] text-[#1e3a2c] uppercase font-robotics block">ESCROWED ASSET</span>
              <span className="text-[#3a5e3c] text-base font-bold tabular-nums">
                {deal.amount} <span className="text-[#145c32] font-robotics font-bold">${deal.asset}</span>
              </span>
            </div>
            <div className="p-3 bg-white border border-[rgba(58,94,60,0.12)] rounded">
              <span className="text-[10px] text-[#1e3a2c] uppercase font-robotics block">USD ORACLE VALUATION</span>
              <span className="text-[#3a5e3c] text-base font-bold tabular-nums">
                ${deal.usdValue.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
              </span>
            </div>
          </div>

          {/* Parties */}
          <div className="p-3 bg-white border border-[rgba(58,94,60,0.12)] rounded flex flex-col gap-2">
            <div>
              <span className="text-[10px] text-[#1e3a2c] uppercase font-robotics block">CREATOR (DEPOSITOR):</span>
              <span className="text-[#3a5e3c] break-all">{deal.creator}</span>
            </div>
            <div className="pt-2 border-t border-[rgba(58,94,60,0.1)]">
              <span className="text-[10px] text-[#1e3a2c] uppercase font-robotics block">BENEFICIARY (RECIPIENT):</span>
              <span className="text-[#145c32] font-semibold block">{deal.beneficiaryLabel || 'Verified EVM Address'}</span>
              <span className="text-[#3a5e3c] break-all text-[11px]">{deal.beneficiary}</span>
            </div>
          </div>

          {/* L2 Metadata */}
          <div className="p-3 bg-white border border-[rgba(58,94,60,0.12)] rounded grid grid-cols-2 gap-2 text-[11px]">
            <div>
              <span className="text-[#1e3a2c] block">L2 BLOCK HEIGHT:</span>
              <span className="text-[#3a5e3c] font-bold">#{deal.l2BlockNumber}</span>
            </div>
            <div>
              <span className="text-[#1e3a2c] block">EXPIRY DEADLINE:</span>
              <span className="text-[#3a5e3c] font-bold">{deal.expiry}</span>
            </div>
            <div>
              <span className="text-[#1e3a2c] block">GAS PROTOCOL:</span>
              <span className="text-[#145c32] font-bold">ERC-4337 Sponsored ($0.00)</span>
            </div>
            <div>
              <span className="text-[#1e3a2c] block">MILESTONE SPLIT:</span>
              <span className="text-[#3a5e3c] font-bold">
                {deal.milestoneEnabled
                  ? `Partial · paid ${(deal.releasedAmount ?? 0).toLocaleString()} / ${deal.amount.toLocaleString()}`
                  : 'Single Release'}
              </span>
            </div>
          </div>

          {/* Transaction Hash */}
          <div className="p-2.5 bg-[#d9fce8] text-[#3a5e3c] rounded flex items-center justify-between">
            <div className="truncate pr-2">
              <span className="text-[10px] text-[#A89C8F] block font-robotics">TRANSACTION HASH:</span>
              <span className="text-[#145c32] text-[11px] truncate block font-mono">{deal.txHash}</span>
            </div>
            <button
              onClick={() => copyHash(deal.txHash)}
              className="p-1.5 text-[#A89C8F] hover:text-white shrink-0 cursor-pointer"
              title="Copy hash"
            >
              {copied ? <Check className="w-3.5 h-3.5 text-[#145c32]" /> : <Copy className="w-3.5 h-3.5" />}
            </button>
          </div>

        </div>

        {/* Modal Actions */}
        <div className="mt-5 pt-4 border-t border-[rgba(58,94,60,0.12)] flex items-center justify-between gap-2">
          {isPending ? (
            <>
              <button
                onClick={() => {
                  onRefundDeal(deal.id);
                  onClose();
                }}
                className="px-4 py-2 bg-white hover:bg-[#c1d9bf] text-[#3a5e3c] border border-[rgba(58,94,60,0.16)] font-robotics font-bold text-xs rounded transition-colors flex items-center gap-1.5 cursor-pointer"
              >
                <RotateCcw className="w-3.5 h-3.5" />
                <span>Refund remainder</span>
              </button>

              {deal.milestoneEnabled && (
                <input
                  value={partial}
                  onChange={(event) => setPartial(event.target.value)}
                  inputMode="decimal"
                  placeholder="Partial amount"
                  className="w-28 rounded-lg border border-[rgba(58,94,60,0.16)] px-2 py-2 text-xs"
                />
              )}
              <button
                onClick={() => {
                  const typed = Number(partial);
                  onReleaseDeal(deal.id, deal.milestoneEnabled && typed > 0 ? typed : undefined);
                  onClose();
                }}
                className="px-4 py-2 bg-[#3a5e3c] hover:bg-[#2f4d31] text-white font-robotics font-bold text-xs rounded transition-all flex items-center gap-1.5 cursor-pointer shadow-xs"
              >
                <ArrowRight className="w-3.5 h-3.5" />
                <span>{deal.milestoneEnabled ? 'Pay amount' : 'Release'}</span>
              </button>
            </>
          ) : (
            <button
              onClick={onClose}
              className="w-full py-2 bg-white hover:bg-[#c1d9bf] text-[#3a5e3c] font-robotics text-xs font-bold rounded border border-[rgba(58,94,60,0.16)] transition-colors cursor-pointer"
            >
              Close
            </button>
          )}
        </div>

      </div>
    </div>
  );
};
