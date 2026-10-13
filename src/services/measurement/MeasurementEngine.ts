/**
 * MeasurementEngine — complete implementation
 *
 * Orchestrates: network info → GPS → ping probes → throughput → score → persist
 */

import { useMeasurementStore, useHistoryStore, useNetworkStore, useSettingsStore } from '../../store';
import { runPing } from './PingProbe';
import { runThroughput } from './ThroughputProbe';
import { getCurrentPosition, clearPositionCache } from '../geo/GeoService';
import { PersistenceService } from '../persistence/PersistenceService';
import type { MeasurementRecord, PingResult } from '../../types';

// ---------------------------------------------------------------------------
// QoS composite score
// ---------------------------------------------------------------------------

/**
 * Weighted composite: RTT 40% + download 40% + RSSI 20%
 * All sub-scores are 0-100.
 */
function computeQosScore(
  avgRttMs: number | null,
  downloadMbps: number | null,
  rssiScore: number | null,
): number | null {
  const parts: { v: number; w: number }[] = [];

  if (avgRttMs !== null) {
    // 0 ms → 100, 500 ms → 0
    parts.push({ v: Math.max(0, 100 - avgRttMs / 5), w: 0.4 });
  }
  if (downloadMbps !== null) {
    // 100 Mbps → 100, 0 → 0
    parts.push({ v: Math.min(100, downloadMbps), w: 0.4 });
  }
  if (rssiScore !== null) {
    parts.push({ v: rssiScore, w: 0.2 });
  }

  if (parts.length === 0) return null;
  const totalWeight = parts.reduce((s, p) => s + p.w, 0);
  return parts.reduce((s, p) => s + p.v * p.w, 0) / totalWeight;
}

// ---------------------------------------------------------------------------
// Public engine
// ---------------------------------------------------------------------------

export const MeasurementEngine = {
  async runFullMeasurement(): Promise<void> {
    const { setStatus, setProgress, setError, setLastRecord, reset } =
      useMeasurementStore.getState();
    const { addRecord } = useHistoryStore.getState();
    const { networkInfo } = useNetworkStore.getState();
    const { settings } = useSettingsStore.getState();

    const sessionId = `sess_${Date.now()}`;

    try {
      reset();
      clearPositionCache();

      // ── 1. GPS location ──────────────────────────────────────────────────
      const location = await getCurrentPosition();

      // ── 2. Ping all configured hosts ─────────────────────────────────────
      const pingResults: PingResult[] = [];
      const hosts = settings.pingHosts;

      for (let i = 0; i < hosts.length; i++) {
        const host = hosts[i];
        setStatus('pinging', host.host);
        setProgress(Math.round((i / hosts.length) * 40)); // 0-40%

        const result = await runPing({
          host: host.host,
          port: host.port,
          count: 5,
          timeoutMs: 3000,
          intervalMs: 200,
        });
        pingResults.push(result);
      }

      setProgress(45);

      // ── 3. Throughput ────────────────────────────────────────────────────
      setStatus('downloading');

      const throughput = await runThroughput({
        serverUrl: settings.throughputServerUrl,
        downloadBytes: 10_000_000, // 10 MB
        uploadBytes: 5_000_000, // 5 MB
        onProgress: (phase, pct) => {
          if (phase === 'download') {
            setStatus('downloading');
            setProgress(45 + Math.round(pct * 0.35)); // 45-80%
          } else {
            setStatus('uploading');
            setProgress(80 + Math.round(pct * 0.15)); // 80-95%
          }
        },
      });

      setProgress(95);

      // ── 4. QoS score ─────────────────────────────────────────────────────
      const avgRtt = pingResults.find(p => p.avg !== null)?.avg ?? null;
      const dlMbps = throughput.downloadMbps;
      const qosScore = computeQosScore(avgRtt, dlMbps, networkInfo.rssiScore);

      // ── 5. Build and persist record ───────────────────────────────────────
      const record: MeasurementRecord = {
        id: `meas_${Date.now()}_${Math.random().toString(36).slice(2, 8)}`,
        timestamp: Date.now(),
        sessionId,
        network: { ...networkInfo },
        location,
        ping: pingResults,
        throughput,
        qosScore,
      };

      // Persist to SQLite (non-blocking — don't fail the whole measurement)
      PersistenceService.save(record).catch(e =>
        console.warn('[MeasurementEngine] Persistence error:', e),
      );

      setLastRecord(record);
      addRecord(record);
      setStatus('done');
      setProgress(100);

      // Keep the 100% completed summary visible so the user can verify all probes are ready
      await new Promise<void>(resolve => setTimeout(() => resolve(), 2000));
      reset();
    } catch (err) {
      const message = err instanceof Error ? err.message : 'Measurement failed';
      setError(message);
    }
  },
};
