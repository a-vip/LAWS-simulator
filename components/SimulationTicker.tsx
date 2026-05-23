'use client';
import { useEffect } from 'react';
import { useSimulationStore } from '@/store/simulation';

export function SimulationTicker() {
  const { tick, phase } = useSimulationStore();

  useEffect(() => {
    const id = setInterval(() => {
      tick();
    }, 200); // 5 ticks per second
    return () => clearInterval(id);
  }, [tick, phase]);

  return null;
}
