import React, { useState, useEffect, useRef } from 'react';
import { Header } from './components/Header';
import { TickerBar } from './components/TickerBar';
import { LandingPage } from './components/LandingPage';
import { DAppTerminal } from './components/DAppTerminal';
import { WalletModal } from './components/WalletModal';
import { ContractModal } from './components/ContractModal';
import { DealInspectorModal } from './components/DealInspectorModal';
import { ExportHtmlModal } from './components/ExportHtmlModal';
import { WhitepaperModal } from './components/WhitepaperModal';
import { ToastContainer } from './components/ToastContainer';
import { formatUnits } from 'viem';
import { INITIAL_TOKENS, checkVIPEligibility } from './data/mockData';
import { TokenAsset, EscrowDeal, ToastMessage, TokenSymbol } from './types';
import { connectInjectedWallet, addOrSwitchToRobinhoodL2, type NetworkSwitchResult } from './utils/web3';
import { readNativeBalance, readTokenBalance } from './utils/ponsBuy';
import { getSavedAppConfig, resolveEscrowAddress, saveAppConfig, savedTokenContracts, type SavedAppConfig } from './utils/contractDeployer';
import {
  connectWithProvider,
  pickMetaMaskProvider,
  WALLET_MESSAGE_SOURCE,
  MM_STORAGE_KEY,
  type WalletBridgeMessage,
} from './utils/metamask';
import { expiryToSeconds, readAccountDeals, runSettlement } from './utils/escrowChain';
import { getLivePrices } from './utils/livePrices';

export default function App({ tab = 'home' }: { tab?: 'home' | 'dapp' }) {
  const activeTab = tab;
  const [walletConnected, setWalletConnected] = useState<boolean>(false);
  const [isRealWallet, setIsRealWallet] = useState<boolean>(false);
  const [walletAddress, setWalletAddress] = useState<string>("");
  const [tokens, setTokens] = useState<Record<string, TokenAsset>>(INITIAL_TOKENS);
  const tokensRef = useRef(tokens);
  tokensRef.current = tokens;
  const [deals, setDeals] = useState<EscrowDeal[]>([]);
  const [activeContractAddress, setActiveContractAddress] = useState<string>(() =>
    resolveEscrowAddress(getSavedAppConfig().escrowContractAddress),
  );
  const [appConfig, setAppConfig] = useState<SavedAppConfig>(getSavedAppConfig());
  const [networkMode, setNetworkMode] = useState<'wallet' | 'session'>('session');
  const applyMetaMaskRef = useRef<(address: string, chainId?: string) => void>(() => {});
  const [isWalletModalOpen, setIsWalletModalOpen] = useState<boolean>(false);
  const [isContractModalOpen, setIsContractModalOpen] = useState<boolean>(false);
  const [isExportModalOpen, setIsExportModalOpen] = useState<boolean>(false);
  const [isWhitepaperModalOpen, setIsWhitepaperModalOpen] = useState<boolean>(false);
  const [inspectedDeal, setInspectedDeal] = useState<EscrowDeal | null>(null);

  const emarketBalance = tokens.ZEC?.balance || 0;
  const vipStatus = checkVIPEligibility(emarketBalance);

  useEffect(() => {
    window.scrollTo(0, 0);
  }, [tab]);

  const [toasts, setToasts] = useState<ToastMessage[]>([
    {
      id: 'welcome-toast',
      type: 'info',
      title: 'Robinhood Chain online',
      message: 'Connect a wallet to lock assets on Robinhood Chain (4663).',
    },
  ]);

  const addToast = (toast: Omit<ToastMessage, 'id'>) => {
    const id = `toast-${Date.now()}-${Math.random().toString(36).substring(2, 6)}`;
    setToasts((prev) => [{ ...toast, id }, ...prev]);
    setTimeout(() => {
      setToasts((prev) => prev.filter((t) => t.id !== id));
    }, 4500);
  };

  const dismissToast = (id: string) => {
    setToasts((prev) => prev.filter((t) => t.id !== id));
  };

  useEffect(() => {
    const syncConfig = () => {
      const existing = getSavedAppConfig();
      const updated = saveAppConfig({
        mode: 'LIVE',
        escrowContractAddress: resolveEscrowAddress(existing.escrowContractAddress),
        ...(walletAddress ? { deployerWallet: walletAddress } : {}),
      });
      const contracts = savedTokenContracts(updated);
      setAppConfig(updated);
      setActiveContractAddress(updated.escrowContractAddress);
      setTokens((prev) => {
        const next = { ...prev };
        for (const [symbol, contract] of Object.entries(contracts)) {
          if (!next[symbol]) continue;
          next[symbol] = { ...next[symbol], contract: contract || '' };
        }
        return next;
      });
    };
    syncConfig();
    window.addEventListener('focus', syncConfig);
    window.addEventListener('storage', syncConfig);
    return () => {
      window.removeEventListener('focus', syncConfig);
      window.removeEventListener('storage', syncConfig);
    };
  }, [walletAddress]);

  useEffect(() => {
    if (!isRealWallet || !/^0x[a-fA-F0-9]{40}$/.test(walletAddress)) return;
    let stopped = false;
    const loadBalances = async () => {
      const config = getSavedAppConfig();
      const contracts = savedTokenContracts(config);
      const found: Record<string, number> = {};
      try {
        found.ETH = await readNativeBalance(walletAddress, pickMetaMaskProvider());
      } catch {
        found.ETH = 0;
      }
      await Promise.all(
        Object.entries(contracts).map(async ([symbol, contract]) => {
          if (!/^0x[a-fA-F0-9]{40}$/.test(contract || "")) {
            found[symbol] = 0;
            return;
          }
          try {
            found[symbol] = await readTokenBalance(contract, walletAddress);
          } catch {
            found[symbol] = 0;
          }
        }),
      );
      if (stopped) return;
      setTokens((prev) => {
        const next = { ...prev };
        for (const symbol of Object.keys(next)) {
          next[symbol] = { ...next[symbol], balance: found[symbol] ?? 0 };
        }
        return next;
      });
    };
    void loadBalances();
    const timer = window.setInterval(() => void loadBalances(), 20000);
    window.addEventListener("focus", loadBalances);
    return () => {
      stopped = true;
      window.clearInterval(timer);
      window.removeEventListener("focus", loadBalances);
    };
  }, [isRealWallet, walletAddress]);

  useEffect(() => {
    if (!isRealWallet || !/^0x[a-fA-F0-9]{40}$/.test(walletAddress)) {
      setDeals([]);
      return;
    }
    let stopped = false;
    const loadDeals = async () => {
      try {
        const config = getSavedAppConfig();
        const rows = await readAccountDeals(
          resolveEscrowAddress(config.escrowContractAddress),
          walletAddress,
        );
        if (stopped) return;
        const mine = walletAddress.toLowerCase();
        const mapped: EscrowDeal[] = rows
          .filter((row) => row.creator.toLowerCase() === mine || row.beneficiary.toLowerCase() === mine)
          .map((row) => {
            const token = row.assetToken.toLowerCase();
            const contracts = savedTokenContracts(config);
            const asset: TokenSymbol =
              token === "0x0000000000000000000000000000000000000000"
                ? "ETH"
                : ((Object.entries(contracts).find(([, address]) => address.toLowerCase() === token)?.[0] as TokenSymbol | undefined) || "ZEC");
            const amount = Number(formatUnits(row.amount, 18));
            const releasedAmount = Number(formatUnits(row.released, 18));
            const price = tokensRef.current[asset]?.priceUsd || 0;
            const status = row.status === 2 ? "RELEASED" : row.status === 3 ? "REFUNDED" : "PENDING";
            return {
              id: `ESC-${row.txHash.slice(2, 6).toUpperCase()}`,
              txHash: row.txHash,
              chainDealId: row.dealId,
              memo: row.memo || "Escrow",
              asset,
              amount,
              usdValue: amount * price,
              feePaid: 0,
              isVipFeeWaived: false,
              creator: row.creator,
              beneficiary: row.beneficiary,
              createdAt: "",
              expiry: new Date(Number(row.expiry) * 1000).toISOString().slice(0, 16).replace("T", " "),
              status,
              milestoneEnabled: row.milestone,
              releasedAmount,
              l2BlockNumber: 0,
              paymasterSponsored: false,
            };
          });
        setDeals((prev) => {
          const seen = new Set(mapped.map((deal) => deal.txHash.toLowerCase()));
          const pending = prev.filter((deal) => deal.txHash && !seen.has(deal.txHash.toLowerCase()) && !deal.id.endsWith("-RBN"));
          return [...pending, ...mapped];
        });
      } catch {
        // Keep the deals already recorded in this session.
      }
    };
    void loadDeals();
    const timer = window.setInterval(() => void loadDeals(), 20000);
    return () => {
      stopped = true;
      window.clearInterval(timer);
    };
  }, [isRealWallet, walletAddress]);

  useEffect(() => {
    let stopped = false;
    const loadPrices = async () => {
      try {
        const prices = await getLivePrices();
        if (stopped) return;
        setTokens((prev) => {
          const next = { ...prev };
          for (const [symbol, quote] of Object.entries(prices)) {
            if (!quote || !next[symbol]) continue;
            next[symbol] = { ...next[symbol], priceUsd: quote.price, change24h: quote.change24h };
          }
          return next;
        });
      } catch {
        // Keep the last live quote if a refresh fails.
      }
    };
    void loadPrices();
    const timer = window.setInterval(() => void loadPrices(), 4000);
    return () => {
      stopped = true;
      window.clearInterval(timer);
    };
  }, []);

  const handleConnectRealWallet = async () => {
    try {
      const res = await connectInjectedWallet();
      setWalletAddress(res.address);
      setWalletConnected(true);
      setIsRealWallet(res.isReal);
      if (res.isReal) {
        addToast({
          type: 'success',
          title: 'Live Web3 Wallet Connected!',
          message: `Account ${res.address.slice(0, 6)}...${res.address.slice(-4)} is on Robinhood Chain.`,
        });
        await addOrSwitchToRobinhoodL2();
      } else {
        addToast({
          type: 'info',
          title: 'Simulation Mode Active',
          message: 'No browser wallet detected. Preloaded demo account loaded.',
        });
      }
    } catch {
      addToast({
        type: 'warning',
        title: 'Connection Cancelled',
        message: 'Wallet connection request was rejected in your browser.',
      });
    }
  };

  const handleConnectSimulatedWallet = (provider: string) => {
    setWalletConnected(true);
    setIsRealWallet(false);
    addToast({
      type: 'success',
      title: `${provider} Connected`,
      message: 'Robinhood Chain account (0x71C4...8A92) initialized.',
    });
  };

  const applyMetaMaskAccount = (address: string, chainId?: string) => {
    setWalletAddress(address);
    setWalletConnected(true);
    setIsRealWallet(true);
    const onMainnet = chainId != null && Number.parseInt(chainId, 16) === 4663;
    setNetworkMode(onMainnet ? 'wallet' : 'session');
    setIsWalletModalOpen(false);
    const short = `${address.slice(0, 6)}...${address.slice(-4)}`;
    addToast({
      type: 'success',
      title: 'MetaMask connected',
      message: onMainnet
        ? `${short} is on Robinhood Chain (4663).`
        : `${short} connected. Approve chain 4663 in MetaMask if it did not switch.`,
    });
  };
  applyMetaMaskRef.current = applyMetaMaskAccount;

  useEffect(() => {
    const read = (raw: string | null) => {
      if (!raw) return;
      try {
        const data = JSON.parse(raw) as { address?: string; chainId?: string; ts?: number };
        if (!data.address || !data.ts || Date.now() - data.ts > 3 * 60 * 1000) return;
        applyMetaMaskRef.current(data.address, data.chainId);
      } catch {
        // Ignore a bad session payload.
      }
    };
    const onStorage = (event: StorageEvent) => {
      if (event.key === MM_STORAGE_KEY) read(event.newValue);
    };
    const onMessage = (event: MessageEvent) => {
      if (event.origin !== window.location.origin) return;
      const data = event.data as WalletBridgeMessage;
      if (!data || data.source !== WALLET_MESSAGE_SOURCE) return;
      if ((data.type === 'connected' || data.type === 'switched') && data.address) {
        applyMetaMaskRef.current(data.address, data.chainId);
      }
    };
    window.addEventListener('storage', onStorage);
    window.addEventListener('message', onMessage);
    return () => {
      window.removeEventListener('storage', onStorage);
      window.removeEventListener('message', onMessage);
    };
  }, []);

  const handleConnectMetaMask = () => {
    const provider = pickMetaMaskProvider();
    if (!provider) return;
    void connectWithProvider(provider)
      .then((result) => applyMetaMaskAccount(result.address, result.chainId))
      .catch(() => {
        addToast({
          type: 'warning',
          title: 'MetaMask declined',
          message: 'The connection request was rejected.',
        });
      });
  };

  const handleSwitchNetwork = () => {
    const provider = pickMetaMaskProvider();
    if (!provider) {
      addToast({
        type: 'info',
        title: 'Robinhood Chain selected',
        message: 'No MetaMask in this window. Open Connect MetaMask to add chain 4663.',
      });
      return;
    }
    void addOrSwitchToRobinhoodL2(provider).then((result: NetworkSwitchResult) => {
      if (result === 'switched') {
        setNetworkMode('wallet');
        setIsRealWallet(true);
        addToast({
          type: 'success',
          title: 'Robinhood Chain mainnet',
          message: 'MetaMask is on chain ID 4663.',
        });
        return;
      }
      addToast({
        type: 'warning',
        title: result === 'rejected' ? 'Network switch declined' : 'Could not switch network',
        message: 'In MetaMask add chain 4663, RPC rpc.mainnet.chain.robinhood.com.',
      });
    });
  };

  const handleDisconnectWallet = () => {
    setWalletConnected(false);
    setIsRealWallet(false);
    addToast({
      type: 'info',
      title: 'Wallet Disconnected',
      message: 'Active session closed.',
    });
  };

  const handleClaimFaucet = () => {
    setTokens((prev) => {
      const next = { ...prev };
      if (next.ZEC) next.ZEC = { ...next.ZEC, balance: next.ZEC.balance + 100000 };
      if (next.USDG) next.USDG = { ...next.USDG, balance: next.USDG.balance + 5000 };
      if (next.ETH) next.ETH = { ...next.ETH, balance: next.ETH.balance + 1.0 };
      if (next.NVDA) next.NVDA = { ...next.NVDA, balance: next.NVDA.balance + 10 };
      if (next.TSLA) next.TSLA = { ...next.TSLA, balance: next.TSLA.balance + 50 };
      return next;
    });
    addToast({
      type: 'success',
      title: 'Faucet Claimed Successfully',
      message: '+100,000 $ZEC, +$5,000 USDG, +1.0 ETH, +10 NVDA, and +50 TSLA credited.',
    });
  };

  const handleCreateDeal = async (dealData: {
    memo: string;
    asset: TokenSymbol;
    amount: number;
    amountText: string;
    tokenAddress: string;
    beneficiary: string;
    beneficiaryLabel?: string;
    expiry: string;
    milestoneEnabled: boolean;
  }): Promise<boolean> => {
    const currentToken = tokens[dealData.asset];
    if (!currentToken) {
      addToast({ type: 'warning', title: 'Unknown asset', message: 'Choose the asset again.' });
      return false;
    }

    if (isRealWallet) {
      addToast({
        type: 'info',
        title: 'Confirm in MetaMask',
        message: 'Approve the lock on Robinhood Chain. A token also needs an approval before the lock.',
      });
      try {
        const result = await runSettlement({
          id: `lock-${Date.now()}`,
          kind: 'lock',
          contract: resolveEscrowAddress(getSavedAppConfig().escrowContractAddress),
          beneficiary: dealData.beneficiary,
          asset: dealData.asset,
          tokenAddress: dealData.tokenAddress,
          amount: dealData.amountText,
          durationSeconds: expiryToSeconds(dealData.expiry),
          milestone: dealData.milestoneEnabled,
          memo: dealData.memo,
          ts: Date.now(),
        });
        const usdVal = dealData.amount * currentToken.priceUsd;
        const newDeal: EscrowDeal = {
          id: `ESC-${result.hash.slice(2, 6).toUpperCase()}`,
          txHash: result.hash,
          chainDealId: result.chainDealId,
          memo: dealData.memo,
          asset: dealData.asset,
          amount: dealData.amount,
          usdValue: usdVal,
          feePaid: 0,
          isVipFeeWaived: vipStatus.isVIP,
          creator: walletAddress,
          beneficiary: dealData.beneficiary,
          beneficiaryLabel: dealData.beneficiaryLabel || 'Verified EVM Address',
          createdAt: new Date().toISOString().replace('T', ' ').substring(0, 19),
          expiry: dealData.expiry,
          status: 'PENDING',
          milestoneEnabled: dealData.milestoneEnabled,
          milestones: dealData.milestoneEnabled ? { stage1Released: false, stage2Released: false } : undefined,
          l2BlockNumber: 0,
          paymasterSponsored: Boolean(result.sponsored),
        };
        setDeals((prev) => [newDeal, ...prev]);
        addToast({
          type: 'success',
          title: 'Locked on Robinhood Chain',
          message: result.sponsored
            ? "You signed. The sponsor wallet paid the gas. A wallet under 1,000,000 $ZEC also pays a 0.20% fee inside the contract."
            : `Real funds are in the escrow contract. Tx ${result.hash.slice(0, 10)}\u2026`,
          txHash: result.hash,
        });
        return true;
      } catch (error) {
        addToast({
          type: 'warning',
          title: 'Lock was not sent',
          message: error instanceof Error ? error.message : 'MetaMask did not finish.',
        });
        return false;
      }
    }

    if (currentToken.balance < dealData.amount) {
      addToast({
        type: 'warning',
        title: 'Insufficient Balance',
        message: `Your preview balance is only ${currentToken.balance} ${dealData.asset}.`,
      });
      return false;
    }
    setTokens((prev) => ({
      ...prev,
      [dealData.asset]: {
        ...prev[dealData.asset],
        balance: prev[dealData.asset].balance - dealData.amount,
      },
    }));
    const dealId = `ESC-${Math.floor(1000 + Math.random() * 9000)}-RBN`;
    const randomHash = `0x${Array.from({ length: 64 }, () => Math.floor(Math.random() * 16).toString(16)).join('')}`;
    const usdVal = dealData.amount * currentToken.priceUsd;
    const isVipWaived = vipStatus.isVIP;
    const feePaid = isVipWaived ? 0 : usdVal * vipStatus.feeRate;
    const newDeal: EscrowDeal = {
      id: dealId,
      txHash: randomHash,
      memo: dealData.memo,
      asset: dealData.asset,
      amount: dealData.amount,
      usdValue: usdVal,
      feePaid,
      isVipFeeWaived: isVipWaived,
      creator: walletAddress,
      beneficiary: dealData.beneficiary,
      beneficiaryLabel: dealData.beneficiaryLabel || 'Verified EVM Address',
      createdAt: new Date().toISOString().replace('T', ' ').substring(0, 19),
      expiry: dealData.expiry,
      status: 'PENDING',
      milestoneEnabled: dealData.milestoneEnabled,
      l2BlockNumber: 4891024 + Math.floor(Math.random() * 100),
      paymasterSponsored: false,
    };
    setDeals((prev) => [newDeal, ...prev]);
    addToast({
      type: 'info',
      title: 'Preview lock only',
      message: 'Connect MetaMask to move real funds. This row is not on chain.',
    });
    return true;
  };

  const handleReleaseDeal = (dealId: string, partialAmount?: number) => {
    const target = deals.find((deal) => deal.id === dealId);
    if (!target || target.status !== 'PENDING') return;
    const already = target.releasedAmount ?? 0;
    const remaining = target.amount - already;
    const pay =
      target.milestoneEnabled && partialAmount && partialAmount > 0
        ? Math.min(partialAmount, remaining)
        : remaining;
    const finished = pay >= remaining;
    const apply = (hash?: string) => {
      setDeals((prev) =>
        prev.map((deal) => {
          if (deal.id !== dealId) return deal;
          return {
            ...deal,
            txHash: hash || deal.txHash,
            releasedAmount: already + pay,
            status: finished ? 'RELEASED' : 'PENDING',
          };
        }),
      );
    };
    if (isRealWallet && target.chainDealId) {
      addToast({ type: 'info', title: 'Confirm release', message: 'Sign the release. If this contract is gasless, the sponsor pays the gas.' });
      void runSettlement({
        id: `release-${dealId}-${Date.now()}`,
        kind: 'release',
        contract: resolveEscrowAddress(getSavedAppConfig().escrowContractAddress),
        dealId: target.chainDealId,
        partialAmount: target.milestoneEnabled ? pay.toLocaleString('en-US', { useGrouping: false, maximumFractionDigits: 18 }) : undefined,
        asset: target.asset,
        tokenAddress: tokens[target.asset]?.contract || '',
        ts: Date.now(),
      })
        .then((result) => {
          apply(result.hash);
          addToast({
            type: 'success',
            title: finished ? 'Released on Robinhood Chain' : 'Partial payment sent',
            message: finished ? 'The remaining balance is now with the beneficiary.' : `${pay} ${target.asset} was paid. The rest stays locked.`,
            txHash: result.hash,
          });
        })
        .catch((error: unknown) => {
          addToast({
            type: 'warning',
            title: 'Release was not sent',
            message: error instanceof Error ? error.message : 'MetaMask did not finish.',
          });
        });
      return;
    }
    apply();
    addToast({
      type: 'info',
      title: finished ? 'Preview release only' : 'Preview partial payment',
      message: 'This deal was not locked on chain, so no funds moved.',
    });
  };

  const handleRefundDeal = (dealId: string) => {
    const target = deals.find((deal) => deal.id === dealId);
    if (!target || target.status !== 'PENDING') return;
    if (isRealWallet && target.chainDealId) {
      addToast({ type: 'info', title: 'Confirm refund', message: 'Sign the refund. If this contract is gasless, the sponsor pays the gas.' });
      void runSettlement({
        id: `refund-${dealId}-${Date.now()}`,
        kind: 'refund',
        contract: resolveEscrowAddress(getSavedAppConfig().escrowContractAddress),
        dealId: target.chainDealId,
        ts: Date.now(),
      })
        .then((result) => {
          setDeals((prev) => prev.map((deal) => (deal.id === dealId ? { ...deal, status: 'REFUNDED', txHash: result.hash } : deal)));
          addToast({
            type: 'refund',
            title: 'Refunded on Robinhood Chain',
            message: 'The remaining funds were sent back to the payer.',
            txHash: result.hash,
          });
        })
        .catch((error: unknown) => {
          addToast({
            type: 'warning',
            title: 'Refund was not sent',
            message: error instanceof Error ? error.message : 'MetaMask did not finish.',
          });
        });
      return;
    }
    setTokens((prev) => ({
      ...prev,
      [target.asset]: { ...prev[target.asset], balance: prev[target.asset].balance + target.amount },
    }));
    setDeals((prev) => prev.map((deal) => (deal.id === dealId ? { ...deal, status: 'REFUNDED' } : deal)));
    addToast({
      type: 'info',
      title: 'Preview refund only',
      message: 'This deal was not locked on chain, so no funds moved.',
    });
  };

  useEffect(() => {
    if (typeof window !== 'undefined' && window.ethereum?.on) {
      const handleAccountsChanged = (accounts: unknown) => {
        const accs = accounts as string[];
        if (accs && accs.length > 0) {
          setWalletAddress(accs[0]);
          setIsRealWallet(true);
          setWalletConnected(true);
        } else {
          setWalletConnected(false);
          setIsRealWallet(false);
        }
      };
      window.ethereum.on('accountsChanged', handleAccountsChanged);
      return () => {
        window.ethereum?.removeListener?.('accountsChanged', handleAccountsChanged);
      };
    }
  }, []);

  const handleShareApp = () => {
    const shareUrl = typeof window !== 'undefined' && window.location.origin.includes('http')
      ? window.location.origin
      : 'https://escrow.market';
    if (navigator?.clipboard?.writeText) {
      navigator.clipboard.writeText(shareUrl).catch(() => {});
    }
    addToast({
      type: 'success',
      title: 'Public Link Copied!',
      message: `${shareUrl} copied to clipboard.`,
    });
  };

  return (
    <div className="min-h-screen overflow-x-hidden bg-[#d9fce8] text-[#3a5e3c] flex flex-col font-sans selection:bg-[#82f5ad] selection:text-[#121718]">
      <Header
        activeTab={activeTab}
        walletConnected={walletConnected}
        walletAddress={walletAddress}
        isRealWallet={isRealWallet}
        vipStatus={vipStatus}
        appMode={appConfig.mode}
        onOpenWalletModal={() => setIsWalletModalOpen(true)}
        onOpenContractModal={() => setIsContractModalOpen(true)}
        onOpenExportModal={() => setIsExportModalOpen(true)}
        onOpenWhitepaperModal={() => setIsWhitepaperModalOpen(true)}
        onShareApp={handleShareApp}
        networkMode={networkMode}
      />
      <TickerBar tokens={tokens} />
      <main className="flex-1">
        {activeTab === 'home' ? (
          <LandingPage
            onOpenContractModal={() => setIsContractModalOpen(true)}
            onOpenWhitepaperModal={() => setIsWhitepaperModalOpen(true)}
          />
        ) : (
          <DAppTerminal
            tokens={tokens}
            deals={deals}
            walletConnected={walletConnected}
            walletAddress={walletAddress}
            isRealWallet={isRealWallet}
            vipStatus={vipStatus}
            appConfig={appConfig}
            onOpenWalletModal={() => setIsWalletModalOpen(true)}
            onClaimFaucet={handleClaimFaucet}
            onOpenWhitepaperModal={() => setIsWhitepaperModalOpen(true)}
            onCreateDeal={handleCreateDeal}
            onReleaseDeal={handleReleaseDeal}
            onRefundDeal={handleRefundDeal}
            onInspectDeal={(deal) => setInspectedDeal(deal)}
          />
        )}
      </main>
      <WalletModal
        isOpen={isWalletModalOpen}
        onClose={() => setIsWalletModalOpen(false)}
        walletConnected={walletConnected}
        walletAddress={walletAddress}
        isRealWallet={isRealWallet}
        onConnectRealWallet={handleConnectRealWallet}
        onConnectSimulatedWallet={handleConnectSimulatedWallet}
        onDisconnectWallet={handleDisconnectWallet}
        onClaimFaucet={handleClaimFaucet}
        onSwitchNetwork={handleSwitchNetwork}
        onConnectMetaMask={handleConnectMetaMask}
      />
      <ContractModal
        isOpen={isContractModalOpen}
        onClose={() => setIsContractModalOpen(false)}
        activeContractAddress={activeContractAddress}
      />
      <DealInspectorModal
        deal={inspectedDeal}
        onClose={() => setInspectedDeal(null)}
        onReleaseDeal={handleReleaseDeal}
        onRefundDeal={handleRefundDeal}
      />
      <ExportHtmlModal isOpen={isExportModalOpen} onClose={() => setIsExportModalOpen(false)} />
      <WhitepaperModal
        isOpen={isWhitepaperModalOpen}
        onClose={() => setIsWhitepaperModalOpen(false)}
      />
      <ToastContainer toasts={toasts} onDismiss={dismissToast} />
    </div>
  );
}
