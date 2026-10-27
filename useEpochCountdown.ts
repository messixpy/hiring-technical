import { useState, useEffect, useMemo } from 'react';
import { useBlockNumber } from 'wagmi';
import { getAverageBlockTime } from '../config/chains';
import { formatSecondsToTime } from '../utils/conversionHelpers';

const PLACEHOLDER_TIME = '--d --h --m --s';
const ZERO_TIME = '0d 0h 0m 0s';

interface UseEpochCountdownProps {
  epochInterval: number | undefined;
  startBlock: bigint | undefined;
  targetChainId: number | undefined;
  isChainSupported: boolean;
  isLoadingEpochData: boolean; // True if epochInterval or startBlock are loading
}

export const useEpochCountdown = ({
  epochInterval,
  startBlock,
  targetChainId,
  isChainSupported,
  isLoadingEpochData,
}: UseEpochCountdownProps) => {
  const hasEpochData = epochInterval !== undefined && startBlock !== undefined;

  const { data: currentBlockNumber, isLoading: isLoadingCurrentBlockNumber } = useBlockNumber({
    watch: true,
    chainId: targetChainId,
    query: { enabled: isChainSupported && !!targetChainId && !isLoadingEpochData && hasEpochData },
  });

  const formattedEpochIntervalTime = useMemo(() => {
    if (epochInterval === undefined) return PLACEHOLDER_TIME;
    const averageBlockTime = getAverageBlockTime(targetChainId);
    if (averageBlockTime === undefined) return '(avg block time N/A)';
    return formatSecondsToTime(epochInterval * averageBlockTime);
  }, [epochInterval, targetChainId]);

  const timeUntilNextEpochInSeconds = useMemo(() => {
    if (startBlock === undefined || epochInterval === undefined || currentBlockNumber === undefined) return undefined;
    // FIX: zero/negative interval is guarded before any math to prevent modulo-by-zero
    if (epochInterval <= 0) return 0;
    const averageBlockTime = getAverageBlockTime(targetChainId);
    if (averageBlockTime === undefined) return undefined;

    const blocksSinceStart = currentBlockNumber - startBlock;
    if (blocksSinceStart < 0n) return undefined; // Epochs have not started yet

    // FIX: bigint-only math replaces Number()/BigInt() mixing (precision loss) and removes the unreachable "<= 0" check
    const interval = BigInt(epochInterval);
    const blocksUntilNextEpoch = interval - (blocksSinceStart % interval);
    return Number(blocksUntilNextEpoch) * averageBlockTime;
  }, [startBlock, epochInterval, currentBlockNumber, targetChainId]);

  const [countdown, setCountdown] = useState(PLACEHOLDER_TIME);

  useEffect(() => {
    if (timeUntilNextEpochInSeconds === undefined) {
      setCountdown(PLACEHOLDER_TIME);
      return;
    }

    // FIX: deadline-based ticking keeps the countdown accurate and smooth even when the interval is reset every block
    const deadline = Date.now() + timeUntilNextEpochInSeconds * 1000;

    const tick = () => {
      // FIX: Math.ceil instead of Math.floor so zero is not shown up to 1s early
      const remaining = Math.max(0, Math.ceil((deadline - Date.now()) / 1000));
      setCountdown(remaining === 0 ? ZERO_TIME : formatSecondsToTime(remaining));
      return remaining;
    };

    if (tick() === 0) return;
    const intervalId = setInterval(() => {
      if (tick() === 0) clearInterval(intervalId);
    }, 1000);

    return () => clearInterval(intervalId);
  }, [timeUntilNextEpochInSeconds]);

  const isLoadingEpochDisplay =
    isLoadingEpochData ||
    isLoadingCurrentBlockNumber ||
    // FIX: redundant "!!" removed; this expression is already boolean
    (hasEpochData && currentBlockNumber === undefined && isChainSupported);

  return {
    countdown,
    formattedEpochIntervalTime,
    isLoadingEpochDisplay,
    currentBlockNumber,
  };
};