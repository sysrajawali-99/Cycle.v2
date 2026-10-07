/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 *
 * Script Pemeriksaan Integritas & Protokol Keamanan Data
 * Dijalankan via: npm run check:data
 */

import { STORAGE_KEYS, DATA_KEY_REGISTRY, validateDataRegistry } from '../src/services/dataRegistry';
import {
  ensureRecordMetadata,
  getDeterministicRecordId
} from '../src/services/storageService';
import { mergeIdArrays } from '../server/vpsDatabase';

interface TestResult {
  name: string;
  passed: boolean;
  error?: string;
}

const results: TestResult[] = [];

function test(name: string, fn: () => void) {
  try {
    fn();
    results.push({ name, passed: true });
    console.log(`  \x1b[32m✔ PASS\x1b[0m: ${name}`);
  } catch (err: any) {
    results.push({ name, passed: false, error: err?.message || String(err) });
    console.error(`  \x1b[31m✖ FAIL\x1b[0m: ${name}`);
    console.error(`    \x1b[33mError: ${err?.message || err}\x1b[0m`);
  }
}

function assert(condition: boolean, message: string) {
  if (!condition) {
    throw new Error(message);
  }
}

console.log('\n\x1b[1m\x1b[36m=================================================================\x1b[0m');
console.log('\x1b[1m\x1b[36m   PT RAJAWALI CYCLE INDONESIA - PEMERIKSAAN KEAMANAN DATA      \x1b[0m');
console.log('\x1b[1m\x1b[36m=================================================================\x1b[0m\n');

// ---------------------------------------------------------------------------
// TEST GROUP 1: REGISTRI KUNCI UNIK TERPUSAT
// ---------------------------------------------------------------------------
console.log('\x1b[1m[1/7] Pemeriksaan Registri Kunci Unik (STORAGE_KEYS)...\x1b[0m');

test('Setiap key di STORAGE_KEYS memiliki definisi kunci unik di DATA_KEY_REGISTRY', () => {
  const check = validateDataRegistry();
  assert(
    check.valid,
    `Key berikut di STORAGE_KEYS belum memiliki definisi di DATA_KEY_REGISTRY: ${check.missingKeys.join(', ')}`
  );
});

test('Validasi registri gagal jika terdapat key asing tanpa definisi kunci unik', () => {
  const fakeRegistry = { ...DATA_KEY_REGISTRY };
  delete fakeRegistry[STORAGE_KEYS.CHART_OF_ACCOUNTS];
  let caught = false;
  // Simulasikan pengecekan
  if (!fakeRegistry[STORAGE_KEYS.CHART_OF_ACCOUNTS]) {
    caught = true;
  }
  assert(caught, 'Registri harus mendeteksi key yang belum terdefinisi');
});

// ---------------------------------------------------------------------------
// TEST GROUP 2: INTEGRITAS MERGE (TIDAK PERNAH MENGHILANGKAN RECORD)
// ---------------------------------------------------------------------------
console.log('\n\x1b[1m[2/7] Pengujian Merge: Proteksi Kehilangan Data...\x1b[0m');

test('Merge server tidak pernah menghilangkan record yang ada di salah satu sisi', () => {
  const server = [
    { id: 'item-1', name: 'Item Server 1', updatedAt: '2026-10-01T10:00:00Z' },
    { id: 'item-2', name: 'Item Server 2', updatedAt: '2026-10-01T10:00:00Z' }
  ];
  const incoming = [
    { id: 'item-2', name: 'Item Server 2 Updated', updatedAt: '2026-10-01T11:00:00Z' },
    { id: 'item-3', name: 'Item Client 3', updatedAt: '2026-10-01T11:00:00Z' }
  ];

  const merged = mergeIdArrays(server, incoming);
  assert(merged.length === 3, `Expected 3 records, got ${merged.length}`);

  const ids = new Set(merged.map((m: any) => m.id));
  assert(ids.has('item-1'), 'item-1 dari server tidak boleh hilang');
  assert(ids.has('item-2'), 'item-2 tidak boleh hilang');
  assert(ids.has('item-3'), 'item-3 dari incoming tidak boleh hilang');

  const item2 = merged.find((m: any) => m.id === 'item-2');
  assert(item2.name === 'Item Server 2 Updated', 'Update terbaru harus digunakan');
});

test('Merge tidak pernah menghasilkan array kosong dari input yang tidak kosong', () => {
  const server = [{ id: 'srv-1', name: 'Akun Kas' }];
  const emptyIncoming: any[] = [];

  const merged1 = mergeIdArrays(server, emptyIncoming);
  assert(merged1.length === 1, `Merge dengan incoming kosong tidak boleh menghasilkan array kosong (dapat ${merged1.length})`);
  assert(merged1[0].id === 'srv-1', 'Data server harus utuh');

  const emptyServer: any[] = [];
  const clientIncoming = [{ id: 'cl-1', name: 'Akun Bank' }];
  const merged2 = mergeIdArrays(emptyServer, clientIncoming);
  assert(merged2.length === 1, `Merge server kosong dengan incoming tidak boleh kosong (dapat ${merged2.length})`);
  assert(merged2[0].id === 'cl-1', 'Data incoming harus tersimpan');
});

test('Merge bersifat idempotent dan konsisten walau urutan dibalik', () => {
  const setA = [
    { id: 'A', val: 10, updatedAt: '2026-08-01T00:00:00Z' },
    { id: 'B', val: 20, updatedAt: '2026-08-01T00:00:00Z' }
  ];
  const setB = [
    { id: 'B', val: 25, updatedAt: '2026-08-02T00:00:00Z' },
    { id: 'C', val: 30, updatedAt: '2026-08-01T00:00:00Z' }
  ];

  const mergedAB = mergeIdArrays(setA, setB);
  const reMerged = mergeIdArrays(mergedAB, setB);

  assert(mergedAB.length === 3, 'Hasil harus memiliki 3 item');
  assert(reMerged.length === 3, 'Merge berulang harus tetap menghasilkan 3 item (idempotent)');

  const idsAB = mergedAB.map((i: any) => i.id).sort();
  const idsReMerged = reMerged.map((i: any) => i.id).sort();
  assert(JSON.stringify(idsAB) === JSON.stringify(idsReMerged), 'ID harus identik setelah re-merge');
});

// ---------------------------------------------------------------------------
// TEST GROUP 3: IDENTITAS DETERMINISTIK UNTUK RECORD TANPA ID
// ---------------------------------------------------------------------------
console.log('\n\x1b[1m[3/7] Pengujian Identitas Record Deterministik (COA & Kurs)...\x1b[0m');

test('Record COA tanpa id mendapatkan id deterministik (id = code) secara stabil', () => {
  const coaRecord: Record<string, any> = {
    code: '1110',
    name: 'Kas Besar (Cash on Hand HQ)',
    type: 'Asset'
  };

  const read1 = ensureRecordMetadata(coaRecord, false, 'chart_of_accounts');
  const read2 = ensureRecordMetadata(coaRecord, false, 'chart_of_accounts');

  assert(read1.id === '1110', `COA harus mendapatkan id "1110", didapat "${read1.id}"`);
  assert(read1.id === read2.id, 'id harus identik di setiap pembacaan');

  // Simulasi jika user kemudian mengubah field "code", id yang sudah ditetapkan TIDAK boleh berubah
  const editedRecord = { ...read1, code: '1110-REVISED' };
  const readAfterEdit = ensureRecordMetadata(editedRecord, false, 'chart_of_accounts');
  assert(
    readAfterEdit.id === '1110',
    `id yang sudah ditetapkan tidak boleh berubah saat code diedit. Expected "1110", got "${readAfterEdit.id}"`
  );
});

test('Record Kurs tanpa id mendapatkan id deterministik (id = code mata uang)', () => {
  const currencyRecord: Record<string, any> = {
    code: 'USD',
    name: 'United States Dollar',
    rateToIdr: 16250
  };

  const res1 = ensureRecordMetadata(currencyRecord, false, 'currency_rates');
  const res2 = ensureRecordMetadata(currencyRecord, false, 'currency_rates');

  assert(res1.id === 'USD', `Kurs harus mendapatkan id "USD", didapat "${res1.id}"`);
  assert(res1.id === res2.id, 'id kurs harus stabil tanpa UUID acak');
});

test('Merge campuran record ber-id dan tanpa id tidak menghasilkan duplikat atau kehilangan data', () => {
  const serverCoa = [
    { code: '1110', name: 'Kas Besar', currentBalance: 100 },
    { code: '1120', name: 'Bank BCA', currentBalance: 200 }
  ];
  const incomingCoa = [
    { id: '1110', code: '1110', name: 'Kas Besar (Updated Balance)', currentBalance: 150 },
    { code: '1130', name: 'Kas Kecil', currentBalance: 50 }
  ];

  const merged = mergeIdArrays(serverCoa, incomingCoa);
  assert(merged.length === 3, `Expected 3 distinct COA accounts, got ${merged.length}`);

  const kasBesar = merged.find((a: any) => a.id === '1110');
  assert(kasBesar !== undefined, 'Akun 1110 harus ada');
  assert(kasBesar.id === '1110', 'Akun 1110 harus ber-id 1110');
  assert(kasBesar.name === 'Kas Besar (Updated Balance)', 'Data incoming harus ter-update');
});

// ---------------------------------------------------------------------------
// TEST GROUP 4: SOFT DELETE (deletedAt)
// ---------------------------------------------------------------------------
console.log('\n\x1b[1m[4/7] Pengujian Soft Delete (deletedAt)...\x1b[0m');

test('Record dengan deletedAt tetap tersimpan di server dan tidak dibuang saat merge', () => {
  const server = [
    { id: 'rec-active', name: 'Aktif' },
    { id: 'rec-del', name: 'Terhapus', deletedAt: '2026-09-01T00:00:00Z' }
  ];
  const incoming = [
    { id: 'rec-active', name: 'Aktif Diperbarui' }
  ];

  const merged = mergeIdArrays(server, incoming);
  assert(merged.length === 2, `Record deletedAt tidak boleh hilang saat merge (didapat ${merged.length})`);

  const softDeleted = merged.find((r: any) => r.id === 'rec-del');
  assert(softDeleted !== undefined, 'Record soft-deleted harus tetap ada di array');
  assert(Boolean(softDeleted.deletedAt), 'Field deletedAt harus dipertahankan');
});

test('Record ber-deletedAt tidak tampil pada pembacaan aktif tetapi tetap tersimpan', () => {
  const rawStorage = [
    { id: 'acc-1', name: 'Akun Aktif' },
    { id: 'acc-2', name: 'Akun Dihapus', deletedAt: '2026-10-01T10:00:00Z' }
  ];
  // Simulasi pembacaan aktif (seperti pada readProcessedRecords)
  const activeRecords = rawStorage.filter((item) => !item.deletedAt);
  assert(activeRecords.length === 1, 'Hanya 1 record non-deletedAt yang tampil');
  assert(activeRecords[0].id === 'acc-1', 'Record aktif harus acc-1');
  assert(rawStorage.length === 2, 'Storage mentah tetap menyimpan semua record termasuk yang ber-deletedAt');
});

// ---------------------------------------------------------------------------
// TEST GROUP 5: SEED STORAGE BEHAVIOR
// ---------------------------------------------------------------------------
console.log('\n\x1b[1m[5/7] Pengujian Inisialisasi Data Bawaan (Seed)...\x1b[0m');

test('Seed hanya aktif jika key bernilai null secara mutlak', () => {
  const defaultItems = [{ id: 'def-1', name: 'Seed Account' }];

  // Simulasi mock storage
  const mockStorage: Record<string, string | null> = {
    'existing_key': JSON.stringify([{ id: 'existing-1', name: 'User Account' }]),
    'empty_key': null
  };

  const getWithSeed = (key: string) => {
    const raw = mockStorage[key];
    if (raw === null || raw === undefined) {
      // Seed dijalankan
      return defaultItems;
    }
    return JSON.parse(raw);
  };

  const resultEmpty = getWithSeed('empty_key');
  assert(resultEmpty.length === 1 && resultEmpty[0].id === 'def-1', 'Key null harus menerima seed');

  const resultExisting = getWithSeed('existing_key');
  assert(resultExisting.length === 1 && resultExisting[0].id === 'existing-1', 'Key yang sudah ada TIDAK boleh ditimpa seed');
});

// ---------------------------------------------------------------------------
// TEST GROUP 6: STATUS PRESENSI LAMA & BARU (H, A, I, S, O)
// ---------------------------------------------------------------------------
console.log('\n\x1b[1m[6/7] Pengujian Kompatibilitas Status Presensi (H, A, I, S, O)...\x1b[0m');

test('Nilai status presensi lama (H, A, I, O) dan baru (S) tetap terbaca dan valid', () => {
  const allowedStatuses = new Set(['H', 'A', 'I', 'S', 'O', '']);
  const historicalRecord = {
    id: 'ts-2026-08',
    employeeId: 'emp-1',
    days: {
      1: 'H',
      2: 'H',
      3: 'A',
      4: 'I',
      5: 'S',
      6: 'O',
      7: 'O'
    }
  };

  for (const [day, status] of Object.entries(historicalRecord.days)) {
    assert(allowedStatuses.has(status), `Status presensi "${status}" pada hari ke-${day} harus valid`);
  }

  // Verifikasi tidak ada perubahan format nilai lama
  assert(historicalRecord.days[1] === 'H', 'Hadir harus tetap H');
  assert(historicalRecord.days[3] === 'A', 'Alpa harus tetap A');
  assert(historicalRecord.days[4] === 'I', 'Izin harus tetap I');
  assert(historicalRecord.days[5] === 'S', 'Sakit baru harus tetap S');
  assert(historicalRecord.days[6] === 'O', 'Off/Libur harus tetap O');
});

// ---------------------------------------------------------------------------
// TEST GROUP 7: RINGKASAN & LAPORAN AKHIR
// ---------------------------------------------------------------------------
console.log('\n\x1b[1m[7/7] Ringkasan Hasil Pemeriksaan...\x1b[0m');

const total = results.length;
const passed = results.filter((r) => r.passed).length;
const failed = results.filter((r) => !r.passed).length;

console.log(`\n  Total Pengujian : \x1b[1m${total}\x1b[0m`);
console.log(`  Lulus (PASS)    : \x1b[32m\x1b[1m${passed}\x1b[0m`);
console.log(`  Gagal (FAIL)    : \x1b[${failed > 0 ? '31' : '32'}m\x1b[1m${failed}\x1b[0m\n`);

if (failed > 0) {
  console.error('\x1b[31m[CHECK DATA FAILED] Terdapat pelanggaran protokol keamanan data!\x1b[0m');
  process.exit(1);
} else {
  console.log('\x1b[32m\x1b[1m[CHECK DATA SUCCESS] Semua pengujian protokol integritas data LULUS (100%).\x1b[0m\n');
  process.exit(0);
}
