import { create } from 'zustand';
import type {
  MeasurementRecord,
  MeasurementState,
  MeasurementStatus,
  NetworkInfo,
  AppSettings,
  PingHost,
} from '../types';
import { getDefaultThroughputUrl } from '../utils/deviceDetection';

// ---------------------------------------------------------------------------
// Default settings
// ---------------------------------------------------------------------------

const DEFAULT_PING_HOSTS: PingHost[] = [
  { id: '1', label: 'Google DNS', host: '8.8.8.8', port: 53 },
  { id: '2', label: 'Cloudflare DNS', host: '1.1.1.1', port: 53 },
  { id: '3', label: 'OpenDNS', host: '208.67.222.222', port: 53 },
];

const DEFAULT_SETTINGS: AppSettings = {
  pingHosts: DEFAULT_PING_HOSTS,
  backgroundIntervalMinutes: 15,
  alertRttThresholdMs: 200,
  alertThroughputThresholdMbps: 1,
  throughputServerUrl: getDefaultThroughputUrl(),
};

// ---------------------------------------------------------------------------
// Network store — current live network info
// ---------------------------------------------------------------------------

interface NetworkStore {
  networkInfo: NetworkInfo;
  setNetworkInfo: (info: Partial<NetworkInfo>) => void;
}

export const useNetworkStore = create<NetworkStore>(set => ({
  networkInfo: {
    type: 'UNKNOWN',
    operator: null,
    rssi: null,
    rssiScore: null,
    isConnected: false,
  },
  setNetworkInfo: info =>
    set(state => ({ networkInfo: { ...state.networkInfo, ...info } })),
}));

// ---------------------------------------------------------------------------
// Measurement store — current test state + last result
// ---------------------------------------------------------------------------

interface MeasurementStore {
  state: MeasurementState;
  lastRecord: MeasurementRecord | null;
  setStatus: (status: MeasurementStatus, host?: string | null) => void;
  setProgress: (progress: number) => void;
  setError: (error: string | null) => void;
  setLastRecord: (record: MeasurementRecord) => void;
  reset: () => void;
}

const IDLE_STATE: MeasurementState = {
  status: 'idle',
  progress: 0,
  currentHost: null,
  error: null,
};

export const useMeasurementStore = create<MeasurementStore>(set => ({
  state: IDLE_STATE,
  lastRecord: null,
  setStatus: (status, host = null) =>
    set(s => ({ state: { ...s.state, status, currentHost: host ?? s.state.currentHost } })),
  setProgress: progress => set(s => ({ state: { ...s.state, progress } })),
  setError: error => set(s => ({ state: { ...s.state, error, status: 'error' } })),
  setLastRecord: record => set({ lastRecord: record }),
  reset: () => set({ state: IDLE_STATE }),
}));

// ---------------------------------------------------------------------------
// History store — persisted measurements list
// ---------------------------------------------------------------------------

interface HistoryStore {
  records: MeasurementRecord[];
  setRecords: (records: MeasurementRecord[]) => void;
  addRecord: (record: MeasurementRecord) => void;
  clearHistory: () => void;
}

export const useHistoryStore = create<HistoryStore>(set => ({
  records: [],
  setRecords: records =>
    set(() => {
      const seen = new Set<string>();
      const uniqueRecords: MeasurementRecord[] = [];
      for (const r of records) {
        if (!seen.has(r.id)) {
          seen.add(r.id);
          uniqueRecords.push(r);
        }
      }
      return { records: uniqueRecords.slice(0, 1000) };
    }),
  addRecord: record =>
    set(state => {
      if (state.records.some(r => r.id === record.id)) {
        return state;
      }
      return {
        records: [record, ...state.records].slice(0, 1000), // cap at 1000
      };
    }),
  clearHistory: () => set({ records: [] }),
}));

// ---------------------------------------------------------------------------
// Settings store
// ---------------------------------------------------------------------------

interface SettingsStore {
  settings: AppSettings;
  updateSettings: (patch: Partial<AppSettings>) => void;
  addPingHost: (host: PingHost) => void;
  removePingHost: (id: string) => void;
}

export const useSettingsStore = create<SettingsStore>(set => ({
  settings: DEFAULT_SETTINGS,
  updateSettings: patch =>
    set(state => ({ settings: { ...state.settings, ...patch } })),
  addPingHost: host =>
    set(state => ({
      settings: {
        ...state.settings,
        pingHosts: [...state.settings.pingHosts, host],
      },
    })),
  removePingHost: id =>
    set(state => ({
      settings: {
        ...state.settings,
        pingHosts: state.settings.pingHosts.filter(h => h.id !== id),
      },
    })),
}));
