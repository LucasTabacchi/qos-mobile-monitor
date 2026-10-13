// ---------------------------------------------------------------------------
// Network info types
// ---------------------------------------------------------------------------

export type NetworkType =
  | '5G'
  | 'LTE'
  | '4G'
  | '3G'
  | '2G'
  | 'EDGE'
  | 'GPRS'
  | 'WIFI'
  | 'UNKNOWN'
  | 'NONE';

export interface NetworkInfo {
  type: NetworkType;
  operator: string | null;
  rssi: number | null; // dBm
  rssiScore: number | null; // 0-100 normalized
  isConnected: boolean;
}

// ---------------------------------------------------------------------------
// RTT (Ping) measurement
// ---------------------------------------------------------------------------

export interface PingResult {
  host: string;
  min: number | null; // ms
  avg: number | null;
  max: number | null;
  jitter: number | null;
  packetLoss: number; // 0-100 %
  timestamp: number; // Unix ms
}

// ---------------------------------------------------------------------------
// Throughput measurement
// ---------------------------------------------------------------------------

export interface ThroughputResult {
  downloadMbps: number | null;
  uploadMbps: number | null;
  durationMs: number;
  payloadBytes: number;
  timestamp: number;
}

// ---------------------------------------------------------------------------
// GPS coordinates
// ---------------------------------------------------------------------------

export interface Coordinates {
  latitude: number;
  longitude: number;
  accuracy: number; // meters
  altitude: number | null;
}

// ---------------------------------------------------------------------------
// Full measurement record (persisted)
// ---------------------------------------------------------------------------

export interface MeasurementRecord {
  id: string;
  timestamp: number; // Unix ms
  sessionId: string;
  network: NetworkInfo;
  location: Coordinates | null;
  ping: PingResult[];
  throughput: ThroughputResult | null;
  /** Composite 0-100 QoS score derived from ping + throughput + RSSI */
  qosScore: number | null;
}

/** Query criteria used by history and map views (RF-09). */
export interface MeasurementFilter {
  networkType?: NetworkType;
  fromTimestamp?: number;
  toTimestamp?: number;
  center?: Pick<Coordinates, 'latitude' | 'longitude'>;
  radiusMeters?: number;
}

// ---------------------------------------------------------------------------
// Measurement engine state
// ---------------------------------------------------------------------------

export type MeasurementStatus =
  | 'idle'
  | 'pinging'
  | 'downloading'
  | 'uploading'
  | 'done'
  | 'error';

export interface MeasurementState {
  status: MeasurementStatus;
  progress: number; // 0-100
  currentHost: string | null;
  error: string | null;
}

// ---------------------------------------------------------------------------
// App settings
// ---------------------------------------------------------------------------

export interface PingHost {
  id: string;
  label: string;
  host: string;
  port: number;
}

export interface AppSettings {
  pingHosts: PingHost[];
  backgroundIntervalMinutes: number;
  alertRttThresholdMs: number;
  alertThroughputThresholdMbps: number;
  throughputServerUrl: string;
}

// ---------------------------------------------------------------------------
// Navigation param lists
// ---------------------------------------------------------------------------

export type RootTabParamList = {
  Dashboard: undefined;
  Map: undefined;
  History: undefined;
  Settings: undefined;
};

export type HistoryStackParamList = {
  HistoryList: undefined;
  Charts: { sessionId?: string } | undefined;
};
