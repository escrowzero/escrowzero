import { TokenAsset, VIPStatus } from '../types';

export const ZEC_CONFIG = {
  TOTAL_SUPPLY: 1000000000,
  MIN_VIP_THRESHOLD_TOKENS: 1000000,
  MIN_VIP_THRESHOLD_PERCENT: 0.001,
  STANDARD_FEE_RATE: 0.002,
  VIP_FEE_RATE: 0.00,
  TOKEN_PRICE_USD: 0.085,
};

export function checkVIPEligibility(userBalance: number): VIPStatus {
  const isEligible = userBalance >= ZEC_CONFIG.MIN_VIP_THRESHOLD_TOKENS;
  const progressPercent = Math.min(
    100,
    parseFloat(((userBalance / ZEC_CONFIG.MIN_VIP_THRESHOLD_TOKENS) * 100).toFixed(1))
  );
  const remainingTokens = Math.max(0, ZEC_CONFIG.MIN_VIP_THRESHOLD_TOKENS - userBalance);

  return {
    isVIP: isEligible,
    tierName: isEligible ? 'VIP Tier (0% Platform Fee)' : 'Standard Tier (0.2% Fee)',
    feeRate: isEligible ? 0.00 : 0.002,
    arbiterPower: isEligible ? 'ACTIVE (DAO Arbiter Node)' : 'INACTIVE (Req. 1M $ZEC)',
    currentTokens: userBalance,
    requiredTokens: ZEC_CONFIG.MIN_VIP_THRESHOLD_TOKENS,
    progressPercent,
    remainingTokens,
  };
}

export const INITIAL_TOKENS: Record<string, TokenAsset> = {
  ZEC: { symbol: 'ZEC', name: 'Zero Escrow', priceUsd: 0, change24h: null, balance: 0, color: '#00873E', isEquity: false, contract: '' },
  NVDA: { symbol: 'NVDA', name: 'NVIDIA Corp. Tokenized', priceUsd: 0, change24h: null, balance: 0, color: '#00873E', isEquity: true, contract: '' },
  TSLA: { symbol: 'TSLA', name: 'Tesla Inc. Tokenized', priceUsd: 0, change24h: null, balance: 0, color: '#E82127', isEquity: true, contract: '' },
  AAPL: { symbol: 'AAPL', name: 'Apple Inc. Tokenized', priceUsd: 0, change24h: null, balance: 0, color: '#A2AAAD', isEquity: true, contract: '' },
  SPY: { symbol: 'SPY', name: 'SPDR S&P 500 ETF Trust', priceUsd: 0, change24h: null, balance: 0, color: '#007E8A', isEquity: true, contract: '' },
  USDG: { symbol: 'USDG', name: 'USDG', priceUsd: 0, change24h: null, balance: 0, color: '#2775CA', isEquity: false, contract: '' },
  ETH: { symbol: 'ETH', name: 'Robinhood Chain Ether', priceUsd: 0, change24h: null, balance: 0, color: '#627EEA', isEquity: false, contract: '0x0000...0000' },
};

export const ROBINHOOD_L2_METRICS = {
  chainId: 4663,
  chainIdHex: '0x1237',
  networkName: 'Robinhood Chain',
  rpcUrl: 'https://rpc.mainnet.chain.robinhood.com',
  blockExplorerUrl: 'https://robinhoodchain.blockscout.com',
  currencySymbol: 'ETH',
  blockTime: '250ms',
  gasPrice: '0.00 Gwei (Gasless Paymaster)',
  settlementFinality: '< 800ms Sub-second',
  paymasterAddress: '0x43378902A910Ecb89445178B88019024faC84337',
  escrowCoreContract: '0x88E5c40192A992f021239912048E1920B60cA288',
  oracleFeed: 'Pyth Network Low-Latency Equity Feeds (Sub-second)',
};
