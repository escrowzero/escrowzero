import React from 'react';
import { Link } from '@tanstack/react-router';
import { Logo } from './Logo';
import { Wallet } from 'lucide-react';
import { VIPStatus } from '../types';

interface HeaderProps {
  activeTab: 'home' | 'dapp';
  walletConnected: boolean;
  walletAddress: string;
  isRealWallet: boolean;
  vipStatus: VIPStatus;
  appMode?: 'LIVE' | 'SIMULATION';
  onOpenWalletModal: () => void;
  onOpenContractModal: () => void;
  onOpenExportModal: () => void;
  onOpenWhitepaperModal: () => void;
  onShareApp?: () => void;
  networkMode?: 'wallet' | 'session';
}

export const Header: React.FC<HeaderProps> = ({
  activeTab,
  walletConnected,
  walletAddress,
  onOpenWalletModal,
  onOpenWhitepaperModal,
  onShareApp,
}) => {
  return (
    <header className="sticky top-0 z-40 w-full bg-[#d9fce8] text-[#3a5e3c] border-b border-[#3a5e3c]/15">
      <div className="max-w-7xl mx-auto px-3 sm:px-6 h-16 flex items-center justify-between gap-2 sm:gap-4">
        <div className="flex items-center gap-3 shrink-0">
          <Link
            to="/"
            search={{ view: 'home' }}
            className="flex items-center gap-3 text-left group focus:outline-none cursor-pointer"
          >
            <Logo size={38} />
            <span className="font-sans font-medium tracking-[-0.03em] text-[#3a5e3c] text-base sm:text-[22px] leading-[1.05] group-hover:text-[#f3fff7] transition-colors">
              ZERO ESCROW
            </span>
          </Link>
        </div>

        <div className="flex items-center gap-1 text-[15px] sm:text-[18px] leading-[1.05] tracking-[-0.03em]">
          <Link
            to="/"
            search={{ view: 'home' }}
            className={`px-4 py-1 transition-colors cursor-pointer ${
              activeTab === 'home' ? 'text-[#f3fff7] font-medium' : 'text-[#9ecfb0] hover:text-[#d7f5e4]'
            }`}
          >
            Home
          </Link>
          <Link
            to="/"
            search={{ view: 'dapp' }}
            className={`px-4 py-1 transition-colors cursor-pointer inline-flex items-center gap-2 ${
              activeTab === 'dapp' ? 'text-[#f3fff7]' : 'text-[#9ecfb0] hover:text-[#d7f5e4]'
            }`}
          >
            Terminal
            <span className="w-1.5 h-1.5 rounded-full bg-[#3a5e3c]" />
          </Link>
        </div>

        <div className="flex items-center gap-1 sm:gap-2 shrink-0 text-[15px] sm:text-[18px] leading-[1.05] tracking-[-0.03em] text-[#3a5e3c]">
          <button
            onClick={onOpenWhitepaperModal}
            className="hidden md:inline px-2 py-1 hover:text-[#3a5e3c] transition-colors cursor-pointer"
            title="Whitepaper"
          >
            Whitepaper
          </button>
          {onShareApp && (
            <button
              onClick={onShareApp}
              className="hidden sm:inline px-2 py-1 hover:text-[#3a5e3c] transition-colors cursor-pointer"
            >
              Share
            </button>
          )}
          <button
            onClick={onOpenWalletModal}
            className="ml-1 inline-flex items-center gap-2 px-2 py-1 font-mono text-[12px] tracking-normal hover:text-[#3a5e3c] transition-colors cursor-pointer"
          >
            <Wallet className="w-3.5 h-3.5" />
            {walletConnected ? `${walletAddress.slice(0, 6)}\u2026${walletAddress.slice(-4)}` : 'Connect'}
          </button>
        </div>
      </div>
    </header>
  );
};
