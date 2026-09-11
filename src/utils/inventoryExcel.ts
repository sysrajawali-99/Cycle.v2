import * as XLSX from 'xlsx';
import { InventoryItem, InventoryCategory, Project, ProjectStock } from '../types';

export interface BulkParsedInventoryItem {
  raw: {
    code: string;
    name: string;
    category: string;
    unit: string;
    minStock: string;
    unitPrice: string;
    description: string;
    initialStockPerProject: string;
  };
  item: InventoryItem;
  initialStock: number;
  errors: string[];
  warnings: string[];
  isValid: boolean;
}

export const INVENTORY_TEMPLATE_HEADERS = [
  'Kode Barang',
  'Nama Barang / Chemical',
  'Kategori (Chemical/Equipment/Consumable/Safety / APD)',
  'Satuan / Kemasan',
  'Batas Min. Stok (Threshold)',
  'Estimasi Harga Satuan (Rp)',
  'Deskripsi & Spesifikasi Kegunaan',
  'Stok Awal Per Lokasi Proyek (Opsional)'
];

/**
 * Downloads standard Excel (.xlsx) template for master items
 * Features separated columns (A through H) and sample data across all categories
 */
export function downloadInventoryTemplateXLSX() {
  const sampleData = [
    INVENTORY_TEMPLATE_HEADERS,
    [
      'CHM-101',
      'Floor Cleaner Pine 5L',
      'Chemical',
      'Jerigen 5L',
      4,
      75000,
      'Cairan pembersih lantai konsentrat wangi pinus anti kuman & bakteri',
      8
    ],
    [
      'CHM-102',
      'Glass Cleaner Crystal Clear 5L',
      'Chemical',
      'Jerigen 5L',
      3,
      65000,
      'Pembersih kaca kilap cepat kering tanpa meninggalkan bercak noda',
      6
    ],
    [
      'CHM-103',
      'Marble Polishing Powder (Extra 5)',
      'Chemical',
      'Pcs / Can',
      2,
      250000,
      'Bubuk kristalisasi marmer dan granit untuk mengembalikan kilau lantai',
      4
    ],
    [
      'EQP-201',
      'Single Disc Scrubber 17 Inch',
      'Equipment',
      'Unit',
      1,
      8500000,
      'Mesin polisher scrubbing & buffing lantai heavy duty 1100W',
      2
    ],
    [
      'EQP-202',
      'Wet & Dry Vacuum Cleaner 30L',
      'Equipment',
      'Unit',
      1,
      3200000,
      'Mesin penyedot debu & air basah kapasitas 30 liter tangki stainless',
      2
    ],
    [
      'EQP-203',
      'Double Bucket Mop Wringer 46L',
      'Equipment',
      'Unit',
      2,
      450000,
      'Ember pel ganda dengan pemeras air roda heavy duty',
      4
    ],
    [
      'CSM-301',
      'Mop Set Cotton Microfiber',
      'Consumable',
      'Set',
      5,
      85000,
      'Set gagang aluminium dan kain pel katun microfiber serap air tinggi',
      12
    ],
    [
      'CSM-302',
      'Trash Bag Hitam Tebal 80x100 cm',
      'Consumable',
      'Pack (50 pcs)',
      10,
      45000,
      'Plastik sampah ramah lingkungan tebal anti bocor untuk gedung',
      20
    ],
    [
      'CSM-303',
      'Microfiber Cloth Premium (Multi Warna)',
      'Consumable',
      'Pcs',
      15,
      12000,
      'Kain lap microfiber color-coding (Merah toilet, Biru kaca, Kuning meja)',
      30
    ],
    [
      'APD-401',
      'Sarung Tangan Karet Nitrile Heavy Duty',
      'Safety / APD',
      'Pasang',
      10,
      18000,
      'Sarung tangan pelindung kimia tebal untuk petugas toilet dan chemical',
      25
    ],
    [
      'APD-402',
      'Sepatu Boot Safety Karet K3',
      'Safety / APD',
      'Pasang',
      4,
      110000,
      'Sepatu boot anti selip dan anti tembus air untuk area basah dan luar',
      6
    ],
    [
      'APD-403',
      'Kacamata Safety Goggles K3 Clear',
      'Safety / APD',
      'Pcs',
      5,
      25000,
      'Kacamata pelindung mata dari cipratan zat kimia pembersih',
      10
    ]
  ];

  const wb = XLSX.utils.book_new();
  const ws = XLSX.utils.aoa_to_sheet(sampleData);

  // Set explicit column widths for perfect visual display
  ws['!cols'] = [
    { wch: 16 }, // Kolom A: Kode Barang
    { wch: 36 }, // Kolom B: Nama Barang
    { wch: 22 }, // Kolom C: Kategori
    { wch: 20 }, // Kolom D: Satuan
    { wch: 24 }, // Kolom E: Min Stok
    { wch: 24 }, // Kolom F: Estimasi Harga Satuan
    { wch: 55 }, // Kolom G: Deskripsi & Fungsi
    { wch: 30 }  // Kolom H: Stok Awal Per Lokasi
  ];

  XLSX.utils.book_append_sheet(wb, ws, 'Master Barang');

  // Sheet 2: Petunjuk & Standar Kategori
  const guideData = [
    ['PANDUAN PENGISIAN TEMPLATE MASTER BARANG PT RAJAWALI PRIMA SERVICE'],
    [''],
    ['KOLOM', 'NAMA ITEM', 'CONTOH PENGISIAN', 'KETERANGAN VALIDASI'],
    ['Kolom A', 'Kode Barang', 'CHM-101 / EQP-201', 'Kode unik SKU barang (Boleh kosong, sistem akan auto-generate)'],
    ['Kolom B', 'Nama Barang / Chemical', 'Floor Cleaner Pine 5L', 'Wajib diisi (Nama barang & spesifikasi kemasan)'],
    ['Kolom C', 'Kategori', 'Chemical', 'Pilihan wajib: Chemical, Equipment, Consumable, Safety / APD'],
    ['Kolom D', 'Satuan / Kemasan', 'Jerigen 5L / Unit / Pcs', 'Pilihan: Jerigen 5L, Botol 1L, Unit, Pcs, Set, Roll, Pack, Pasang, Can'],
    ['Kolom E', 'Batas Min. Stok', '4', 'Batas kuantitas minimum sebelum sistem membunyikan peringatan Kritis'],
    ['Kolom F', 'Estimasi Harga Satuan (Rp)', '75000', 'Nominal harga pengadaan per satuan tanpa titik/koma'],
    ['Kolom G', 'Deskripsi & Fungsi', 'Pembersih lantai wangi pinus', 'Keterangan peruntukan, SOP pemakaian, atau area kerja'],
    ['Kolom H', 'Stok Awal Per Lokasi', '10', 'Kuantitas stok awal yang otomatis dialokasikan ke lokasi proyek (opsional)']
  ];

  const guideWs = XLSX.utils.aoa_to_sheet(guideData);
  guideWs['!cols'] = [
    { wch: 12 },
    { wch: 26 },
    { wch: 28 },
    { wch: 60 }
  ];
  XLSX.utils.book_append_sheet(wb, guideWs, 'Petunjuk & Validasi');

  XLSX.writeFile(wb, 'Template_Upload_Master_Barang_PT_Rajawali.xlsx');
}

/**
 * Downloads CSV template with specific delimiter
 */
export function downloadInventoryTemplateCSV(delimiter: ';' | ',' = ';') {
  const rows = [
    INVENTORY_TEMPLATE_HEADERS,
    [
      'CHM-101',
      'Floor Cleaner Pine 5L',
      'Chemical',
      'Jerigen 5L',
      '4',
      '75000',
      'Cairan pembersih lantai konsentrat wangi pinus anti kuman',
      '8'
    ],
    [
      'EQP-201',
      'Single Disc Scrubber 17 Inch',
      'Equipment',
      'Unit',
      '1',
      '8500000',
      'Mesin polisher scrubbing & buffing lantai heavy duty 1100W',
      '2'
    ],
    [
      'CSM-301',
      'Mop Set Cotton Microfiber',
      'Consumable',
      'Set',
      '5',
      '85000',
      'Set gagang aluminium dan kain pel katun microfiber serap tinggi',
      '10'
    ],
    [
      'APD-401',
      'Sarung Tangan Karet Nitrile',
      'Safety / APD',
      'Pasang',
      '10',
      '18000',
      'Sarung tangan pelindung kimia tebal untuk petugas toilet & sanitasi',
      '20'
    ]
  ];

  const escapeCell = (val: string | number) => {
    let str = val === null || val === undefined ? '' : String(val);
    if (str.includes(delimiter) || str.includes('"') || str.includes('\n')) {
      str = `"${str.replace(/"/g, '""')}"`;
    }
    return str;
  };

  const csvBody = rows.map((r) => r.map(escapeCell).join(delimiter)).join('\r\n');
  const blob = new Blob(['\uFEFF' + csvBody], { type: 'text/csv;charset=utf-8;' });
  const url = URL.createObjectURL(blob);
  const link = document.createElement('a');
  link.setAttribute('href', url);
  link.setAttribute('download', `Template_Upload_Master_Barang_${delimiter === ';' ? 'Excel_Indonesia' : 'Standard'}.csv`);
  document.body.appendChild(link);
  link.click();
  document.body.removeChild(link);
  URL.revokeObjectURL(url);
}

/**
 * Export current master inventory catalog to Excel .xlsx
 */
export function exportMasterInventoryToXLSX(
  items: InventoryItem[],
  projectStocks: ProjectStock[],
  projects: Project[]
) {
  const headers = [
    'No',
    'Kode Barang',
    'Nama Barang / Chemical',
    'Kategori',
    'Satuan / Kemasan',
    'Min. Stok Aman',
    'Harga Satuan (Rp)',
    'Total Stok Seluruh Lokasi',
    'Status Ketersediaan Global',
    'Deskripsi & Spesifikasi'
  ];

  const dataRows = items.map((item, index) => {
    // calculate total stock across all projects
    const totalStock = projectStocks
      .filter((ps) => ps.itemId === item.id)
      .reduce((sum, ps) => sum + ps.currentStock, 0);

    const isGlobalCritical = totalStock <= item.minStock * (projects.length || 1);

    return [
      index + 1,
      item.code,
      item.name,
      item.category,
      item.unit,
      item.minStock,
      item.unitPrice,
      totalStock,
      isGlobalCritical ? 'Perlu Restock' : 'Stok Aman',
      item.description
    ];
  });

  const wb = XLSX.utils.book_new();
  const ws = XLSX.utils.aoa_to_sheet([headers, ...dataRows]);

  ws['!cols'] = [
    { wch: 6 },
    { wch: 16 },
    { wch: 35 },
    { wch: 18 },
    { wch: 18 },
    { wch: 16 },
    { wch: 20 },
    { wch: 24 },
    { wch: 24 },
    { wch: 45 }
  ];

  XLSX.utils.book_append_sheet(wb, ws, 'Katalog Master Barang');
  XLSX.writeFile(wb, `Katalog_Master_Barang_PT_Rajawali_${new Date().toISOString().split('T')[0]}.xlsx`);
}

/**
 * Universal Parser for Excel (.xlsx, .xls) and CSV (.csv, .txt) files for master items
 */
export async function parseInventoryFile(file: File): Promise<BulkParsedInventoryItem[]> {
  const fileName = file.name.toLowerCase();
  let rawRows: (string | number)[][] = [];

  if (fileName.endsWith('.xlsx') || fileName.endsWith('.xls')) {
    const buffer = await file.arrayBuffer();
    const workbook = XLSX.read(buffer, { type: 'array' });
    const firstSheetName = workbook.SheetNames[0];
    if (!firstSheetName) {
      throw new Error('File Excel tidak memiliki lembar kerja (worksheet).');
    }
    const worksheet = workbook.Sheets[firstSheetName];
    rawRows = XLSX.utils.sheet_to_json(worksheet, { header: 1, defval: '' }) as (string | number)[][];
  } else {
    const text = await file.text();
    rawRows = parseCSVMultiDelimiter(text);
  }

  // Filter out empty rows
  const cleanRows = rawRows.filter((r) => r.some((c) => String(c).trim() !== ''));

  if (cleanRows.length < 2) {
    throw new Error('File harus memiliki baris judul kolom (header) dan minimal 1 baris data barang.');
  }

  const headerRow = cleanRows[0].map((h) => String(h).toLowerCase().replace(/[^a-z0-9]/g, ''));
  const dataRows = cleanRows.slice(1);

  // Helper to find column index by keywords
  const findColIdx = (keywords: string[]) => {
    return headerRow.findIndex((h) => keywords.some((k) => h.includes(k)));
  };

  const codeIdx = findColIdx(['kode', 'code', 'sku', 'id', 'barcode']);
  const nameIdx = findColIdx(['nama', 'name', 'barang', 'item', 'produk', 'chemical', 'alat']);
  const catIdx = findColIdx(['kategori', 'category', 'jenis', 'tipe', 'group']);
  const unitIdx = findColIdx(['satuan', 'unit', 'kemasan', 'uom', 'ukuran']);
  const minStockIdx = findColIdx(['min', 'minimum', 'threshold', 'batas', 'safetystock']);
  const priceIdx = findColIdx(['harga', 'price', 'tarif', 'biaya', 'cost', 'unitprice', 'rp']);
  const descIdx = findColIdx(['deskripsi', 'description', 'keterangan', 'fungsi', 'spesifikasi', 'notes']);
  const initStockIdx = findColIdx(['stok', 'stock', 'awal', 'initial', 'saldo', 'qty']);

  return dataRows.map((row, idx) => {
    const errors: string[] = [];
    const warnings: string[] = [];

    const getVal = (mappedIdx: number, defaultIndex: number): string => {
      const idxToUse = mappedIdx >= 0 ? mappedIdx : defaultIndex;
      const v = row[idxToUse];
      return v === null || v === undefined ? '' : String(v).trim();
    };

    // 1. Column B / Name: Nama Barang (Required)
    const rawName = getVal(nameIdx, 1);
    if (!rawName) {
      errors.push('Nama Barang (Kolom B) wajib diisi.');
    }

    // 2. Column C / Category: Kategori
    const rawCat = getVal(catIdx, 2);
    const catVal = rawCat.toLowerCase();
    let matchedCategory: InventoryCategory = 'Chemical';
    if (catVal.includes('equip') || catVal.includes('alat') || catVal.includes('mesin')) {
      matchedCategory = 'Equipment';
    } else if (catVal.includes('consum') || catVal.includes('habis') || catVal.includes('plastik') || catVal.includes('lap')) {
      matchedCategory = 'Consumable';
    } else if (catVal.includes('safe') || catVal.includes('apd') || catVal.includes('k3') || catVal.includes('pelindung')) {
      matchedCategory = 'Safety / APD';
    } else if (catVal.includes('chem') || catVal.includes('kimia') || catVal.includes('cairan')) {
      matchedCategory = 'Chemical';
    } else if (rawCat) {
      matchedCategory = 'Chemical';
      warnings.push(`Kategori '${rawCat}' tidak standar, dialihkan ke Chemical.`);
    }

    // 3. Column A / Code: Kode Barang
    let rawCode = getVal(codeIdx, 0);
    if (!rawCode) {
      const prefix =
        matchedCategory === 'Chemical'
          ? 'CHM'
          : matchedCategory === 'Equipment'
          ? 'EQP'
          : matchedCategory === 'Consumable'
          ? 'CSM'
          : 'APD';
      rawCode = `${prefix}-${Math.floor(100 + idx * 5 + Math.random() * 89)}`;
      warnings.push(`Kode otomatis dibuat: ${rawCode}`);
    }

    // 4. Column D / Unit: Satuan / Kemasan
    let rawUnit = getVal(unitIdx, 3);
    if (!rawUnit) {
      rawUnit =
        matchedCategory === 'Chemical'
          ? 'Jerigen 5L'
          : matchedCategory === 'Equipment'
          ? 'Unit'
          : matchedCategory === 'Consumable'
          ? 'Pcs'
          : 'Pasang';
    }

    // 5. Column E / Min Stock: Batas Minimum
    const rawMinStock = getVal(minStockIdx, 4);
    const cleanedMinStock = Number(rawMinStock.replace(/[^0-9]/g, ''));
    const finalMinStock = cleanedMinStock > 0 ? cleanedMinStock : (matchedCategory === 'Equipment' ? 1 : 4);

    // 6. Column F / Unit Price: Harga Satuan
    const rawPrice = getVal(priceIdx, 5);
    const cleanedPrice = Number(rawPrice.replace(/[^0-9]/g, ''));
    const finalPrice = cleanedPrice > 0 ? cleanedPrice : (matchedCategory === 'Chemical' ? 75000 : matchedCategory === 'Equipment' ? 2500000 : 25000);

    // 7. Column G / Description: Deskripsi & Fungsi
    let rawDesc = getVal(descIdx, 6);
    if (!rawDesc) {
      rawDesc = `Standarisasi ${matchedCategory} untuk operasional gedung PT Rajawali`;
    }

    // 8. Column H / Initial Stock: Stok Awal (Opsional)
    const rawInitStock = getVal(initStockIdx, 7);
    const cleanedInitStock = Number(rawInitStock.replace(/[^0-9]/g, ''));
    const finalInitStock = !isNaN(cleanedInitStock) && cleanedInitStock >= 0 ? cleanedInitStock : 0;

    const generatedItem: InventoryItem = {
      id: `item-bulk-${Date.now()}-${idx}`,
      code: rawCode,
      name: rawName,
      category: matchedCategory,
      unit: rawUnit,
      minStock: finalMinStock,
      description: rawDesc,
      unitPrice: finalPrice
    };

    return {
      raw: {
        code: rawCode,
        name: rawName,
        category: rawCat || matchedCategory,
        unit: rawUnit,
        minStock: String(finalMinStock),
        unitPrice: String(finalPrice),
        description: rawDesc,
        initialStockPerProject: String(finalInitStock)
      },
      item: generatedItem,
      initialStock: finalInitStock,
      errors,
      warnings,
      isValid: errors.length === 0
    };
  });
}

/**
 * Multi-delimiter CSV parser with quote escaping support
 */
function parseCSVMultiDelimiter(text: string): string[][] {
  let cleanText = text.replace(/^\uFEFF/, '').trim();
  if (!cleanText) return [];

  let forcedDelimiter: string | null = null;
  const firstLineBreak = cleanText.indexOf('\n');
  const firstLine = firstLineBreak >= 0 ? cleanText.substring(0, firstLineBreak).trim() : cleanText;
  if (firstLine.toLowerCase().startsWith('sep=')) {
    forcedDelimiter = firstLine.substring(4).trim();
    cleanText = cleanText.substring(firstLineBreak + 1).trim();
  }

  const delimiter = forcedDelimiter || detectDelimiter(cleanText);

  const lines: string[] = [];
  let currentLine = '';
  let inQuotes = false;

  for (let i = 0; i < cleanText.length; i++) {
    const char = cleanText[i];
    const nextChar = cleanText[i + 1];

    if (char === '"') {
      if (inQuotes && nextChar === '"') {
        currentLine += '"';
        i++;
      } else {
        inQuotes = !inQuotes;
      }
    } else if ((char === '\r' || char === '\n') && !inQuotes) {
      if (currentLine.trim()) {
        lines.push(currentLine);
      }
      currentLine = '';
      if (char === '\r' && nextChar === '\n') {
        i++;
      }
    } else {
      currentLine += char;
    }
  }
  if (currentLine.trim()) {
    lines.push(currentLine);
  }

  return lines.map((line) => {
    const cells: string[] = [];
    let cell = '';
    let quote = false;

    for (let j = 0; j < line.length; j++) {
      const c = line[j];
      const next = line[j + 1];

      if (c === '"') {
        if (quote && next === '"') {
          cell += '"';
          j++;
        } else {
          quote = !quote;
        }
      } else if (c === delimiter && !quote) {
        cells.push(cell.trim());
        cell = '';
      } else {
        cell += c;
      }
    }
    cells.push(cell.trim());
    return cells;
  });
}

function detectDelimiter(text: string): string {
  const sample = text.split('\n').slice(0, 5).join('\n');
  const counts = {
    ';': (sample.match(/;/g) || []).length,
    ',': (sample.match(/,/g) || []).length,
    '\t': (sample.match(/\t/g) || []).length,
    '|': (sample.match(/\|/g) || []).length
  };

  let maxDelim = ';';
  let maxCount = -1;

  for (const [delim, count] of Object.entries(counts)) {
    if (count > maxCount) {
      maxCount = count;
      maxDelim = delim;
    }
  }

  return maxCount > 0 ? maxDelim : ';';
}

// =============================================================================
// STOK LOKASI PROYEK (STOCK OPNAME & BULK UPLOAD)
// =============================================================================

export const LOCATION_STOCK_TEMPLATE_HEADERS = [
  'Kode Barang',
  'Nama Barang',
  'Kategori',
  'Satuan',
  'Min. Stok',
  'Sisa Stok Saat Ini'
];

/**
 * Downloads Excel (.xlsx) template for Stock at Project Location (Stok Lokasi)
 * with dedicated, separate columns for Kode Barang, Nama Barang, Kategori, Satuan, Min. Stok, Sisa Stok Saat Ini
 * (ensuring no comma-separated single columns).
 */
export function downloadLocationStockTemplateXLSX(
  projectName: string,
  items: InventoryItem[],
  projectStocks: ProjectStock[],
  projectId: string
) {
  const headers = LOCATION_STOCK_TEMPLATE_HEADERS;

  // Pre-populate with existing items in this project location
  const rows = items.map((item) => {
    const pStock = projectStocks.find((ps) => ps.itemId === item.id && ps.projectId === projectId);
    const currentStock = pStock ? pStock.currentStock : 0;
    return [
      item.code,
      item.name,
      item.category,
      item.unit,
      item.minStock,
      currentStock
    ];
  });

  // If no items in catalog, provide sample data with separate columns
  const dataRows =
    rows.length > 0
      ? rows
      : [
          ['CHM-101', 'Floor Cleaner Pine 5L', 'Chemical', 'Jerigen 5L', 4, 8],
          ['EQP-201', 'Single Disc Scrubber 17 Inch', 'Equipment', 'Unit', 1, 2],
          ['CSM-301', 'Mop Set Cotton Microfiber', 'Consumable', 'Set', 5, 12],
          ['APD-401', 'Sarung Tangan Karet Nitrile', 'Safety / APD', 'Pasang', 10, 25]
        ];

  const wb = XLSX.utils.book_new();
  const ws = XLSX.utils.aoa_to_sheet([headers, ...dataRows]);

  // Set explicit column widths for each of the 6 distinct columns
  ws['!cols'] = [
    { wch: 16 }, // Kolom A: Kode Barang
    { wch: 38 }, // Kolom B: Nama Barang
    { wch: 20 }, // Kolom C: Kategori
    { wch: 18 }, // Kolom D: Satuan
    { wch: 16 }, // Kolom E: Min. Stok
    { wch: 24 }  // Kolom F: Sisa Stok Saat Ini
  ];

  XLSX.utils.book_append_sheet(wb, ws, 'Stok Lokasi');

  // Sheet 2: Petunjuk & Panduan Validasi Kolom
  const guideData = [
    ['PANDUAN TEMPLATE EXCEL STOK LOKASI PROYEK (STOCK OPNAME)'],
    ['Lokasi Proyek:', projectName || 'Semua Lokasi'],
    ['Tanggal Dibuat:', new Date().toISOString().split('T')[0]],
    [''],
    ['KOLOM', 'NAMA HEADER', 'DESKRIPSI', 'PANDUAN PENGISIAN'],
    ['Kolom A', 'Kode Barang', 'Kode SKU unik barang di katalog', 'Contoh: CHM-101. Sistem mencocokkan otomatis berdasarkan kode ini.'],
    ['Kolom B', 'Nama Barang', 'Nama barang / chemical', 'Contoh: Floor Cleaner Pine 5L.'],
    ['Kolom C', 'Kategori', 'Kelompok barang', 'Chemical, Equipment, Consumable, Safety / APD.'],
    ['Kolom D', 'Satuan', 'Satuan kemasan', 'Jerigen 5L, Unit, Pcs, Set, Pasang, Botol 1L.'],
    ['Kolom E', 'Min. Stok', 'Batas minimum persediaan', 'Batas angka peringatan stok kritis.'],
    ['Kolom F', 'Sisa Stok Saat Ini', 'Kuantitas fisik riil di lokasi', 'MASUKKAN HASIL HITUNGAN FISIK DI SINI. Masukkan angka bulat (Contoh: 15).'],
    [''],
    ['INSTRUKSI PENTING:'],
    ['1. Semua data berada pada kolom masing-masing (Kolom A s/d Kolom F), BUKAN dalam satu kolom yang dipisahkan koma.'],
    ['2. Anda cukup memperbarui angka pada Kolom F (Sisa Stok Saat Ini) sesuai hasil stock opname fisik.'],
    ['3. Simpan file ini sebagai .xlsx, kemudian buka menu Stok Lokasi lalu klik tombol "Upload Masal Stok Lokasi".']
  ];

  const guideWs = XLSX.utils.aoa_to_sheet(guideData);
  guideWs['!cols'] = [{ wch: 12 }, { wch: 22 }, { wch: 34 }, { wch: 70 }];
  XLSX.utils.book_append_sheet(wb, guideWs, 'Petunjuk Pengisian');

  const safeProj = (projectName || 'Lokasi').replace(/[^a-zA-Z0-9]/g, '_');
  XLSX.writeFile(
    wb,
    `Template_Stok_Lokasi_${safeProj}_${new Date().toISOString().split('T')[0]}.xlsx`
  );
}

export interface ParsedLocationStockRow {
  rowIndex: number;
  code: string;
  name: string;
  category: string;
  unit: string;
  minStock: number;
  currentStockInSystem: number;
  newStock: number;
  difference: number;
  matchedItemId?: string;
  status: 'MATCHED' | 'NEW_ITEM' | 'INVALID';
  message: string;
}

/**
 * Universal Parser for Location Stock Bulk Upload (.xlsx, .xls, .csv)
 * Maps Kode Barang, Nama Barang, Kategori, Satuan, Min. Stok, Sisa Stok Saat Ini
 */
export async function parseLocationStockFile(
  file: File,
  items: InventoryItem[],
  projectStocks: ProjectStock[],
  projectId: string
): Promise<ParsedLocationStockRow[]> {
  const fileName = file.name.toLowerCase();
  let rawRows: (string | number)[][] = [];

  if (fileName.endsWith('.xlsx') || fileName.endsWith('.xls')) {
    const buffer = await file.arrayBuffer();
    const workbook = XLSX.read(buffer, { type: 'array' });
    const firstSheetName = workbook.SheetNames[0];
    if (!firstSheetName) {
      throw new Error('File Excel tidak memiliki lembar kerja (worksheet) yang dapat dibaca.');
    }
    const worksheet = workbook.Sheets[firstSheetName];
    rawRows = XLSX.utils.sheet_to_json(worksheet, { header: 1, defval: '' }) as (string | number)[][];
  } else {
    const text = await file.text();
    rawRows = parseCSVMultiDelimiter(text);
  }

  // Filter out empty rows
  const cleanRows = rawRows.filter((r) => r.some((c) => String(c).trim() !== ''));
  if (cleanRows.length < 2) {
    throw new Error('File harus memiliki baris header dan minimal 1 baris data stok barang.');
  }

  const headerRow = cleanRows[0].map((h) => String(h).toLowerCase().replace(/[^a-z0-9]/g, ''));
  const dataRows = cleanRows.slice(1);

  // Column finder
  const findCol = (keywords: string[]) =>
    headerRow.findIndex((h) => keywords.some((k) => h.includes(k)));

  const codeIdx = findCol(['kode', 'code', 'sku', 'id']);
  const nameIdx = findCol(['nama', 'name', 'barang', 'item', 'chemical']);
  const catIdx = findCol(['kategori', 'category', 'jenis']);
  const unitIdx = findCol(['satuan', 'unit', 'kemasan']);
  const minStockIdx = findCol(['min', 'minimum']);
  // Stock keywords: sisa, saat ini, stok, saldo, fisik, opname, qty
  const stockIdx = findCol([
    'sisa',
    'sisastok',
    'saatini',
    'stoksaatini',
    'sisastoksaatini',
    'stok',
    'stock',
    'fisik',
    'qty',
    'saldo',
    'opname'
  ]);

  return dataRows.map((row, idx) => {
    const getVal = (col: number, fallback: number) => {
      const i = col >= 0 ? col : fallback;
      const v = row[i];
      return v === null || v === undefined ? '' : String(v).trim();
    };

    const rawCode = getVal(codeIdx, 0);
    const rawName = getVal(nameIdx, 1);
    const rawCat = getVal(catIdx, 2) || 'Chemical';
    const rawUnit = getVal(unitIdx, 3) || 'Pcs';
    const rawMin = getVal(minStockIdx, 4);
    const rawStock = getVal(stockIdx, 5);

    // Clean numeric values
    const cleanedStock = Number(String(rawStock).replace(/[^0-9.-]/g, ''));
    const finalNewStock = isNaN(cleanedStock) ? 0 : Math.max(0, Math.round(cleanedStock));

    const cleanedMin = Number(String(rawMin).replace(/[^0-9]/g, ''));
    const finalMinStock = isNaN(cleanedMin) || cleanedMin <= 0 ? 4 : cleanedMin;

    // Match with existing item
    let matchedItem = items.find(
      (it) => rawCode && it.code.trim().toLowerCase() === rawCode.trim().toLowerCase()
    );
    if (!matchedItem && rawName) {
      matchedItem = items.find(
        (it) => it.name.trim().toLowerCase() === rawName.trim().toLowerCase()
      );
    }

    const currentStockRecord = matchedItem
      ? projectStocks.find((ps) => ps.itemId === matchedItem!.id && ps.projectId === projectId)
      : undefined;
    const currentStockInSystem = currentStockRecord ? currentStockRecord.currentStock : 0;
    const difference = finalNewStock - currentStockInSystem;

    let status: 'MATCHED' | 'NEW_ITEM' | 'INVALID' = 'MATCHED';
    let message = 'Item cocok dengan master barang.';

    if (!rawName && !rawCode) {
      status = 'INVALID';
      message = 'Baris tidak memiliki nama atau kode barang.';
    } else if (!matchedItem) {
      status = 'NEW_ITEM';
      message = 'Item belum ada di master (akan didaftarkan otomatis).';
    } else {
      if (difference > 0) {
        message = `Penambahan stok fisik: +${difference} ${matchedItem.unit}`;
      } else if (difference < 0) {
        message = `Pengurangan stok fisik: ${difference} ${matchedItem.unit}`;
      } else {
        message = 'Stok sama dengan sistem (selisih 0).';
      }
    }

    return {
      rowIndex: idx + 2,
      code: matchedItem ? matchedItem.code : (rawCode || `ITEM-${idx + 1}`),
      name: matchedItem ? matchedItem.name : (rawName || 'Item Tanpa Nama'),
      category: matchedItem ? matchedItem.category : rawCat,
      unit: matchedItem ? matchedItem.unit : rawUnit,
      minStock: matchedItem ? matchedItem.minStock : finalMinStock,
      currentStockInSystem,
      newStock: finalNewStock,
      difference,
      matchedItemId: matchedItem?.id,
      status,
      message
    };
  });
}
