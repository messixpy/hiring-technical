import { useMemo } from 'react';
import { useBalance } from 'wagmi';
import { type Address } from 'viem';
import { useNativeUsdPrice } from './useNativeUsdPrice';
import { calculateUsdValue } from '../utils/conversionHelpers';

interface UseKtv2JackpotProps {
  contractAddress: Address | null;
  targetChainId: number | undefined;
  isChainSupported: boolean;
}

export const useKtv2Jackpot = ({ contractAddress, targetChainId, isChainSupported }: UseKtv2JackpotProps) => {
  const {
    data: childContractBalance,
    error: childContractBalanceError,
    isLoading: isLoadingChildContractBalance,
    isSuccess: childContractBalanceSuccess,
  } = useBalance({
    address: contractAddress ?? undefined,
    chainId: targetChainId,
    query: { enabled: !!contractAddress && isChainSupported && !!targetChainId },
  });

  const { ethPriceData, ethPriceDecimals, isLoadingEthPrice, isLoadingEthPriceDecimals } = useNativeUsdPrice(targetChainId);

  const balanceValue = childContractBalance?.value;
  const balanceDecimals = childContractBalance?.decimals;

  // FIX: depend on the primitive fields actually read, so the memo is not recomputed when only the object identity changes
  const contractBalanceUsd = useMemo(
    () => calculateUsdValue(balanceValue, ethPriceData, ethPriceDecimals, balanceDecimals),
    [balanceValue, balanceDecimals, ethPriceData, ethPriceDecimals],
  );

  // FIX: price-loading flag computed once and reused, instead of repeating the same two terms in two places
  const isLoadingUsdValue = isLoadingEthPrice || isLoadingEthPriceDecimals;

  return {
    childContractBalance,
    childContractBalanceError,
    isLoadingChildContractBalance,
    childContractBalanceSuccess,
    contractBalanceUsd,
    isLoadingUsdValue,
    isLoading: isLoadingChildContractBalance || isLoadingUsdValue,
  };
};