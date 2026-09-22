import React from 'react';
import { CompanyProfile } from '../../types';
import { storageService } from '../../services/storageService';

export interface OfficialLetterheadProps {
  companyProfile?: CompanyProfile;
  documentTitle?: string;
  documentCode?: string;
  documentDate?: string;
  documentStatus?: string;
  variant?: 'full' | 'compact' | 'minimal';
  showLegalInfo?: boolean;
}

/**
 * Komponen Kop Surat Resmi Perusahaan Terpadu
 * Terhubung langsung dan otomatis dengan Master Identitas & Legalitas Organisasi Pengaturan Perusahaan.
 */
export const OfficialLetterhead: React.FC<OfficialLetterheadProps> = ({
  companyProfile: propProfile,
  documentTitle,
  documentCode,
  documentDate,
  documentStatus,
  variant = 'full',
  showLegalInfo = true
}) => {
  const profile = propProfile || storageService.getCompanyProfile();

  const primaryBank = profile.bankAccounts?.find((b) => b.isPrimary) || profile.bankAccounts?.[0];

  return (
    <div className="w-full pb-4 border-b-2 border-slate-900 text-slate-900 select-none">
      <div className="flex flex-col sm:flex-row items-start justify-between gap-4">
        {/* Left: Logo & Company Identity */}
        <div className="flex items-start space-x-3.5 max-w-2xl">
          {profile.logoUrl ? (
            <div className="w-14 h-14 sm:w-16 sm:h-16 shrink-0 bg-white rounded-lg p-1 border border-slate-200 flex items-center justify-center">
              <img
                src={profile.logoUrl}
                alt={profile.name}
                className="max-w-full max-h-full object-contain"
                referrerPolicy="no-referrer"
              />
            </div>
          ) : (
            <div className="w-14 h-14 sm:w-16 sm:h-16 shrink-0 bg-slate-950 text-amber-400 font-black rounded-xl flex items-center justify-center text-xl shadow-sm border border-slate-900">
              {profile.brandName?.charAt(0) || profile.name?.charAt(0) || 'R'}
            </div>
          )}

          <div className="space-y-0.5">
            <h1 className="text-base sm:text-lg font-black tracking-tight text-slate-950 uppercase leading-snug">
              {profile.name || 'PT RAJAWALI CYCLE INDONESIA'}
            </h1>
            <p className="text-[11px] font-bold text-slate-700 tracking-wide uppercase">
              {profile.tagline || 'Integrated Facility Services & Enterprise Management'}
            </p>
            <p className="text-[10px] text-slate-600 leading-snug">
              {profile.address}{profile.city ? `, ${profile.city}` : ''}
            </p>
            <div className="text-[9.5px] text-slate-500 pt-0.5 flex flex-wrap items-center gap-x-2 gap-y-0.5">
              {profile.phone && <span>Telp: <strong className="text-slate-700">{profile.phone}</strong></span>}
              {profile.whatsapp && <span>• WA: <strong className="text-slate-700">{profile.whatsapp}</strong></span>}
              {profile.email && <span>• Email: <strong className="text-slate-700">{profile.email}</strong></span>}
              {profile.website && <span>• Web: <strong className="text-slate-700">{profile.website}</strong></span>}
            </div>

            {showLegalInfo && (profile.taxId || profile.businessPermitNo) && (
              <div className="text-[9px] text-slate-600 pt-0.5 flex flex-wrap items-center gap-x-2">
                {profile.taxId && <span>NPWP: <strong className="font-mono text-slate-800">{profile.taxId}</strong></span>}
                {profile.businessPermitNo && <span>• NIB: <strong className="font-mono text-slate-800">{profile.businessPermitNo}</strong></span>}
                {primaryBank && (
                  <span>• Rek: <strong className="font-mono text-slate-800">{primaryBank.bankName} {primaryBank.accountNumber}</strong> a/n {primaryBank.accountHolder}</span>
                )}
              </div>
            )}
          </div>
        </div>

        {/* Right: Document Info Tag */}
        {(documentTitle || documentCode || documentDate || documentStatus) && (
          <div className="text-left sm:text-right shrink-0 bg-slate-50 sm:bg-transparent p-2 sm:p-0 rounded-lg border sm:border-0 border-slate-200 w-full sm:w-auto">
            {documentStatus && (
              <span className="inline-block px-2.5 py-0.5 rounded text-[9.5px] font-black uppercase tracking-wider bg-amber-100 text-amber-900 border border-amber-300">
                {documentStatus}
              </span>
            )}
            {documentTitle && (
              <div className="font-black text-xs text-slate-900 mt-1 uppercase tracking-tight">
                {documentTitle}
              </div>
            )}
            {documentCode && (
              <div className="text-[10px] font-mono font-bold text-slate-700 mt-0.5">
                NO: {documentCode}
              </div>
            )}
            {documentDate && (
              <div className="text-[9.5px] text-slate-500 mt-0.5">
                Tgl Dokumen: {documentDate}
              </div>
            )}
          </div>
        )}
      </div>
    </div>
  );
};
