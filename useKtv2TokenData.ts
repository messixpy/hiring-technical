import { useReadContract } from 'wagmi';
import { type Address } from 'viem';
import { childContractABI, erc20ABI, tpABI } from '../config/contracts';

interface UseKtv2TokenDataProps {
  contractAddress: Address | null;
  targetChainId: number | undefined;
  isChainSupported: boolean;
}

export const useKtv2TokenData = ({ contractAddress, targetChainId, isChainSupported }: UseKtv2TokenDataProps) => {
  const isChainReady = isChainSupported && !!targetChainId;

  // FIX: one shared config for all child-contract reads, so none can lose chainId or enabled again (the merge conflict cause)
  const childConfig = {
    address: contractAddress ?? undefined,
    abi: childContractABI,
    chainId: targetChainId,
    query: { enabled: !!contractAddress && isChainReady },
  } as const;

  const {
    data: childTokenAddress,
    error: childContractReadError,
    isLoading: isLoadingChildContractData,
    isSuccess: childContractReadSuccess,
  } = useReadContract({ ...childConfig, functionName: 'tokenAddr' });

  // FIX: shared ERC-20 config, enabled only once the token address is known
  const tokenConfig = {
    address: childTokenAddress,
    abi: erc20ABI,
    chainId: targetChainId,
    query: { enabled: !!childTokenAddress && isChainReady },
  } as const;

  const {
    data: ktv2TokenDecimals,
    error: ktv2TokenDecimalsError,
    isLoading: isLoadingKtv2TokenDecimals,
  } = useReadContract({ ...tokenConfig, functionName: 'decimals' });

  const {
    data: ktv2TokenSymbol,
    error: ktv2TokenSymbolError,
    isLoading: isLoadingKtv2TokenSymbol,
  } = useReadContract({ ...tokenConfig, functionName: 'symbol' });

  const {
    data: ktv2TokenName,
    error: ktv2TokenNameError,
    isLoading: isLoadingKtv2TokenName,
  } = useReadContract({ ...tokenConfig, functionName: 'name' });

  // --- Price in native (Uniswap v2/v3) ---
  // CONFLICT 1 FIX: main had deleted chainId/query from this read; dev's version restored (via childConfig)
  const { data: poolAddress, isLoading: isLoadingPoolAddress } = useReadContract({
    ...childConfig,
    functionName: 'pool', // Address used as pair (Uni v2) or pool (Uni v3)
  });

  // FIX: tp read had the same missing chainId/query as pool but was not flagged as a conflict
  const { data: tpContractAddress, isLoading: isLoadingTpContractAddress } = useReadContract({
    ...childConfig,
    functionName: 'tp',
  });

  // KTV2 version flag (true => Uniswap v2, false => Uniswap v3)
  // CONFLICT 2 FIX: dev's undefined-aware typing kept; the false "as boolean" cast is gone, so the type is boolean | undefined
  const { data: isV2, isLoading: isLoadingIsV2 } = useReadContract({ ...childConfig, functionName: 'v2' });

  // Read token price: v2 -> priceV2 (Uniswap v2), otherwise -> price (Uniswap v3)
  const {
    data: ktv2TokenPriceInNative,
    error: ktv2TokenPriceInNativeError,
    isLoading: isLoadingPriceRead,
  } = useReadContract({
    address: tpContractAddress,
    abi: tpABI,
    functionName: isV2 ? 'priceV2' : 'price',
    args: poolAddress ? [poolAddress] : undefined,
    chainId: targetChainId,
    // CONFLICT 3 FIX: main's chain-support guard kept; dev's version dropped it and would read on unsupported chains
    query: { enabled: isV2 !== undefined && !!tpContractAddress && !!poolAddress && isChainReady },
  });

  // FIX: price loading now covers pool, tp and v2 reads, and isLoading reuses it (it used the raw flag before)
  const isLoadingKtv2TokenPriceInNative =
    isLoadingPriceRead || isLoadingPoolAddress || isLoadingTpContractAddress || isLoadingIsV2;

  return {
    childTokenAddress,
    childContractReadError,
    isLoadingChildContractData,
    childContractReadSuccess,
    ktv2TokenDecimals,
    ktv2TokenDecimalsError,
    isLoadingKtv2TokenDecimals,
    ktv2TokenSymbol,
    ktv2TokenSymbolError,
    isLoadingKtv2TokenSymbol,
    ktv2TokenName,
    ktv2TokenNameError,
    isLoadingKtv2TokenName,
    ktv2TokenPriceInNative,
    ktv2TokenPriceInNativeError,
    isLoadingKtv2TokenPriceInNative,
    isLoading:
      isLoadingChildContractData ||
      isLoadingKtv2TokenDecimals ||
      isLoadingKtv2TokenSymbol ||
      isLoadingKtv2TokenName ||
      isLoadingKtv2TokenPriceInNative,
  };
};