/**
 * ThroughputProbe — Download and Upload speed measurement
 *
 * Measures Mbps by:
 *   Download: GET /download?bytes=N → timing the fetch from response start to body end
 *   Upload:   POST /upload with a binary payload → timing the fetch round-trip
 *
 * Reports live progress via onProgress callback so the Dashboard can render
 * a live byte counter / progress bar while the test runs.
 */

import type { ThroughputResult } from '../../types';

interface ThroughputOptions {
  serverUrl: string; // base URL, e.g. "http://192.168.1.10:3000"
  downloadBytes?: number; // default 10 MB
  uploadBytes?: number; // default 5 MB
  onProgress?: (phase: 'download' | 'upload', percent: number) => void;
}

const DEFAULT_DOWNLOAD_BYTES = 10_000_000; // 10 MB
const DEFAULT_UPLOAD_BYTES = 5_000_000; // 5 MB

// ---------------------------------------------------------------------------
// Download measurement
// ---------------------------------------------------------------------------

async function measureDownload(
  serverUrl: string,
  bytes: number,
  onProgress?: (pct: number) => void,
): Promise<number | null> {
  const url = `${serverUrl}/download?bytes=${bytes}`;
  const t0 = Date.now();

  try {
    const response = await fetch(url, {
      method: 'GET',
      headers: { 'Cache-Control': 'no-store' },
    });

    if (!response.ok) return null;

    // Cast needed: RN's fetch types don't expose .body (Streams API),
    // but it IS available at runtime in Hermes.
    const bodyReader = (response as any).body?.getReader();
    if (!bodyReader) {
      // Fallback: read as arrayBuffer if streaming not available
      const buffer = await response.arrayBuffer();
      const elapsed = (Date.now() - t0) / 1000;
      return (buffer.byteLength * 8) / elapsed / 1_000_000;
    }

    let received = 0;
    while (true) {
      const { done, value } = await bodyReader.read();
      if (done) break;
      received += value?.length ?? 0;
      onProgress?.(Math.round((received / bytes) * 100));
    }

    const elapsed = (Date.now() - t0) / 1000; // seconds
    const bitsReceived = received * 8;
    return bitsReceived / elapsed / 1_000_000; // Mbps
  } catch {
    return null;
  }
}

// ---------------------------------------------------------------------------
// Upload measurement
// ---------------------------------------------------------------------------

async function measureUpload(
  serverUrl: string,
  bytes: number,
  onProgress?: (pct: number) => void,
): Promise<number | null> {
  const url = `${serverUrl}/upload`;

  onProgress?.(10);

  // Generate payload on JS side (React Native doesn't stream outbound bodies
  // natively, so we use a single buffer approach, acceptable for ≤ 50 MB)
  const payload = new Uint8Array(bytes).fill(0x55);
  const t0 = Date.now();

  onProgress?.(30);

  try {
    const response = await fetch(url, {
      method: 'POST',
      headers: { 'Content-Type': 'application/octet-stream' },
      body: payload,
    });

    if (!response.ok) return null;

    const elapsed = (Date.now() - t0) / 1000;
    const bits = bytes * 8;
    onProgress?.(100);
    return bits / elapsed / 1_000_000; // Mbps
  } catch {
    return null;
  }
}

// ---------------------------------------------------------------------------
// Public API
// ---------------------------------------------------------------------------

export async function runThroughput({
  serverUrl,
  downloadBytes = DEFAULT_DOWNLOAD_BYTES,
  uploadBytes = DEFAULT_UPLOAD_BYTES,
  onProgress,
}: ThroughputOptions): Promise<ThroughputResult> {
  const timestamp = Date.now();

  const downloadMbps = await measureDownload(
    serverUrl,
    downloadBytes,
    pct => onProgress?.('download', pct),
  );

  // Mark download phase complete and notify upload start
  onProgress?.('download', 100);
  await new Promise<void>(resolve => setTimeout(() => resolve(), 250));

  onProgress?.('upload', 0);

  const uploadMbps = await measureUpload(
    serverUrl,
    uploadBytes,
    pct => onProgress?.('upload', pct),
  );

  // Mark upload phase complete
  onProgress?.('upload', 100);
  await new Promise<void>(resolve => setTimeout(() => resolve(), 250));

  const durationMs = Date.now() - timestamp;

  return {
    downloadMbps,
    uploadMbps,
    durationMs,
    payloadBytes: downloadBytes + uploadBytes,
    timestamp,
  };
}
