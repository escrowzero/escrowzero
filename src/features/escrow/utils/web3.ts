import { ROBINHOOD_L2_METRICS } from '../data/mockData';
import escrowSource from '../contracts/GaslessEscrow.sol?raw';

declare global {
  interface Window {
    ethereum?: {
      isMetaMask?: boolean;
      isRabby?: boolean;
      isRobinhood?: boolean;
      request: (args: { method: string; params?: unknown[] | object }) => Promise<unknown>;
      on?: (event: string, callback: (...args: unknown[]) => void) => void;
      removeListener?: (event: string, callback: (...args: unknown[]) => void) => void;
    };
  }
}

export const SOLIDITY_ESCROW_CONTRACT_SOURCE = escrowSource;

export async function connectInjectedWallet(): Promise<{
  address: string;
  isReal: boolean;
  chainId?: string;
}> {
  if (typeof window !== 'undefined' && window.ethereum) {

    try {
      const accounts = (await window.ethereum.request({
        method: 'eth_requestAccounts',
      })) as string[];

      if (accounts && accounts.length > 0) {
        const chainId = (await window.ethereum.request({
          method: 'eth_chainId',
        })) as string;

        return {
          address: accounts[0],
          isReal: true,
          chainId,
        };
      }
    } catch (err: unknown) {
      console.warn('User rejected or error requesting accounts:', err);
      throw err;
    }
  }

  // Fallback simulation if no Web3 extension injected
  return {
    address: '0x71C4B59E8190B28A920401889C71e29A88628A92',
    isReal: false,
    chainId: ROBINHOOD_L2_METRICS.chainIdHex,
  };
}

function errorCode(error: unknown): number | undefined {
  if (!error || typeof error !== 'object') return undefined;
  const record = error as { code?: number; data?: { originalError?: { code?: number } } };
  return record.data?.originalError?.code ?? record.code;
}

export type NetworkSwitchResult = 'switched' | 'no-provider' | 'rejected' | 'failed';

export type Eip1193Provider = {
  request: (args: { method: string; params?: unknown[] | object }) => Promise<unknown>;
  isMetaMask?: boolean;
};

export async function addOrSwitchToRobinhoodL2(
  provider?: Eip1193Provider,
): Promise<NetworkSwitchResult> {
  const ethereum = provider ?? (typeof window !== 'undefined' ? window.ethereum : undefined);
  if (!ethereum) return 'no-provider';

  const chainId = ROBINHOOD_L2_METRICS.chainIdHex;
  const params = {
    chainId,
    chainName: ROBINHOOD_L2_METRICS.networkName,
    nativeCurrency: {
      name: 'Ether',
      symbol: ROBINHOOD_L2_METRICS.currencySymbol,
      decimals: 18,
    },
    rpcUrls: [ROBINHOOD_L2_METRICS.rpcUrl],
    blockExplorerUrls: [ROBINHOOD_L2_METRICS.blockExplorerUrl],
  };

  try {
    const current = (await ethereum.request({ method: 'eth_chainId' })) as string;
    if (Number.parseInt(current, 16) === ROBINHOOD_L2_METRICS.chainId) {
      return 'switched';
    }
  } catch {
    // Fall through and try an explicit switch.
  }

  try {
    await ethereum.request({
      method: 'wallet_switchEthereumChain',
      params: [{ chainId }],
    });
    return 'switched';
  } catch (switchError: unknown) {
    const code = errorCode(switchError);
    if (code === 4001) return 'rejected';
    const message = switchError instanceof Error ? switchError.message : String(switchError ?? '');
    const missing = code === 4902 || /unrecognized|not added|unknown chain/i.test(message);
    if (!missing) return 'failed';
    try {
      await ethereum.request({
        method: 'wallet_addEthereumChain',
        params: [params],
      });
      return 'switched';
    } catch (addError: unknown) {
      if (errorCode(addError) === 4001) return 'rejected';
      return 'failed';
    }
  }
}
