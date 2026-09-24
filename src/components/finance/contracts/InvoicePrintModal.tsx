import React, { useRef } from 'react';
import { X, Printer, Download, Building2, CheckCircle2, ShieldCheck } from 'lucide-react';
import { ClientInvoice, ClientContract } from '../../../types/finance';
import { CompanyProfile } from '../../../types';
import { formatCurrency, formatDateDDMMYYYY } from '../../../utils/formatters';
import { OfficialLetterhead } from '../../common/OfficialLetterhead';
import jsPDF from 'jspdf';
import autoTable from 'jspdf-autotable';
import { drawOfficialPDFLetterhead } from '../../../utils/pdfExport';

interface InvoicePrintModalProps {
  isOpen: boolean;
  onClose: () => void;
  invoice: ClientInvoice | null;
  contract?: ClientContract | null;
  companyProfile: CompanyProfile;
}

export const InvoicePrintModal: React.FC<InvoicePrintModalProps> = ({
  isOpen,
  onClose,
  invoice,
  contract,
  companyProfile
}) => {
  const printRef = useRef<HTMLDivElement>(null);

  if (!isOpen || !invoice) return null;

  const targetBank =
    companyProfile.bankAccounts?.find((b) => b.id === invoice.bankAccountId) ||
    companyProfile.bankAccounts?.find((b) => b.isPrimary) ||
    companyProfile.bankAccounts?.[0] || {
      bankName: companyProfile.bankName || 'Bank Central Asia (BCA)',
      accountNumber: companyProfile.bankAccountNo || '541-0988-771',
      accountHolder: companyProfile.bankAccountHolder || companyProfile.name
    };

  const handlePrint = () => {
    window.print();
  };

  const handleDownloadPDF = () => {
    try {
      const doc = new jsPDF('p', 'mm', 'a4');
      const pageWidth = doc.internal.pageSize.getWidth();

      // Draw official letterhead
      drawOfficialPDFLetterhead({
        doc,
        pageWidth,
        comp: companyProfile,
        badgeText: 'INVOICE TAGIHAN RESMI',
        docCode: invoice.invoiceNumber,
        docDate: invoice.issueDate
      });

      let currentY = 32;

      // Title & Info
      doc.setFont('helvetica', 'bold');
      doc.setFontSize(14);
      doc.setTextColor(15, 23, 42);
      doc.text('FAKTUR TAGIHAN (INVOICE)', 14, currentY);

      doc.setFont('helvetica', 'normal');
      doc.setFontSize(8.5);
      doc.setTextColor(71, 85, 105);
      currentY += 5;
      doc.text(`Periode Layanan: ${invoice.billingPeriod}`, 14, currentY);

      // Client info (Left) & Invoice meta (Right)
      currentY += 8;
      doc.setFillColor(248, 250, 252);
      doc.rect(14, currentY, 90, 26, 'F');
      doc.rect(108, currentY, 88, 26, 'F');

      doc.setFont('helvetica', 'bold');
      doc.setFontSize(8.5);
      doc.setTextColor(15, 23, 42);
      doc.text('DITAGIHKAN KEPADA:', 17, currentY + 5);
      doc.text(invoice.clientName, 17, currentY + 10);
      
      doc.setFont('helvetica', 'normal');
      doc.setFontSize(7.5);
      doc.setTextColor(71, 85, 105);
      doc.text(`NPWP: ${invoice.clientTaxId || '-'}`, 17, currentY + 15);
      doc.text(doc.splitTextToSize(invoice.clientAddress || 'Lokasi Klien', 82), 17, currentY + 19);

      // Right box: Invoice meta
      doc.setFont('helvetica', 'bold');
      doc.setFontSize(8.5);
      doc.setTextColor(15, 23, 42);
      doc.text('DETAIL DOKUMEN:', 111, currentY + 5);
      
      doc.setFont('helvetica', 'normal');
      doc.setFontSize(7.5);
      doc.setTextColor(71, 85, 105);
      doc.text(`No. Invoice: ${invoice.invoiceNumber}`, 111, currentY + 10);
      doc.text(`No. Kontrak: ${invoice.contractNumber}`, 111, currentY + 14);
      doc.text(`Lokasi Site: ${invoice.projectName || '-'}`, 111, currentY + 18);
      doc.text(`Jatuh Tempo: ${formatDateDDMMYYYY(invoice.dueDate)}`, 111, currentY + 22);

      currentY += 32;

      // Table Items
      const tableRows: any[] = [];
      tableRows.push([
        '1',
        `Jasa Kebersihan (Facility Services) Periode ${invoice.billingPeriod}\nSesuai Kontrak Kerja Sama No: ${invoice.contractNumber}`,
        '1 Bln',
        formatCurrency(invoice.baseMonthlyAmount),
        formatCurrency(invoice.baseMonthlyAmount)
      ]);

      (invoice.extraItems || []).forEach((extra, idx) => {
        tableRows.push([
          String(idx + 2),
          `Pekerjaan Ekstra: ${extra.description}`,
          `${extra.quantity} Pkt`,
          formatCurrency(extra.unitPrice),
          formatCurrency(extra.subtotal)
        ]);
      });

      autoTable(doc, {
        startY: currentY,
        head: [['No', 'Uraian Layanan & Deskripsi Pekerjaan', 'Qty', 'Harga Satuan (Rp)', 'Total (Rp)']],
        body: tableRows,
        theme: 'striped',
        headStyles: { fillColor: [15, 23, 42], textColor: 255, fontStyle: 'bold', fontSize: 8 },
        styles: { fontSize: 7.5, cellPadding: 3, textColor: [30, 41, 59] },
        columnStyles: {
          0: { cellWidth: 10, halign: 'center' },
          1: { cellWidth: 100 },
          2: { cellWidth: 18, halign: 'center' },
          3: { cellWidth: 32, halign: 'right' },
          4: { cellWidth: 34, halign: 'right' }
        }
      });

      const finalY = (doc as any).lastAutoTable.finalY + 6;

      // Financial Calculation Summary
      const summaryX = 110;
      doc.setFontSize(8);
      doc.setTextColor(71, 85, 105);

      doc.text('Subtotal Sebelum Pajak:', summaryX, finalY);
      doc.text(formatCurrency(invoice.subtotalBeforeTax), 194, finalY, { align: 'right' });

      let taxY = finalY + 5;
      if (invoice.isPpnEnabled) {
        doc.text(`(+) PPN ${invoice.ppnRatePercent}%:`, summaryX, taxY);
        doc.text(`+${formatCurrency(invoice.ppnAmount)}`, 194, taxY, { align: 'right' });
        taxY += 5;
      }

      if (invoice.isPph23Enabled) {
        doc.text(`(-) PPh 23 (${invoice.pph23RatePercent}% dipotong klien):`, summaryX, taxY);
        doc.text(`-${formatCurrency(invoice.pph23Amount)}`, 194, taxY, { align: 'right' });
        taxY += 5;
      }

      // Grand Total Highlight
      doc.setFillColor(241, 245, 249);
      doc.rect(summaryX - 2, taxY - 2, 88, 8, 'F');
      doc.setFont('helvetica', 'bold');
      doc.setFontSize(9);
      doc.setTextColor(15, 23, 42);
      doc.text('TOTAL TAGIHAN BERSIH:', summaryX, taxY + 3.5);
      doc.text(formatCurrency(invoice.totalAmount), 194, taxY + 3.5, { align: 'right' });

      // Left: Payment & Bank Instructions
      doc.setFont('helvetica', 'bold');
      doc.setFontSize(8);
      doc.setTextColor(15, 23, 42);
      doc.text('INSTRUKSI PEMBAYARAN:', 14, finalY);

      doc.setFont('helvetica', 'normal');
      doc.setFontSize(7.5);
      doc.setTextColor(71, 85, 105);
      doc.text(`Mohon pembayaran ditransfer ke rekening resmi:`, 14, finalY + 5);
      doc.text(`Bank: ${targetBank.bankName}`, 14, finalY + 9);
      doc.text(`Nomor Rekening: ${targetBank.accountNumber}`, 14, finalY + 13);
      doc.text(`Atas Nama: ${targetBank.accountHolder}`, 14, finalY + 17);
      if (invoice.notes) {
        doc.text(`Catatan: ${invoice.notes}`, 14, finalY + 22);
      }

      // Signature Section
      const sigY = Math.max(taxY + 18, finalY + 30);
      doc.setFontSize(8);
      doc.setTextColor(15, 23, 42);
      doc.text('Disiapkan Oleh,', 30, sigY);
      doc.text('Disetujui Oleh,', 140, sigY);

      doc.setFont('helvetica', 'bold');
      doc.text(companyProfile.financeManagerName || 'Finance & Accounting Lead', 30, sigY + 22);
      doc.text(companyProfile.directorName || 'Direktur Utama', 140, sigY + 22);

      doc.setFont('helvetica', 'normal');
      doc.setFontSize(7);
      doc.setTextColor(100, 116, 139);
      doc.text(companyProfile.financeManagerTitle || 'Finance & Accounting Lead', 30, sigY + 26);
      doc.text(companyProfile.directorTitle || 'Direktur Utama', 140, sigY + 26);

      doc.save(`Invoice_${invoice.invoiceNumber.replace(/\//g, '_')}.pdf`);
    } catch (err) {
      console.error('Failed to generate PDF:', err);
      alert('Terjadi kesalahan saat memproses ekspor PDF invoice.');
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/70 p-2 sm:p-4 overflow-y-auto">
      <div className="bg-white rounded-2xl shadow-2xl w-full max-w-4xl overflow-hidden border border-slate-200 my-4 flex flex-col max-h-[94vh]">
        {/* Action Header Bar (No-Print) */}
        <div className="px-6 py-3.5 border-b border-slate-200 flex items-center justify-between bg-slate-900 text-white shrink-0 print:hidden">
          <div className="flex items-center space-x-3">
            <span className="px-2.5 py-1 text-xs font-bold bg-amber-500 text-slate-950 rounded-md">
              INVOICE RESMI
            </span>
            <span className="text-sm font-semibold text-slate-200">
              {invoice.invoiceNumber} • {invoice.clientName}
            </span>
          </div>

          <div className="flex items-center gap-2">
            <button
              onClick={handlePrint}
              className="px-3.5 py-1.5 text-xs font-bold bg-slate-800 hover:bg-slate-700 text-white rounded-lg flex items-center gap-1.5 transition cursor-pointer"
            >
              <Printer className="w-4 h-4" /> Cetak / Print A4
            </button>
            <button
              onClick={handleDownloadPDF}
              className="px-3.5 py-1.5 text-xs font-bold bg-amber-500 hover:bg-amber-400 text-slate-950 rounded-lg flex items-center gap-1.5 transition cursor-pointer"
            >
              <Download className="w-4 h-4" /> Unduh PDF Resmi
            </button>
            <button
              onClick={onClose}
              className="p-1.5 text-slate-400 hover:text-white rounded-lg hover:bg-slate-800 transition cursor-pointer"
            >
              <X className="w-5 h-5" />
            </button>
          </div>
        </div>

        {/* Printable Invoice Page Canvas */}
        <div className="overflow-y-auto p-4 sm:p-8 bg-slate-100 flex-1">
          <div
            ref={printRef}
            className="bg-white p-6 sm:p-10 rounded-xl shadow-md border border-slate-200 max-w-3xl mx-auto space-y-6 text-slate-900"
          >
            {/* Kop Surat Resmi */}
            <OfficialLetterhead
              companyProfile={companyProfile}
              documentTitle="FAKTUR TAGIHAN (INVOICE)"
              documentCode={invoice.invoiceNumber}
              documentDate={formatDateDDMMYYYY(invoice.issueDate)}
              documentStatus={invoice.status}
              showLegalInfo={true}
              departmentSubtitle="Divisi Finance & Commercial Billing"
            />

            {/* Bill To & Meta Details */}
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-6 pt-2">
              <div className="bg-slate-50 p-4 rounded-xl border border-slate-200 space-y-1">
                <p className="text-[10px] font-bold text-slate-400 uppercase tracking-wider">
                  DITAGIHKAN KEPADA (BILL TO):
                </p>
                <h4 className="text-sm font-bold text-slate-900">{invoice.clientName}</h4>
                {invoice.clientTaxId && (
                  <p className="text-xs text-slate-600 font-mono">NPWP: {invoice.clientTaxId}</p>
                )}
                <p className="text-xs text-slate-600 leading-relaxed">{invoice.clientAddress || '-'}</p>
              </div>

              <div className="bg-slate-50 p-4 rounded-xl border border-slate-200 space-y-1.5 text-xs">
                <div className="flex justify-between">
                  <span className="text-slate-500 font-medium">Nomor Invoice:</span>
                  <span className="font-bold font-mono text-slate-900">{invoice.invoiceNumber}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-slate-500 font-medium">Periode Layanan:</span>
                  <span className="font-bold text-slate-900">{invoice.billingPeriod}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-slate-500 font-medium">No. Kontrak Acuan:</span>
                  <span className="font-mono text-slate-700">{invoice.contractNumber}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-slate-500 font-medium">Lokasi Proyek / Site:</span>
                  <span className="font-bold text-slate-900">{invoice.projectName || '-'}</span>
                </div>
                <div className="flex justify-between pt-1 border-t border-slate-200 text-rose-700 font-bold">
                  <span>Jatuh Tempo:</span>
                  <span>{formatDateDDMMYYYY(invoice.dueDate)}</span>
                </div>
              </div>
            </div>

            {/* Table of Items */}
            <div className="border border-slate-200 rounded-xl overflow-hidden">
              <table className="w-full text-left text-xs">
                <thead className="bg-slate-900 text-white uppercase text-[11px] font-bold">
                  <tr>
                    <th className="py-2.5 px-3 w-10 text-center">No</th>
                    <th className="py-2.5 px-3">Deskripsi Layanan / Pekerjaan</th>
                    <th className="py-2.5 px-3 w-16 text-center">Qty</th>
                    <th className="py-2.5 px-3 text-right w-32">Harga Satuan</th>
                    <th className="py-2.5 px-3 text-right w-36">Total (Rp)</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-200">
                  <tr className="hover:bg-slate-50/50">
                    <td className="py-3 px-3 text-center text-slate-400 font-bold">1</td>
                    <td className="py-3 px-3">
                      <p className="font-bold text-slate-900">
                        Jasa Kebersihan (Facility Services) Periode {invoice.billingPeriod}
                      </p>
                      <p className="text-[11px] text-slate-500">
                        Sesuai Kontrak Kerja Sama No: {invoice.contractNumber} ({invoice.projectName})
                      </p>
                    </td>
                    <td className="py-3 px-3 text-center font-medium">1 Bln</td>
                    <td className="py-3 px-3 text-right font-medium">{formatCurrency(invoice.baseMonthlyAmount)}</td>
                    <td className="py-3 px-3 text-right font-bold text-slate-900">{formatCurrency(invoice.baseMonthlyAmount)}</td>
                  </tr>

                  {(invoice.extraItems || []).map((extra, idx) => (
                    <tr key={extra.id} className="hover:bg-slate-50/50">
                      <td className="py-3 px-3 text-center text-slate-400 font-bold">{idx + 2}</td>
                      <td className="py-3 px-3">
                        <p className="font-bold text-slate-900">Pekerjaan Ekstra: {extra.description}</p>
                        <p className="text-[11px] text-slate-500">Pekerjaan tambahan di luar rutin bulanan</p>
                      </td>
                      <td className="py-3 px-3 text-center font-medium">{extra.quantity} Pkt</td>
                      <td className="py-3 px-3 text-right font-medium">{formatCurrency(extra.unitPrice)}</td>
                      <td className="py-3 px-3 text-right font-bold text-slate-900">{formatCurrency(extra.subtotal)}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>

            {/* Calculations & Bank Instruction */}
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-6 pt-2">
              {/* Left: Payment instructions */}
              <div className="bg-slate-50 p-4 rounded-xl border border-slate-200 space-y-2 text-xs">
                <p className="text-[10px] font-bold text-slate-400 uppercase tracking-wider">
                  INSTRUKSI PEMBAYARAN TRANSFER:
                </p>
                <div className="space-y-1">
                  <p className="text-slate-600">Mohon pembayaran ditransfer ke rekening bank resmi:</p>
                  <p className="font-bold text-slate-900 text-sm">{targetBank.bankName}</p>
                  <p className="font-mono font-extrabold text-slate-900 text-base">{targetBank.accountNumber}</p>
                  <p className="text-slate-700 font-semibold">Atas Nama: {targetBank.accountHolder}</p>
                </div>
                {invoice.notes && (
                  <p className="text-[11px] text-slate-500 pt-1 border-t border-slate-200">
                    Catatan: {invoice.notes}
                  </p>
                )}
              </div>

              {/* Right: Tax Breakdown */}
              <div className="space-y-2 text-xs">
                <div className="flex justify-between text-slate-600">
                  <span>Subtotal Biaya Jasa:</span>
                  <span className="font-semibold text-slate-800">{formatCurrency(invoice.subtotalBeforeTax)}</span>
                </div>
                {invoice.isPpnEnabled && (
                  <div className="flex justify-between text-emerald-700">
                    <span>PPN {invoice.ppnRatePercent}%:</span>
                    <span className="font-semibold">+{formatCurrency(invoice.ppnAmount)}</span>
                  </div>
                )}
                {invoice.isPph23Enabled && (
                  <div className="flex justify-between text-rose-700">
                    <span>PPh 23 ({invoice.pph23RatePercent}% dipotong klien):</span>
                    <span className="font-semibold">-{formatCurrency(invoice.pph23Amount)}</span>
                  </div>
                )}

                <div className="pt-2 border-t-2 border-slate-900 flex justify-between items-center">
                  <span className="text-sm font-extrabold text-slate-900 uppercase">Total Tagihan:</span>
                  <span className="text-lg font-black text-slate-900">{formatCurrency(invoice.totalAmount)}</span>
                </div>

                {invoice.paidAmount > 0 && (
                  <div className="pt-1 flex justify-between text-xs text-slate-500">
                    <span>Telah Dibayar:</span>
                    <span className="font-semibold text-emerald-600">{formatCurrency(invoice.paidAmount)}</span>
                  </div>
                )}
                {invoice.remainingAmount > 0 && invoice.paidAmount > 0 && (
                  <div className="flex justify-between text-xs text-rose-600 font-bold">
                    <span>Sisa Piutang:</span>
                    <span>{formatCurrency(invoice.remainingAmount)}</span>
                  </div>
                )}
              </div>
            </div>

            {/* Signature Block */}
            <div className="pt-8 border-t border-slate-200 grid grid-cols-2 text-center text-xs">
              <div className="space-y-12">
                <p className="text-slate-600 font-medium">Disiapkan Oleh,</p>
                <div>
                  <p className="font-bold text-slate-900 underline">
                    {companyProfile.financeManagerName || 'Dewi Lestari, S.Ak'}
                  </p>
                  <p className="text-[11px] text-slate-500">
                    {companyProfile.financeManagerTitle || 'Finance & Accounting Lead'}
                  </p>
                </div>
              </div>

              <div className="space-y-12">
                <p className="text-slate-600 font-medium">Disetujui Oleh,</p>
                <div>
                  <p className="font-bold text-slate-900 underline">
                    {companyProfile.directorName || 'Wanda I. Zeng, S.E.'}
                  </p>
                  <p className="text-[11px] text-slate-500">
                    {companyProfile.directorTitle || 'Direktur Utama'}
                  </p>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};
