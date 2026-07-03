import { useLiveYamatoData } from './useLiveYamatoData';
import { mockYamatoDrivers } from '../data/aggregates';

export function useYamatoDrivers() {
  const live = useLiveYamatoData();
  const isLive = live.status === 'success' && !!live.drivers;
  const drivers = isLive ? live.drivers! : mockYamatoDrivers;
  return { drivers, isLive, status: live.status, meta: live.meta, error: live.error };
}
