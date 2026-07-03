import { useEffect, useState } from 'react';
import { LIVE_DATA_ENDPOINT } from '../data/liveConfig';
import { transformToDrivers, type LiveYamatoResponse } from '../data/liveYamatoSource';
import type { Driver } from '../types';

export type LiveDataStatus = 'disabled' | 'loading' | 'success' | 'error';

export interface LiveDataMeta {
  generatedAt: string;
  periodFrom: string;
  periodTo: string;
}

export function useLiveYamatoData() {
  const [status, setStatus] = useState<LiveDataStatus>(LIVE_DATA_ENDPOINT ? 'loading' : 'disabled');
  const [drivers, setDrivers] = useState<Driver[] | null>(null);
  const [meta, setMeta] = useState<LiveDataMeta | null>(null);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!LIVE_DATA_ENDPOINT) return;
    let cancelled = false;
    setStatus('loading');

    fetch(LIVE_DATA_ENDPOINT)
      .then((res) => {
        if (!res.ok) throw new Error(`HTTP ${res.status}`);
        return res.json() as Promise<LiveYamatoResponse>;
      })
      .then((data) => {
        if (cancelled) return;
        if (data.error) throw new Error(data.error);
        setDrivers(transformToDrivers(data));
        setMeta({ generatedAt: data.generatedAt, periodFrom: data.periodFrom, periodTo: data.periodTo });
        setStatus('success');
      })
      .catch((e: unknown) => {
        if (cancelled) return;
        setError(e instanceof Error ? e.message : String(e));
        setStatus('error');
      });

    return () => {
      cancelled = true;
    };
  }, []);

  return { status, drivers, meta, error };
}
