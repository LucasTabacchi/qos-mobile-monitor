/**
 * Network QoS Monitor — Throughput Reference Server
 *
 * Minimal Node.js/Express backend for speed tests (RF-03).
 *
 * Endpoints:
 *   GET /download?bytes=N   — sends N bytes of random data
 *   POST /upload            — reads the entire request body and echoes the byte count
 *   GET /health             — liveness probe
 *
 * Default port: 3000 (override with PORT env var)
 * Default payload: 10 MB for download, unlimited for upload
 */

const express = require('express');
const crypto = require('crypto');

const app = express();
const PORT = parseInt(process.env.PORT || '3000', 10);

// Allow large uploads (default body-parser limit is 100kb, we want 50MB)
app.use(express.raw({ type: '*/*', limit: '50mb' }));

// ── Logger & CORS ───────────────────────────────────────────────────────────
app.use((req, res, next) => {
  console.log(`[${new Date().toLocaleTimeString()}] ${req.method} ${req.url}`);
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'GET, POST, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type');
  if (req.method === 'OPTIONS') { res.sendStatus(204); return; }
  next();
});

// ── /health ─────────────────────────────────────────────────────────────────
app.get('/health', (_req, res) => {
  res.json({ status: 'ok', timestamp: Date.now() });
});

// ── /download ────────────────────────────────────────────────────────────────
//
// Returns exactly `bytes` bytes of pseudo-random data.
// The client measures total transfer time to compute Mbps.
//
// Limits: 1 KB min, 100 MB max (avoids OOM / abuse).
const MIN_BYTES = 1_024;          // 1 KB
const MAX_BYTES = 100_000_000;    // 100 MB
const DEFAULT_BYTES = 10_000_000; // 10 MB

app.get('/download', (req, res) => {
  const requestedBytes = parseInt(req.query.bytes, 10);
  const bytes = isNaN(requestedBytes)
    ? DEFAULT_BYTES
    : Math.max(MIN_BYTES, Math.min(MAX_BYTES, requestedBytes));

  res.setHeader('Content-Type', 'application/octet-stream');
  res.setHeader('Content-Length', bytes);
  res.setHeader('Cache-Control', 'no-store');
  res.setHeader('X-Payload-Bytes', bytes);

  // Stream in 64 KB chunks to avoid allocating the full buffer at once
  const CHUNK = 65_536;
  let remaining = bytes;

  function writeChunk() {
    if (remaining <= 0) { res.end(); return; }
    const size = Math.min(CHUNK, remaining);
    remaining -= size;
    const chunk = crypto.randomBytes(size);
    const canContinue = res.write(chunk);
    if (canContinue) {
      setImmediate(writeChunk);
    } else {
      res.once('drain', writeChunk);
    }
  }

  writeChunk();
});

// ── /upload ──────────────────────────────────────────────────────────────────
//
// Reads the entire POST body and returns the number of received bytes.
// The client records start/end time around the POST request to compute Mbps.

app.post('/upload', (req, res) => {
  const received = req.body ? req.body.length : 0;
  res.json({ received, timestamp: Date.now() });
});

// ── Start ────────────────────────────────────────────────────────────────────
app.listen(PORT, '0.0.0.0', () => {
  console.log(`[QoS Backend] Listening on http://0.0.0.0:${PORT}`);
  console.log(`  GET  /download?bytes=10000000`);
  console.log(`  POST /upload`);
  console.log(`  GET  /health`);
});
