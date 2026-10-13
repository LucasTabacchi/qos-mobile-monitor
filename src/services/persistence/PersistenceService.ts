/**
 * PersistenceService — SQLite storage for MeasurementRecord
 *
 * Uses react-native-sqlite-storage.
 * Schema: single `measurements` table with JSON-serialized fields.
 * Opened once at app start via init(); all subsequent calls reuse the handle.
 */

import SQLite from 'react-native-sqlite-storage';
import type { MeasurementFilter, MeasurementRecord } from '../../types';
import RNFS from 'react-native-fs';
import { useHistoryStore } from '../../store';

SQLite.enablePromise(true);
SQLite.DEBUG(false);

let db: SQLite.SQLiteDatabase | null = null;

const CREATE_TABLE = `
  CREATE TABLE IF NOT EXISTS measurements (
    id TEXT PRIMARY KEY,
    timestamp INTEGER NOT NULL,
    session_id TEXT,
    network_type TEXT,
    operator TEXT,
    rssi INTEGER,
    rssi_score INTEGER,
    is_connected INTEGER,
    latitude REAL,
    longitude REAL,
    accuracy REAL,
    altitude REAL,
    ping_json TEXT,
    throughput_json TEXT,
    qos_score REAL
  );
`;

// Index for date-range and network-type queries (RF-09)
const CREATE_INDEX_TIMESTAMP = `
  CREATE INDEX IF NOT EXISTS idx_measurements_timestamp ON measurements(timestamp);
`;
const CREATE_INDEX_TYPE = `
  CREATE INDEX IF NOT EXISTS idx_measurements_network_type ON measurements(network_type);
`;

// ---------------------------------------------------------------------------
// init
// ---------------------------------------------------------------------------

async function init(): Promise<void> {
  if (db) return;
  db = await SQLite.openDatabase({ name: 'qos_monitor.db', location: 'default' });
  await db.executeSql(CREATE_TABLE);
  await db.executeSql(CREATE_INDEX_TIMESTAMP);
  await db.executeSql(CREATE_INDEX_TYPE);
}

// ---------------------------------------------------------------------------
// save
// ---------------------------------------------------------------------------

async function save(record: MeasurementRecord): Promise<void> {
  await init();
  const sql = `
    INSERT OR REPLACE INTO measurements
    (id, timestamp, session_id, network_type, operator, rssi, rssi_score, is_connected,
     latitude, longitude, accuracy, altitude, ping_json, throughput_json, qos_score)
    VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?);
  `;
  await db!.executeSql(sql, [
    record.id,
    record.timestamp,
    record.sessionId,
    record.network.type,
    record.network.operator,
    record.network.rssi,
    record.network.rssiScore,
    record.network.isConnected ? 1 : 0,
    record.location?.latitude ?? null,
    record.location?.longitude ?? null,
    record.location?.accuracy ?? null,
    record.location?.altitude ?? null,
    JSON.stringify(record.ping),
    record.throughput ? JSON.stringify(record.throughput) : null,
    record.qosScore,
  ]);
}

// ---------------------------------------------------------------------------
// loadAll — returns up to 1000 most recent records
// ---------------------------------------------------------------------------

async function loadAll(limit = 1000): Promise<MeasurementRecord[]> {
  await init();
  const [results] = await db!.executeSql(
    `SELECT * FROM measurements ORDER BY timestamp DESC LIMIT ?`,
    [limit],
  );

  const records: MeasurementRecord[] = [];
  for (let i = 0; i < results.rows.length; i++) {
    const row = results.rows.item(i);
    records.push(rowToRecord(row));
  }
  return records;
}

// ---------------------------------------------------------------------------
// loadByRange — RF-09 date filter
// ---------------------------------------------------------------------------

async function loadByRange(
  fromTs: number,
  toTs: number,
  networkType?: string,
): Promise<MeasurementRecord[]> {
  await init();
  const sql = networkType
    ? `SELECT * FROM measurements WHERE timestamp >= ? AND timestamp <= ? AND network_type = ? ORDER BY timestamp DESC`
    : `SELECT * FROM measurements WHERE timestamp >= ? AND timestamp <= ? ORDER BY timestamp DESC`;
  const params = networkType ? [fromTs, toTs, networkType] : [fromTs, toTs];
  const [results] = await db!.executeSql(sql, params);
  const records: MeasurementRecord[] = [];
  for (let i = 0; i < results.rows.length; i++) {
    records.push(rowToRecord(results.rows.item(i)));
  }
  return records;
}

export function filterRecords(records: MeasurementRecord[], filter: MeasurementFilter): MeasurementRecord[] {
  return records.filter(record => {
    if (filter.networkType && record.network.type !== filter.networkType) return false;
    if (filter.fromTimestamp && record.timestamp < filter.fromTimestamp) return false;
    if (filter.toTimestamp && record.timestamp > filter.toTimestamp) return false;
    if (filter.center && filter.radiusMeters != null) {
      if (!record.location) return false;
      if (distanceMeters(filter.center, record.location) > filter.radiusMeters) return false;
    }
    return true;
  });
}

/** Haversine distance, intentionally dependency-free for predictable offline filtering. */
export function distanceMeters(a: { latitude: number; longitude: number }, b: { latitude: number; longitude: number }): number {
  const r = 6_371_000;
  const toRad = (value: number) => value * Math.PI / 180;
  const dLat = toRad(b.latitude - a.latitude);
  const dLng = toRad(b.longitude - a.longitude);
  const x = Math.sin(dLat / 2) ** 2 + Math.cos(toRad(a.latitude)) * Math.cos(toRad(b.latitude)) * Math.sin(dLng / 2) ** 2;
  return 2 * r * Math.atan2(Math.sqrt(x), Math.sqrt(1 - x));
}

// ---------------------------------------------------------------------------
// clearAll
// ---------------------------------------------------------------------------

async function clearAll(): Promise<void> {
  await init();
  await db!.executeSql(`DELETE FROM measurements`);
}

// ---------------------------------------------------------------------------
// loadIntoStore — call at app startup to hydrate Zustand from SQLite
// ---------------------------------------------------------------------------

async function loadIntoStore(): Promise<void> {
  try {
    const records = await loadAll();
    const { setRecords } = useHistoryStore.getState();
    setRecords(records);
  } catch (e) {
    console.warn('[PersistenceService] Failed to load from SQLite:', e);
  }
}

// ---------------------------------------------------------------------------
// Row → MeasurementRecord
// ---------------------------------------------------------------------------

function rowToRecord(row: any): MeasurementRecord {
  return {
    id: row.id,
    timestamp: row.timestamp,
    sessionId: row.session_id,
    network: {
      type: row.network_type,
      operator: row.operator,
      rssi: row.rssi,
      rssiScore: row.rssi_score,
      isConnected: row.is_connected === 1,
    },
    location:
      row.latitude != null
        ? {
            latitude: row.latitude,
            longitude: row.longitude,
            accuracy: row.accuracy,
            altitude: row.altitude,
          }
        : null,
    ping: row.ping_json ? JSON.parse(row.ping_json) : [],
    throughput: row.throughput_json ? JSON.parse(row.throughput_json) : null,
    qosScore: row.qos_score,
  };
}

// ---------------------------------------------------------------------------
// CSV/JSON export — RF-08
// ---------------------------------------------------------------------------

function recordsToCsv(records: MeasurementRecord[]): string {
  const header = [
    'id', 'timestamp', 'network_type', 'operator', 'rssi', 'rssi_score',
    'latitude', 'longitude', 'avg_rtt_ms', 'jitter_ms', 'packet_loss_pct',
    'download_mbps', 'upload_mbps', 'qos_score',
  ].join(',');

  const rows = records.map(r => {
    const ping = r.ping?.[0];
    return [
      r.id,
      new Date(r.timestamp).toISOString(),
      r.network.type,
      r.network.operator ?? '',
      r.network.rssi ?? '',
      r.network.rssiScore ?? '',
      r.location?.latitude ?? '',
      r.location?.longitude ?? '',
      ping?.avg?.toFixed(2) ?? '',
      ping?.jitter?.toFixed(2) ?? '',
      ping?.packetLoss ?? '',
      r.throughput?.downloadMbps?.toFixed(2) ?? '',
      r.throughput?.uploadMbps?.toFixed(2) ?? '',
      r.qosScore?.toFixed(1) ?? '',
    ].join(',');
  });

  return [header, ...rows].join('\n');
}

async function exportFile(records: MeasurementRecord[], format: 'csv' | 'json'): Promise<string> {
  const content = format === 'csv' ? recordsToCsv(records) : JSON.stringify(records, null, 2);
  const path = `${RNFS.CachesDirectoryPath}/qos_export_${Date.now()}.${format}`;
  await RNFS.writeFile(path, content, 'utf8');
  return `file://${path}`;
}

export const PersistenceService = {
  init,
  save,
  loadAll,
  loadByRange,
  clearAll,
  loadIntoStore,
  recordsToCsv,
  recordsToJson: (records: MeasurementRecord[]) => JSON.stringify(records, null, 2),
  filterRecords,
  exportFile,
};
