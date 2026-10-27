import { useState, useEffect } from 'react';

interface TimeRemaining {
  days: number;
  hours: number;
  minutes: number;
  seconds: number;
  isComplete: boolean;
}

// FIX: named constants replace the repeated 1000 * 60 * ... magic-number expressions
const SECOND = 1000;
const MINUTE = 60 * SECOND;
const HOUR = 60 * MINUTE;
const DAY = 24 * HOUR;

const COMPLETE: TimeRemaining = { days: 0, hours: 0, minutes: 0, seconds: 0, isComplete: true };

// FIX: pure function moved outside the hook, so it is not recreated on every render
const calculateTimeRemaining = (targetTime: number): TimeRemaining => {
  const difference = targetTime - Date.now();
  if (difference <= 0) return COMPLETE;

  return {
    days: Math.floor(difference / DAY),
    hours: Math.floor((difference % DAY) / HOUR),
    minutes: Math.floor((difference % HOUR) / MINUTE),
    seconds: Math.floor((difference % MINUTE) / SECOND),
    isComplete: false,
  };
};

export const useLaunchCountdown = (targetDate: Date): TimeRemaining => {
  // FIX: depend on a primitive timestamp, since a new Date object each render restarted the interval every render
  const targetTime = targetDate.getTime();

  // FIX: lazy initializer, so the calculation runs once on mount instead of on every render
  const [timeRemaining, setTimeRemaining] = useState<TimeRemaining>(() => calculateTimeRemaining(targetTime));

  useEffect(() => {
    // FIX: recompute immediately when the target changes, so stale time is not shown for up to 1s
    const update = () => {
      const next = calculateTimeRemaining(targetTime);
      setTimeRemaining(next);
      return next.isComplete;
    };

    if (update()) return;

    const timer = setInterval(() => {
      // FIX: stop ticking once complete instead of updating state every second forever
      if (update()) clearInterval(timer);
    }, SECOND);

    return () => clearInterval(timer);
  }, [targetTime]);

  return timeRemaining;
};