import { useMemo } from 'react';
import { useReadContract, useReadContracts } from 'wagmi';
import { type Address } from 'viem';
import { ktv2FactoryAbi } from '../abis/ktv2FactoryAbi';
import { officialKtv2Contracts } from '../config/officialContracts';
import { FACTORY_CONTRACTS } from '../config/contracts';
import { ContractSourceMode } from '../components/features/ktv2/Ktv2SelectorTypes';
import { getChainName } from '../config/chains';

export function useKtv2Contracts(targetChainId: number, contractSourceMode: ContractSourceMode) {
  // FIX: console.warn removed from render (side effect in useMemo); "Coming Soon" below already covers this case
  const factoryAddress = FACTORY_CONTRACTS[targetChainId]?.address;

  // FIX: source-mode conditions computed once instead of being repeated across hooks
  const includesFetched =
    contractSourceMode === ContractSourceMode.FETCHED_ONLY || contractSourceMode === ContractSourceMode.BOTH_MERGED;
  const includesHardcoded =
    contractSourceMode === ContractSourceMode.HARDCODED_ONLY || contractSourceMode === ContractSourceMode.BOTH_MERGED;
  const shouldFetch = includesFetched && !!factoryAddress;

  const {
    data: childContractCount,
    isLoading: isLoadingCount,
    error: countError,
  } = useReadContract({
    address: factoryAddress,
    abi: ktv2FactoryAbi,
    functionName: 'count',
    chainId: targetChainId,
    query: { enabled: shouldFetch },
  });

  const childContractCalls = useMemo(() => {
    if (!factoryAddress || !childContractCount) return []; // 0n and undefined both mean nothing to fetch
    // FIX: "as const" keeps the ABI function name literal so wagmi infers types (removes the unsafe double cast later)
    return Array.from(
      { length: Number(childContractCount) },
      (_, index) =>
        ({
          address: factoryAddress,
          abi: ktv2FactoryAbi,
          functionName: 'created',
          args: [BigInt(index)],
          chainId: targetChainId,
        }) as const,
    );
  }, [factoryAddress, childContractCount, targetChainId]);

  const {
    data: childContractsData,
    isLoading: isLoadingChildContracts,
    error: childContractsError,
  } = useReadContracts({
    contracts: childContractCalls,
    query: { enabled: shouldFetch && childContractCalls.length > 0 },
  });

  // FIX: derived during render instead of useState + useEffect, so it can never go stale on chain/mode change
  const fetchedAddresses = useMemo(
    () =>
      shouldFetch
        ? (childContractsData ?? []).flatMap((item) => (item.status === 'success' ? [item.result as Address] : []))
        : [],
    [shouldFetch, childContractsData],
  );

  const finalContractList = useMemo(() => {
    const hardcoded = includesHardcoded ? (officialKtv2Contracts[targetChainId] ?? []) : [];
    // FIX: dedupe by lowercase key, since Set treated checksummed and lowercase copies of one address as different
    const unique = new Map<string, Address>();
    for (const address of [...hardcoded, ...fetchedAddresses]) {
      const key = address.toLowerCase();
      if (!unique.has(key)) unique.set(key, address);
    }
    return [...unique.values()];
  }, [includesHardcoded, targetChainId, fetchedAddresses]);

  // FIX: derived flag replaces the useState that was never reset to false when switching to a supported chain
  const isComingSoon = !factoryAddress;
  const isLoadingContracts = shouldFetch && (isLoadingCount || isLoadingChildContracts);

  let fetchError: string | null = null;
  if (isComingSoon) {
    fetchError = `Coming Soon on ${getChainName(targetChainId) || `Chain ID ${targetChainId}`}!`;
  } else if (shouldFetch && countError) {
    fetchError = `Error fetching contract count: ${countError.message}`;
  } else if (shouldFetch && childContractsError) {
    fetchError = `Error fetching child contracts: ${childContractsError.message}`;
  }

  return { finalContractList, isLoadingContracts, fetchError, isComingSoon };
}