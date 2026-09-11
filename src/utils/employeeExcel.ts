import * as XLSX from 'xlsx';
import { Employee, Project, EmployeePosition, ShiftType, EmployeeStatus } from '../types';

export interface BulkParsedEmployee {
  raw: {
    name: string;
    nik: string;
    phone: string;
    position: string;
    project: string;
    shift: string;
    rate: string;
    status: string;
    joinDate: string;
    uniform: string;
    bank: string;
    account: string;
  };
  employee: Employee;
  errors: string[];
  warnings: string[];
  isValid: boolean;
}

const TEMPLATE_HEADERS = [
  'Nama Lengkap',
  'NIK (Nomor Induk Karyawan)',
  'No Handphone / WA',
  'Posisi / Jabatan',
  'Lokasi Proyek',
  'Shift Kerja',
  'Rate Harian (Rp)',
  'Status Keaktifan',
  'Tanggal Bergabung (YYYY-MM-DD)',
  'Ukuran Seragam (S/M/L/XL/XXL)',
  'Nama Bank',
  'Nomor Rekening'
];

/**
 * Generates and downloads native Excel .xlsx file
 * Each item is guaranteed to be in its own separate column cell (A to L)
 */
export function downloadEmployeeTemplateXLSX(projects: Project[]) {
  const projNames = projects.map((p) => p.name);
  const p1 = projNames[0] || 'Mall Gandaria City';
  const p2 = projNames[1] || 'RS Medika Utama';
  const p3 = projNames[2] || 'Menara Bintang Tower';
  const p4 = projNames[3] || 'Senopati Park Residence';
  const p5 = projNames[4] || 'Kawasan Industri Jababeka';

  const sampleData = [
    TEMPLATE_HEADERS,
    [
      'Ahmad Supriyadi',
      'RC-2026101',
      '081234567890',
      'Cleaner',
      p1,
      'Pagi (06:00 - 14:00)',
      130000,
      'Aktif',
      '2026-01-15',
      'L',
      'BCA',
      '8830192831'
    ],
    [
      'Budi Santoso',
      'RC-2026102',
      '081398765432',
      'Team Leader',
      p2,
      'Siang (14:00 - 22:00)',
      150000,
      'Aktif',
      '2026-02-01',
      'XL',
      'Mandiri',
      '1220098765432'
    ],
    [
      'Siti Rahayu',
      'RC-2026103',
      '085712345678',
      'Cleaner',
      p1,
      'Pagi (06:00 - 14:00)',
      130000,
      'Aktif',
      '2026-03-10',
      'M',
      'BRI',
      '012301009876504'
    ],
    [
      'Dedi Kusuma',
      'RC-2026104',
      '082199887766',
      'Floor Specialist',
      p3,
      'General (08:00 - 17:00)',
      160000,
      'Aktif',
      '2026-01-20',
      'L',
      'BNI',
      '0987654321'
    ],
    [
      'Rahmat Hidayat',
      'RC-2026105',
      '081877665544',
      'Gardener',
      p4,
      'Pagi (06:00 - 14:00)',
      135000,
      'Aktif',
      '2026-02-15',
      'L',
      'BCA',
      '7766554433'
    ],
    [
      'Hendro Wijaya',
      'RC-2026106',
      '081900112233',
      'Gondola / Facade Cleaner',
      p5,
      'Pagi (06:00 - 14:00)',
      175000,
      'Aktif',
      '2026-01-10',
      'XL',
      'BCA',
      '5544332211'
    ],
    [
      'Surya Pratama',
      'RC-2026107',
      '081299881122',
      'Supervisor',
      p1,
      'General (08:00 - 17:00)',
      200000,
      'Aktif',
      '2025-11-01',
      'XL',
      'Mandiri',
      '998877665544'
    ]
  ];

  const wb = XLSX.utils.book_new();
  const ws = XLSX.utils.aoa_to_sheet(sampleData);

  // Set explicit column widths for perfect display in Excel
  ws['!cols'] = [
    { wch: 26 }, // Kolom A: Nama Lengkap
    { wch: 20 }, // Kolom B: NIK
    { wch: 18 }, // Kolom C: No HP
    { wch: 24 }, // Kolom D: Posisi
    { wch: 32 }, // Kolom E: Lokasi Proyek
    { wch: 24 }, // Kolom F: Shift
    { wch: 18 }, // Kolom G: Rate Harian
    { wch: 16 }, // Kolom H: Status
    { wch: 24 }, // Kolom I: Tanggal Join
    { wch: 22 }, // Kolom J: Seragam
    { wch: 15 }, // Kolom K: Bank
    { wch: 22 }  // Kolom L: No Rekening
  ];

  XLSX.utils.book_append_sheet(wb, ws, 'Data Karyawan');

  // Add Guide Sheet
  const guideData = [
    ['PANDUAN PENGISIAN TEMPLATE DATA KARYAWAN PT RAJAWALI PRIMA SERVICE'],
    [''],
    ['KOLOM', 'NAMA ITEM', 'CONTOH PENGISIAN', 'KETERANGAN'],
    ['Kolom A', 'Nama Lengkap', 'Ahmad Supriyadi', 'Wajib diisi (Nama lengkap personil)'],
    ['Kolom B', 'NIK', 'RC-2026101', 'Nomor Induk Karyawan / ID unik (Boleh dikosongkan untuk auto-generate)'],
    ['Kolom C', 'No Handphone / WA', '081234567890', 'Nomor kontak aktif WhatsApp'],
    ['Kolom D', 'Posisi / Jabatan', 'Cleaner', 'Pilihan: Cleaner, Team Leader, Floor Specialist, Gardener, Gondola / Facade Cleaner, Supervisor'],
    ['Kolom E', 'Lokasi Proyek', p1, 'Nama gedung / proyek penempatan yang terdaftar'],
    ['Kolom F', 'Shift Kerja', 'Pagi (06:00 - 14:00)', 'Pilihan: Pagi (06:00 - 14:00), Siang (14:00 - 22:00), Malam (22:00 - 06:00), General (08:00 - 17:00)'],
    ['Kolom G', 'Rate Harian (Rp)', '130000', 'Nominal upah harian tanpa titik/koma (cth: 130000)'],
    ['Kolom H', 'Status Keaktifan', 'Aktif', 'Pilihan: Aktif, Cuti, Mutasi, Resign'],
    ['Kolom I', 'Tanggal Bergabung', '2026-01-15', 'Format standar YYYY-MM-DD'],
    ['Kolom J', 'Ukuran Seragam', 'L', 'Pilihan: S, M, L, XL, XXL'],
    ['Kolom K', 'Nama Bank', 'BCA', 'Bank payroll transfer (BCA, Mandiri, BRI, BNI, BSI, dll)'],
    ['Kolom L', 'Nomor Rekening', '8830192831', 'Nomor rekening tabungan karyawan']
  ];

  const guideWs = XLSX.utils.aoa_to_sheet(guideData);
  guideWs['!cols'] = [
    { wch: 12 },
    { wch: 22 },
    { wch: 30 },
    { wch: 55 }
  ];
  XLSX.utils.book_append_sheet(wb, guideWs, 'Petunjuk & Validasi');

  XLSX.writeFile(wb, 'Template_Upload_Karyawan_PT_Rajawali.xlsx');
}

/**
 * Downloads CSV template with specific delimiter
 * Uses UTF-8 BOM (\uFEFF) for Excel compatibility
 */
export function downloadEmployeeTemplateCSV(projects: Project[], delimiter: ';' | ',' = ';') {
  const p1 = projects[0]?.name || 'Mall Gandaria City';
  const p2 = projects[1]?.name || 'RS Medika Utama';
  const p3 = projects[2]?.name || 'Menara Bintang Tower';

  const rows = [
    TEMPLATE_HEADERS,
    [
      'Ahmad Supriyadi',
      'RC-2026101',
      '081234567890',
      'Cleaner',
      p1,
      'Pagi (06:00 - 14:00)',
      '130000',
      'Aktif',
      '2026-01-15',
      'L',
      'BCA',
      '8830192831'
    ],
    [
      'Budi Santoso',
      'RC-2026102',
      '081398765432',
      'Team Leader',
      p2,
      'Siang (14:00 - 22:00)',
      '150000',
      'Aktif',
      '2026-02-01',
      'XL',
      'Mandiri',
      '1220098765432'
    ],
    [
      'Dedi Kusuma',
      'RC-2026104',
      '082199887766',
      'Floor Specialist',
      p3,
      'General (08:00 - 17:00)',
      '160000',
      'Aktif',
      '2026-01-20',
      'L',
      'BNI',
      '0987654321'
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
  link.setAttribute('download', `Template_Upload_Karyawan_${delimiter === ';' ? 'Excel_Indonesia' : 'Standard'}.csv`);
  document.body.appendChild(link);
  link.click();
  document.body.removeChild(link);
  URL.revokeObjectURL(url);
}

/**
 * Export current employees into Excel .xlsx
 */
export function exportEmployeesToXLSX(employees: Employee[], projects: Project[]) {
  const headers = [
    'No',
    'NIK',
    'Nama Lengkap',
    'No Handphone',
    'Posisi / Jabatan',
    'Lokasi Proyek',
    'Kode Proyek',
    'Shift Kerja',
    'Rate Harian (Rp)',
    'Status',
    'Tanggal Bergabung',
    'Ukuran Seragam',
    'Nama Bank',
    'Nomor Rekening'
  ];

  const dataRows = employees.map((emp, index) => {
    const proj = projects.find((p) => p.id === emp.projectId);
    return [
      index + 1,
      emp.nik,
      emp.name,
      emp.phone,
      emp.position,
      proj?.name || emp.projectId,
      proj?.code || '',
      emp.shift,
      emp.dailyRate,
      emp.status,
      emp.joinDate,
      emp.uniformSize,
      emp.bankName,
      emp.bankAccount
    ];
  });

  const wb = XLSX.utils.book_new();
  const ws = XLSX.utils.aoa_to_sheet([headers, ...dataRows]);

  ws['!cols'] = [
    { wch: 6 },
    { wch: 18 },
    { wch: 25 },
    { wch: 18 },
    { wch: 22 },
    { wch: 30 },
    { wch: 14 },
    { wch: 24 },
    { wch: 16 },
    { wch: 12 },
    { wch: 18 },
    { wch: 16 },
    { wch: 14 },
    { wch: 20 }
  ];

  XLSX.utils.book_append_sheet(wb, ws, 'Roster Karyawan');
  XLSX.writeFile(wb, `Data_Karyawan_PT_Rajawali_${new Date().toISOString().split('T')[0]}.xlsx`);
}

/**
 * Universal Parser for Excel (.xlsx, .xls) and CSV (.csv, .txt, .tsv)
 */
export async function parseEmployeeFile(
  file: File,
  projects: Project[]
): Promise<BulkParsedEmployee[]> {
  const fileName = file.name.toLowerCase();
  let rawRows: (string | number)[][] = [];

  if (fileName.endsWith('.xlsx') || fileName.endsWith('.xls')) {
    // Parse Native Excel
    const buffer = await file.arrayBuffer();
    const workbook = XLSX.read(buffer, { type: 'array' });
    const firstSheetName = workbook.SheetNames[0];
    if (!firstSheetName) {
      throw new Error('File Excel tidak memiliki lembar kerja (worksheet).');
    }
    const worksheet = workbook.Sheets[firstSheetName];
    rawRows = XLSX.utils.sheet_to_json(worksheet, { header: 1, defval: '' }) as (string | number)[][];
  } else {
    // Parse CSV or Text
    const text = await file.text();
    rawRows = parseCSVMultiDelimiter(text);
  }

  // Filter out empty rows
  const cleanRows = rawRows.filter((r) => r.some((c) => String(c).trim() !== ''));

  if (cleanRows.length < 2) {
    throw new Error('File harus memiliki baris header dan minimal 1 baris data karyawan.');
  }

  const headerRow = cleanRows[0].map((h) => String(h).toLowerCase().replace(/[^a-z0-9]/g, ''));
  const dataRows = cleanRows.slice(1);

  // Helper to find column index by keywords
  const findColIdx = (keywords: string[]) => {
    return headerRow.findIndex((h) => keywords.some((k) => h.includes(k)));
  };

  const nameIdx = findColIdx(['nama', 'name', 'lengkap', 'karyawan', 'personil']);
  const nikIdx = findColIdx(['nik', 'id', 'kode', 'nomorinduk']);
  const phoneIdx = findColIdx(['hp', 'phone', 'telp', 'kontak', 'wa', 'handphone']);
  const posIdx = findColIdx(['posisi', 'position', 'jabatan', 'role', 'tugas']);
  const projIdx = findColIdx(['lokasi', 'proyek', 'project', 'site', 'gedung', 'penempatan']);
  const shiftIdx = findColIdx(['shift', 'jam', 'waktu', 'jadwal']);
  const rateIdx = findColIdx(['rate', 'gaji', 'daily', 'harian', 'tarif', 'upah']);
  const statusIdx = findColIdx(['status', 'keaktifan', 'aktif']);
  const joinIdx = findColIdx(['tanggal', 'join', 'masuk', 'tgl', 'bergabung']);
  const uniformIdx = findColIdx(['seragam', 'uniform', 'ukuran', 'size', 'baju']);
  const bankIdx = findColIdx(['bank', 'namabank']);
  const accIdx = findColIdx(['rekening', 'account', 'norek', 'nomorrekening']);

  return dataRows.map((row, idx) => {
    const errors: string[] = [];
    const warnings: string[] = [];

    // Extract values either by mapped header or by direct sequential column index (A=0, B=1, ...)
    const getVal = (mappedIdx: number, defaultIndex: number): string => {
      const idxToUse = mappedIdx >= 0 ? mappedIdx : defaultIndex;
      const v = row[idxToUse];
      return v === null || v === undefined ? '' : String(v).trim();
    };

    // 1. Column A (0): Nama Lengkap
    const rawName = getVal(nameIdx, 0);
    if (!rawName) {
      errors.push('Nama Lengkap (Kolom A) wajib diisi.');
    }

    // 2. Column B (1): NIK
    let rawNik = getVal(nikIdx, 1);
    if (!rawNik) {
      rawNik = `RC-${new Date().getFullYear()}${Math.floor(1000 + idx * 10 + Math.random() * 90)}`;
      warnings.push(`NIK otomatis dibuat: ${rawNik}`);
    }

    // 3. Column C (2): No Handphone
    let rawPhone = getVal(phoneIdx, 2);
    if (!rawPhone) {
      rawPhone = '0812-0000-0000';
    }

    // 4. Column D (3): Posisi
    const rawPos = getVal(posIdx, 3);
    const posVal = rawPos.toLowerCase();
    let matchedPosition: EmployeePosition = 'Cleaner';
    if (posVal.includes('lead') || posVal.includes('tl')) matchedPosition = 'Team Leader';
    else if (posVal.includes('floor') || posVal.includes('kristal') || posVal.includes('spesialis')) matchedPosition = 'Floor Specialist';
    else if (posVal.includes('garden') || posVal.includes('taman')) matchedPosition = 'Gardener';
    else if (posVal.includes('gondola') || posVal.includes('facade') || posVal.includes('kaca')) matchedPosition = 'Gondola / Facade Cleaner';
    else if (posVal.includes('spv') || posVal.includes('supervis')) matchedPosition = 'Supervisor';
    else if (posVal.includes('cleaner') || posVal.includes('petugas') || posVal === '') matchedPosition = 'Cleaner';
    else {
      matchedPosition = 'Cleaner';
      warnings.push(`Posisi '${rawPos}' tidak dikenal, dialihkan ke Cleaner.`);
    }

    // 5. Column E (4): Lokasi Proyek
    const rawProj = getVal(projIdx, 4);
    const projVal = rawProj.toLowerCase();
    let matchedProjectId = projects[0]?.id || 'proj-1';
    if (projVal) {
      const foundProj = projects.find((p) => {
        const pName = p.name.toLowerCase();
        const pCode = p.code.toLowerCase();
        return pName.includes(projVal) || projVal.includes(pName) || pCode === projVal;
      });
      if (foundProj) {
        matchedProjectId = foundProj.id;
      } else {
        warnings.push(`Lokasi '${rawProj}' tidak terdaftar, dialihkan ke ${projects[0]?.name || 'default'}.`);
      }
    }

    // 6. Column F (5): Shift Kerja
    const rawShift = getVal(shiftIdx, 5);
    const shiftVal = rawShift.toLowerCase();
    let matchedShift: ShiftType = 'Pagi (06:00 - 14:00)';
    if (shiftVal.includes('siang') || shiftVal.includes('14:00')) matchedShift = 'Siang (14:00 - 22:00)';
    else if (shiftVal.includes('malam') || shiftVal.includes('22:00')) matchedShift = 'Malam (22:00 - 06:00)';
    else if (shiftVal.includes('gen') || shiftVal.includes('08:00')) matchedShift = 'General (08:00 - 17:00)';
    else if (shiftVal.includes('pagi') || shiftVal.includes('06:00')) matchedShift = 'Pagi (06:00 - 14:00)';

    // 7. Column G (6): Daily Rate
    const rawRate = getVal(rateIdx, 6);
    const cleanedRate = Number(rawRate.replace(/[^0-9]/g, ''));
    const defaultPositionRate =
      matchedPosition === 'Supervisor'
        ? 200000
        : matchedPosition === 'Gondola / Facade Cleaner'
        ? 175000
        : matchedPosition === 'Team Leader' || matchedPosition === 'Floor Specialist'
        ? 150000
        : 130000;

    const finalRate = cleanedRate && cleanedRate >= 50000 ? cleanedRate : defaultPositionRate;

    // 8. Column H (7): Status Keaktifan
    const rawStatus = getVal(statusIdx, 7);
    const stVal = rawStatus.toLowerCase();
    let matchedStatus: EmployeeStatus = 'Aktif';
    if (stVal.includes('cuti')) matchedStatus = 'Cuti';
    else if (stVal.includes('mutasi')) matchedStatus = 'Mutasi';
    else if (stVal.includes('resign') || stVal.includes('nonaktif')) matchedStatus = 'Resign';

    // 9. Column I (8): Tanggal Bergabung
    let rawJoin = getVal(joinIdx, 8);
    if (!rawJoin || !rawJoin.includes('-')) {
      rawJoin = new Date().toISOString().split('T')[0];
    }

    // 10. Column J (9): Ukuran Seragam
    const rawUni = getVal(uniformIdx, 9).toUpperCase();
    const validSizes: ('S' | 'M' | 'L' | 'XL' | 'XXL')[] = ['S', 'M', 'L', 'XL', 'XXL'];
    const matchedUniform: 'S' | 'M' | 'L' | 'XL' | 'XXL' = validSizes.includes(rawUni as any) ? (rawUni as any) : 'L';

    // 11. Column K (10): Nama Bank
    let rawBank = getVal(bankIdx, 10);
    if (!rawBank) rawBank = 'BCA';

    // 12. Column L (11): Nomor Rekening
    const rawAcc = getVal(accIdx, 11);

    const generatedEmp: Employee = {
      id: `emp-bulk-${Date.now()}-${idx}`,
      nik: rawNik,
      name: rawName,
      phone: rawPhone,
      position: matchedPosition,
      projectId: matchedProjectId,
      shift: matchedShift,
      dailyRate: finalRate,
      status: matchedStatus,
      joinDate: rawJoin,
      uniformSize: matchedUniform,
      bankName: rawBank,
      bankAccount: rawAcc
    };

    return {
      raw: {
        name: rawName,
        nik: rawNik,
        phone: rawPhone,
        position: rawPos || matchedPosition,
        project: rawProj || projects.find((p) => p.id === matchedProjectId)?.name || '',
        shift: rawShift || matchedShift,
        rate: String(finalRate),
        status: rawStatus || matchedStatus,
        joinDate: rawJoin,
        uniform: matchedUniform,
        bank: rawBank,
        account: rawAcc
      },
      employee: generatedEmp,
      errors,
      warnings,
      isValid: errors.length === 0
    };
  });
}

/**
 * Helper to parse CSV string with auto-detection of delimiter (;, ,, \t, |)
 */
function parseCSVMultiDelimiter(text: string): string[][] {
  // Strip BOM if present
  let cleanText = text.replace(/^\uFEFF/, '').trim();
  if (!cleanText) return [];

  // Check for explicit "sep=;" or "sep=," in first line
  let forcedDelimiter: string | null = null;
  const firstLineBreak = cleanText.indexOf('\n');
  const firstLine = firstLineBreak >= 0 ? cleanText.substring(0, firstLineBreak).trim() : cleanText;
  if (firstLine.toLowerCase().startsWith('sep=')) {
    forcedDelimiter = firstLine.substring(4).trim();
    cleanText = cleanText.substring(firstLineBreak + 1).trim();
  }

  // Detect delimiter if not forced
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
        i++; // skip escaped quote
      } else {
        inQuotes = !inQuotes;
      }
    } else if ((char === '\r' || char === '\n') && !inQuotes) {
      if (currentLine.trim()) {
        lines.push(currentLine);
      }
      currentLine = '';
      if (char === '\r' && nextChar === '\n') {
        i++; // skip CRLF
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
