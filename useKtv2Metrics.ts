import { useMemo } from 'react';
import { useReadContract } from 'wagmi';
import { type Address } from 'viem';
import { childContractABI } from '../config/contracts';
import { useNativeUsdPrice } from './useNativeUsdPrice';
import { useKtv2TokenData } from './useKtv2TokenData';
import { calculateUsdValue, calculateTokenUsdValue } from '../utils/conversionHelpers';

// FIX: magic number 18 was repeated in two calls; named so the intent (on-chain amount decimals) is explicit
const KTV2_AMOUNT_DECIMALS = 18;

interface UseKtv2MetricsProps {
  contractAddress: Address | null;
  targetChainId: number | undefined;
  isChainSupported: boolean;
}

export const useKtv2Metrics = ({ contractAddress, targetChainId, isChainSupported }: UseKtv2MetricsProps) => {
  // FIX: shared read config replaces the options duplicated across all three contract calls
  const baseConfig = {
    address: contractAddress ?? undefined,
    abi: childContractABI,
    chainId: targetChainId,
    query: { enabled: !!contractAddress && isChainSupported && !!targetChainId },
  } as const;

  // FIX: "as bigint" casts removed; the ABI (declared "as const") already types uint256 reads as bigint
  const {
    data: totalDonatedData,
    error: totalDonatedError,
    isLoading: isLoadingTotalDonated,
  } = useReadContract({ ...baseConfig, functionName: 'totalGvn' });

  const {
    data: totalBurnedData,
    error: totalBurnedError,
    isLoading: isLoadingTotalBurned,
  } = useReadContract({ ...baseConfig, functionName: 'totalBurned' });

  const {
    data: totalStakedData,
    error: totalStakedError,
    isLoading: isLoadingTotalStaked,
  } = useReadContract({ ...baseConfig, functionName: 'totalStk' });

  // Dependencies for USD calculations
  const { ethPriceData, ethPriceDecimals, isLoadingEthPrice, isLoadingEthPriceDecimals } = useNativeUsdPrice(targetChainId);
  const { ktv2TokenDecimals, ktv2TokenPriceInNative, isLoading: isLoadingTokenData } = useKtv2TokenData({
    contractAddress,
    targetChainId,
    isChainSupported,
  });

  const totalDonatedUsd = useMemo(
    () => calculateUsdValue(totalDonatedData, ethPriceData, ethPriceDecimals),
    [totalDonatedData, ethPriceData, ethPriceDecimals],
  );

  // FIX: burned and staked share one conversion, so a single helper replaces two identical memo bodies
  const toTokenUsd = (amount: bigint | undefined) =>
    calculateTokenUsdValue(
      amount,
      ktv2TokenDecimals,
      ktv2TokenPriceInNative,
      KTV2_AMOUNT_DECIMALS,
      ethPriceData,
      ethPriceDecimals,
    );

  const totalBurnedUsd = useMemo(
    () => toTokenUsd(totalBurnedData),
    // eslint-disable-next-line react-hooks/exhaustive-deps -- toTokenUsd only reads the values listed here
    [totalBurnedData, ktv2TokenDecimals, ktv2TokenPriceInNative, ethPriceData, ethPriceDecimals],
  );

  const totalStakedUsd = useMemo(
    () => toTokenUsd(totalStakedData),
    // eslint-disable-next-line react-hooks/exhaustive-deps -- toTokenUsd only reads the values listed here
    [totalStakedData, ktv2TokenDecimals, ktv2TokenPriceInNative, ethPriceData, ethPriceDecimals],
  );

  const isLoadingUsd = isLoadingEthPrice || isLoadingEthPriceDecimals || isLoadingTokenData;

  return {
    totalDonatedData,
    totalDonatedError,
    isLoadingTotalDonated,
    totalDonatedUsd,
    totalBurnedData,
    totalBurnedError,
    isLoadingTotalBurned,
    totalBurnedUsd,
    totalStakedData,
    totalStakedError,
    isLoadingTotalStaked,
    totalStakedUsd,
    isLoading: isLoadingTotalDonated || isLoadingTotalBurned || isLoadingTotalStaked || isLoadingUsd,
  };
};