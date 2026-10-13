/**
 * PingProbe — TCP connect-time RTT measurement
 *
 * Uses react-native-tcp-socket to open a TCP connection to a host:port and
 * measures the round-trip time. This is the most reliable approach for
 * cross-platform latency measurement in React Native without raw ICMP access.
 *
 * Algorithm:
 *   1. Record t0
 *   2. Attempt TCP connect to host:port
 *   3. On 'connect' event, record t1 → RTT = t1 - t0
 *   4. Immediately destroy the socket
 *   5. Repeat `count` times with `intervalMs` between probes
 *   6. Compute min, avg, max, jitter (mean absolute deviation), packet loss
 */

import TcpSocket from 'react-native-tcp-socket';
import type { PingResult } from '../../types';

interface PingOptions {
  host: string;
  port: number;
  count?: number; // number of probes (default 5)
  timeoutMs?: number; // per-probe timeout (default 3000)
  intervalMs?: number; // delay between probes (default 200)
}

// ---------------------------------------------------------------------------
// Single probe
// ---------------------------------------------------------------------------

function singleProbe(host: string, port: number, timeoutMs: number): Promise<number | null> {
  return new Promise(resolve => {
    const t0 = Date.now();
    let settled = false;

    const settle = (rtt: number | null) => {
      if (settled) return;
      settled = true;
      try { socket.destroy(); } catch { /* ignore */ }
      resolve(rtt);
    };

    const socket = TcpSocket.createConnection(
      { host, port, tls: false },
      () => { settle(Date.now() - t0); },
    );

    socket.on('error', () => settle(null));
    socket.on('close', () => settle(null));

    // Timeout watchdog
    const timer = setTimeout(() => settle(null), timeoutMs);
    socket.on('connect', () => clearTimeout(timer));
  });
}

// ---------------------------------------------------------------------------
// delay helper
// ---------------------------------------------------------------------------

const delay = (ms: number) => new Promise<void>(r => setTimeout(r, ms));

// ---------------------------------------------------------------------------
// runPing — public API
// ---------------------------------------------------------------------------

export async function runPing({
  host,
  port,
  count = 5,
  timeoutMs = 3000,
  intervalMs = 200,
}: PingOptions): Promise<PingResult> {
  const timestamp = Date.now();
  const rtts: number[] = [];

  for (let i = 0; i < count; i++) {
    const rtt = await singleProbe(host, port, timeoutMs);
    if (rtt !== null) rtts.push(rtt);
    if (i < count - 1) await delay(intervalMs);
  }

  if (rtts.length === 0) {
    return {
      host,
      min: null,
      avg: null,
      max: null,
      jitter: null,
      packetLoss: 100,
      timestamp,
    };
  }

  const min = Math.min(...rtts);
  const max = Math.max(...rtts);
  const avg = rtts.reduce((s, v) => s + v, 0) / rtts.length;

  // Jitter: mean absolute deviation from average
  const jitter = rtts.reduce((s, v) => s + Math.abs(v - avg), 0) / rtts.length;

  const packetLoss = Math.round(((count - rtts.length) / count) * 100);

  return { host, min, avg, max, jitter, packetLoss, timestamp };
}
