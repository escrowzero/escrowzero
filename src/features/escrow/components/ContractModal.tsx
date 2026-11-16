import React, { useState } from 'react';
import { X, Copy, Check, Terminal, ShieldCheck } from 'lucide-react';
import { ROBINHOOD_L2_METRICS } from '../data/mockData';

interface ContractModalProps {
  isOpen: boolean;
  onClose: () => void;
  activeContractAddress?: string;
}

export const ContractModal: React.FC<ContractModalProps> = ({ isOpen, onClose, activeContractAddress }) => {
  const [copiedKey, setCopiedKey] = useState<string | null>(null);

  if (!isOpen) return null;

  const copyToClipboard = (key: string, text: string) => {
    navigator.clipboard?.writeText(text);
    setCopiedKey(key);
    setTimeout(() => setCopiedKey(null), 2000);
  };

  const coreContract = activeContractAddress || ROBINHOOD_L2_METRICS.escrowCoreContract;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/75 backdrop-blur-md animate-in fade-in duration-200">
      <div className="w-full max-w-2xl bg-white border border-[rgba(58,94,60,0.16)] rounded-3xl shadow-2xl p-6 sm:p-7 relative max-h-[90vh] overflow-y-auto text-[#3a5e3c]">
        
        {/* Close Button */}
        <button
          onClick={onClose}
          className="absolute top-5 right-5 p-2 rounded-full text-[#1e3a2c] hover:text-[#3a5e3c] hover:bg-[#e7f6ec] transition-colors cursor-pointer"
        >
          <X className="w-5 h-5" />
        </button>

        {/* Modal Header */}
        <div className="flex items-center gap-3 mb-5 pb-4 border-b border-[rgba(58,94,60,0.12)]">
          <div className="p-2 rounded bg-[#3a5e3c]/10 border border-[#82f5ad]/30 text-[#145c32]">
            <ShieldCheck className="w-6 h-6" />
          </div>
          <div>
            <h3 className="font-robotics text-base font-bold text-[#3a5e3c]">
              ROBINHOOD CHAIN L2 SMART CONTRACTS
            </h3>
            <p className="text-xs font-mono text-[#1e3a2c]">
              Verified Non-Custodial Multi-Party Escrow Architecture
            </p>
          </div>
        </div>

        {/* Details Grid */}
        <div className="flex flex-col gap-4 font-mono text-xs">
          
          {/* Contracts List */}
          <div className="flex flex-col gap-2.5">
            
            {/* Core Escrow Contract */}
            <div className="p-3 bg-white border border-[rgba(58,94,60,0.12)] rounded">
              <div className="flex items-center justify-between text-[#1e3a2c] mb-1">
                <span className="font-robotics font-bold text-[#3a5e3c]">CORE ESCROW VAULT CONTRACT</span>
                <span className="text-[#145c32] text-[10px] font-bold">VERIFIED EVM</span>
              </div>
              <div className="flex items-center justify-between bg-white p-2 rounded text-[#3a5e3c] font-mono text-[11px] break-all">
                <span>{coreContract}</span>
                <button
                  onClick={() => copyToClipboard('core', coreContract)}
                  className="ml-2 p-1 text-[#1e3a2c] hover:text-[#3a5e3c] shrink-0 cursor-pointer"
                >
                  {copiedKey === 'core' ? <Check className="w-3.5 h-3.5 text-[#145c32]" /> : <Copy className="w-3.5 h-3.5" />}
                </button>
              </div>
            </div>

            {/* Paymaster */}
            <div className="p-3 bg-white border border-[rgba(58,94,60,0.12)] rounded">
              <div className="flex items-center justify-between text-[#1e3a2c] mb-1">
                <span className="font-robotics font-bold text-[#3a5e3c]">ERC-4337 GASLESS PAYMASTER</span>
                <span className="text-[#145c32] text-[10px] font-bold">100% SPONSORED</span>
              </div>
              <div className="flex items-center justify-between bg-white p-2 rounded text-[#3a5e3c] font-mono text-[11px] break-all">
                <span>{ROBINHOOD_L2_METRICS.paymasterAddress}</span>
                <button
                  onClick={() => copyToClipboard('paymaster', ROBINHOOD_L2_METRICS.paymasterAddress)}
                  className="ml-2 p-1 text-[#1e3a2c] hover:text-[#3a5e3c] shrink-0 cursor-pointer"
                >
                  {copiedKey === 'paymaster' ? <Check className="w-3.5 h-3.5 text-[#145c32]" /> : <Copy className="w-3.5 h-3.5" />}
                </button>
              </div>
            </div>

            {/* Oracle Feed */}
            <div className="p-3 bg-white border border-[rgba(58,94,60,0.12)] rounded">
              <div className="flex items-center justify-between text-[#1e3a2c] mb-1">
                <span className="font-robotics font-bold text-[#3a5e3c]">PRICE ORACLE BENCHMARK</span>
                <span className="text-[#A0621E] text-[10px] font-bold">PYTH NETWORK</span>
              </div>
              <div className="text-[#1e3a2c] text-[11px] bg-white p-2 rounded">
                Sub-second low-latency price feeds for $NVDA, $TSLA, $AAPL, $SPY with confidence intervals.
              </div>
            </div>

          </div>

          {/* Network Parameters */}
          <div className="p-4 bg-white border border-[rgba(58,94,60,0.12)] rounded grid grid-cols-2 sm:grid-cols-3 gap-3">
            <div>
              <div className="text-[10px] text-[#1e3a2c] font-robotics">CHAIN ID</div>
              <div className="text-[#3a5e3c] font-bold">{ROBINHOOD_L2_METRICS.chainId}</div>
            </div>
            <div>
              <div className="text-[10px] text-[#1e3a2c] font-robotics">SETTLEMENT SPEED</div>
              <div className="text-[#145c32] font-bold">{ROBINHOOD_L2_METRICS.settlementFinality}</div>
            </div>
            <div>
              <div className="text-[10px] text-[#1e3a2c] font-robotics">BLOCK TIME</div>
              <div className="text-[#3a5e3c] font-bold">{ROBINHOOD_L2_METRICS.blockTime}</div>
            </div>
            <div>
              <div className="text-[10px] text-[#1e3a2c] font-robotics">GAS PROTOCOL</div>
              <div className="text-[#145c32] font-bold">ERC-4337 Sponsored</div>
            </div>
            <div>
              <div className="text-[10px] text-[#1e3a2c] font-robotics">FINALITY</div>
              <div className="text-[#3a5e3c] font-bold">Robinhood L2 Sequencer</div>
            </div>
            <div>
              <div className="text-[10px] text-[#1e3a2c] font-robotics">ORACLE FEED</div>
              <div className="text-[#145c32] font-bold">Pyth Low-Latency</div>
            </div>
          </div>

          {/* Solidity Interface */}
          <div className="p-3 bg-[#d9fce8] text-[#3a5e3c] rounded">
            <div className="text-[10px] text-[#A89C8F] mb-1 flex items-center justify-between font-robotics">
              <span>SOLIDITY ESCROW INTERFACE (ROBINHOOD EVM L2)</span>
              <Terminal className="w-3 h-3 text-[#145c32]" />
            </div>
            <pre className="text-[11px] text-[#145c32] font-mono overflow-x-auto leading-relaxed">
{`interface IEscrowMarket {
  function createDeal(
    address beneficiary,
    address assetToken,
    uint256 amount,
    uint256 durationSeconds,
    bool milestoneEnabled,
    string calldata memo
  ) external payable returns (bytes32 dealId);

  function releaseFunds(bytes32 dealId) external;
  function refundFunds(bytes32 dealId) external;
}`}
            </pre>
          </div>

        </div>

        {/* Done Button */}
        <div className="mt-5 pt-4 border-t border-[rgba(58,94,60,0.12)] flex justify-end">
          <button
            onClick={onClose}
            className="px-5 py-2 bg-[#3a5e3c] hover:bg-[#2f4d31] text-white font-robotics font-bold text-xs rounded transition-colors cursor-pointer"
          >
            Close Inspector
          </button>
        </div>

      </div>
    </div>
  );
};
