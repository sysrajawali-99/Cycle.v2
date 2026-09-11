import { MaterialRequest, Project, CleaningTask, TelegramBotConfig, TelegramLogItem } from '../types';
import { storageService } from './storageService';

export interface TelegramSendResponse {
  success: boolean;
  messageId?: number;
  error?: string;
  botInfo?: {
    id: number;
    username: string;
    first_name: string;
  };
}

class TelegramService {
  private sentNotificationMap = new Map<string, number>();

  /**
   * Mengirim pesan notifikasi ke backend / Telegram Bot API
   */
  async sendNotification(options: {
    title: string;
    message: string;
    type: TelegramLogItem['type'];
    chatId?: string;
    botToken?: string;
    disableNotification?: boolean;
  }): Promise<TelegramSendResponse> {
    const config = storageService.getTelegramConfig();
    const botToken = (options.botToken || config.botToken || '8810715512:AAHNTN8pwVIuXwfkwQIMHR6LFw_LNvk09qo').trim();
    const targetChatId = (options.chatId || config.groupChatId || '-1004355969725').trim();

    if (!botToken || !targetChatId) {
      const err = 'Bot Token atau Group Chat ID belum dikonfigurasi di Pengaturan Telegram.';
      storageService.addTelegramLog({
        type: options.type,
        title: options.title,
        message: options.message,
        targetChatId: targetChatId || '-',
        status: 'FAILED',
        errorMessage: err
      });
      return { success: false, error: err };
    }

    try {
      const response = await fetch('/api/telegram/send', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          botToken,
          chatId: targetChatId,
          text: options.message,
          parseMode: 'HTML',
          type: options.type,
          title: options.title,
          disableNotification: options.disableNotification || false
        })
      });

      const result = await response.json();

      if (result.success) {
        storageService.addTelegramLog({
          type: options.type,
          title: options.title,
          message: options.message,
          targetChatId,
          status: 'SUCCESS'
        });
        return { success: true, messageId: result.messageId };
      } else {
        const errorMsg = result.error || 'Gagal mengirim pesan ke Telegram';
        storageService.addTelegramLog({
          type: options.type,
          title: options.title,
          message: options.message,
          targetChatId,
          status: 'FAILED',
          errorMessage: errorMsg
        });
        return { success: false, error: errorMsg };
      }
    } catch (err: any) {
      // Fallback direct request if server endpoint has issues
      try {
        const fallbackRes = await fetch(`https://api.telegram.org/bot${botToken}/sendMessage`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            chat_id: targetChatId,
            text: options.message,
            parse_mode: 'HTML'
          })
        });
        const fbJson = await fallbackRes.json();
        if (fbJson.ok) {
          storageService.addTelegramLog({
            type: options.type,
            title: options.title,
            message: options.message,
            targetChatId,
            status: 'SUCCESS'
          });
          return { success: true, messageId: fbJson.result?.message_id };
        } else {
          throw new Error(fbJson.description || 'Telegram API Error');
        }
      } catch (fallbackErr: any) {
        const errMsg = fallbackErr?.message || err?.message || 'Gagal terhubung ke Telegram API';
        storageService.addTelegramLog({
          type: options.type,
          title: options.title,
          message: options.message,
          targetChatId,
          status: 'FAILED',
          errorMessage: errMsg
        });
        return { success: false, error: errMsg };
      }
    }
  }

  /**
   * Notifikasi Real-time Material Request Baru
   */
  async notifyMaterialRequest(mr: MaterialRequest, project?: Project): Promise<TelegramSendResponse | null> {
    const config = storageService.getTelegramConfig();
    if (!config.isEnabled || !config.notifyOnMaterialRequest) {
      return null;
    }

    const projectName = project?.name || mr.projectName || mr.projectId || 'Pusat / Operasional';
    const itemsList = (mr.items || [])
      .slice(0, 5)
      .map((item, idx) => `  ${idx + 1}. <b>${item.itemName}</b>: ${item.requestedQty} ${item.unit}`)
      .join('\n');

    const moreItems = (mr.items || []).length > 5 ? `\n  <i>...dan ${(mr.items || []).length - 5} item lainnya</i>` : '';

    const text = `
🏢 <b>PT RAJAWALI CYCLE INDONESIA</b>
━━━━━━━━━━━━━━━━━━━━
📦 <b>PENGAJUAN MATERIAL REQUEST BARU</b>
━━━━━━━━━━━━━━━━━━━━
📄 <b>No. Dokumen:</b> <code>${mr.requestCode || mr.id}</code>
📍 <b>Lokasi Proyek:</b> ${projectName}
👤 <b>Pemohon:</b> ${mr.requesterName} (${mr.requesterRole || 'Operasional'})
📅 <b>Tanggal:</b> ${mr.requestDate || new Date().toISOString().split('T')[0]}
⚡ <b>Prioritas:</b> ${mr.priority || 'Normal'}

📝 <b>Daftar Kebutuhan Material:</b>
${itemsList}${moreItems}

💬 <b>Keterangan:</b>
<i>${mr.purpose || 'Pengajuan kebutuhan operasional berkala'}</i>

⏳ <b>Status:</b> <b>MENUNGGU PERSETUJUAN (PENDING)</b>
━━━━━━━━━━━━━━━━━━━━
<i>Notifikasi otomatis sistem terpadu Rajawali Cycle ERP</i>
`.trim();

    return this.sendNotification({
      title: `Material Request: ${mr.requestCode || mr.id}`,
      message: text,
      type: 'MATERIAL_REQUEST'
    });
  }

  /**
   * Notifikasi Real-time Material Request Disetujui
   */
  async notifyMaterialRequestApproved(mr: MaterialRequest, approverName: string, projectName?: string): Promise<TelegramSendResponse | null> {
    const config = storageService.getTelegramConfig();
    if (!config.isEnabled || !config.notifyOnMaterialRequest) {
      return null;
    }

    const text = `
🏢 <b>PT RAJAWALI CYCLE INDONESIA</b>
━━━━━━━━━━━━━━━━━━━━
✅ <b>MATERIAL REQUEST DISETUJUI</b>
━━━━━━━━━━━━━━━━━━━━
📄 <b>No. Dokumen:</b> <code>${mr.requestCode || mr.id}</code>
📍 <b>Lokasi:</b> ${projectName || mr.projectName || mr.projectId}
👤 <b>Disetujui Oleh:</b> ${approverName}
📅 <b>Waktu:</b> ${new Date().toLocaleString('id-ID')}
📦 <b>Jumlah Item:</b> ${(mr.items || []).length} jenis barang

Status dokumen telah diperbarui menjadi <b>APPROVED</b>. Bagian logistik dapat segera menyiapkan pengeluaran barang.
━━━━━━━━━━━━━━━━━━━━
<i>Notifikasi resmi sistem Rajawali Cycle ERP</i>
`.trim();

    return this.sendNotification({
      title: `MR Disetujui: ${mr.requestCode || mr.id}`,
      message: text,
      type: 'MATERIAL_REQUEST'
    });
  }

  /**
   * Notifikasi Peringatan Stok Menipis / Kritis
   */
  async notifyLowStockAlert(data: {
    itemName: string;
    currentStock: number;
    minStock: number;
    unit: string;
    category?: string;
    projectName?: string;
  }): Promise<TelegramSendResponse | null> {
    const config = storageService.getTelegramConfig();
    if (!config.isEnabled || !config.notifyOnLowStock) {
      return null;
    }

    const text = `
🏢 <b>PT RAJAWALI CYCLE INDONESIA</b>
━━━━━━━━━━━━━━━━━━━━
⚠️ <b>PERINGATAN: STOK MENCAPAI LEVEL KRITIS!</b>
━━━━━━━━━━━━━━━━━━━━
📦 <b>Nama Barang:</b> <b>${data.itemName}</b>
🏷️ <b>Kategori:</b> ${data.category || 'Chemical / Alat'}
📍 <b>Lokasi:</b> ${data.projectName || 'Gudang Utama'}
📊 <b>Sisa Stok:</b> <b>${data.currentStock} ${data.unit}</b>
🔴 <b>Batas Minimum:</b> <b>${data.minStock} ${data.unit}</b>

⚠️ <i>Stok saat ini berada di bawah batas minimum operasional. Segera lakukan pemesanan atau pengajuan restock agar tidak mengganggu operasional di lapangan.</i>
━━━━━━━━━━━━━━━━━━━━
<i>Peringatan otomatis Rajawali Inventory Guard</i>
`.trim();

    return this.sendNotification({
      title: `Stok Kritis: ${data.itemName}`,
      message: text,
      type: 'LOW_STOCK'
    });
  }

  /**
   * Notifikasi Perubahan / Update Stok (Penyesuaian, Pemakaian, Restock, Mutasi)
   */
  async notifyStockUpdate(data: {
    itemName: string;
    itemCode?: string;
    projectName?: string;
    type?: 'OUT' | 'IN' | 'ADJUST' | 'TRANSFER' | 'OPNAME';
    quantityChange?: number;
    previousStock?: number;
    newStock: number;
    minStock?: number;
    unit?: string;
    pic?: string;
    notes?: string;
  }): Promise<TelegramSendResponse | null> {
    const config = storageService.getTelegramConfig();
    if (!config.isEnabled || !config.notifyOnLowStock) {
      return null;
    }

    const typeBadge =
      data.type === 'OUT' ? '📤 PEMAKAIAN / BARANG KELUAR' :
      data.type === 'IN' ? '📥 RESTOCK / BARANG MASUK' :
      data.type === 'TRANSFER' ? '🚚 MUTASI ANTAR AREA' :
      '🔄 PENYESUAIAN STOK (OPNAME)';

    const unit = data.unit || 'Unit';
    const changeStr =
      data.quantityChange !== undefined
        ? data.quantityChange > 0
          ? `+${data.quantityChange}`
          : `${data.quantityChange}`
        : data.previousStock !== undefined
        ? `${data.newStock - data.previousStock > 0 ? '+' : ''}${data.newStock - data.previousStock}`
        : '';

    const minStock = data.minStock ?? 5;
    const isCritical = data.newStock <= minStock;
    const statusTag = isCritical
      ? '🔴 <b>KRITIS (Perlu Restock!)</b>'
      : data.newStock <= minStock * 1.5
      ? '🟡 <b>MENIPIS</b>'
      : '🟢 <b>AMAN</b>';

    const text = `
🏢 <b>PT RAJAWALI CYCLE INDONESIA</b>
━━━━━━━━━━━━━━━━━━━━
📦 <b>UPDATE PERUBAHAN STOK SISTEM</b>
━━━━━━━━━━━━━━━━━━━━
📋 <b>Aktivitas:</b> ${typeBadge}
📍 <b>Area / Proyek:</b> <b>${data.projectName || 'Gudang Pusat'}</b>
🏷️ <b>Barang:</b> <b>${data.itemName}</b> ${data.itemCode ? `(<code>${data.itemCode}</code>)` : ''}
${changeStr ? `🔢 <b>Perubahan Jumlah:</b> <b>${changeStr} ${unit}</b>\n` : ''}${data.previousStock !== undefined ? `📊 <b>Stok Sebelumnya:</b> ${data.previousStock} ${unit}\n` : ''}📊 <b>Sisa Stok Sekarang:</b> <b>${data.newStock} ${unit}</b> (Min: ${minStock} ${unit})
📌 <b>Status Sisa:</b> ${statusTag}
👤 <b>Petugas (PIC):</b> ${data.pic || 'Petugas Lapangan'}
${data.notes ? `📝 <b>Keterangan:</b> <i>${data.notes}</i>\n` : ''}⏰ <b>Waktu:</b> ${new Date().toLocaleString('id-ID')}
━━━━━━━━━━━━━━━━━━━━
<i>Notifikasi Otomatis Logistik & Inventaris Rajawali Cycle</i>
`.trim();

    return this.sendNotification({
      title: `Update Stok [${data.projectName || 'Gudang'}]: ${data.itemName}`,
      message: text,
      type: 'STOCK_UPDATE'
    });
  }

  /**
   * Notifikasi Tugas Operasional Lapangan (Kanban)
   */
  async notifyTaskAlert(task: CleaningTask, projectName?: string): Promise<TelegramSendResponse | null> {
    return this.notifyTaskStatusChange({
      task,
      action: 'STATUS_CHANGED',
      projectName
    });
  }

  /**
   * Notifikasi Perubahan Status atau Pembuatan Tugas (Kanban Lapangan)
   */
  async notifyTaskStatusChange(data: {
    task: CleaningTask;
    action: 'CREATED' | 'STATUS_CHANGED' | 'COMPLETED' | 'UPDATED';
    previousStatus?: string;
    projectName?: string;
    updaterName?: string;
  }): Promise<TelegramSendResponse | null> {
    const config = storageService.getTelegramConfig();
    if (!config.isEnabled || !config.notifyOnTaskUpdate) {
      return null;
    }

    const { task, action, previousStatus, projectName, updaterName } = data;

    // Deduplication check: prevent multiple triggers for the same task action within 4 seconds
    const dedupeKey = `${task.id}-${action}-${task.status}`;
    const now = Date.now();
    const lastSent = this.sentNotificationMap.get(dedupeKey);
    if (lastSent && now - lastSent < 4000) {
      return { success: true };
    }
    this.sentNotificationMap.set(dedupeKey, now);

    let headerTitle = '📋 UPDATE TUGAS OPERASIONAL';
    let icon = '⚡';

    if (action === 'CREATED') {
      headerTitle = '📋 PENUGASAN TUGAS BARU (AD-HOC)';
      icon = '🆕';
    } else if (action === 'COMPLETED' || task.status === 'done') {
      headerTitle = '✅ TUGAS OPERASIONAL SELESAI';
      icon = '🎉';
    } else if (task.status === 'in_progress') {
      headerTitle = '⚡ TUGAS MULAI DIKERJAKAN';
      icon = '🛠️';
    } else if (task.status === 'review') {
      headerTitle = '🔍 TUGAS MENUNGGU INSPEKSI QC';
      icon = '🧐';
    }

    const priorityBadge =
      task.priority === 'Urgent'
        ? '🔴 URGENT'
        : task.priority === 'Tinggi'
        ? '🟠 TINGGI'
        : '🔵 NORMAL';

    const checklistFormatted = (task.checklist && task.checklist.length > 0)
      ? `\n📋 <b>Instruksi Pekerjaan (${task.checklist.length} Ceklis):</b>\n` +
        task.checklist.map((c, i) => `   ${i + 1}. ⬜ ${c.text}`).join('\n')
      : '';

    const text = `
🏢 <b>PT RAJAWALI CYCLE INDONESIA</b>
━━━━━━━━━━━━━━━━━━━━
${icon} <b>${headerTitle}</b>
━━━━━━━━━━━━━━━━━━━━
👤 <b>Penerima Tugas:</b> <b>${task.assignedLeaderName || (task.assignedEmployees || []).join(', ') || 'Team Leader Area'}</b> (Team Leader / Supervisor Area)
👔 <b>Pemberi Tugas:</b> ${task.assignedBy || updaterName || 'Supervisor Lapangan'}
📍 <b>Area / Titik Kerja:</b> <b>${task.areaName}</b>
🏢 <b>Proyek:</b> <b>${projectName || 'Site Lapangan'}</b>
⚡ <b>Kategori Tugas:</b> ${task.taskType || 'Tugas Harian'}
🔥 <b>Prioritas:</b> ${priorityBadge}
⏰ <b>Shift Kerja:</b> ${task.shift || 'Pagi'}
🎯 <b>Target Selesai:</b> ${task.targetCompletionTime || 'Hari ini'}
${previousStatus ? `🔄 <b>Perubahan Status:</b> <code>${previousStatus.toUpperCase()}</code> ➔ <b>${task.status.toUpperCase()}</b>\n` : `📊 <b>Status:</b> <b>${task.status.toUpperCase()}</b>\n`}${checklistFormatted}
${task.notes ? `\n📝 <b>Catatan Instruksi:</b> <i>${task.notes}</i>` : ''}
⏰ <b>Waktu Disimpan:</b> ${new Date().toLocaleString('id-ID')}
━━━━━━━━━━━━━━━━━━━━
<i>Sistem Pengawasan Tugas Rajawali Board</i>
`.trim();

    return this.sendNotification({
      title: `${headerTitle}: ${task.areaName}`,
      message: text,
      type: 'TASK'
    });
  }

  /**
   * Menguji koneksi bot ke Telegram dan mengambil detail bot
   */
  async testConnection(botToken?: string, chatId?: string): Promise<TelegramSendResponse> {
    try {
      const config = storageService.getTelegramConfig();
      const token = (botToken || config.botToken || '8810715512:AAHNTN8pwVIuXwfkwQIMHR6LFw_LNvk09qo').trim();
      const targetChat = (chatId || config.groupChatId || '-1004355969725').trim();

      const response = await fetch('/api/telegram/test', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ botToken: token, chatId: targetChat })
      });

      const result = await response.json();
      return result;
    } catch (err: any) {
      return { success: false, error: err?.message || 'Gagal terhubung ke backend server' };
    }
  }

  /**
   * Menghubungkan Webhook ke Telegram API
   */
  async setupWebhook(botToken: string, webhookUrl: string): Promise<{ success: boolean; message: string }> {
    try {
      const response = await fetch('/api/telegram/set-webhook', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ botToken, webhookUrl })
      });
      return await response.json();
    } catch (err: any) {
      return { success: false, message: err?.message || 'Gagal memasang webhook' };
    }
  }

  /**
   * Sinkronisasi seluruh snapshot data operasional, HRD, dan Finance ke server memory
   * agar semua data menu dapat diakses secara real-time via Telegram Bot
   */
  async syncSnapshotToBackend(): Promise<void> {
    try {
      const config = storageService.getTelegramConfig();
      const projects = storageService.getProjects();
      const inventory = storageService.getInventoryItems();
      const projectStocks = storageService.getProjectStocks();
      const materialRequests = storageService.getMaterialRequests();
      const tasks = storageService.getTasks();
      const employees = storageService.getEmployees();
      const timesheets = storageService.getTimesheets();
      const sops = storageService.getSops();
      const blasts = storageService.getBlasts();
      const accounts = storageService.getChartOfAccounts();
      const financeTransactions = storageService.getFinanceTransactions();
      const debts = storageService.getDebts();
      const receivables = storageService.getReceivables();
      const investments = storageService.getInvestments();
      const bankStatements = storageService.getBankStatements();
      const periodClosings = storageService.getPeriodClosings();

      await fetch('/api/telegram/sync-data', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          botToken: config.botToken,
          groupChatId: config.groupChatId,
          projects,
          inventory,
          projectStocks,
          materialRequests,
          tasks,
          employees,
          timesheets,
          sops,
          blasts,
          accounts,
          financeTransactions,
          debts,
          receivables,
          investments,
          bankStatements,
          periodClosings,
          syncedAt: new Date().toISOString()
        })
      });
    } catch {
      // Background non-blocking sync
    }
  }

  private hasInitializedEngine = false;
  private syncDebounceTimer: any = null;
  private lastNotifTimestamps: Record<string, number> = {};

  /**
   * Menginisialisasi sistem sinkronisasi otomatis & pengiriman notifikasi real-time
   * saat data di sistem diperbarui, ditambahkan, atau diubah.
   */
  initAutoSyncAndNotificationEngine(): void {
    if (this.hasInitializedEngine) return;
    this.hasInitializedEngine = true;

    // Sinkronisasi data awal saat aplikasi dibuka
    this.syncSnapshotToBackend();

    // Mendaftarkan storage middleware untuk mendengarkan setiap perubahan data di sistem
    storageService.registerStorageMiddleware(async (context) => {
      // 1. Selalu lakukan debounce sinkronisasi ke cache backend server
      if (this.syncDebounceTimer) {
        clearTimeout(this.syncDebounceTimer);
      }
      this.syncDebounceTimer = setTimeout(() => {
        this.syncSnapshotToBackend();
      }, 300);

      // 2. Jika merupakan aksi input/update dari user di sistem, kirim notifikasi perubahan ke Telegram
      if (context.source === 'user_action') {
        const now = Date.now();
        const lastTime = this.lastNotifTimestamps[context.key] || 0;
        // Debounce notifikasi kategori yang sama dalam 2.5 detik untuk menghindari banjir pesan
        if (now - lastTime < 2500) {
          return;
        }
        this.lastNotifTimestamps[context.key] = now;

        await this.notifyDataChange(context.key, context.data);
      }
    });
  }

  /**
   * Kirim pesan notifikasi perubahan data secara real-time ke Telegram
   */
  async notifyDataChange(key: string, data: any): Promise<TelegramSendResponse | null> {
    const config = storageService.getTelegramConfig();
    if (!config.isEnabled) return null;
    if (config.notifyOnDataUpdates === false) return null;

    const rupiah = (val: number) =>
      new Intl.NumberFormat('id-ID', {
        style: 'currency',
        currency: 'IDR',
        maximumFractionDigits: 0
      }).format(val || 0);

    let title = 'Pembaruan Data Sistem';
    let type: TelegramLogItem['type'] = 'DATA_UPDATE';
    let bodyText = '';

    const timestamp = new Date().toLocaleString('id-ID');

    switch (key) {
      case 'finance_transactions': {
        const txs = Array.isArray(data) ? data : [];
        const latest = txs[0];
        if (!latest) return null;
        title = `Transaksi Keuangan: ${latest.transactionNumber || latest.id}`;
        type = 'FINANCE';
        bodyText = `
💰 <b>NOTIFIKASI KEUANGAN: TRANSAKSI BUKU KAS & JURNAL</b>
━━━━━━━━━━━━━━━━━━━━
Terdapat pembaruan pencatatan transaksi kas / bank di sistem:
📄 <b>Nomor:</b> <code>${latest.transactionNumber || latest.id}</code>
📅 <b>Tanggal:</b> ${latest.date || '-'}
🏷️ <b>Deskripsi:</b> ${latest.description || '-'}
💵 <b>Nominal:</b> <b>${rupiah(latest.amount || 0)}</b>
📌 <b>Tipe:</b> ${latest.type || 'Jurnal Umum'} | Ref: <code>${latest.reference || '-'}</code>
📊 <b>Total Transaksi Tersimpan:</b> <b>${txs.length}</b> rekord`;
        break;
      }

      case 'debts': {
        const debts = Array.isArray(data) ? data : [];
        const latest = debts[0];
        if (!latest) return null;
        const totalRemaining = debts.filter((d: any) => d.status !== 'PAID').reduce((s: number, d: any) => s + (d.remainingAmount || 0), 0);
        title = `Pencatatan Hutang Usaha: ${latest.creditorName}`;
        type = 'DEBT';
        bodyText = `
📑 <b>NOTIFIKASI KEUANGAN: PENCATATAN HUTANG USAHA (AP)</b>
━━━━━━━━━━━━━━━━━━━━
Pembaruan data kewajiban hutang / vendor di sistem:
🏢 <b>Pemberi Pinjaman / Vendor:</b> <b>${latest.creditorName}</b>
📄 <b>No. Invoice / Ref:</b> <code>${latest.invoiceNumber || latest.code}</code>
💰 <b>Nilai Tagihan:</b> <b>${rupiah(latest.totalAmount || 0)}</b>
⏳ <b>Jatuh Tempo:</b> ${latest.dueDate || '-'}
📊 <b>Status:</b> ${latest.status || 'UNPAID'} (Sisa: ${rupiah(latest.remainingAmount || 0)})
💼 <b>Total Sisa Hutang Aktif:</b> <b>${rupiah(totalRemaining)}</b>`;
        break;
      }

      case 'receivables': {
        const recs = Array.isArray(data) ? data : [];
        const latest = recs[0];
        if (!latest) return null;
        const totalRemaining = recs.filter((r: any) => r.status !== 'PAID').reduce((s: number, r: any) => s + (r.remainingAmount || 0), 0);
        title = `Pencatatan Piutang Usaha: ${latest.customerName}`;
        type = 'RECEIVABLE';
        bodyText = `
📄 <b>NOTIFIKASI KEUANGAN: PIUTANG TAGIHAN INVOICE (AR)</b>
━━━━━━━━━━━━━━━━━━━━
Pembaruan data piutang pendapatan klien di sistem:
🏢 <b>Klien / Debitor:</b> <b>${latest.customerName}</b>
📄 <b>No. Invoice:</b> <code>${latest.invoiceNumber || latest.code}</code>
💰 <b>Nilai Tagihan:</b> <b>${rupiah(latest.totalAmount || 0)}</b>
⏳ <b>Jatuh Tempo:</b> ${latest.dueDate || '-'}
📊 <b>Status:</b> ${latest.status || 'UNPAID'} (Sisa: ${rupiah(latest.remainingAmount || 0)})
💎 <b>Total Sisa Piutang Berjalan:</b> <b>${rupiah(totalRemaining)}</b>`;
        break;
      }

      case 'investments': {
        const invs = Array.isArray(data) ? data : [];
        const latest = invs[0];
        if (!latest) return null;
        const totalCapital = invs.reduce((s: number, i: any) => s + (i.capitalAmount || i.totalInvestment || 0), 0);
        title = `Investasi Mitra: ${latest.investorName}`;
        type = 'INVESTMENT';
        bodyText = `
🤝 <b>NOTIFIKASI KEUANGAN: KONTRAK INVESTASI & BAGI HASIL</b>
━━━━━━━━━━━━━━━━━━━━
Pembaruan data kemitraan modal & imbal hasil:
👤 <b>Investor / Mitra:</b> <b>${latest.investorName}</b>
📈 <b>Modal Ditempatkan:</b> <b>${rupiah(latest.capitalAmount || latest.totalInvestment || 0)}</b>
⚖️ <b>Bagi Hasil:</b> <b>${latest.profitShareRate || 0}% / bulan</b> (${rupiah(latest.monthlyProfitShareAmount || 0)})
📅 <b>Masa Kontrak:</b> ${latest.startDate || '-'} s/d ${latest.endDate || '-'}
💼 <b>Total Portofolio Mitra:</b> <b>${rupiah(totalCapital)}</b>`;
        break;
      }

      case 'bank_statements': {
        const statements = Array.isArray(data) ? data : [];
        title = `Rekonsiliasi Rekening Koran`;
        type = 'FINANCE';
        bodyText = `
🏦 <b>NOTIFIKASI KEUANGAN: REKONSILIASI REKENING KORAN</b>
━━━━━━━━━━━━━━━━━━━━
Data mutasi rekening koran telah diperbarui atau disinkronkan ke Buku Kas:
📊 <b>Total Baris Rekening Koran:</b> <b>${statements.length} Transaksi</b>
💡 <i>Data yang telah dicocokkan (reconciled) otomatis terbukukan ke Jurnal Umum & Kas Bank.</i>`;
        break;
      }

      case 'employees': {
        const emps = Array.isArray(data) ? data : [];
        const latest = emps[0];
        if (!latest) return null;
        title = `Data Karyawan: ${latest.name}`;
        type = 'HRD';
        bodyText = `
👥 <b>NOTIFIKASI HRD: DATA PERSONIL & KARYAWAN</b>
━━━━━━━━━━━━━━━━━━━━
Pembaruan data master karyawan di sistem:
👤 <b>Nama:</b> <b>${latest.name}</b> (NIK: <code>${latest.nik || '-'}</code>)
👔 <b>Jabatan:</b> ${latest.role || latest.position || 'Cleaning Specialist'}
🏢 <b>Penempatan:</b> ${latest.projectId || latest.placement || 'HQ'}
📊 <b>Status:</b> ${latest.status || 'Aktif'}
👥 <b>Total Personil Terdaftar:</b> <b>${emps.length} Karyawan</b>`;
        break;
      }

      case 'timesheets': {
        const ts = Array.isArray(data) ? data : [];
        title = `Eagle Timesheet (Presensi)`;
        type = 'TIMESHEET';
        bodyText = `
⏰ <b>NOTIFIKASI HRD: EAGLE TIMESHEET (1-31 HARI)</b>
━━━━━━━━━━━━━━━━━━━━
Matriks kehadiran personil lapangan telah diperbarui:
📊 <b>Total Lembar Presensi:</b> <b>${ts.length} Record</b>
💡 <i>Data hari hadir otomatis mengalkulasi nilai beban gaji pada menu Forecast Rencana Pengeluaran.</i>`;
        break;
      }

      case 'projects': {
        const projs = Array.isArray(data) ? data : [];
        const latest = projs[0];
        if (!latest) return null;
        title = `Data Proyek / Site: ${latest.name}`;
        type = 'PROJECT';
        bodyText = `
🏢 <b>NOTIFIKASI OPERASIONAL: DATA SITE & PROYEK KLIEN</b>
━━━━━━━━━━━━━━━━━━━━
Pembaruan data site / lokasi proyek:
🏢 <b>Nama Site:</b> <b>${latest.name}</b> (<code>${latest.code || '-'}</code>)
📍 <b>Lokasi:</b> ${latest.address || latest.location || '-'}
👤 <b>Supervisor PIC:</b> ${latest.siteSupervisor || latest.supervisor || '-'}
👥 <b>Total Site Aktif:</b> <b>${projs.length} Lokasi</b>`;
        break;
      }

      case 'inventory_items':
      case 'project_stocks': {
        title = `Pembaruan Persediaan Logistik`;
        type = 'STOCK_UPDATE';
        bodyText = `
📦 <b>NOTIFIKASI LOGISTIK: STOK CHEMICAL & ALAT KERJA</b>
━━━━━━━━━━━━━━━━━━━━
Terjadi pembaruan inventaris atau sebaran stok area proyek di sistem.
Status stok real-time dapat dicek kapan saja melalui perintah <code>/stok</code> atau <code>/stok kritis</code> di Telegram.`;
        break;
      }

      case 'material_requests': {
        const mrs = Array.isArray(data) ? data : [];
        const latest = mrs[0];
        if (!latest) return null;
        title = `Material Request: ${latest.requestNumber || latest.id}`;
        type = 'MATERIAL_REQUEST';
        bodyText = `
📄 <b>NOTIFIKASI LOGISTIK: PENGAJUAN MATERIAL REQUEST (MR)</b>
━━━━━━━━━━━━━━━━━━━━
Pembaruan dokumen permohonan material barang:
📄 <b>No. Dokumen:</b> <code>${latest.requestNumber || latest.id}</code>
👤 <b>Pemohon:</b> ${latest.requesterName || '-'}
📊 <b>Status:</b> ${latest.status || 'PENDING'}
📦 <b>Rincian:</b> ${(latest.items || []).length} Item Barang`;
        break;
      }

      case 'blasts': {
        const blasts = Array.isArray(data) ? data : [];
        const latest = blasts[0];
        if (!latest) return null;
        title = `Eagle Blast: ${latest.title}`;
        type = 'BLAST';
        bodyText = `
📢 <b>EAGLE BLAST: SIARAN PENGUMUMAN PERUSAHAAN</b>
━━━━━━━━━━━━━━━━━━━━
<b>${latest.title}</b>
📝 <i>${(latest.content || '').slice(0, 150)}${(latest.content || '').length > 150 ? '...' : ''}</i>
👤 <b>Oleh:</b> ${latest.author || 'Manajemen HQ'} | Prioritas: ${latest.priority || 'Normal'}`;
        break;
      }

      case 'sops': {
        const sops = Array.isArray(data) ? data : [];
        const latest = sops[0];
        if (!latest) return null;
        title = `Dokumen SOP: ${latest.title}`;
        type = 'SOP';
        bodyText = `
📚 <b>NOTIFIKASI K3 & OPERASIONAL: DOKUMEN SOP</b>
━━━━━━━━━━━━━━━━━━━━
Pembaruan Prosedur Standar Operasional:
📖 <b>Judul:</b> <b>${latest.title}</b> (<code>${latest.code || '-'}</code>)
🏷️ <b>Kategori:</b> ${latest.category || '-'} | Revisi: ${latest.revision || '1.0'}`;
        break;
      }

      case 'chart_of_accounts': {
        title = `Chart of Accounts (COA)`;
        type = 'FINANCE';
        bodyText = `
💳 <b>NOTIFIKASI KEUANGAN: BAGAN AKUN (COA)</b>
━━━━━━━━━━━━━━━━━━━━
Master bagan akun standar akuntansi telah diselaraskan di sistem.`;
        break;
      }

      case 'company_profile': {
        title = `Profil Perusahaan`;
        type = 'DATA_UPDATE';
        bodyText = `
🏢 <b>NOTIFIKASI SISTEM: PROFIL PERUSAHAAN</b>
━━━━━━━━━━━━━━━━━━━━
Informasi profil resmi, nama legal, atau kop surat PT Rajawali Cycle Indonesia telah diperbarui.`;
        break;
      }

      default: {
        title = `Pembaruan Data: ${key}`;
        type = 'DATA_UPDATE';
        bodyText = `
🔄 <b>NOTIFIKASI SISTEM: PEMBARUAN DATA</b>
━━━━━━━━━━━━━━━━━━━━
Telah terjadi pembaruan data pada modul <b>${key}</b> di sistem portal.`;
        break;
      }
    }

    const fullMessage = `
🏢 <b>PT RAJAWALI CYCLE INDONESIA</b>
━━━━━━━━━━━━━━━━━━━━
${bodyText.trim()}
⏰ <b>Waktu Sinkron:</b> ${timestamp}
━━━━━━━━━━━━━━━━━━━━
<i>Status: Data Real-Time Tersinkronisasi Otomatis</i>
`.trim();

    return this.sendNotification({
      title,
      message: fullMessage,
      type
    });
  }
}

export const telegramService = new TelegramService();
