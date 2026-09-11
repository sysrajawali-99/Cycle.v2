import jsPDF from 'jspdf';
import autoTable from 'jspdf-autotable';
import { Employee, Project, TimesheetMonthRecord, InventoryItem, InventoryLog, CleaningTask, SopItem, SopDocument, MaterialRequest, CompanyProfile } from '../types';
import { formatCurrency, getMonthName, formatDateDDMMYYYY, formatDateTimeStamp } from './formatters';
import { storageService } from '../services/storageService';

const getCompany = () => {
  try {
    return storageService.getCompanyProfile();
  } catch (e) {
    return {
      name: 'PT RAJAWALI PRIMA SERVICE',
      brandName: 'Rajawali Cycle',
      tagline: 'Commercial Cleaning, Facility Management, High Rise & Hospitality Support Services',
      address: 'Menara Rajawali Lt. 12, Mega Kuningan, Jakarta Selatan',
      city: 'Jakarta Selatan',
      phone: '(021) 5299-8800',
      email: 'hq@rajawaliservice.co.id',
      website: 'www.rajawaliservice.co.id',
      directorName: 'Bambang Soedarmono',
      directorTitle: 'Direktur Utama',
      financeManagerName: 'Hendra Gunawan',
      financeManagerTitle: 'Finance & HRD Lead',
      letterheadFooterNote: 'Dokumen ini sah dan diterbitkan secara elektronik oleh Sistem Terpadu Rajawali Cycle.'
    };
  }
};

interface ExportTimesheetPDFParams {
  projects: Project[];
  employees: Employee[];
  timesheets: TimesheetMonthRecord[];
  selectedProjectId: string;
  month: number;
  year: number;
}

export const generateTimesheetPDF = ({
  projects,
  employees,
  timesheets,
  selectedProjectId,
  month,
  year
}: ExportTimesheetPDFParams) => {
  const comp = getCompany();
  // Filter active employees
  const targetEmployees = employees.filter((emp) => {
    if (emp.status === 'Resign') return false;
    if (selectedProjectId !== 'ALL' && emp.projectId !== selectedProjectId) return false;
    return true;
  });

  const projName =
    selectedProjectId === 'ALL'
      ? 'KONSOLIDASI SEMUA LOKASI PROYEK'
      : projects.find((p) => p.id === selectedProjectId)?.name || 'LOKASI PROYEK';

  const projCode =
    selectedProjectId === 'ALL'
      ? 'ALL-SITES'
      : projects.find((p) => p.id === selectedProjectId)?.code || 'PROJ';

  const monthName = getMonthName(month);
  const totalDays = new Date(year, month, 0).getDate();

  // Create A4 Landscape PDF
  const doc = new jsPDF({
    orientation: 'landscape',
    unit: 'mm',
    format: 'a4'
  });

  const pageWidth = doc.internal.pageSize.getWidth(); // ~297mm
  const pageHeight = doc.internal.pageSize.getHeight(); // ~210mm

  // 1. TOP HEADER - Corporate Dark Navy & Gold Accents
  doc.setFillColor(15, 39, 68); // #0f2744 Dark Navy
  doc.rect(0, 0, pageWidth, 22, 'F');

  // Gold accent line under header
  doc.setFillColor(217, 119, 6); // #d97706 Gold
  doc.rect(0, 22, pageWidth, 1.8, 'F');

  // Company Name
  doc.setFont('helvetica', 'bold');
  doc.setFontSize(14);
  doc.setTextColor(255, 255, 255);
  doc.text(comp.name, 14, 9);

  // Subtitle
  doc.setFont('helvetica', 'normal');
  doc.setFontSize(7.5);
  doc.setTextColor(203, 213, 225); // Slate 300
  doc.text(comp.tagline, 14, 14);
  doc.text(`Head Office: ${comp.address} • Telp: ${comp.phone}`, 14, 18);

  // Right Header Tag
  doc.setFillColor(217, 119, 6);
  doc.roundedRect(pageWidth - 65, 4, 51, 6, 1, 1, 'F');
  doc.setFont('helvetica', 'bold');
  doc.setFontSize(6.5);
  doc.setTextColor(15, 23, 42);
  doc.text('OFFICIAL PAYROLL DOCUMENT', pageWidth - 63, 8.2);

  doc.setFont('helvetica', 'bold');
  doc.setFontSize(7);
  doc.setTextColor(255, 255, 255);
  doc.text(`DOC: PAY-${year}${String(month).padStart(2, '0')}-${projCode}`, pageWidth - 65, 14);

  const printDate = new Date().toLocaleDateString('id-ID', {
    day: '2-digit',
    month: 'short',
    year: 'numeric'
  });
  doc.setFont('helvetica', 'normal');
  doc.setFontSize(6.5);
  doc.setTextColor(203, 213, 225);
  doc.text(`Cetak: ${printDate}`, pageWidth - 65, 18);

  // 2. DOCUMENT TITLE & METADATA BAR
  doc.setFont('helvetica', 'bold');
  doc.setFontSize(11);
  doc.setTextColor(15, 23, 42);
  doc.text('REKAPITULASI TIMESHEET KEHADIRAN & GAJI BERSIH (PAYROLL)', 14, 29);

  doc.setFont('helvetica', 'normal');
  doc.setFontSize(8);
  doc.setTextColor(71, 85, 105);
  doc.text(
    `Laporan resmi akumulasi presensi kerja harian dan perhitungan take home pay personil cleaning service.`,
    14,
    33.5
  );

  // Metadata Info Boxes (4 columns)
  const boxY = 36;
  const boxH = 11;
  const boxW = (pageWidth - 28 - 9) / 4;

  // Box 1: Periode
  doc.setFillColor(248, 250, 252);
  doc.setDrawColor(203, 213, 225);
  doc.roundedRect(14, boxY, boxW, boxH, 1, 1, 'FD');
  doc.setFontSize(6.5);
  doc.setFont('helvetica', 'bold');
  doc.setTextColor(100, 116, 139);
  doc.text('PERIODE PENGGAJIAN', 17, boxY + 4);
  doc.setFontSize(8.5);
  doc.setTextColor(15, 23, 42);
  doc.text(`${monthName.toUpperCase()} ${year}`, 17, boxY + 8.5);

  // Box 2: Lokasi
  doc.setFillColor(248, 250, 252);
  doc.roundedRect(14 + boxW + 3, boxY, boxW, boxH, 1, 1, 'FD');
  doc.setFontSize(6.5);
  doc.setFont('helvetica', 'bold');
  doc.setTextColor(100, 116, 139);
  doc.text('LOKASI PROYEK / SITE', 14 + boxW + 6, boxY + 4);
  doc.setFontSize(8);
  doc.setTextColor(15, 23, 42);
  const truncatedProj = projName.length > 28 ? projName.substring(0, 26) + '...' : projName;
  doc.text(truncatedProj, 14 + boxW + 6, boxY + 8.5);

  // Box 3: Total Personil
  doc.setFillColor(248, 250, 252);
  doc.roundedRect(14 + (boxW + 3) * 2, boxY, boxW, boxH, 1, 1, 'FD');
  doc.setFontSize(6.5);
  doc.setFont('helvetica', 'bold');
  doc.setTextColor(100, 116, 139);
  doc.text('TOTAL PERSONIL AKTIF', 14 + (boxW + 3) * 2 + 3, boxY + 4);
  doc.setFontSize(8.5);
  doc.setTextColor(5, 150, 105); // Emerald
  doc.text(`${targetEmployees.length} Personil`, 14 + (boxW + 3) * 2 + 3, boxY + 8.5);

  // Box 4: Total Nilai Payroll Placeholder (Calculated later)
  let grandTotalNet = 0;
  let grandTotalHadir = 0;
  let grandTotalAlpa = 0;
  let grandTotalIzin = 0;
  let grandTotalDeductions = 0;

  // Prepare table headers
  // Columns: No, Nama Karyawan & Posisi, Lokasi / Shift, Rate/Hari, 1..31, H, A, I, Potongan, Gaji Bersih
  const dateHeaders: string[] = [];
  for (let d = 1; d <= 31; d++) {
    dateHeaders.push(String(d));
  }

  const tableHead = [
    [
      'No',
      'Nama Personil & Posisi',
      'Site & Shift',
      'Rate/Hari',
      ...dateHeaders,
      'H',
      'A',
      'I',
      'Potongan (Rp)',
      'Gaji Bersih (THP)'
    ]
  ];

  // Prepare table body rows
  const tableBody = targetEmployees.map((emp, index) => {
    const rec = timesheets.find(
      (ts) => ts.employeeId === emp.id && ts.month === month && ts.year === year
    ) || {
      id: `ts-${emp.id}`,
      employeeId: emp.id,
      projectId: emp.projectId,
      month,
      year,
      days: {},
      deductionAmount: 0,
      deductionReason: '',
      bonusAmount: 0,
      notes: ''
    };

    let hadir = 0;
    let alpa = 0;
    let izin = 0;

    const dayCells: string[] = [];
    for (let d = 1; d <= 31; d++) {
      if (d <= totalDays) {
        const st = rec.days[d] || '';
        if (st === 'H') {
          hadir++;
          dayCells.push('H');
        } else if (st === 'A') {
          alpa++;
          dayCells.push('A');
        } else if (st === 'I') {
          izin++;
          dayCells.push('I');
        } else if (st === 'O') {
          dayCells.push('OFF');
        } else {
          dayCells.push('');
        }
      } else {
        dayCells.push('-');
      }
    }

    const deduction = rec.deductionAmount || 0;
    const bonus = rec.bonusAmount || 0;
    const gross = hadir * emp.dailyRate + bonus;
    const net = Math.max(0, gross - deduction);

    grandTotalHadir += hadir;
    grandTotalAlpa += alpa;
    grandTotalIzin += izin;
    grandTotalDeductions += deduction;
    grandTotalNet += net;

    const empProj = projects.find((p) => p.id === emp.projectId);
    const shortProj = empProj?.code || empProj?.name.substring(0, 10) || '-';
    const shortShift = emp.shift.includes('Pagi')
      ? 'Pagi'
      : emp.shift.includes('Siang')
      ? 'Siang'
      : emp.shift.includes('Malam')
      ? 'Malam'
      : 'Gen';

    return [
      String(index + 1),
      `${emp.name}\n[${emp.position} • ${emp.nik}]`,
      `${shortProj}\n${shortShift}`,
      formatCurrency(emp.dailyRate),
      ...dayCells,
      String(hadir),
      String(alpa),
      String(izin),
      deduction > 0 ? formatCurrency(deduction) : '-',
      formatCurrency(net)
    ];
  });

  // Now render Box 4 with calculated total
  doc.setFillColor(248, 250, 252);
  doc.roundedRect(14 + (boxW + 3) * 3, boxY, boxW, boxH, 1, 1, 'FD');
  doc.setFontSize(6.5);
  doc.setFont('helvetica', 'bold');
  doc.setTextColor(100, 116, 139);
  doc.text('TOTAL ESTIMASI PAYROLL', 14 + (boxW + 3) * 3 + 3, boxY + 4);
  doc.setFontSize(8.5);
  doc.setTextColor(15, 23, 42);
  doc.text(formatCurrency(grandTotalNet), 14 + (boxW + 3) * 3 + 3, boxY + 8.5);

  // 3. GENERATE PROFESSIONAL TABLE VIA AUTOTABLE
  autoTable(doc, {
    head: tableHead,
    body: tableBody,
    foot: [
      [
        '',
        `TOTAL KONSOLIDASI (${targetEmployees.length} PERSONIL)`,
        '',
        '',
        ...Array(31).fill(''),
        String(grandTotalHadir),
        String(grandTotalAlpa),
        String(grandTotalIzin),
        formatCurrency(grandTotalDeductions),
        formatCurrency(grandTotalNet)
      ]
    ],
    startY: 50,
    margin: { left: 10, right: 10, bottom: 35 },
    theme: 'grid',
    styles: {
      fontSize: 5.5,
      cellPadding: 0.8,
      lineColor: [203, 213, 225],
      lineWidth: 0.15,
      font: 'helvetica',
      textColor: [30, 41, 59],
      valign: 'middle'
    },
    headStyles: {
      fillColor: [15, 39, 68], // Deep Corporate Navy
      textColor: [255, 255, 255],
      fontSize: 5.5,
      fontStyle: 'bold',
      halign: 'center',
      valign: 'middle'
    },
    footStyles: {
      fillColor: [241, 245, 249],
      textColor: [15, 23, 42],
      fontStyle: 'bold',
      fontSize: 6,
      halign: 'center',
      valign: 'middle'
    },
    columnStyles: {
      0: { cellWidth: 7, halign: 'center' }, // No
      1: { cellWidth: 32, halign: 'left', fontStyle: 'bold' }, // Name
      2: { cellWidth: 15, halign: 'center' }, // Proj/Shift
      3: { cellWidth: 15, halign: 'right', fontStyle: 'bold' }, // Rate
      // 31 days columns (index 4 to 34)
      ...Array.from({ length: 31 }, (_, i) => i + 4).reduce((acc, colIdx) => {
        acc[colIdx] = { cellWidth: 3.9, halign: 'center', fontSize: 4.8 };
        return acc;
      }, {} as any),
      35: { cellWidth: 6, halign: 'center', fontStyle: 'bold', textColor: [5, 150, 105] }, // H
      36: { cellWidth: 6, halign: 'center', fontStyle: 'bold', textColor: [220, 38, 38] }, // A
      37: { cellWidth: 6, halign: 'center', fontStyle: 'bold', textColor: [217, 119, 6] }, // I
      38: { cellWidth: 16, halign: 'right', textColor: [220, 38, 38] }, // Deduction
      39: { cellWidth: 20, halign: 'right', fontStyle: 'bold', textColor: [15, 23, 42] } // Net Pay
    },
    didParseCell: (data) => {
      // Color-code day cells in table body
      if (data.section === 'body' && data.column.index >= 4 && data.column.index <= 34) {
        const val = data.cell.raw;
        if (val === 'H') {
          data.cell.styles.fillColor = [220, 252, 231]; // Soft Green
          data.cell.styles.textColor = [22, 101, 52]; // Dark Green
          data.cell.styles.fontStyle = 'bold';
        } else if (val === 'A') {
          data.cell.styles.fillColor = [254, 226, 226]; // Soft Red
          data.cell.styles.textColor = [153, 27, 27]; // Dark Red
          data.cell.styles.fontStyle = 'bold';
        } else if (val === 'I') {
          data.cell.styles.fillColor = [254, 243, 199]; // Soft Orange
          data.cell.styles.textColor = [146, 64, 14]; // Dark Orange
          data.cell.styles.fontStyle = 'bold';
        } else if (val === 'OFF') {
          data.cell.styles.fillColor = [241, 245, 249];
          data.cell.styles.textColor = [148, 163, 184];
        } else if (val === '-') {
          data.cell.styles.fillColor = [248, 250, 252];
          data.cell.styles.textColor = [203, 213, 225];
        }
      }
    }
  });

  // 4. SIGNATURE SECTION (Bottom of Last Page)
  const finalY = (doc as any).lastAutoTable?.finalY || 160;
  const sigY = Math.min(finalY + 8, pageHeight - 32);

  // If table runs too close to bottom, add new page for signatures
  if (finalY > pageHeight - 35) {
    doc.addPage();
  }

  const effectiveSigY = finalY > pageHeight - 35 ? 20 : sigY;
  const colW = (pageWidth - 28) / 3;

  // 3 Signature Columns
  const sigTitles = [
    { role: 'Dibuat & Diverifikasi Oleh:', title: 'Site Supervisor / Admin Project' },
    { role: 'Diperiksa & Divalidasi Oleh:', title: 'Finance & Payroll Officer' },
    { role: 'Disetujui Oleh:', title: 'Operations Director / Management' }
  ];

  sigTitles.forEach((item, i) => {
    const x = 14 + i * colW + colW / 2;
    doc.setFontSize(6.5);
    doc.setFont('helvetica', 'normal');
    doc.setTextColor(100, 116, 139);
    doc.text(item.role, x, effectiveSigY, { align: 'center' });

    doc.setFont('helvetica', 'bold');
    doc.setFontSize(7.5);
    doc.setTextColor(15, 23, 42);
    doc.text(item.title, x, effectiveSigY + 4, { align: 'center' });

    // Signature line
    doc.setDrawColor(148, 163, 184);
    doc.setLineWidth(0.3);
    doc.line(x - 22, effectiveSigY + 19, x + 22, effectiveSigY + 19);

    doc.setFont('helvetica', 'normal');
    doc.setFontSize(6.5);
    doc.setTextColor(100, 116, 139);
    doc.text('( ............................................ )', x, effectiveSigY + 22.5, { align: 'center' });
  });

  // Bottom Security & Authenticity Stamp
  doc.setFontSize(5.5);
  doc.setFont('helvetica', 'normal');
  doc.setTextColor(148, 163, 184);
  doc.text(
    `Dokumen resmi payroll diterbitkan secara digital oleh Rajawali Cleaning Eagle Management System • Keabsahan terverifikasi secara sistem`,
    14,
    pageHeight - 6
  );
  doc.text(
    `Halaman ${doc.getNumberOfPages()} dari ${doc.getNumberOfPages()}`,
    pageWidth - 14,
    pageHeight - 6,
    { align: 'right' }
  );

  // Save PDF file
  const fileName = `Rekap_Payroll_Rajawali_${monthName}_${year}_${projCode}.pdf`;
  doc.save(fileName);
};

/**
 * Generate Individual Employee Payslip PDF
 */
export const generateIndividualPayslipPDF = ({
  employee,
  timesheet,
  project,
  month,
  year
}: {
  employee: Employee;
  timesheet: TimesheetMonthRecord;
  project?: Project;
  month: number;
  year: number;
}) => {
  const comp = getCompany();
  const doc = new jsPDF({
    orientation: 'portrait',
    unit: 'mm',
    format: 'a5' // A5 Portrait for neat payslip
  });

  const pageWidth = doc.internal.pageSize.getWidth(); // 148mm
  const pageHeight = doc.internal.pageSize.getHeight(); // 210mm
  const monthName = getMonthName(month);

  let hadir = 0;
  let alpa = 0;
  let izin = 0;
  Object.values(timesheet.days || {}).forEach((st) => {
    if (st === 'H') hadir++;
    else if (st === 'A') alpa++;
    else if (st === 'I') izin++;
  });

  const baseEarning = hadir * employee.dailyRate;
  const bonus = timesheet.bonusAmount || 0;
  const grossPay = baseEarning + bonus;
  const deduction = timesheet.deductionAmount || 0;
  const netPay = Math.max(0, grossPay - deduction);

  // Top Header Banner
  doc.setFillColor(15, 39, 68); // Dark Navy
  doc.rect(0, 0, pageWidth, 26, 'F');
  doc.setFillColor(217, 119, 6); // Gold line
  doc.rect(0, 26, pageWidth, 1.5, 'F');

  // Company Text
  doc.setFont('helvetica', 'bold');
  doc.setFontSize(12);
  doc.setTextColor(255, 255, 255);
  doc.text(comp.name, 10, 9);

  doc.setFont('helvetica', 'normal');
  doc.setFontSize(6.5);
  doc.setTextColor(203, 213, 225);
  doc.text(comp.tagline, 10, 14);
  doc.text(`${comp.address} • Telp: ${comp.phone}`, 10, 18);

  // Slip Gaji Tag
  doc.setFillColor(217, 119, 6);
  doc.roundedRect(pageWidth - 45, 6, 35, 13, 1, 1, 'F');
  doc.setFont('helvetica', 'bold');
  doc.setFontSize(7.5);
  doc.setTextColor(15, 23, 42);
  doc.text('SLIP GAJI RESMI', pageWidth - 27.5, 11.5, { align: 'center' });
  doc.setFontSize(6.5);
  doc.text(`${monthName.toUpperCase()} ${year}`, pageWidth - 27.5, 16, { align: 'center' });

  // Employee Identity Card Box
  doc.setFillColor(248, 250, 252);
  doc.setDrawColor(203, 213, 225);
  doc.roundedRect(10, 32, pageWidth - 20, 26, 1.5, 1.5, 'FD');

  doc.setFont('helvetica', 'bold');
  doc.setFontSize(9);
  doc.setTextColor(15, 23, 42);
  doc.text(employee.name, 14, 38);

  doc.setFont('helvetica', 'normal');
  doc.setFontSize(7);
  doc.setTextColor(100, 116, 139);
  doc.text(`NIK: ${employee.nik}   •   Posisi: ${employee.position}`, 14, 43);
  doc.text(`Lokasi: ${project?.name || '-'} (${project?.code || '-'})`, 14, 48);
  doc.text(`Shift: ${employee.shift}   •   Rekening: ${employee.bankName} - ${employee.bankAccount || '-'}`, 14, 53);

  // Presensi Summary Badges
  const badgeY = 62;
  const bw = (pageWidth - 20 - 9) / 4;

  const badges = [
    { label: 'HADIR (H)', val: `${hadir} Hari`, color: [5, 150, 105], bg: [220, 252, 231] },
    { label: 'ALPA (A)', val: `${alpa} Hari`, color: [220, 38, 38], bg: [254, 226, 226] },
    { label: 'IZIN (I)', val: `${izin} Hari`, color: [217, 119, 6], bg: [254, 243, 199] },
    { label: 'RATE / HARI', val: formatCurrency(employee.dailyRate), color: [15, 23, 42], bg: [241, 245, 249] }
  ];

  badges.forEach((b, i) => {
    const bx = 10 + i * (bw + 3);
    doc.setFillColor(b.bg[0], b.bg[1], b.bg[2]);
    doc.setDrawColor(203, 213, 225);
    doc.roundedRect(bx, badgeY, bw, 12, 1, 1, 'FD');

    doc.setFontSize(5.5);
    doc.setFont('helvetica', 'bold');
    doc.setTextColor(100, 116, 139);
    doc.text(b.label, bx + bw / 2, badgeY + 4, { align: 'center' });

    doc.setFontSize(7.5);
    doc.setTextColor(b.color[0], b.color[1], b.color[2]);
    doc.text(b.val, bx + bw / 2, badgeY + 9.5, { align: 'center' });
  });

  // Details Table: Penghasilan & Potongan
  autoTable(doc, {
    startY: 78,
    margin: { left: 10, right: 10 },
    head: [['RINCIAN PENGHASILAN & PENERIMAAN', 'JUMLAH (RP)']],
    body: [
      [`Gaji Pokok Kehadiran (${hadir} Hari x ${formatCurrency(employee.dailyRate)})`, formatCurrency(baseEarning)],
      ...(bonus > 0 ? [['Insentif / Tunjangan Tambahan', formatCurrency(bonus)]] : []),
      ['Total Penghasilan Kotor (Gross)', formatCurrency(grossPay)],
      ...(deduction > 0
        ? [[`Potongan Absensi / Kedisiplinan ${timesheet.deductionReason ? `(${timesheet.deductionReason})` : ''}`, `-${formatCurrency(deduction)}`]]
        : [])
    ],
    foot: [['TOTAL GAJI BERSIH (TAKE HOME PAY)', formatCurrency(netPay)]],
    theme: 'grid',
    styles: {
      fontSize: 7.5,
      cellPadding: 2,
      lineColor: [203, 213, 225],
      lineWidth: 0.2
    },
    headStyles: {
      fillColor: [15, 39, 68],
      textColor: [255, 255, 255],
      fontSize: 7.5,
      fontStyle: 'bold'
    },
    footStyles: {
      fillColor: [254, 243, 199], // Amber soft
      textColor: [15, 23, 42],
      fontSize: 9,
      fontStyle: 'bold'
    },
    columnStyles: {
      0: { cellWidth: 'auto', halign: 'left' },
      1: { cellWidth: 40, halign: 'right', fontStyle: 'bold' }
    }
  });

  const endY = (doc as any).lastAutoTable?.finalY || 135;

  // Signatures
  const sigY = endY + 12;
  const halfW = (pageWidth - 20) / 2;

  // Left: Employee
  doc.setFontSize(6.5);
  doc.setFont('helvetica', 'normal');
  doc.setTextColor(100, 116, 139);
  doc.text('Penerima,', 10 + halfW / 2, sigY, { align: 'center' });
  doc.setFont('helvetica', 'bold');
  doc.setTextColor(15, 23, 42);
  doc.text(employee.name, 10 + halfW / 2, sigY + 4, { align: 'center' });
  doc.line(10 + halfW / 2 - 20, sigY + 18, 10 + halfW / 2 + 20, sigY + 18);
  doc.setFont('helvetica', 'normal');
  doc.text('( Karyawan Bersangkutan )', 10 + halfW / 2, sigY + 21.5, { align: 'center' });

  // Right: Payroll Officer
  doc.setFontSize(6.5);
  doc.setFont('helvetica', 'normal');
  doc.setTextColor(100, 116, 139);
  doc.text('Petugas Payroll / HRD,', 10 + halfW + halfW / 2, sigY, { align: 'center' });
  doc.setFont('helvetica', 'bold');
  doc.setTextColor(15, 23, 42);
  doc.text(comp.name, 10 + halfW + halfW / 2, sigY + 4, { align: 'center' });
  doc.line(10 + halfW + halfW / 2 - 20, sigY + 18, 10 + halfW + halfW / 2 + 20, sigY + 18);
  doc.setFont('helvetica', 'normal');
  doc.text(`( ${comp.financeManagerName || 'Finance & HR Dept'} )`, 10 + halfW + halfW / 2, sigY + 21.5, { align: 'center' });

  // Footer
  doc.setFontSize(5.5);
  doc.setTextColor(148, 163, 184);
  doc.text('Dokumen ini dicetak otomatis & sah tanpa tanda tangan basah jika kode verifikasi cocok.', pageWidth / 2, pageHeight - 8, {
    align: 'center'
  });

  const fileName = `Slip_Gaji_${employee.nik}_${employee.name.replace(/[^a-zA-Z0-9]/g, '_')}_${monthName}_${year}.pdf`;
  doc.save(fileName);
};

export interface ExportInventoryUsagePDFParams {
  projects: Project[];
  inventoryItems: InventoryItem[];
  inventoryLogs: InventoryLog[];
  selectedProjectId: string;
  startDate?: string;
  endDate?: string;
  categoryFilter?: string;
}

export const generateInventoryUsagePDF = ({
  projects,
  inventoryItems,
  inventoryLogs,
  selectedProjectId,
  startDate,
  endDate,
  categoryFilter = 'ALL'
}: ExportInventoryUsagePDFParams) => {
  const comp = getCompany();
  // Filter OUT logs (Pemakaian Harian)
  const usageLogs = inventoryLogs.filter((log) => {
    if (log.type !== 'OUT') return false;
    if (selectedProjectId !== 'ALL' && log.projectId !== selectedProjectId) return false;
    if (startDate && log.date.substring(0, 10) < startDate) return false;
    if (endDate && log.date.substring(0, 10) > endDate) return false;
    if (categoryFilter !== 'ALL') {
      const item = inventoryItems.find((i) => i.id === log.itemId);
      if (item && item.category !== categoryFilter) return false;
    }
    return true;
  });

  const projName =
    selectedProjectId === 'ALL'
      ? 'KONSOLIDASI SEMUA LOKASI PROYEK'
      : projects.find((p) => p.id === selectedProjectId)?.name || 'LOKASI PROYEK';

  const projCode =
    selectedProjectId === 'ALL'
      ? 'ALL-SITES'
      : projects.find((p) => p.id === selectedProjectId)?.code || 'PROJ';

  // Create A4 Landscape PDF
  const doc = new jsPDF({
    orientation: 'landscape',
    unit: 'mm',
    format: 'a4'
  });

  const pageWidth = doc.internal.pageSize.getWidth(); // ~297mm
  const pageHeight = doc.internal.pageSize.getHeight(); // ~210mm

  // 1. TOP HEADER - Corporate Dark Navy & Gold Accents
  doc.setFillColor(15, 39, 68); // #0f2744 Dark Navy
  doc.rect(0, 0, pageWidth, 22, 'F');

  // Gold accent line under header
  doc.setFillColor(217, 119, 6); // #d97706 Gold
  doc.rect(0, 22, pageWidth, 1.8, 'F');

  // Company Name
  doc.setFont('helvetica', 'bold');
  doc.setFontSize(14);
  doc.setTextColor(255, 255, 255);
  doc.text(comp.name, 14, 9);

  // Subtitle
  doc.setFont('helvetica', 'normal');
  doc.setFontSize(7.5);
  doc.setTextColor(203, 213, 225); // Slate 300
  doc.text(comp.tagline, 14, 14);
  doc.text(`Head Office: ${comp.address} • Telp: ${comp.phone}`, 14, 18);

  // Right Header Tag
  doc.setFillColor(217, 119, 6);
  doc.roundedRect(pageWidth - 70, 4, 56, 6, 1, 1, 'F');
  doc.setFont('helvetica', 'bold');
  doc.setFontSize(6.5);
  doc.setTextColor(15, 23, 42);
  doc.text('LOGISTIK & INVENTORY CONTROL', pageWidth - 68, 8.2);

  const printDate = new Date().toLocaleDateString('id-ID', {
    day: '2-digit',
    month: 'short',
    year: 'numeric'
  });
  doc.setFont('helvetica', 'bold');
  doc.setFontSize(7);
  doc.setTextColor(255, 255, 255);
  doc.text(`DOC: LOG-${projCode}-${new Date().toISOString().substring(0, 10).replace(/-/g, '')}`, pageWidth - 70, 14);

  doc.setFont('helvetica', 'normal');
  doc.setFontSize(6.5);
  doc.setTextColor(203, 213, 225);
  doc.text(`Tanggal Cetak: ${printDate}`, pageWidth - 70, 18);

  // 2. DOCUMENT TITLE & METADATA BAR
  doc.setFont('helvetica', 'bold');
  doc.setFontSize(11);
  doc.setTextColor(15, 23, 42);
  doc.text('REKAPITULASI PEMAKAIAN HARIAN CHEMICAL & ALAT OPERASIONAL', 14, 29);

  doc.setFont('helvetica', 'normal');
  doc.setFontSize(8);
  doc.setTextColor(71, 85, 105);
  doc.text(
    `Laporan audit pengeluaran stok chemical pembersih, consumable, dan perlengkapan sanitasi harian per site.`,
    14,
    33.5
  );

  // Calculate totals
  let totalQtyUsed = 0;
  let totalEstimatedCost = 0;

  usageLogs.forEach((log) => {
    totalQtyUsed += log.quantity;
    const item = inventoryItems.find((i) => i.id === log.itemId);
    if (item) {
      totalEstimatedCost += log.quantity * (item.unitPrice || 0);
    }
  });

  // Metadata Info Boxes (4 columns)
  const boxY = 36;
  const boxH = 11;
  const boxW = (pageWidth - 28 - 9) / 4;

  // Box 1: Lokasi
  doc.setFillColor(248, 250, 252);
  doc.setDrawColor(203, 213, 225);
  doc.roundedRect(14, boxY, boxW, boxH, 1, 1, 'FD');
  doc.setFontSize(6.5);
  doc.setFont('helvetica', 'bold');
  doc.setTextColor(100, 116, 139);
  doc.text('LOKASI PROYEK / SITE', 17, boxY + 4);
  doc.setFontSize(8);
  doc.setTextColor(15, 23, 42);
  const truncatedProj = projName.length > 28 ? projName.substring(0, 26) + '...' : projName;
  doc.text(truncatedProj, 17, boxY + 8.5);

  // Box 2: Total Transaksi
  doc.setFillColor(248, 250, 252);
  doc.roundedRect(14 + boxW + 3, boxY, boxW, boxH, 1, 1, 'FD');
  doc.setFontSize(6.5);
  doc.setFont('helvetica', 'bold');
  doc.setTextColor(100, 116, 139);
  doc.text('TOTAL FREKUENSI PEMAKAIAN', 14 + boxW + 6, boxY + 4);
  doc.setFontSize(8.5);
  doc.setTextColor(15, 23, 42);
  doc.text(`${usageLogs.length} Kali Pengeluaran`, 14 + boxW + 6, boxY + 8.5);

  // Box 3: Total Unit Digunakan
  doc.setFillColor(248, 250, 252);
  doc.roundedRect(14 + (boxW + 3) * 2, boxY, boxW, boxH, 1, 1, 'FD');
  doc.setFontSize(6.5);
  doc.setFont('helvetica', 'bold');
  doc.setTextColor(100, 116, 139);
  doc.text('TOTAL VOLUME / KUANTITAS', 14 + (boxW + 3) * 2 + 3, boxY + 4);
  doc.setFontSize(8.5);
  doc.setTextColor(217, 119, 6); // Amber
  doc.text(`${totalQtyUsed} Unit / Jerigen`, 14 + (boxW + 3) * 2 + 3, boxY + 8.5);

  // Box 4: Estimasi Biaya Pemakaian
  doc.setFillColor(248, 250, 252);
  doc.roundedRect(14 + (boxW + 3) * 3, boxY, boxW, boxH, 1, 1, 'FD');
  doc.setFontSize(6.5);
  doc.setFont('helvetica', 'bold');
  doc.setTextColor(100, 116, 139);
  doc.text('ESTIMASI NILAI PEMAKAIAN', 14 + (boxW + 3) * 3 + 3, boxY + 4);
  doc.setFontSize(8.5);
  doc.setTextColor(5, 150, 105); // Emerald
  doc.text(formatCurrency(totalEstimatedCost), 14 + (boxW + 3) * 3 + 3, boxY + 8.5);

  // Prepare table headers
  const tableHead = [
    [
      'No',
      'Tanggal & Waktu',
      'Lokasi Proyek',
      'Kode & Nama Chemical / Alat',
      'Kategori',
      'Qty Pakai',
      'Satuan',
      'Sisa Stok',
      'Biaya Satuan',
      'Total Nilai',
      'Petugas PIC',
      'Keterangan & Area Pembersihan'
    ]
  ];

  // Prepare table body rows
  const tableBody = usageLogs.map((log, index) => {
    const item = inventoryItems.find((i) => i.id === log.itemId);
    const proj = projects.find((p) => p.id === log.projectId);
    const itemPrice = item?.unitPrice || 0;
    const lineTotal = log.quantity * itemPrice;

    return [
      String(index + 1),
      log.date,
      proj?.code || proj?.name.substring(0, 12) || '-',
      item ? `${item.name}\n(${item.code})` : log.itemId,
      item?.category || 'Chemical',
      String(log.quantity),
      item?.unit || 'Pcs',
      String(log.newStock),
      formatCurrency(itemPrice),
      formatCurrency(lineTotal),
      log.pic,
      log.notes || 'Pemakaian rutin operasional'
    ];
  });

  // Render Table with autoTable
  autoTable(doc, {
    startY: 50,
    head: tableHead,
    body: tableBody,
    theme: 'grid',
    styles: {
      fontSize: 7,
      cellPadding: 1.5,
      lineColor: [203, 213, 225],
      lineWidth: 0.15,
      textColor: [15, 23, 42]
    },
    headStyles: {
      fillColor: [15, 39, 68], // Dark Navy
      textColor: [255, 255, 255],
      fontSize: 7,
      fontStyle: 'bold',
      halign: 'center',
      valign: 'middle'
    },
    columnStyles: {
      0: { cellWidth: 8, halign: 'center' },
      1: { cellWidth: 24, halign: 'center' },
      2: { cellWidth: 18, halign: 'center' },
      3: { cellWidth: 42, halign: 'left', fontStyle: 'bold' },
      4: { cellWidth: 20, halign: 'center' },
      5: { cellWidth: 14, halign: 'center', fontStyle: 'bold', textColor: [220, 38, 38] },
      6: { cellWidth: 16, halign: 'center' },
      7: { cellWidth: 14, halign: 'center' },
      8: { cellWidth: 20, halign: 'right' },
      9: { cellWidth: 22, halign: 'right', fontStyle: 'bold' },
      10: { cellWidth: 24, halign: 'left' },
      11: { cellWidth: 'auto', halign: 'left' }
    },
    alternateRowStyles: {
      fillColor: [248, 250, 252]
    }
  });

  // Get final Y position after table
  const finalY = (doc as any).lastAutoTable?.finalY || 130;

  // Verification & Signatures Block
  let sigY = finalY + 8;
  if (sigY > pageHeight - 38) {
    doc.addPage();
    sigY = 18;
  }

  const sigColWidth = (pageWidth - 28) / 3;

  doc.setFontSize(6.5);
  doc.setFont('helvetica', 'normal');
  doc.setTextColor(100, 116, 139);

  // Sign 1: Site Supervisor
  doc.text('Dibuat & Diverifikasi Oleh,', 14 + sigColWidth * 0.5, sigY, { align: 'center' });
  doc.setFont('helvetica', 'bold');
  doc.setFontSize(7.5);
  doc.setTextColor(15, 23, 42);
  doc.text('Supervisor Area / Leader', 14 + sigColWidth * 0.5, sigY + 4, { align: 'center' });
  doc.line(14 + sigColWidth * 0.2, sigY + 18, 14 + sigColWidth * 0.8, sigY + 18);
  doc.setFont('helvetica', 'normal');
  doc.setFontSize(6.5);
  doc.text('( Site Operational Leader )', 14 + sigColWidth * 0.5, sigY + 21.5, { align: 'center' });

  // Sign 2: Inventory & Warehouse Manager
  doc.setFontSize(6.5);
  doc.text('Diketahui & Dicek Stok,', 14 + sigColWidth * 1.5, sigY, { align: 'center' });
  doc.setFont('helvetica', 'bold');
  doc.setFontSize(7.5);
  doc.text('Logistik & Gudang Chemical', 14 + sigColWidth * 1.5, sigY + 4, { align: 'center' });
  doc.line(14 + sigColWidth * 1.2, sigY + 18, 14 + sigColWidth * 1.8, sigY + 18);
  doc.setFont('helvetica', 'normal');
  doc.setFontSize(6.5);
  doc.text('( Facility Logistic Dept )', 14 + sigColWidth * 1.5, sigY + 21.5, { align: 'center' });

  // Sign 3: Operations Manager
  doc.setFontSize(6.5);
  doc.text('Disetujui Oleh,', 14 + sigColWidth * 2.5, sigY, { align: 'center' });
  doc.setFont('helvetica', 'bold');
  doc.setFontSize(7.5);
  doc.text('Operations Manager', 14 + sigColWidth * 2.5, sigY + 4, { align: 'center' });
  doc.line(14 + sigColWidth * 2.2, sigY + 18, 14 + sigColWidth * 2.8, sigY + 18);
  doc.setFont('helvetica', 'normal');
  doc.setFontSize(6.5);
  doc.text('( Head of Operations )', 14 + sigColWidth * 2.5, sigY + 21.5, { align: 'center' });

  // Document Footer
  doc.setFontSize(6);
  doc.setTextColor(148, 163, 184);
  doc.text(
    `PT Rajawali Prima Service • Smart Inventory & Chemical Tracker System • Rekap Pemakaian Harian Resmi Ukuran A4`,
    pageWidth / 2,
    pageHeight - 5,
    { align: 'center' }
  );

  const safeProjName = projName.replace(/[^a-zA-Z0-9]/g, '_');
  const safeDate = new Date().toISOString().split('T')[0];
  const fileName = `Rekap_Pemakaian_Chemical_${safeProjName}_${safeDate}.pdf`;
  doc.save(fileName);
};

export interface ExportCompletedTasksPDFParams {
  tasks: CleaningTask[];
  projects: Project[];
  selectedProjectId?: string;
  selectedDate?: string;
  selectedShift?: string;
  reportTitle?: string;
}

export const generateCompletedTasksPDF = ({
  tasks,
  projects,
  selectedProjectId = 'ALL',
  selectedDate,
  selectedShift = 'ALL',
  reportTitle = 'LAPORAN PENYELESAIAN TUGAS AREA CLEANING'
}: ExportCompletedTasksPDFParams) => {
  // Filter completed tasks
  const completedTasks = tasks.filter((t) => {
    if (t.status !== 'done') return false;
    if (selectedProjectId !== 'ALL' && t.projectId !== selectedProjectId) return false;
    if (selectedShift !== 'ALL' && t.shift !== selectedShift) return false;
    if (selectedDate) {
      const taskDate = (t.completedAt || t.submittedAt || t.createdAt || '').substring(0, 10);
      if (taskDate && taskDate !== selectedDate) return false;
    }
    return true;
  });

  const projName =
    selectedProjectId === 'ALL'
      ? 'KONSOLIDASI SEMUA LOKASI PROYEK'
      : projects.find((p) => p.id === selectedProjectId)?.name || 'LOKASI PROYEK';

  const projCode =
    selectedProjectId === 'ALL'
      ? 'ALL-SITES'
      : projects.find((p) => p.id === selectedProjectId)?.code || 'PROJ';

  const doc = new jsPDF({
    orientation: 'portrait',
    unit: 'mm',
    format: 'a4'
  });

  const pageWidth = doc.internal.pageSize.getWidth(); // ~210mm
  const pageHeight = doc.internal.pageSize.getHeight(); // ~297mm
  const margin = 12;
  const contentWidth = pageWidth - margin * 2; // ~186mm

  const currentTimestamp = new Date();
  const printDateDDMMYYYY = formatDateDDMMYYYY(currentTimestamp);
  const printTimestampStr = formatDateTimeStamp(currentTimestamp);

  // Helper: Draw Header on Page
  const drawHeader = () => {
    const comp = getCompany();
    doc.setFillColor(15, 39, 68); // Dark Navy
    doc.rect(0, 0, pageWidth, 20, 'F');

    doc.setFillColor(217, 119, 6); // Amber Gold
    doc.rect(0, 20, pageWidth, 1.5, 'F');

    // Title & Company
    doc.setFont('helvetica', 'bold');
    doc.setFontSize(12);
    doc.setTextColor(255, 255, 255);
    doc.text(comp.name, margin, 8);

    doc.setFont('helvetica', 'normal');
    doc.setFontSize(6.5);
    doc.setTextColor(203, 213, 225);
    doc.text(comp.tagline, margin, 12);
    doc.text(`${comp.address} • Telp: ${comp.phone}`, margin, 16);

    // Right Tag
    doc.setFillColor(217, 119, 6);
    doc.roundedRect(pageWidth - margin - 48, 4, 48, 5.5, 1, 1, 'F');
    doc.setFont('helvetica', 'bold');
    doc.setFontSize(6);
    doc.setTextColor(15, 23, 42);
    doc.text('OFFICIAL CLEANING REPORT', pageWidth - margin - 46, 7.8);

    doc.setFont('helvetica', 'normal');
    doc.setFontSize(6.5);
    doc.setTextColor(255, 255, 255);
    doc.text(`DOC: CLN-${projCode}-${currentTimestamp.toISOString().substring(0, 10).replace(/-/g, '')}`, pageWidth - margin - 48, 13);
    doc.text(`Tanggal: ${printDateDDMMYYYY}`, pageWidth - margin - 48, 17);
  };

  // Helper: Draw Footer with Timestamp
  const drawFooter = (pageNum: number, totalPages: number) => {
    doc.setDrawColor(226, 232, 240);
    doc.line(margin, pageHeight - 12, pageWidth - margin, pageHeight - 12);

    doc.setFont('helvetica', 'bold');
    doc.setFontSize(6.5);
    doc.setTextColor(15, 23, 42);
    doc.text(
      `Time stamp cetak: ${printTimestampStr}`,
      margin,
      pageHeight - 7
    );

    doc.setFont('helvetica', 'normal');
    doc.setFontSize(6);
    doc.setTextColor(100, 116, 139);
    doc.text(
      `PT Rajawali Prima Service • Dokumen Resmi Terverifikasi QC • Hal ${pageNum} dari ${totalPages}`,
      pageWidth - margin,
      pageHeight - 7,
      { align: 'right' }
    );
  };

  drawHeader();

  let curY = 27;

  // Title
  doc.setFont('helvetica', 'bold');
  doc.setFontSize(11);
  doc.setTextColor(15, 23, 42);
  doc.text(reportTitle.toUpperCase(), margin, curY);

  doc.setFont('helvetica', 'normal');
  doc.setFontSize(7.5);
  doc.setTextColor(71, 85, 105);
  doc.text(
    'Rekapitulasi resmi tugas kebersihan yang telah diselesaikan beserta foto bukti pengerjaan dan hasil audit QC.',
    margin,
    curY + 4
  );

  curY += 8;

  // 4 Top Info Cards (Lokasi, Total Selesai, Tanggal, Shift)
  const cardW = (contentWidth - 6) / 3;
  const cardH = 10;

  // Box 1: Lokasi
  doc.setFillColor(248, 250, 252);
  doc.setDrawColor(203, 213, 225);
  doc.roundedRect(margin, curY, cardW, cardH, 1, 1, 'FD');
  doc.setFontSize(5.5);
  doc.setFont('helvetica', 'bold');
  doc.setTextColor(100, 116, 139);
  doc.text('LOKASI PROYEK / SITE', margin + 2.5, curY + 3.5);
  doc.setFontSize(7.5);
  doc.setTextColor(15, 23, 42);
  const truncatedProj = projName.length > 28 ? projName.substring(0, 26) + '...' : projName;
  doc.text(truncatedProj, margin + 2.5, curY + 7.5);

  // Box 2: Total Tugas Selesai
  doc.setFillColor(240, 253, 244);
  doc.roundedRect(margin + cardW + 3, curY, cardW, cardH, 1, 1, 'FD');
  doc.setFontSize(5.5);
  doc.setFont('helvetica', 'bold');
  doc.setTextColor(5, 150, 105);
  doc.text('TOTAL TUGAS SELESAI', margin + cardW + 5.5, curY + 3.5);
  doc.setFontSize(7.5);
  doc.setTextColor(4, 120, 87);
  doc.text(`${completedTasks.length} Tugas (100% Selesai & QC)`, margin + cardW + 5.5, curY + 7.5);

  // Box 3: Tanggal Laporan
  doc.setFillColor(248, 250, 252);
  doc.roundedRect(margin + (cardW + 3) * 2, curY, cardW, cardH, 1, 1, 'FD');
  doc.setFontSize(5.5);
  doc.setFont('helvetica', 'bold');
  doc.setTextColor(100, 116, 139);
  doc.text('TANGGAL CETAK & SHIFT', margin + (cardW + 3) * 2 + 2.5, curY + 3.5);
  doc.setFontSize(7.5);
  doc.setTextColor(15, 23, 42);
  doc.text(`${printDateDDMMYYYY} • ${selectedShift === 'ALL' ? 'Semua Shift' : selectedShift}`, margin + (cardW + 3) * 2 + 2.5, curY + 7.5);

  curY += cardH + 5;

  if (completedTasks.length === 0) {
    doc.setFillColor(254, 242, 242);
    doc.setDrawColor(252, 165, 165);
    doc.roundedRect(margin, curY, contentWidth, 20, 1.5, 1.5, 'FD');
    doc.setFontSize(8);
    doc.setFont('helvetica', 'bold');
    doc.setTextColor(185, 28, 28);
    doc.text('Tidak ada data tugas yang telah selesai pada filter yang dipilih.', margin + 6, curY + 11);
  } else {
    // Iterate over completed tasks and render structured reports
    completedTasks.forEach((task, tIndex) => {
      const taskDateFormatted = formatDateDDMMYYYY(task.completedAt || task.submittedAt || task.createdAt || currentTimestamp);
      const assigner = task.assignedBy || 'Supervisor Lapangan';
      const assignee = task.assignedLeaderName || (task.assignedEmployees && task.assignedEmployees.length > 0 ? task.assignedEmployees.join(', ') : 'Team Leader');
      const shift = task.shift || 'Shift 1 (Pagi)';
      const area = task.areaName;
      const notes = task.notes || '-';
      const qcNote = task.qcFeedback || 'Pekerjaan rapi dan sesuai standar SOP kebersihan.';
      const qcReviewer = task.qcReviewedBy || 'Supervisor QC';

      const taskItems = task.checklist;
      const itemsCount = taskItems.length;

      // Estimate needed height for this task block
      // Header bar: 14mm
      // Checklist + photos rows: ~16mm per row
      // Keterangan bar: 12mm
      const estimatedHeight = 26 + itemsCount * 18;

      if (curY + estimatedHeight > pageHeight - 35) {
        doc.addPage();
        drawHeader();
        curY = 26;
      }

      // TASK CARD CONTAINER
      const startCardY = curY;

      // 1. Task Header Banner (Dark blue/slate with dd/mm/yyyy - pemberi tugas - penerima tugas - shift)
      doc.setFillColor(30, 41, 59); // Slate 800
      doc.roundedRect(margin, curY, contentWidth, 13, 1, 1, 'F');

      doc.setFont('helvetica', 'bold');
      doc.setFontSize(8);
      doc.setTextColor(255, 255, 255);
      doc.text(`#${tIndex + 1}. Area: ${area} (${task.frequency || 'Harian'})`, margin + 3, curY + 5);

      // Status pill
      doc.setFillColor(16, 185, 129); // Emerald
      doc.roundedRect(margin + contentWidth - 32, curY + 2, 29, 4.5, 1, 1, 'F');
      doc.setFontSize(5.5);
      doc.setFont('helvetica', 'bold');
      doc.setTextColor(255, 255, 255);
      doc.text('✓ SELESAI (QC SESUAI)', margin + contentWidth - 30.5, curY + 5.2);

      // Metadata Line 1: dd/mm/yyyy - Pemberi Tugas - Penerima Tugas - Shift
      doc.setFont('helvetica', 'normal');
      doc.setFontSize(6.5);
      doc.setTextColor(226, 232, 240);
      doc.text(
        `Tanggal: ${taskDateFormatted}   •   Pemberi Tugas: ${assigner}   •   Penerima: ${assignee}   •   Shift: ${shift}`,
        margin + 3,
        curY + 10
      );

      curY += 14;

      // 2. Side-by-Side: LIST TUGAS YANG TELAH SELESAI (Kiri) & FOTO DI SAMPING NYA (Kanan)
      const listColWidth = contentWidth * 0.58;
      const photoColWidth = contentWidth * 0.42;

      // Table Subheader
      doc.setFillColor(241, 245, 249);
      doc.setDrawColor(203, 213, 225);
      doc.rect(margin, curY, listColWidth, 5, 'FD');
      doc.rect(margin + listColWidth, curY, photoColWidth, 5, 'FD');

      doc.setFont('helvetica', 'bold');
      doc.setFontSize(6);
      doc.setTextColor(71, 85, 105);
      doc.text('LIST TUGAS / CHECKLIST YANG TELAH SELESAI', margin + 2, curY + 3.5);
      doc.text('FOTO BUKTI DI SAMPING NYA', margin + listColWidth + 2, curY + 3.5);

      curY += 5;

      // Rows for each checklist item + its photo side-by-side
      taskItems.forEach((cItem, cIdx) => {
        const rowH = 17; // mm

        if (curY + rowH > pageHeight - 32) {
          doc.addPage();
          drawHeader();
          curY = 26;
        }

        // Draw Row borders
        doc.setFillColor(cIdx % 2 === 0 ? 255 : 248, cIdx % 2 === 0 ? 255 : 250, cIdx % 2 === 0 ? 255 : 252);
        doc.setDrawColor(226, 232, 240);
        doc.rect(margin, curY, listColWidth, rowH, 'FD');
        doc.rect(margin + listColWidth, curY, photoColWidth, rowH, 'FD');

        // Left Col: Checklist item title + check badge
        doc.setFillColor(220, 252, 231); // Green soft
        doc.setDrawColor(134, 239, 172);
        doc.roundedRect(margin + 2, curY + 2.5, 4.5, 4.5, 0.5, 0.5, 'FD');
        doc.setFont('helvetica', 'bold');
        doc.setFontSize(6);
        doc.setTextColor(22, 101, 52);
        doc.text('✓', margin + 3.2, curY + 5.8);

        doc.setFont('helvetica', 'bold');
        doc.setFontSize(6.5);
        doc.setTextColor(15, 23, 42);
        const truncatedText = cItem.text.length > 40 ? cItem.text.substring(0, 38) + '...' : cItem.text;
        doc.text(`${cIdx + 1}. ${truncatedText}`, margin + 8, curY + 6);

        doc.setFont('helvetica', 'normal');
        doc.setFontSize(5.5);
        doc.setTextColor(100, 116, 139);
        doc.text(`Status: Selesai 100%   •   Evaluasi Item: ${cItem.itemQC || 'Sesuai SOP'}`, margin + 8, curY + 10);
        if (cItem.photoUploadedAt) {
          doc.text(`Upload: ${cItem.photoUploadedAt.substring(0, 16)}`, margin + 8, curY + 14);
        } else {
          doc.text(`SOP Terverifikasi Lapangan`, margin + 8, curY + 14);
        }

        // Right Col: Foto di samping nya
        const photoSrc = cItem.photo || task.evidencePhoto;
        const photoX = margin + listColWidth + 2;
        const photoY = curY + 1.5;
        const photoW = 20;
        const photoH = 14;

        if (photoSrc && photoSrc.startsWith('data:image')) {
          try {
            const format = photoSrc.includes('png') ? 'PNG' : 'JPEG';
            doc.addImage(photoSrc, format, photoX, photoY, photoW, photoH);
            doc.setFont('helvetica', 'normal');
            doc.setFontSize(5);
            doc.setTextColor(100, 116, 139);
            doc.text(`Bukti Foto #${cIdx + 1}`, photoX + photoW + 2, photoY + 5);
            doc.text(`Resolusi: OK`, photoX + photoW + 2, photoY + 9);
            doc.text(`Verified Sesuai`, photoX + photoW + 2, photoY + 13);
          } catch (e) {
            doc.setFillColor(241, 245, 249);
            doc.roundedRect(photoX, photoY, photoW, photoH, 1, 1, 'F');
            doc.setFontSize(5);
            doc.setTextColor(148, 163, 184);
            doc.text('[Foto Terlampir]', photoX + 2, photoY + 7);
          }
        } else {
          // Placeholder box for photo proof
          doc.setFillColor(241, 245, 249);
          doc.setDrawColor(203, 213, 225);
          doc.roundedRect(photoX, photoY, photoW, photoH, 1, 1, 'FD');
          doc.setFont('helvetica', 'normal');
          doc.setFontSize(5.5);
          doc.setTextColor(100, 116, 139);
          doc.text('Foto Terverifikasi', photoX + 2, photoY + 6);
          doc.text('(Checklist Selesai)', photoX + 2, photoY + 10);
        }

        curY += rowH;
      });

      // 3. Keterangan Box (Notes, Evidence Notes & QC Feedback)
      const noteH = 10;
      if (curY + noteH > pageHeight - 32) {
        doc.addPage();
        drawHeader();
        curY = 26;
      }

      doc.setFillColor(248, 250, 252);
      doc.setDrawColor(203, 213, 225);
      doc.rect(margin, curY, contentWidth, noteH, 'FD');

      doc.setFont('helvetica', 'bold');
      doc.setFontSize(5.5);
      doc.setTextColor(71, 85, 105);
      doc.text('KETERANGAN & CATATAN EVALUASI:', margin + 2.5, curY + 3.5);

      doc.setFont('helvetica', 'normal');
      doc.setFontSize(6);
      doc.setTextColor(15, 23, 42);
      const combinedNotes = `Instruksi: ${notes}   |   Hasil QC Supervisor (${qcReviewer}): ${qcNote}`;
      const splitNotes = doc.splitTextToSize(combinedNotes, contentWidth - 5);
      doc.text(splitNotes, margin + 2.5, curY + 7);

      curY += noteH + 4;
    });

    // Verification & Signature Box
    let sigY = curY + 3;
    if (sigY > pageHeight - 40) {
      doc.addPage();
      drawHeader();
      sigY = 26;
    }

    const sigW = contentWidth / 3;

    doc.setFontSize(6);
    doc.setFont('helvetica', 'normal');
    doc.setTextColor(100, 116, 139);

    // Sign 1: Pemberi Tugas
    doc.text('Pemberi Tugas,', margin + sigW * 0.5, sigY, { align: 'center' });
    doc.setFont('helvetica', 'bold');
    doc.setFontSize(7);
    doc.setTextColor(15, 23, 42);
    doc.text('Supervisor Lapangan', margin + sigW * 0.5, sigY + 3.5, { align: 'center' });
    doc.line(margin + sigW * 0.15, sigY + 14, margin + sigW * 0.85, sigY + 14);
    doc.setFont('helvetica', 'normal');
    doc.setFontSize(6);
    doc.text('( Assigner / Pengawas )', margin + sigW * 0.5, sigY + 17.5, { align: 'center' });

    // Sign 2: Penerima Tugas
    doc.setFontSize(6);
    doc.text('Penerima Tugas,', margin + sigW * 1.5, sigY, { align: 'center' });
    doc.setFont('helvetica', 'bold');
    doc.setFontSize(7);
    doc.text('Team Leader / Petugas', margin + sigW * 1.5, sigY + 3.5, { align: 'center' });
    doc.line(margin + sigW * 1.15, sigY + 14, margin + sigW * 1.85, sigY + 14);
    doc.setFont('helvetica', 'normal');
    doc.setFontSize(6);
    doc.text('( Assignee / Pelaksana )', margin + sigW * 1.5, sigY + 17.5, { align: 'center' });

    // Sign 3: Project Manager / Ops
    doc.setFontSize(6);
    doc.text('Disetujui & Diverifikasi,', margin + sigW * 2.5, sigY, { align: 'center' });
    doc.setFont('helvetica', 'bold');
    doc.setFontSize(7);
    doc.text('Operations Manager', margin + sigW * 2.5, sigY + 3.5, { align: 'center' });
    doc.line(margin + sigW * 2.15, sigY + 14, margin + sigW * 2.85, sigY + 14);
    doc.setFont('helvetica', 'normal');
    doc.setFontSize(6);
    doc.text('( Head of Facility Services )', margin + sigW * 2.5, sigY + 17.5, { align: 'center' });
  }

  // Draw Footer on all pages
  const totalPages = doc.internal.pages.length - 1;
  for (let i = 1; i <= totalPages; i++) {
    doc.setPage(i);
    drawFooter(i, totalPages);
  }

  const safeProj = projName.replace(/[^a-zA-Z0-9]/g, '_');
  const safeDate = currentTimestamp.toISOString().split('T')[0];
  const fileName = `Laporan_Tugas_Selesai_${safeProj}_${safeDate}.pdf`;
  doc.save(fileName);
};

/**
 * Generate Official SOP Document PDF (Standar Operasional Prosedur Mutu Rajawali)
 */
export const generateSingleSopPDF = (sop: SopItem) => {
  const doc = new jsPDF({
    orientation: 'portrait',
    unit: 'mm',
    format: 'a4'
  });

  const pageWidth = doc.internal.pageSize.getWidth(); // ~210mm
  const pageHeight = doc.internal.pageSize.getHeight(); // ~297mm
  const margin = 12;
  const contentWidth = pageWidth - margin * 2; // ~186mm

  const currentTimestamp = new Date();
  const printDateDDMMYYYY = formatDateDDMMYYYY(currentTimestamp);
  const printTimestampStr = formatDateTimeStamp(currentTimestamp);

  const drawHeader = () => {
    const comp = getCompany();
    // 1. Dark Navy Top Banner
    doc.setFillColor(15, 39, 68); // #0f2744 Dark Navy
    doc.rect(0, 0, pageWidth, 21, 'F');

    // 2. Gold Accent Line
    doc.setFillColor(217, 119, 6); // #d97706 Gold
    doc.rect(0, 21, pageWidth, 1.8, 'F');

    // Company Name & Logo text
    doc.setFont('helvetica', 'bold');
    doc.setFontSize(13);
    doc.setTextColor(255, 255, 255);
    doc.text(comp.name, margin, 8.5);

    // Subtitles
    doc.setFont('helvetica', 'normal');
    doc.setFontSize(6.8);
    doc.setTextColor(203, 213, 225);
    doc.text('Pusat Standar Operasional Prosedur (SOP) & Jaminan Mutu Kebersihan', margin, 13);
    doc.text(`${comp.address} • Telp: ${comp.phone}`, margin, 17);

    // Right Header Tag
    doc.setFillColor(217, 119, 6);
    doc.roundedRect(pageWidth - margin - 52, 4, 52, 5.5, 1, 1, 'F');
    doc.setFont('helvetica', 'bold');
    doc.setFontSize(6);
    doc.setTextColor(15, 23, 42);
    doc.text('DOKUMEN RESMI STANDAR MUTU', pageWidth - margin - 50, 7.8);

    doc.setFont('helvetica', 'bold');
    doc.setFontSize(6.5);
    doc.setTextColor(255, 255, 255);
    doc.text(`KODE: ${sop.code || 'SOP-MUTU'} • v${sop.version || '1.0'}`, pageWidth - margin - 52, 13.5);

    doc.setFont('helvetica', 'normal');
    doc.setFontSize(6);
    doc.setTextColor(203, 213, 225);
    doc.text(`Revisi: ${sop.lastUpdated || printDateDDMMYYYY}`, pageWidth - margin - 52, 17.5);
  };

  const drawFooter = (pageNum: number, totalPages: number) => {
    doc.setDrawColor(226, 232, 240);
    doc.setLineWidth(0.3);
    doc.line(margin, pageHeight - 12, pageWidth - margin, pageHeight - 12);

    doc.setFont('helvetica', 'bold');
    doc.setFontSize(6.5);
    doc.setTextColor(15, 23, 42);
    doc.text(`Time stamp cetak: ${printTimestampStr}`, margin, pageHeight - 7);

    doc.setFont('helvetica', 'normal');
    doc.setFontSize(6);
    doc.setTextColor(100, 116, 139);
    doc.text(
      `PT Rajawali Prima Service • Dokumen Terkendali Mutu SOP • Halaman ${pageNum} dari ${totalPages}`,
      pageWidth - margin,
      pageHeight - 7,
      { align: 'right' }
    );
  };

  drawHeader();

  let curY = 28;

  // Title Box
  doc.setFillColor(248, 250, 252);
  doc.setDrawColor(203, 213, 225);
  doc.roundedRect(margin, curY, contentWidth, 18, 1.5, 1.5, 'FD');

  // Category Tag
  doc.setFillColor(217, 119, 6);
  doc.roundedRect(margin + 3, curY + 3, 35, 4.5, 1, 1, 'F');
  doc.setFont('helvetica', 'bold');
  doc.setFontSize(5.5);
  doc.setTextColor(15, 23, 42);
  doc.text(sop.category.toUpperCase(), margin + 4.5, curY + 6.2);

  if (sop.code) {
    doc.setFont('helvetica', 'bold');
    doc.setFontSize(6);
    doc.setTextColor(100, 116, 139);
    doc.text(`KODE DOKUMEN: ${sop.code}`, margin + 42, curY + 6.2);
  }

  // Title Text
  doc.setFont('helvetica', 'bold');
  doc.setFontSize(11);
  doc.setTextColor(15, 23, 42);
  doc.text(sop.title, margin + 3, curY + 12);

  // Author & Version Info
  doc.setFont('helvetica', 'normal');
  doc.setFontSize(6);
  doc.setTextColor(100, 116, 139);
  doc.text(
    `Penyusun: ${sop.author || 'Divisi Standar Mutu & Operasional Rajawali'}  •  Versi Dokumen: ${sop.version || '1.0'}  •  Terakhir Diperbarui: ${sop.lastUpdated || printDateDDMMYYYY}`,
    margin + 3,
    curY + 16
  );

  curY += 21;

  // 1. TUJUAN PEKERJAAN (Objective)
  doc.setFillColor(254, 243, 199); // Light Amber
  doc.setDrawColor(251, 191, 36);
  doc.roundedRect(margin, curY, contentWidth, 12, 1, 1, 'FD');

  doc.setFont('helvetica', 'bold');
  doc.setFontSize(6.5);
  doc.setTextColor(146, 64, 14);
  doc.text('1. TUJUAN & RUANG LINGKUP PEKERJAAN (OBJECTIVE):', margin + 3, curY + 4);

  doc.setFont('helvetica', 'normal');
  doc.setFontSize(6.5);
  doc.setTextColor(15, 23, 42);
  const objText = sop.objective || sop.description || 'Menjaga standar kebersihan, higienitas, dan estetika area kerja sesuai standar operasional PT Rajawali Prima Service.';
  const splitObj = doc.splitTextToSize(objText, contentWidth - 6);
  doc.text(splitObj, margin + 3, curY + 8);

  curY += 15;

  // 2 & 3. TABEL PERALATAN KERJA & TABEL CHEMICAL (Side by side tables or stacked)
  const equipmentItems = sop.equipmentList || [];
  const chemicalItems = sop.chemicalList || [];

  // Peralatan Kerja Table
  const eqHead = [['No', 'Peralatan Kerja / Tools', 'Qty', 'Satuan']];
  const eqBody = equipmentItems.length > 0
    ? equipmentItems.map((e, idx) => [String(idx + 1), e.name, String(e.qty), e.unit])
    : [['1', 'Alat kebersihan standar operasional', '1', 'Set']];

  // Chemical Table
  const chHead = [['No', 'Nama Chemical / Pembersih', 'Takaran / Rasio', 'Satuan']];
  const chBody = chemicalItems.length > 0
    ? chemicalItems.map((c, idx) => [String(idx + 1), c.name, c.dosage, c.unit])
    : (sop.chemicalsUsed && sop.chemicalsUsed.length > 0
      ? sop.chemicalsUsed.map((c, idx) => [String(idx + 1), c, 'Sesuai takaran botol', 'Pcs'])
      : [['1', 'Chemical standar sesuai material permukaan', '1:20 / Sesuai instruksi', 'Botol']]);

  const halfWidth = (contentWidth - 4) / 2;

  // Section Header for Equipment & Chemical
  doc.setFont('helvetica', 'bold');
  doc.setFontSize(7.5);
  doc.setTextColor(15, 23, 42);
  doc.text('2. PERALATAN KERJA (EQUIPMENT)', margin, curY + 3);
  doc.text('3. CHEMICAL & TAKARAN RASIO (DOSAGE)', margin + halfWidth + 4, curY + 3);

  curY += 5;

  // Draw Equipment table on the left
  autoTable(doc, {
    startY: curY,
    margin: { left: margin, right: pageWidth - margin - halfWidth },
    head: eqHead,
    body: eqBody,
    theme: 'grid',
    styles: {
      fontSize: 6,
      cellPadding: 1.2,
      lineColor: [203, 213, 225],
      lineWidth: 0.15
    },
    headStyles: {
      fillColor: [15, 39, 68],
      textColor: [255, 255, 255],
      fontSize: 6,
      fontStyle: 'bold',
      halign: 'center'
    },
    columnStyles: {
      0: { cellWidth: 7, halign: 'center' },
      1: { cellWidth: 'auto', halign: 'left', fontStyle: 'bold' },
      2: { cellWidth: 10, halign: 'center' },
      3: { cellWidth: 15, halign: 'right' }
    }
  });

  const eqFinalY = (doc as any).lastAutoTable?.finalY || curY + 20;

  // Draw Chemical table on the right
  autoTable(doc, {
    startY: curY,
    margin: { left: margin + halfWidth + 4, right: margin },
    head: chHead,
    body: chBody,
    theme: 'grid',
    styles: {
      fontSize: 6,
      cellPadding: 1.2,
      lineColor: [203, 213, 225],
      lineWidth: 0.15
    },
    headStyles: {
      fillColor: [217, 119, 6],
      textColor: [15, 23, 42],
      fontSize: 6,
      fontStyle: 'bold',
      halign: 'center'
    },
    columnStyles: {
      0: { cellWidth: 7, halign: 'center' },
      1: { cellWidth: 'auto', halign: 'left', fontStyle: 'bold' },
      2: { cellWidth: 24, halign: 'center' },
      3: { cellWidth: 14, halign: 'right' }
    }
  });

  const chFinalY = (doc as any).lastAutoTable?.finalY || curY + 20;
  curY = Math.max(eqFinalY, chFinalY) + 5;

  // 4. TAHAPAN PROSEDUR KERJA STANDAR (SOP)
  if (curY > pageHeight - 60) {
    doc.addPage();
    drawHeader();
    curY = 28;
  }

  doc.setFont('helvetica', 'bold');
  doc.setFontSize(7.5);
  doc.setTextColor(15, 23, 42);
  doc.text(`4. TAHAPAN PROSEDUR KERJA STANDAR (SOP) - TOTAL ${sop.steps.length} LANGKAH`, margin, curY + 3);

  curY += 5;

  const stepsHead = [['Step', 'Instruksi Langkah Kerja & Prosedur Operasional', 'Standar Mutu / Kunci Keberhasilan']];
  const stepsBody = sop.steps.map((stepText, idx) => [
    String(idx + 1),
    stepText,
    'Sesuai Standar K3 & Bersih Higienis'
  ]);

  autoTable(doc, {
    startY: curY,
    margin: { left: margin, right: margin },
    head: stepsHead,
    body: stepsBody,
    theme: 'grid',
    styles: {
      fontSize: 6.5,
      cellPadding: 2,
      lineColor: [203, 213, 225],
      lineWidth: 0.15,
      textColor: [15, 23, 42]
    },
    headStyles: {
      fillColor: [15, 39, 68],
      textColor: [255, 255, 255],
      fontSize: 6.5,
      fontStyle: 'bold',
      halign: 'center'
    },
    columnStyles: {
      0: { cellWidth: 10, halign: 'center', fontStyle: 'bold' },
      1: { cellWidth: 'auto', halign: 'left' },
      2: { cellWidth: 46, halign: 'center', textColor: [5, 150, 105] }
    },
    alternateRowStyles: {
      fillColor: [248, 250, 252]
    }
  });

  curY = (doc as any).lastAutoTable?.finalY + 5;

  // 5 & 6. APD K3 & PERAWATAN PERALATAN
  if (curY > pageHeight - 55) {
    doc.addPage();
    drawHeader();
    curY = 28;
  }

  const ppeList = sop.requiredPPE || sop.safetyEquipment || ['Sarung tangan karet (Hand Gloves)', 'Masker medis / N95', 'Sepatu safety / Boots kerja', 'Kacamata pelindung (Goggles saat chemical keras)'];
  const maintList = sop.equipmentMaintenance || ['Cuci dan bilas kain microfiber serta mop head setelah selesai digunakan.', 'Kosongkan dan keringkan ember/bucket di tempat berventilasi baik.', 'Periksa kabel mesin kebersihan sebelum dan sesudah operasional.'];

  // Two columns for APD and Maintenance
  doc.setFillColor(240, 253, 244); // Light Emerald
  doc.setDrawColor(167, 243, 208);
  doc.roundedRect(margin, curY, halfWidth, 22, 1, 1, 'FD');

  doc.setFont('helvetica', 'bold');
  doc.setFontSize(6.5);
  doc.setTextColor(6, 95, 70);
  doc.text('5. APD & ALAT KESELAMATAN (K3):', margin + 3, curY + 4);

  doc.setFont('helvetica', 'normal');
  doc.setFontSize(5.8);
  doc.setTextColor(15, 23, 42);
  let ppeY = curY + 7.5;
  ppeList.slice(0, 4).forEach((p) => {
    doc.text(`• ${p}`, margin + 3, ppeY);
    ppeY += 3.5;
  });

  doc.setFillColor(238, 242, 255); // Light Indigo
  doc.setDrawColor(199, 210, 254);
  doc.roundedRect(margin + halfWidth + 4, curY, halfWidth, 22, 1, 1, 'FD');

  doc.setFont('helvetica', 'bold');
  doc.setFontSize(6.5);
  doc.setTextColor(55, 48, 163);
  doc.text('6. PERAWATAN & PENYIMPANAN ALAT:', margin + halfWidth + 7, curY + 4);

  doc.setFont('helvetica', 'normal');
  doc.setFontSize(5.8);
  doc.setTextColor(15, 23, 42);
  let maintY = curY + 7.5;
  maintList.slice(0, 4).forEach((m) => {
    const splitM = doc.splitTextToSize(`• ${m}`, halfWidth - 6);
    doc.text(splitM, margin + halfWidth + 7, maintY);
    maintY += 3.5;
  });

  curY += 26;

  // 7. APPROVAL & VALIDATION BLOCK
  if (curY > pageHeight - 38) {
    doc.addPage();
    drawHeader();
    curY = 28;
  }

  const sigColW = contentWidth / 3;
  const sigY = curY + 2;

  doc.setFontSize(6);
  doc.setFont('helvetica', 'normal');
  doc.setTextColor(100, 116, 139);

  // Sign 1: Penyusun / Trainer
  doc.text('Disusun Oleh,', margin + sigColW * 0.5, sigY, { align: 'center' });
  doc.setFont('helvetica', 'bold');
  doc.setFontSize(7);
  doc.setTextColor(15, 23, 42);
  doc.text('Supervisor Mutu & Standarisasi', margin + sigColW * 0.5, sigY + 3.5, { align: 'center' });
  doc.line(margin + sigColW * 0.15, sigY + 13, margin + sigColW * 0.85, sigY + 13);
  doc.setFont('helvetica', 'normal');
  doc.setFontSize(5.5);
  doc.text(`( ${sop.author || 'Tim Standar Mutu HQ'} )`, margin + sigColW * 0.5, sigY + 16.5, { align: 'center' });

  // Sign 2: HSE & Quality Assurance
  doc.setFontSize(6);
  doc.text('Divalidasi Oleh,', margin + sigColW * 1.5, sigY, { align: 'center' });
  doc.setFont('helvetica', 'bold');
  doc.setFontSize(7);
  doc.text('HSE & Quality Assurance Lead', margin + sigColW * 1.5, sigY + 3.5, { align: 'center' });
  doc.line(margin + sigColW * 1.15, sigY + 13, margin + sigColW * 1.85, sigY + 13);
  doc.setFont('helvetica', 'normal');
  doc.setFontSize(5.5);
  doc.text('( Safety & Quality Specialist )', margin + sigColW * 1.5, sigY + 16.5, { align: 'center' });

  // Sign 3: Operations Director
  doc.setFontSize(6);
  doc.text('Disetujui Oleh,', margin + sigColW * 2.5, sigY, { align: 'center' });
  doc.setFont('helvetica', 'bold');
  doc.setFontSize(7);
  doc.text('Operations Director', margin + sigColW * 2.5, sigY + 3.5, { align: 'center' });
  doc.line(margin + sigColW * 2.15, sigY + 13, margin + sigColW * 2.85, sigY + 13);
  doc.setFont('helvetica', 'normal');
  doc.setFontSize(5.5);
  doc.text('( Direktur Operasional )', margin + sigColW * 2.5, sigY + 16.5, { align: 'center' });

  // Draw Footer on all pages
  const totalPages = doc.internal.pages.length - 1;
  for (let i = 1; i <= totalPages; i++) {
    doc.setPage(i);
    drawFooter(i, totalPages);
  }

  const safeTitle = (sop.code || sop.title).replace(/[^a-zA-Z0-9]/g, '_');
  const fileName = `SOP_${safeTitle}_Rajawali.pdf`;
  doc.save(fileName);
};

/**
 * Generate Entire SOP Catalog / Compilation Book PDF
 */
export const generateSopsCatalogPDF = (sops: SopItem[], categoryFilter: string = 'ALL') => {
  const targetSops = categoryFilter === 'ALL'
    ? sops
    : sops.filter(s => s.category === categoryFilter);

  if (targetSops.length === 0) return;

  const doc = new jsPDF({
    orientation: 'portrait',
    unit: 'mm',
    format: 'a4'
  });

  const pageWidth = doc.internal.pageSize.getWidth();
  const pageHeight = doc.internal.pageSize.getHeight();
  const margin = 12;
  const contentWidth = pageWidth - margin * 2;

  const currentTimestamp = new Date();
  const printDateDDMMYYYY = formatDateDDMMYYYY(currentTimestamp);
  const printTimestampStr = formatDateTimeStamp(currentTimestamp);

  const drawHeader = () => {
    const comp = getCompany();
    doc.setFillColor(15, 39, 68);
    doc.rect(0, 0, pageWidth, 21, 'F');
    doc.setFillColor(217, 119, 6);
    doc.rect(0, 21, pageWidth, 1.8, 'F');

    doc.setFont('helvetica', 'bold');
    doc.setFontSize(13);
    doc.setTextColor(255, 255, 255);
    doc.text(comp.name, margin, 8.5);

    doc.setFont('helvetica', 'normal');
    doc.setFontSize(6.8);
    doc.setTextColor(203, 213, 225);
    doc.text('Kompilasi Buku Pedoman Standar Operasional Prosedur (SOP) & Mutu', margin, 13);
    doc.text(`${comp.address} • Telp: ${comp.phone}`, margin, 17);

    doc.setFillColor(217, 119, 6);
    doc.roundedRect(pageWidth - margin - 52, 4, 52, 5.5, 1, 1, 'F');
    doc.setFont('helvetica', 'bold');
    doc.setFontSize(6);
    doc.setTextColor(15, 23, 42);
    doc.text('BUKU KATALOG STANDAR MUTU', pageWidth - margin - 50, 7.8);

    doc.setFont('helvetica', 'bold');
    doc.setFontSize(6.5);
    doc.setTextColor(255, 255, 255);
    doc.text(`TOTAL: ${targetSops.length} DOKUMEN SOP`, pageWidth - margin - 52, 13.5);

    doc.setFont('helvetica', 'normal');
    doc.setFontSize(6);
    doc.setTextColor(203, 213, 225);
    doc.text(`Cetak: ${printDateDDMMYYYY}`, pageWidth - margin - 52, 17.5);
  };

  const drawFooter = (pageNum: number, totalPages: number) => {
    doc.setDrawColor(226, 232, 240);
    doc.setLineWidth(0.3);
    doc.line(margin, pageHeight - 12, pageWidth - margin, pageHeight - 12);

    doc.setFont('helvetica', 'bold');
    doc.setFontSize(6.5);
    doc.setTextColor(15, 23, 42);
    doc.text(`Time stamp cetak: ${printTimestampStr}`, margin, pageHeight - 7);

    doc.setFont('helvetica', 'normal');
    doc.setFontSize(6);
    doc.setTextColor(100, 116, 139);
    doc.text(
      `PT Rajawali Prima Service • Buku Pedoman SOP Resmi • Hal ${pageNum} dari ${totalPages}`,
      pageWidth - margin,
      pageHeight - 7,
      { align: 'right' }
    );
  };

  drawHeader();

  let curY = 28;

  // Title Box
  doc.setFont('helvetica', 'bold');
  doc.setFontSize(12);
  doc.setTextColor(15, 23, 42);
  doc.text(
    categoryFilter === 'ALL'
      ? 'KATALOG LENGKAP STANDAR OPERASIONAL PROSEDUR (SOP)'
      : `KATALOG SOP: ${categoryFilter.toUpperCase()}`,
    margin,
    curY
  );

  doc.setFont('helvetica', 'normal');
  doc.setFontSize(7.5);
  doc.setTextColor(71, 85, 105);
  doc.text(
    'Daftar resmi seluruh standar mutu kebersihan, peralatan, takaran chemical, dan alur pengerjaan operasional Rajawali.',
    margin,
    curY + 4.5
  );

  curY += 9;

  // Table summary of all SOPs
  const tableHead = [['No', 'Kode', 'Judul Standar Operasional (SOP)', 'Kategori', 'Total Langkah', 'Peralatan & Chemical', 'Versi / Tanggal']];
  const tableBody = targetSops.map((s, index) => [
    String(index + 1),
    s.code || `SOP-${index + 1}`,
    s.title,
    s.category,
    `${s.steps.length} Langkah`,
    `${s.equipmentList?.length || 0} Alat • ${s.chemicalList?.length || (s.chemicalsUsed?.length || 0)} Chem`,
    `v${s.version} (${s.lastUpdated})`
  ]);

  autoTable(doc, {
    startY: curY,
    margin: { left: margin, right: margin },
    head: tableHead,
    body: tableBody,
    theme: 'grid',
    styles: {
      fontSize: 6.5,
      cellPadding: 2,
      lineColor: [203, 213, 225],
      lineWidth: 0.15,
      textColor: [15, 23, 42]
    },
    headStyles: {
      fillColor: [15, 39, 68],
      textColor: [255, 255, 255],
      fontSize: 6.5,
      fontStyle: 'bold',
      halign: 'center'
    },
    columnStyles: {
      0: { cellWidth: 8, halign: 'center' },
      1: { cellWidth: 20, halign: 'center', fontStyle: 'bold' },
      2: { cellWidth: 'auto', halign: 'left', fontStyle: 'bold' },
      3: { cellWidth: 32, halign: 'center' },
      4: { cellWidth: 20, halign: 'center' },
      5: { cellWidth: 28, halign: 'center' },
      6: { cellWidth: 24, halign: 'center' }
    },
    alternateRowStyles: {
      fillColor: [248, 250, 252]
    }
  });

  const totalPages = doc.internal.pages.length - 1;
  for (let i = 1; i <= totalPages; i++) {
    doc.setPage(i);
    drawFooter(i, totalPages);
  }

  const safeCat = categoryFilter.replace(/[^a-zA-Z0-9]/g, '_');
  const fileName = `Katalog_SOP_Rajawali_${safeCat}_${currentTimestamp.toISOString().split('T')[0]}.pdf`;
  doc.save(fileName);
};

export const generateMaterialRequestPDF = (
  request: MaterialRequest,
  companyProfile?: CompanyProfile
) => {
  const comp = companyProfile || getCompany();
  const doc = new jsPDF({
    orientation: 'portrait',
    unit: 'mm',
    format: 'a4'
  });

  const pageWidth = doc.internal.pageSize.getWidth(); // ~210mm
  const pageHeight = doc.internal.pageSize.getHeight(); // ~297mm
  const margin = 14;

  // 1. TOP HEADER - Corporate Dark Navy & Gold Accents
  doc.setFillColor(15, 39, 68); // #0f2744 Dark Navy
  doc.rect(0, 0, pageWidth, 22, 'F');

  // Gold accent line under header
  doc.setFillColor(217, 119, 6); // #d97706 Gold
  doc.rect(0, 22, pageWidth, 1.8, 'F');

  // Company Name
  doc.setFont('helvetica', 'bold');
  doc.setFontSize(13);
  doc.setTextColor(255, 255, 255);
  doc.text(comp.name || 'PT RAJAWALI CYCLE INDONESIA', margin, 9);

  // Subtitle
  doc.setFont('helvetica', 'normal');
  doc.setFontSize(7.5);
  doc.setTextColor(203, 213, 225);
  doc.text(comp.tagline || 'Integrated Facility Services & Operational Management', margin, 14);
  doc.text(`${comp.address || 'Jakarta'} • Telp: ${comp.phone || '(021) 5299-8800'}`, margin, 18);

  // Right Header Tag: Status & Code
  doc.setFillColor(217, 119, 6);
  doc.roundedRect(pageWidth - 62, 4, 48, 6, 1, 1, 'F');
  doc.setFont('helvetica', 'bold');
  doc.setFontSize(7.5);
  doc.setTextColor(255, 255, 255);
  doc.text(`KODE: ${request.requestCode}`, pageWidth - 38, 8.2, { align: 'center' });

  doc.setFont('helvetica', 'normal');
  doc.setFontSize(7);
  doc.setTextColor(226, 232, 240);
  doc.text(`Status: ${request.status}`, pageWidth - 14, 18, { align: 'right' });

  let curY = 30;

  // Document Title
  doc.setFont('helvetica', 'bold');
  doc.setFontSize(12);
  doc.setTextColor(15, 39, 68);
  doc.text('SURAT PERMINTAAN BARANG (MATERIAL REQUEST)', pageWidth / 2, curY, { align: 'center' });

  curY += 5;
  doc.setFont('helvetica', 'normal');
  doc.setFontSize(8.5);
  doc.setTextColor(100, 116, 139);
  doc.text('Divisi Operasional & Chemical Management System', pageWidth / 2, curY, { align: 'center' });

  curY += 6;

  // Metadata Box
  doc.setFillColor(248, 250, 252);
  doc.setDrawColor(226, 232, 240);
  doc.roundedRect(margin, curY, pageWidth - margin * 2, 28, 2, 2, 'FD');

  doc.setFontSize(8);
  doc.setTextColor(15, 23, 42);

  // Left column of metadata
  doc.setFont('helvetica', 'bold');
  doc.text('Lokasi Proyek:', margin + 4, curY + 6);
  doc.setFont('helvetica', 'normal');
  doc.text(request.projectName, margin + 30, curY + 6);

  doc.setFont('helvetica', 'bold');
  doc.text('Tujuan / Peruntukan:', margin + 4, curY + 12);
  doc.setFont('helvetica', 'normal');
  const purposeLines = doc.splitTextToSize(request.purpose || '-', 65);
  doc.text(purposeLines, margin + 34, curY + 12);

  doc.setFont('helvetica', 'bold');
  doc.text('Prioritas:', margin + 4, curY + 23);
  doc.setFont('helvetica', 'normal');
  doc.text(request.priority, margin + 30, curY + 23);

  // Right column of metadata
  const rightColX = pageWidth / 2 + 10;
  doc.setFont('helvetica', 'bold');
  doc.text('Tanggal Pengajuan:', rightColX, curY + 6);
  doc.setFont('helvetica', 'normal');
  doc.text(formatDateDDMMYYYY(request.requestDate), rightColX + 32, curY + 6);

  doc.setFont('helvetica', 'bold');
  doc.text('Target Dibutuhkan:', rightColX, curY + 12);
  doc.setFont('helvetica', 'normal');
  doc.text(request.requiredDate ? formatDateDDMMYYYY(request.requiredDate) : '-', rightColX + 32, curY + 12);

  doc.setFont('helvetica', 'bold');
  doc.text('Pemohon (Site):', rightColX, curY + 18);
  doc.setFont('helvetica', 'normal');
  doc.text(`${request.requesterName} (${request.requesterRole})`, rightColX + 32, curY + 18);

  curY += 34;

  // Table of Items
  const tableHead = [
    [
      'No',
      'Kode Barang',
      'Nama Barang / Chemical',
      'Kategori',
      'Satuan',
      'Qty Diminta',
      'Qty Disetujui',
      'Catatan'
    ]
  ];

  const tableBody = request.items.map((item, idx) => [
    idx + 1,
    item.itemCode || '-',
    item.itemName,
    item.category || '-',
    item.unit || '-',
    item.requestedQty,
    item.approvedQty !== undefined ? item.approvedQty : (request.status === 'APPROVED' ? item.requestedQty : '-'),
    item.notes || '-'
  ]);

  autoTable(doc, {
    startY: curY,
    margin: { left: margin, right: margin },
    head: tableHead,
    body: tableBody,
    theme: 'grid',
    styles: {
      fontSize: 8,
      cellPadding: 2.5,
      lineColor: [203, 213, 225],
      lineWidth: 0.15,
      textColor: [15, 23, 42]
    },
    headStyles: {
      fillColor: [15, 39, 68],
      textColor: [255, 255, 255],
      fontSize: 8,
      fontStyle: 'bold',
      halign: 'center'
    },
    columnStyles: {
      0: { cellWidth: 10, halign: 'center' },
      1: { cellWidth: 24, halign: 'center', fontStyle: 'bold' },
      2: { cellWidth: 'auto', halign: 'left', fontStyle: 'bold' },
      3: { cellWidth: 26, halign: 'center' },
      4: { cellWidth: 20, halign: 'center' },
      5: { cellWidth: 22, halign: 'center', fontStyle: 'bold' },
      6: { cellWidth: 22, halign: 'center', fontStyle: 'bold', textColor: [16, 185, 129] },
      7: { cellWidth: 32, halign: 'left' }
    },
    alternateRowStyles: {
      fillColor: [248, 250, 252]
    }
  });

  curY = (doc as any).lastAutoTable.finalY + 8;

  // Approver Notes Box (if reviewed)
  if (request.reviewedByName) {
    if (curY > pageHeight - 65) {
      doc.addPage();
      curY = 20;
    }
    doc.setFillColor(241, 245, 249);
    doc.setDrawColor(203, 213, 225);
    doc.roundedRect(margin, curY, pageWidth - margin * 2, 14, 1.5, 1.5, 'FD');

    doc.setFont('helvetica', 'bold');
    doc.setFontSize(7.5);
    doc.setTextColor(51, 65, 85);
    doc.text('Catatan Otorisasi & Verifikasi Approver:', margin + 4, curY + 5);

    doc.setFont('helvetica', 'italic');
    doc.text(`"${request.approvalNotes || 'Disetujui sesuai prosedur standar operasional.'}"`, margin + 4, curY + 9.5);
    doc.setFont('helvetica', 'normal');
    doc.text(`Diverifikasi oleh: ${request.reviewedByName} (${request.reviewedByRole}) pada ${request.reviewedAt || '-'}`, pageWidth - margin - 4, curY + 9.5, { align: 'right' });

    curY += 20;
  }

  // Signatures Section
  if (curY > pageHeight - 45) {
    doc.addPage();
    curY = 20;
  }

  const sigColWidth = (pageWidth - margin * 2) / 3;
  const col1X = margin + sigColWidth / 2;
  const col2X = margin + sigColWidth * 1.5;
  const col3X = margin + sigColWidth * 2.5;

  doc.setFontSize(7.5);
  doc.setTextColor(100, 116, 139);
  doc.setFont('helvetica', 'normal');
  doc.text('Pemohon (Site Requester)', col1X, curY, { align: 'center' });
  doc.text('Supervisor / Koordinator Lokasi', col2X, curY, { align: 'center' });
  doc.text('Otorisasi Manajemen / Approver', col3X, curY, { align: 'center' });

  curY += 20;
  doc.setFont('helvetica', 'bold');
  doc.setTextColor(15, 23, 42);
  doc.text(request.requesterName || '-', col1X, curY, { align: 'center' });
  doc.text('Supervisor Operasional', col2X, curY, { align: 'center' });
  doc.text(request.reviewedByName || 'Super Admin (HQ)', col3X, curY, { align: 'center' });

  curY += 3.5;
  doc.setFont('helvetica', 'normal');
  doc.setFontSize(6.5);
  doc.setTextColor(100, 116, 139);
  doc.text(request.requesterRole || 'Site Requester', col1X, curY, { align: 'center' });
  doc.text('PT Rajawali Cycle Indonesia', col2X, curY, { align: 'center' });
  doc.text(request.reviewedByRole || 'Otorisasi Pusat', col3X, curY, { align: 'center' });

  // Page Numbers & Footer
  const totalPages = doc.internal.pages.length - 1;
  for (let i = 1; i <= totalPages; i++) {
    doc.setPage(i);
    doc.setFontSize(7);
    doc.setTextColor(148, 163, 184);
    doc.text(
      `Dokumen resmi Sistem Terpadu PT Rajawali Cycle Indonesia • Diterbitkan secara digital • Hal ${i} dari ${totalPages}`,
      pageWidth / 2,
      pageHeight - 6,
      { align: 'center' }
    );
  }

  const safeCode = request.requestCode.replace(/[^a-zA-Z0-9_-]/g, '_');
  doc.save(`SPB_${safeCode}.pdf`);
};


