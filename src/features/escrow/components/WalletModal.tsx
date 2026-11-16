import React, { useState } from 'react';
import {
  X,
  Wallet,
  QrCode,
  Smartphone,
  ExternalLink,
  Copy,
  CheckCircle2,
  RefreshCw,
  Sparkles,
  ArrowRight,
  ShieldCheck,
} from 'lucide-react';
import { pickMetaMaskProvider, walletPopupUrl } from '../utils/metamask';

interface WalletModalProps {
  isOpen: boolean;
  onClose: () => void;
  walletConnected: boolean;
  walletAddress: string;
  isRealWallet: boolean;
  onConnectRealWallet: () => void;
  onConnectSimulatedWallet: (provider: string) => void;
  onDisconnectWallet: () => void;
  onClaimFaucet: () => void;
  onSwitchNetwork: () => void;
  onConnectMetaMask: () => void;
}

export const WalletModal: React.FC<WalletModalProps> = ({
  isOpen,
  onClose,
  walletConnected,
  walletAddress,
  isRealWallet,
  onConnectRealWallet,
  onConnectSimulatedWallet,
  onDisconnectWallet,
  onClaimFaucet,
  onSwitchNetwork,
  onConnectMetaMask,
}) => {
  const [activeTab, setActiveTab] = useState<'walletconnect' | 'browser' | 'demo'>('browser');
  const [copiedWcUri, setCopiedWcUri] = useState(false);
  const [isPairingWc, setIsPairingWc] = useState(false);
  const [mmNote, setMmNote] = useState<string | null>(null);
  const connectHref = typeof window === 'undefined' ? '/wallet?action=connect' : walletPopupUrl('connect');

  const handleMetaMaskClick = (event: React.MouseEvent<HTMLAnchorElement>) => {
    const provider = pickMetaMaskProvider();
    if (provider?.isMetaMask) {
      event.preventDefault();
      setMmNote('Approve the request in the MetaMask extension.');
      onConnectMetaMask();
      return;
    }
    setMmNote('A new tab is opening. On that page, click Continue in MetaMask and approve Robinhood Chain (4663).');
  };

  if (!isOpen) return null;

  // Realistic mock WalletConnect v2 session URI
  const simulatedWcUri =
    'wc:7a18b9c4-82f1-4a5e-9f33-RobinhoodL2Bridge@2?relay-protocol=irn&symKey=0e4c5b1a2d3f4e5a6b7c8d9e0f1a2b3c4d5e6f';

  const handleCopyUri = () => {
    navigator.clipboard.writeText(simulatedWcUri);
    setCopiedWcUri(true);
    setTimeout(() => setCopiedWcUri(false), 2000);
  };

  const handleSimulateMobileScan = () => {
    setIsPairingWc(true);
    setTimeout(() => {
      setIsPairingWc(false);
      onConnectSimulatedWallet('WalletConnect (Mobile QR)');
      onClose();
    }, 1200);
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/75 backdrop-blur-md animate-in fade-in duration-200">
      <div className="w-full max-w-lg bg-white border border-[#4B3723]/25 rounded-3xl shadow-2xl p-6 sm:p-7 relative text-[#3a5e3c] max-h-[90vh] overflow-y-auto">
        {/* Close Button */}
        <button
          onClick={onClose}
          className="absolute top-5 right-5 p-2 rounded-full text-[#1e3a2c] hover:text-[#3a5e3c] hover:bg-[#e7f6ec] transition-colors cursor-pointer"
        >
          <X className="w-5 h-5" />
        </button>

        {/* Modal Title */}
        <div className="flex items-center gap-3 mb-5">
          <div className="p-2.5 rounded-2xl bg-[#3a5e3c]/15 border border-[#82f5ad]/30 text-[#145c32]">
            <Wallet className="w-6 h-6" />
          </div>
          <div>
            <h3 className="text-lg font-bold text-[#3a5e3c]">
              {walletConnected ? 'CONNECTED WALLET' : 'CONNECT WEB3 WALLET'}
            </h3>
            <div className="flex items-center gap-2 mt-0.5">
              <span className="w-2 h-2 rounded-full bg-[#82f5ad]"></span>
              <p className="text-xs font-mono text-[#1e3a2c]">Robinhood Chain (Arbitrum Orbit EVM L2)</p>
            </div>
          </div>
        </div>

        {/* State 1: Already Connected */}
        {walletConnected ? (
          <div className="flex flex-col gap-4 text-xs">
            <div className="p-4 bg-white border border-[#4B3723]/15 rounded-2xl">
              <div className="flex items-center justify-between text-[#1e3a2c] mb-1.5">
                <span className="font-bold text-[11px] uppercase tracking-wider">ACTIVE ACCOUNT</span>
                <span
                  className={`text-[10px] px-2 py-0.5 rounded-full font-bold ${
                    isRealWallet
                      ? 'bg-[#3a5e3c]/15 text-[#145c32] border border-[#82f5ad]/30'
                      : 'bg-amber-500/15 text-amber-800 border border-amber-500/30'
                  }`}
                >
                  {isRealWallet ? 'LIVE WEB3 PROVIDER' : 'SIMULATION MODE'}
                </span>
              </div>
              <div className="text-sm font-mono font-bold text-[#3a5e3c] break-all">{walletAddress}</div>
              <div className="flex items-center justify-between text-[11px] text-[#1e3a2c] mt-3 pt-2 border-t border-[#4B3723]/10 font-mono">
                <span>Chain ID: 4663 (Robinhood Chain)</span>
                <span className="text-[#145c32] font-bold">⛽ Gasless Paymaster Active</span>
              </div>
            </div>

            <a
              href={connectHref}
              target="_blank"
              rel="opener"
              onClick={handleMetaMaskClick}
              className="w-full py-3 rounded-2xl bg-[#82f5ad] text-[#121718] font-bold text-xs hover:bg-[#c1d9bf] transition-colors cursor-pointer text-center block"
            >
              Connect MetaMask
            </a>
            {mmNote && (
              <p className="text-[11px] leading-relaxed text-[#1e3a2c] bg-white border border-[#4B3723]/15 rounded-xl p-3">
                {mmNote}
              </p>
            )}

            {/* Switch Network */}
            <div className="p-3.5 bg-white border border-[#4B3723]/15 rounded-2xl flex items-center justify-between">
              <div>
                <div className="font-bold text-xs text-[#3a5e3c]">Robinhood Chain · 4663</div>
                <div className="text-[11px] text-[#1e3a2c]">
                  Mainnet RPC rpc.mainnet.chain.robinhood.com
                </div>
              </div>
              <button
                onClick={onSwitchNetwork}
                className="px-3 py-1.5 bg-[#82f5ad] text-[#121718] font-bold rounded-xl text-xs hover:bg-[#c1d9bf] transition-colors cursor-pointer"
              >
                Switch Network
              </button>
            </div>

            {/* Faucet Quick Action */}
            <div className="p-3.5 bg-white border border-[#4B3723]/15 rounded-2xl flex items-center justify-between">
              <div>
                <div className="font-bold text-xs text-[#145c32]">Testnet / Simulation Faucet</div>
                <div className="text-[11px] text-[#1e3a2c]">+10 NVDA, +50 TSLA, +1,000,000 $ZEC, +$5,000 USDG</div>
              </div>
              <button
                onClick={onClaimFaucet}
                className="px-3 py-1.5 bg-[#3a5e3c] text-white font-bold rounded-xl text-xs hover:bg-[#2f4d31] transition-colors cursor-pointer"
              >
                Claim
              </button>
            </div>

            {/* Disconnect Button */}
            <div className="flex items-center gap-3 pt-2">
              <button
                onClick={() => {
                  onDisconnectWallet();
                  onClose();
                }}
                className="flex-1 py-2.5 bg-white hover:bg-rose-50 text-rose-700 border border-rose-300 rounded-2xl font-bold transition-colors cursor-pointer"
              >
                Disconnect
              </button>
              <button
                onClick={onClose}
                className="flex-1 py-2.5 bg-[#3a5e3c] hover:bg-[#2f4d31] text-white rounded-2xl font-bold transition-colors cursor-pointer"
              >
                Done
              </button>
            </div>
          </div>
        ) : (
          /* State 2: Selection with WalletConnect QR Tab */
          <div className="space-y-4">
            {/* Tabs */}
            <div className="flex bg-white p-1 rounded-2xl gap-1">
              <button
                onClick={() => setActiveTab('walletconnect')}
                className={`flex-1 py-2 text-xs font-bold rounded-xl flex items-center justify-center gap-1.5 transition-all ${
                  activeTab === 'walletconnect'
                    ? 'bg-white text-[#145c32] shadow-sm'
                    : 'text-[#1e3a2c] hover:text-[#3a5e3c]'
                }`}
              >
                <QrCode className="w-4 h-4" />
                WalletConnect (QR)
              </button>
              <button
                onClick={() => setActiveTab('browser')}
                className={`flex-1 py-2 text-xs font-bold rounded-xl flex items-center justify-center gap-1.5 transition-all ${
                  activeTab === 'browser'
                    ? 'bg-white text-[#145c32] shadow-sm'
                    : 'text-[#1e3a2c] hover:text-[#3a5e3c]'
                }`}
              >
                <Wallet className="w-4 h-4" />
                Browser Extensions
              </button>
              <button
                onClick={() => setActiveTab('demo')}
                className={`flex-1 py-2 text-xs font-bold rounded-xl flex items-center justify-center gap-1.5 transition-all ${
                  activeTab === 'demo'
                    ? 'bg-white text-[#145c32] shadow-sm'
                    : 'text-[#1e3a2c] hover:text-[#3a5e3c]'
                }`}
              >
                <Sparkles className="w-4 h-4" />
                Instant Demo
              </button>
            </div>

            {/* TAB 1: WALLETCONNECT QR CODE */}
            {activeTab === 'walletconnect' && (
              <div className="p-5 rounded-2xl bg-white border border-[#4B3723]/15 flex flex-col items-center text-center space-y-4">
                <div className="space-y-1">
                  <h4 className="text-sm font-bold text-[#3a5e3c]">Scan QR with Mobile Wallet</h4>
                  <p className="text-xs text-[#1e3a2c]">
                    Scan using Rainbow, MetaMask Mobile, Trust Wallet, or Robinhood Wallet
                  </p>
                </div>

                {/* Simulated Interactive QR Code Frame */}
                <div className="relative p-4 bg-white rounded-2xl shadow-inner border border-[#4B3723]/10">
                  <svg className="w-48 h-48" viewBox="0 0 200 200" fill="none">
                    {/* Background */}
                    <rect width="200" height="200" rx="12" fill="white" />
                    {/* Corner 1 */}
                    <rect x="20" y="20" width="45" height="45" rx="8" fill="#1D1712" />
                    <rect x="27" y="27" width="31" height="31" rx="4" fill="white" />
                    <rect x="33" y="33" width="19" height="19" rx="2" fill="#00873E" />

                    {/* Corner 2 */}
                    <rect x="135" y="20" width="45" height="45" rx="8" fill="#1D1712" />
                    <rect x="142" y="27" width="31" height="31" rx="4" fill="white" />
                    <rect x="148" y="33" width="19" height="19" rx="2" fill="#00873E" />

                    {/* Corner 3 */}
                    <rect x="20" y="135" width="45" height="45" rx="8" fill="#1D1712" />
                    <rect x="27" y="142" width="31" height="31" rx="4" fill="white" />
                    <rect x="33" y="148" width="19" height="19" rx="2" fill="#00873E" />

                    {/* Data grid points */}
                    <rect x="80" y="25" width="10" height="10" rx="2" fill="#1D1712" />
                    <rect x="95" y="25" width="10" height="10" rx="2" fill="#00873E" />
                    <rect x="110" y="25" width="10" height="10" rx="2" fill="#1D1712" />
                    <rect x="80" y="45" width="10" height="10" rx="2" fill="#00873E" />
                    <rect x="100" y="45" width="20" height="10" rx="2" fill="#1D1712" />

                    <rect x="25" y="80" width="15" height="10" rx="2" fill="#1D1712" />
                    <rect x="45" y="80" width="10" height="10" rx="2" fill="#00873E" />
                    <rect x="25" y="95" width="10" height="15" rx="2" fill="#00873E" />
                    <rect x="45" y="95" width="20" height="10" rx="2" fill="#1D1712" />
                    <rect x="25" y="115" width="30" height="10" rx="2" fill="#1D1712" />

                    {/* Center badge */}
                    <circle cx="100" cy="100" r="22" fill="#1D1712" />
                    <circle cx="100" cy="100" r="18" fill="#00873E" />
                    <path
                      d="M93 100 L98 105 L108 94"
                      stroke="white"
                      strokeWidth="2.5"
                      strokeLinecap="round"
                      strokeLinejoin="round"
                    />

                    {/* Additional data clusters */}
                    <rect x="135" y="80" width="15" height="15" rx="2" fill="#1D1712" />
                    <rect x="155" y="80" width="15" height="10" rx="2" fill="#00873E" />
                    <rect x="135" y="100" width="10" height="20" rx="2" fill="#00873E" />
                    <rect x="150" y="105" width="25" height="10" rx="2" fill="#1D1712" />

                    <rect x="80" y="135" width="15" height="10" rx="2" fill="#00873E" />
                    <rect x="100" y="135" width="20" height="15" rx="2" fill="#1D1712" />
                    <rect x="80" y="155" width="10" height="25" rx="2" fill="#1D1712" />
                    <rect x="95" y="160" width="25" height="10" rx="2" fill="#00873E" />
                    <rect x="135" y="145" width="20" height="10" rx="2" fill="#00873E" />
                    <rect x="160" y="145" width="15" height="20" rx="2" fill="#1D1712" />
                    <rect x="140" y="165" width="15" height="15" rx="2" fill="#1D1712" />
                  </svg>

                  {/* Scanning Animation line */}
                  <div className="absolute inset-x-4 top-4 h-0.5 bg-[#82f5ad] shadow-[0_0_8px_#00D25B] animate-pulse"></div>
                </div>

                {/* Action Buttons */}
                <div className="w-full space-y-2">
                  <button
                    onClick={handleSimulateMobileScan}
                    disabled={isPairingWc}
                    className="w-full py-3 px-4 rounded-xl bg-[#3a5e3c] text-white font-bold text-xs hover:bg-[#2f4d31] transition-all flex items-center justify-center gap-2 cursor-pointer shadow-sm"
                  >
                    {isPairingWc ? (
                      <>
                        <RefreshCw className="w-4 h-4 animate-spin" />
                        Pairing with Mobile Wallet...
                      </>
                    ) : (
                      <>
                        <Smartphone className="w-4 h-4" />
                        Simulate Mobile Wallet Scan (1-Click Pair)
                      </>
                    )}
                  </button>

                  <button
                    onClick={handleCopyUri}
                    className="w-full py-2.5 px-4 rounded-xl bg-white text-[#3a5e3c] border border-[#3a5e3c]/20 hover:bg-[#c1d9bf] text-xs font-mono font-medium transition-all flex items-center justify-center gap-2 cursor-pointer"
                  >
                    <Copy className="w-3.5 h-3.5 text-[#145c32]" />
                    {copiedWcUri ? 'Copied WalletConnect URI!' : 'Copy WalletConnect URI'}
                  </button>
                </div>
              </div>
            )}

            {/* TAB 2: BROWSER EXTENSIONS */}
            {activeTab === 'browser' && (
              <div className="space-y-2 text-xs">
                <a
                  href={connectHref}
                  target="_blank"
                  rel="opener"
                  onClick={handleMetaMaskClick}
                  className="w-full p-4 rounded-2xl bg-white hover:bg-[#c1d9bf] border border-[#4B3723]/15 hover:border-[#82f5ad] text-left transition-all flex items-center justify-between group cursor-pointer shadow-xs"
                >
                  <div>
                    <div className="flex items-center gap-2">
                      <span className="font-bold text-[#3a5e3c] group-hover:text-[#145c32] transition-colors">
                        MetaMask
                      </span>
                      <span className="text-[10px] px-2 py-0.5 rounded-full bg-[#3a5e3c]/15 text-[#145c32] font-bold border border-[#82f5ad]/30">
                        CHAIN 4663
                      </span>
                    </div>
                    <div className="text-[11px] text-[#1e3a2c] mt-1">
                      Opens MetaMask and adds Robinhood Chain mainnet
                    </div>
                  </div>
                  <ArrowRight className="w-4 h-4 text-[#1e3a2c] group-hover:text-[#145c32] transition-colors" />
                </a>
                {mmNote && <p className="text-[11px] leading-relaxed text-[#1e3a2c] px-1">{mmNote}</p>}
              </div>
            )}

            {/* TAB 3: DEMO SIMULATION */}
            {activeTab === 'demo' && (
              <div className="space-y-2 text-xs">
                <button
                  onClick={() => {
                    onConnectSimulatedWallet('Robinhood L2 Trader');
                    onClose();
                  }}
                  className="w-full p-3.5 rounded-2xl bg-white hover:bg-[#c1d9bf] border border-[#4B3723]/15 hover:border-[#82f5ad] text-left transition-all flex items-center justify-between cursor-pointer"
                >
                  <div>
                    <span className="font-bold text-[#3a5e3c]">Robinhood L2 Trader Account</span>
                    <div className="text-[11px] text-[#1e3a2c] mt-0.5">
                      Preloaded with $ZEC, USDG, ETH, NVDA, and TSLA
                    </div>
                  </div>
                  <span className="text-[10px] px-2 py-0.5 rounded-full bg-amber-500/15 text-amber-800 font-bold">
                    DEMO
                  </span>
                </button>

                <button
                  onClick={() => {
                    onConnectSimulatedWallet('VIP Arbiter DAO Whale');
                    onClose();
                  }}
                  className="w-full p-3.5 rounded-2xl bg-white hover:bg-[#c1d9bf] border border-[#4B3723]/15 hover:border-[#82f5ad] text-left transition-all flex items-center justify-between cursor-pointer"
                >
                  <div>
                    <span className="font-bold text-[#3a5e3c]">VIP Arbiter DAO Account</span>
                    <div className="text-[11px] text-[#1e3a2c] mt-0.5">
                      Has 1,000,000 $ZEC (0% Escrow Fee & Arbiter Voting Power)
                    </div>
                  </div>
                  <span className="text-[10px] px-2 py-0.5 rounded-full bg-[#3a5e3c]/15 text-[#145c32] font-bold">
                    VIP 0% FEE
                  </span>
                </button>
              </div>
            )}

            <div className="p-3 bg-white border border-[#4B3723]/15 rounded-2xl text-[11px] text-[#1e3a2c] flex items-center gap-2">
              <ShieldCheck className="w-4 h-4 text-[#145c32] shrink-0" />
              <span>
                <strong>Robinhood Chain Gasless Paymaster:</strong> All L2 transactions are sponsored. Zero gas costs.
              </span>
            </div>
          </div>
        )}
      </div>
    </div>
  );
};
