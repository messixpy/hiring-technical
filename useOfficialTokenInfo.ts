import { useMemo } from 'react';
import { type Address } from 'viem';
import { getOfficialKtv2ConfigByAddress, getChainPathSegment } from '../config/officialContracts';
import { ContractSourceMode } from '../components/features/ktv2/Ktv2SelectorTypes';

interface TokenInfo {
  tokenSymbol: string;
  tokenName: string;
  tokenAddress?: string;
  logoUrl?: string;
  details?: boolean;
}

export function useOfficialTokenInfo(
  currentHardcodedContracts: readonly Address[],
  targetChainId: number,
  contractSourceMode: ContractSourceMode,
) {
  // FIX: derived during render with useMemo instead of useState + useEffect, removing the extra render and the stale-data frame
  return useMemo(() => {
    const infoMap: Record<string, TokenInfo> = {};

    const includesHardcoded =
      contractSourceMode === ContractSourceMode.HARDCODED_ONLY ||
      contractSourceMode === ContractSourceMode.BOTH_MERGED;
    const chainPathSegment = getChainPathSegment(targetChainId);

    // FIX: early return replaces the nested ifs and the duplicate setOfficialTokenInfoMap({}) branch
    if (!includesHardcoded || !chainPathSegment) return infoMap;

    for (const ktv2Address of currentHardcodedContracts) {
      const config = getOfficialKtv2ConfigByAddress(chainPathSegment, ktv2Address);
      if (!config) continue;

      infoMap[ktv2Address] = {
        tokenSymbol: config.tokenSymbol,
        tokenName: config.tokenName,
        tokenAddress: config.tokenAddress,
        logoUrl: config.logoUrl,
        details: config.details,
      };
    }

    return infoMap;
  }, [currentHardcodedContracts, targetChainId, contractSourceMode]);
}