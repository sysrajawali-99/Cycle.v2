#!/usr/bin/env node
/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 *
 * Script Penjaga Deploy (Data Guard) PT Rajawali Cycle Indonesia
 * Mode:
 *   1. snapshot : simpan jumlah record per key ke file JSON
 *   2. verify   : bandingkan jumlah record sekarang dengan snapshot
 *
 * Hanya membaca database (SELECT lewat DATABASE_URL dari .env).
 * Tidak pernah menulis atau menghapus data database apa pun.
 */

import fs from 'node:fs';
import path from 'node:path';
import pg from 'pg';
import dotenv from 'dotenv';

dotenv.config();

const { Pool } = pg;
const DEFAULT_SNAPSHOT_PATH = '/root/backup/data-counts-before.json';
const snapshotFile = process.env.DATA_GUARD_FILE || DEFAULT_SNAPSHOT_PATH;

function countRecords(data) {
  if (Array.isArray(data)) {
    return data.length;
  }
  if (data !== null && typeof data === 'object') {
    return Object.keys(data).length;
  }
  if (data !== null && data !== undefined) {
    return 1;
  }
  return 0;
}

async function fetchCountsFromDatabase() {
  const databaseUrl = process.env.DATABASE_URL;
  const counts = {};

  if (databaseUrl && databaseUrl.trim().length > 0) {
    const pool = new Pool({
      connectionString: databaseUrl,
      ssl: databaseUrl.includes('sslmode=require') || databaseUrl.includes('supabase.co')
        ? { rejectUnauthorized: false }
        : false,
      connectionTimeoutMillis: 10000
    });

    try {
      const client = await pool.connect();
      try {
        const res = await client.query('SELECT key, data FROM rajawali_app_state');
        for (const row of res.rows) {
          counts[row.key] = countRecords(row.data);
        }
        return counts;
      } finally {
        client.release();
      }
    } catch (dbErr) {
      console.warn(`[DATA GUARD] Koneksi PostgreSQL tidak dapat dijangkau (${dbErr.message}). Menggunakan pembacaan data store lokal...`);
    } finally {
      await pool.end().catch(() => {});
    }
  }

  // Fallback bacaan local file store jika DATABASE_URL tidak aktif atau offline
  const localStorePath = path.resolve(process.cwd(), 'data/vps_local_store.json');
  if (fs.existsSync(localStorePath)) {
    try {
      const raw = fs.readFileSync(localStorePath, 'utf8');
      const parsed = JSON.parse(raw);
      if (parsed && typeof parsed === 'object') {
        for (const [key, val] of Object.entries(parsed)) {
          counts[key] = countRecords(val);
        }
      }
    } catch (err) {
      console.warn('[DATA GUARD] Gagal membaca data/vps_local_store.json:', err.message);
    }
  } else {
    console.warn('[DATA GUARD] Peringatan: DATABASE_URL tidak ditemukan dan file lokal tidak ada.');
  }

  return counts;
}

async function handleSnapshot() {
  console.log(`[DATA GUARD] Menjalankan mode SNAPSHOT...`);
  const counts = await fetchCountsFromDatabase();
  const dir = path.dirname(snapshotFile);
  if (!fs.existsSync(dir)) {
    try {
      fs.mkdirSync(dir, { recursive: true });
    } catch (err) {
      console.warn(`[DATA GUARD] Tidak dapat membuat direktori ${dir}: ${err.message}. Menggunakan fallback ./data-counts-before.json`);
    }
  }

  let targetPath = snapshotFile;
  try {
    fs.writeFileSync(targetPath, JSON.stringify(counts, null, 2), 'utf8');
  } catch (err) {
    // Jika path default /root/backup tidak memiliki izin tulis, simpan di direktori kerja
    targetPath = path.resolve(process.cwd(), 'data-counts-before.json');
    console.warn(`[DATA GUARD] Gagal menulis ke ${snapshotFile} (${err.message}). Menulis ke fallback: ${targetPath}`);
    fs.writeFileSync(targetPath, JSON.stringify(counts, null, 2), 'utf8');
  }

  console.log(`[DATA GUARD] Snapshot berhasil disimpan ke: ${targetPath}`);
  console.log(`[DATA GUARD] Total keys dicatat: ${Object.keys(counts).length}`);
  for (const [key, count] of Object.entries(counts)) {
    console.log(`  - ${key}: ${count} record`);
  }
}

async function handleVerify() {
  console.log(`[DATA GUARD] Menjalankan mode VERIFY...`);
  let targetPath = snapshotFile;
  if (!fs.existsSync(targetPath)) {
    const fallback = path.resolve(process.cwd(), 'data-counts-before.json');
    if (fs.existsSync(fallback)) {
      targetPath = fallback;
    } else {
      console.error(`[DATA GUARD] File snapshot tidak ditemukan di ${snapshotFile} atau ${fallback}. Jalankan mode snapshot terlebih dahulu.`);
      process.exit(1);
    }
  }

  const rawSnapshot = fs.readFileSync(targetPath, 'utf8');
  const snapshot = JSON.parse(rawSnapshot);
  const currentCounts = await fetchCountsFromDatabase();

  let hasDecrease = false;

  console.log(`[DATA GUARD] Membandingkan jumlah record...`);
  for (const [key, sebelum] of Object.entries(snapshot)) {
    const sesudah = currentCounts[key] ?? 0;
    if (sesudah < sebelum) {
      console.error(`[DATA GUARD] BERKURANG: ${key} sebelum=${sebelum} sesudah=${sesudah}`);
      hasDecrease = true;
    } else {
      console.log(`  ✔ ${key}: sebelum=${sebelum}, sesudah=${sesudah} (aman)`);
    }
  }

  if (hasDecrease) {
    console.error(`\n[DATA GUARD] Verifikasi GAGAL: Terdeteksi penurunan jumlah record data!`);
    process.exit(1);
  } else {
    console.log(`\n[DATA GUARD] Verifikasi BERHASIL: Tidak ada data yang berkurang.`);
    process.exit(0);
  }
}

async function main() {
  const mode = process.argv[2] || 'snapshot';
  if (mode === 'snapshot') {
    await handleSnapshot();
  } else if (mode === 'verify') {
    await handleVerify();
  } else {
    console.error(`[DATA GUARD] Mode tidak dikenal: "${mode}". Gunakan "snapshot" atau "verify".`);
    process.exit(1);
  }
}

main().catch((err) => {
  console.error('[DATA GUARD] Terjadi kesalahan fatal:', err);
  process.exit(1);
});
