import { useReadContract } from 'wagmi';
import { CHAINLINK_NATIVE_TOKEN_PRICE_FEEDS } from '../config/contracts';
import { chainlinkPriceFeedAbi } from '../abis/chainlinkPriceFeedAbi';

export const useNativeUsdPrice = (targetChainId: number | undefined) => {
  // FIX: useMemo removed since a plain object lookup is cheaper than memoizing it
  const ethUsdPriceFeedAddress = targetChainId ? CHAINLINK_NATIVE_TOKEN_PRICE_FEEDS[targetChainId] : undefined;

  // FIX: shared config replaces the options duplicated across both reads; the redundant "!!targetChainId" check is dropped
  const baseConfig = {
    address: ethUsdPriceFeedAddress,
    abi: chainlinkPriceFeedAbi,
    chainId: targetChainId,
    query: { enabled: !!ethUsdPriceFeedAddress },
  } as const;

  const {
    data: ethPriceData,
    error: ethPriceError,
    isLoading: isLoadingEthPrice,
  } = useReadContract({ ...baseConfig, functionName: 'latestRoundData' });

  const {
    data: ethPriceDecimals,
    error: ethPriceDecimalsError,
    isLoading: isLoadingEthPriceDecimals,
  } = useReadContract({ ...baseConfig, functionName: 'decimals' });

  return {
    ethPriceData,
    ethPriceError,
    isLoadingEthPrice,
    ethPriceDecimals,
    ethPriceDecimalsError,
    isLoadingEthPriceDecimals,
  };
};