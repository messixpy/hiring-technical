import { useReadContract } from 'wagmi';
import { type Address } from 'viem';
import { childContractABI } from '../config/contracts';

interface UseKtv2EpochDataProps {
  contractAddress: Address | null;
  targetChainId: number | undefined;
  isChainSupported: boolean;
}

export const useKtv2EpochData = ({ contractAddress, targetChainId, isChainSupported }: UseKtv2EpochDataProps) => {
  // FIX: shared read config replaces the options duplicated across both contract calls
  const baseConfig = {
    address: contractAddress ?? undefined,
    abi: childContractABI,
    chainId: targetChainId,
    query: { enabled: !!contractAddress && isChainSupported && !!targetChainId },
  } as const;

  const {
    data: epochIntervalRaw,
    error: epochIntervalError,
    isLoading: isLoadingEpochInterval,
  } = useReadContract({ ...baseConfig, functionName: 'epochInterval' });

  const {
    data: startBlock,
    error: startBlockError,
    isLoading: isLoadingStartBlock,
  } = useReadContract({ ...baseConfig, functionName: 'startBlock' });

  // FIX: uint256 is returned as bigint, so the old "as number" cast was false and crashed BigInt * number math downstream
  const epochInterval = epochIntervalRaw === undefined ? undefined : Number(epochIntervalRaw);

  return {
    epochInterval,
    epochIntervalError,
    isLoadingEpochInterval,
    startBlock,
    startBlockError,
    isLoadingStartBlock,
    isLoading: isLoadingEpochInterval || isLoadingStartBlock,
  };
};