import { useEffect, useRef } from 'react';
import NetInfo, { NetInfoState, NetInfoStateType } from '@react-native-community/netinfo';
import { useNetworkStore } from '../../store';
import type { NetworkInfo, NetworkType } from '../../types';
import { NativeModules } from 'react-native';

const { CellularInfoModule } = NativeModules;

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

function netInfoTypeToNetworkType(state: NetInfoState): NetworkType {
  if (!state.isConnected) return 'NONE';
  switch (state.type) {
    case NetInfoStateType.wifi:
      return 'WIFI';
    case NetInfoStateType.cellular: {
      const gen = (state.details as any)?.cellularGeneration;
      if (gen === '5g') return '5G';
      if (gen === '4g') return 'LTE';
      if (gen === '3g') return '3G';
      if (gen === '2g') return '2G';
      return 'LTE'; // fallback
    }
    case NetInfoStateType.none:
      return 'NONE';
    default:
      return 'UNKNOWN';
  }
}

/** Normalizes RSSI (dBm) to 0-100 signal score */
function rssiToScore(rssiDbm: number): number {
  // Typical ranges: -50 dBm (excellent) to -110 dBm (no signal)
  const MIN = -110;
  const MAX = -50;
  const clamped = Math.max(MIN, Math.min(MAX, rssiDbm));
  return Math.round(((clamped - MIN) / (MAX - MIN)) * 100);
}

// ---------------------------------------------------------------------------
// Hook: useNetworkInfo
//
// Subscribes to NetInfo changes and polls the native CellularInfoModule
// every 5 seconds for RSSI and operator data.
// ---------------------------------------------------------------------------

const NATIVE_POLL_INTERVAL_MS = 5_000;

export function useNetworkInfo(): void {
  const { setNetworkInfo } = useNetworkStore();
  const pollTimerRef = useRef<ReturnType<typeof setInterval> | null>(null);

  // Helper — fetch native cellular data (RSSI, operator)
  const pollNative = async () => {
    if (!CellularInfoModule) return; // module not linked yet
    try {
      const info = await CellularInfoModule.getCellularInfo();
      // info: { rssi: number | null, operator: string | null, cellType: string | null }
      const rssi: number | null = info.rssi ?? null;
      setNetworkInfo({
        rssi,
        rssiScore: rssi !== null ? rssiToScore(rssi) : null,
        operator: info.operator ?? null,
      });
    } catch {
      // Native module not available (e.g. iOS simulator or not yet linked)
    }
  };

  useEffect(() => {
    // Subscribe to NetInfo changes
    const unsubscribe = NetInfo.addEventListener((state: NetInfoState) => {
      const partial: Partial<NetworkInfo> = {
        type: netInfoTypeToNetworkType(state),
        isConnected: state.isConnected ?? false,
      };
      setNetworkInfo(partial);
    });

    // Fetch initial state
    NetInfo.fetch().then((state: NetInfoState) => {
      setNetworkInfo({
        type: netInfoTypeToNetworkType(state),
        isConnected: state.isConnected ?? false,
      });
    });

    // Start native polling
    pollNative();
    pollTimerRef.current = setInterval(pollNative, NATIVE_POLL_INTERVAL_MS);

    return () => {
      unsubscribe();
      if (pollTimerRef.current) clearInterval(pollTimerRef.current);
    };
  }, []); // eslint-disable-line react-hooks/exhaustive-deps
}
