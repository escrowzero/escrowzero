export type TokenSymbol = 'ZEC' | 'USDG' | 'ETH' | 'NVDA' | 'TSLA' | 'AAPL' | 'SPY';

export interface TokenAsset {
  symbol: TokenSymbol;
  name: string;
  priceUsd: number;
  change24h: number | null;
  balance: number;
  color: string;
  isEquity: boolean;
  contract: string;
}

export type EscrowStatus = 'PENDING' | 'RELEASED' | 'REFUNDED';

export interface EscrowDeal {
  id: string;
  txHash: string;
  memo: string;
  asset: TokenSymbol;
  amount: number;
  usdValue: number;
  feePaid: number;
  isVipFeeWaived: boolean;
  creator: string;
  beneficiary: string;
  beneficiaryLabel?: string;
  createdAt: string;
  expiry: string;
  status: EscrowStatus;
  milestoneEnabled: boolean;
  releasedAmount?: number;
  chainDealId?: string;
  milestones?: {
    stage1Released: boolean;
    stage2Released: boolean;
  };
  l2BlockNumber: number;
  paymasterSponsored: boolean;
}

export interface ToastMessage {
  id: string;
  type: 'success' | 'info' | 'refund' | 'warning';
  title: string;
  message: string;
  txHash?: string;
}

export interface VIPStatus {
  isVIP: boolean;
  tierName: string;
  feeRate: number;
  arbiterPower: string;
  currentTokens: number;
  requiredTokens: number;
  progressPercent: number;
  remainingTokens: number;
}
