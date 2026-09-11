import { Router, Request, Response } from 'express';
import { GoogleGenAI } from '@google/genai';
import { executeTelegramCommand } from './telegramCommandHandler.ts';

export interface TelegramSystemCache {
  projects: any[];
  inventory: any[];
  projectStocks: any[];
  materialRequests: any[];
  tasks: any[];
  employees: any[];
  timesheets: any[];
  sops: any[];
  blasts: any[];
  accounts: any[];
  financeTransactions: any[];
  debts: any[];
  receivables: any[];
  investments: any[];
  bankStatements: any[];
  periodClosings: any[];
  lastSyncedAt?: string;
}

// In-memory cache holding real-time system data pushed from the application.
// Initialized empty with zero demo/dummy data so Telegram serves ONLY real data.
export const telegramSystemCache: TelegramSystemCache = {
  projects: [],
  inventory: [],
  projectStocks: [],
  materialRequests: [],
  tasks: [],
  employees: [],
  timesheets: [],
  sops: [],
  blasts: [],
  accounts: [],
  financeTransactions: [],
  debts: [],
  receivables: [],
  investments: [],
  bankStatements: [],
  periodClosings: [],
  lastSyncedAt: undefined
};

// Memory store for bot credentials so webhook can reply even if env var is absent
let serverSavedBotToken = process.env.TELEGRAM_BOT_TOKEN || '8810715512:AAHNTN8pwVIuXwfkwQIMHR6LFw_LNvk09qo';
let serverSavedChatId = process.env.TELEGRAM_GROUP_CHAT_ID || '-1004355969725';

export function createTelegramRouter(getGeminiClient: () => GoogleGenAI | null): Router {
  const router = Router();

  /**
   * Helper: Mengirim pesan langsung via Telegram Bot API
   */
  async function sendTelegramMessage(
    token: string,
    chatId: string | number,
    text: string,
    parseMode: 'HTML' | 'Markdown' = 'HTML'
  ) {
    const url = `https://api.telegram.org/bot${token}/sendMessage`;
    const res = await fetch(url, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        chat_id: chatId,
        text,
        parse_mode: parseMode
      })
    });
    return await res.json();
  }

  /**
   * Helper: Mendapatkan token bot aktif (dari body, query, atau server cache)
   */
  function resolveBotToken(req: Request): string | undefined {
    const token = req.body?.botToken || (req.query?.token as string) || serverSavedBotToken || process.env.TELEGRAM_BOT_TOKEN;
    if (token) serverSavedBotToken = token;
    return token;
  }

  /**
   * Helper: Mendapatkan chat ID aktif (dari body, query, atau server cache)
   */
  function resolveChatId(req: Request): string | undefined {
    const cid = req.body?.chatId || (req.query?.chatId as string) || serverSavedChatId || process.env.TELEGRAM_GROUP_CHAT_ID;
    if (cid) serverSavedChatId = cid;
    return cid;
  }

  // ---------------------------------------------------------------------------
  // 1. POST /api/telegram/send - Kirim Pesan / Notifikasi ke Grup atau User
  // ---------------------------------------------------------------------------
  router.post('/send', async (req: Request, res: Response) => {
    try {
      const token = resolveBotToken(req);
      const chatId = resolveChatId(req);
      const { text, parseMode = 'HTML' } = req.body;

      if (!token) {
        return res.status(400).json({
          success: false,
          error: 'Bot Token belum dikonfigurasi (TELEGRAM_BOT_TOKEN).'
        });
      }

      if (!chatId) {
        return res.status(400).json({
          success: false,
          error: 'Target Chat ID belum diisi (TELEGRAM_GROUP_CHAT_ID).'
        });
      }

      if (!text) {
        return res.status(400).json({
          success: false,
          error: 'Konten pesan tidak boleh kosong.'
        });
      }

      const tgResult = await sendTelegramMessage(token, chatId, text, parseMode);

      if (tgResult.ok) {
        return res.json({
          success: true,
          messageId: tgResult.result?.message_id,
          chat: tgResult.result?.chat
        });
      } else {
        return res.status(400).json({
          success: false,
          error: tgResult.description || 'Gagal mengirim pesan ke Telegram',
          details: tgResult
        });
      }
    } catch (err: any) {
      return res.status(500).json({
        success: false,
        error: err?.message || 'Terjadi kesalahan pada server saat mengirim pesan Telegram'
      });
    }
  });

  // ---------------------------------------------------------------------------
  // 2. POST /api/telegram/test - Uji Sambungan Bot & Kirim Pesan Tes
  // ---------------------------------------------------------------------------
  router.post('/test', async (req: Request, res: Response) => {
    try {
      const token = resolveBotToken(req);
      const chatId = resolveChatId(req);

      if (!token) {
        return res.status(400).json({
          success: false,
          error: 'Masukkan Bot Token terlebih dahulu.'
        });
      }

      // Validasi token via Telegram getMe
      const meRes = await fetch(`https://api.telegram.org/bot${token}/getMe`);
      const meJson = await meRes.json();

      if (!meJson.ok) {
        return res.status(400).json({
          success: false,
          error: `Bot Token tidak valid: ${meJson.description || 'Unauthorized'}`
        });
      }

      const botInfo = meJson.result;

      // Jika chatId diberikan, kirim pesan uji coba
      let testSent = false;
      let sendError = null;

      if (chatId) {
        const testMessage = `
🏢 <b>PT RAJAWALI CYCLE INDONESIA</b>
━━━━━━━━━━━━━━━━━━━━
🤖 <b>TES KONEKSI TELEGRAM BOT BERHASIL</b>
━━━━━━━━━━━━━━━━━━━━
✅ <b>Nama Bot:</b> ${botInfo.first_name} (@${botInfo.username})
🆔 <b>Bot ID:</b> <code>${botInfo.id}</code>
🎯 <b>Target Chat ID:</b> <code>${chatId}</code>
⏰ <b>Waktu Sistem:</b> ${new Date().toLocaleString('id-ID')}

Sistem notifikasi real-time Rajawali Cycle kini telah <b>TERHUBUNG AKTIF</b> dengan grup Telegram perusahaan. Anda akan menerima notifikasi pengajuan barang, stok kritis, dan update tugas secara instan.

Ketik perintah <code>/help</code> di grup ini untuk melihat daftar perintah yang tersedia.
━━━━━━━━━━━━━━━━━━━━
<i>Rajawali Cycle Automated Notification Engine</i>
`.trim();

        const sendRes = await sendTelegramMessage(token, chatId, testMessage, 'HTML');
        if (sendRes.ok) {
          testSent = true;
        } else {
          sendError = sendRes.description;
        }
      }

      return res.json({
        success: true,
        botInfo: {
          id: botInfo.id,
          username: botInfo.username,
          first_name: botInfo.first_name
        },
        testMessageSent: testSent,
        sendError
      });
    } catch (err: any) {
      return res.status(500).json({
        success: false,
        error: err?.message || 'Gagal memverifikasi token bot'
      });
    }
  });

  // ---------------------------------------------------------------------------
  // 2b. POST /api/telegram/get-updates - Ambil Chat ID Terkini dari Bot Updates
  // ---------------------------------------------------------------------------
  router.post('/get-updates', async (req: Request, res: Response) => {
    try {
      const botToken = resolveBotToken(req);
      if (!botToken) {
        return res.status(400).json({ success: false, error: 'Bot Token wajib diisi' });
      }

      const telegramApiUrl = `https://api.telegram.org/bot${botToken}/getUpdates`;
      const response = await fetch(telegramApiUrl);
      const data = await response.json();

      if (!data.ok) {
        return res.status(400).json({
          success: false,
          error: data.description || 'Gagal mengambil data update dari Telegram Bot'
        });
      }

      // Extract unique chats from updates
      const chatsMap = new Map<string, { id: number | string; title?: string; type: string; username?: string; lastMessage?: string }>();
      if (Array.isArray(data.result)) {
        for (const update of data.result) {
          const msg = update.message || update.channel_post || update.my_chat_member;
          if (msg && msg.chat) {
            const chat = msg.chat;
            const key = String(chat.id);
            if (!chatsMap.has(key)) {
              chatsMap.set(key, {
                id: chat.id,
                title: chat.title || chat.first_name || 'Tanpa Judul',
                type: chat.type,
                username: chat.username,
                lastMessage: msg.text || (update.my_chat_member ? 'Bot ditambahkan ke grup' : 'Aktivitas terkini')
              });
            }
          }
        }
      }

      const chats = Array.from(chatsMap.values());
      return res.json({
        success: true,
        chats,
        count: chats.length
      });
    } catch (err: any) {
      return res.status(500).json({
        success: false,
        error: err?.message || 'Gagal menghubungi Telegram API'
      });
    }
  });

  // ---------------------------------------------------------------------------
  // 3. POST /api/telegram/sync-data - Sinkronisasi Snapshot Data Aplikasi
  // ---------------------------------------------------------------------------
  router.post('/sync-data', (req: Request, res: Response) => {
    try {
      const {
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
        botToken,
        groupChatId
      } = req.body;

      if (botToken) serverSavedBotToken = botToken;
      if (groupChatId) serverSavedChatId = groupChatId;

      if (Array.isArray(projects)) telegramSystemCache.projects = projects;
      if (Array.isArray(inventory)) telegramSystemCache.inventory = inventory;
      if (Array.isArray(projectStocks)) telegramSystemCache.projectStocks = projectStocks;
      if (Array.isArray(materialRequests)) telegramSystemCache.materialRequests = materialRequests;
      if (Array.isArray(tasks)) telegramSystemCache.tasks = tasks;
      if (Array.isArray(employees)) telegramSystemCache.employees = employees;
      if (Array.isArray(timesheets)) telegramSystemCache.timesheets = timesheets;
      if (Array.isArray(sops)) telegramSystemCache.sops = sops;
      if (Array.isArray(blasts)) telegramSystemCache.blasts = blasts;
      if (Array.isArray(accounts)) telegramSystemCache.accounts = accounts;
      if (Array.isArray(financeTransactions)) telegramSystemCache.financeTransactions = financeTransactions;
      if (Array.isArray(debts)) telegramSystemCache.debts = debts;
      if (Array.isArray(receivables)) telegramSystemCache.receivables = receivables;
      if (Array.isArray(investments)) telegramSystemCache.investments = investments;
      if (Array.isArray(bankStatements)) telegramSystemCache.bankStatements = bankStatements;
      if (Array.isArray(periodClosings)) telegramSystemCache.periodClosings = periodClosings;

      telegramSystemCache.lastSyncedAt = new Date().toISOString();

      return res.json({
        success: true,
        message: 'Snapshot seluruh data operasional, HRD, dan Finance berhasil disinkronkan ke server Telegram Bot',
        cachedStats: {
          projects: telegramSystemCache.projects.length,
          inventory: telegramSystemCache.inventory.length,
          tasks: telegramSystemCache.tasks.length,
          employees: telegramSystemCache.employees.length,
          timesheets: telegramSystemCache.timesheets.length,
          sops: telegramSystemCache.sops.length,
          blasts: telegramSystemCache.blasts.length,
          accounts: telegramSystemCache.accounts.length,
          debts: telegramSystemCache.debts.length,
          receivables: telegramSystemCache.receivables.length,
          investments: telegramSystemCache.investments.length,
          lastSyncedAt: telegramSystemCache.lastSyncedAt
        }
      });
    } catch (err: any) {
      return res.status(500).json({ success: false, error: err?.message });
    }
  });

  // ---------------------------------------------------------------------------
  // 3b. POST /api/telegram/reset-cache - Reset Cache Per Divisi atau Total
  // ---------------------------------------------------------------------------
  router.post('/reset-cache', (req: Request, res: Response) => {
    try {
      const { division } = req.body || {};

      if (!division || division === 'all' || division === 'finance') {
        telegramSystemCache.accounts = [];
        telegramSystemCache.financeTransactions = [];
        telegramSystemCache.debts = [];
        telegramSystemCache.receivables = [];
        telegramSystemCache.investments = [];
        telegramSystemCache.bankStatements = [];
        telegramSystemCache.periodClosings = [];
      }

      if (!division || division === 'all' || division === 'hrm') {
        telegramSystemCache.employees = [];
        telegramSystemCache.timesheets = [];
      }

      if (!division || division === 'all' || division === 'operations') {
        telegramSystemCache.projects = [];
        telegramSystemCache.inventory = [];
        telegramSystemCache.projectStocks = [];
        telegramSystemCache.materialRequests = [];
        telegramSystemCache.tasks = [];
        telegramSystemCache.sops = [];
      }

      if (!division || division === 'all' || division === 'blast') {
        telegramSystemCache.blasts = [];
      }

      telegramSystemCache.lastSyncedAt = new Date().toISOString();

      return res.json({
        success: true,
        message: `Cache Telegram server untuk divisi ${division || 'all'} berhasil di-reset ke nilai kosong`,
        resetDivision: division || 'all'
      });
    } catch (err: any) {
      return res.status(500).json({ success: false, error: err?.message });
    }
  });

  // ---------------------------------------------------------------------------
  // 3c. POST /api/telegram/simulate - Eksekusi Command Simulator untuk UI
  // ---------------------------------------------------------------------------
  router.post('/simulate', async (req: Request, res: Response) => {
    try {
      const { text, senderName } = req.body;
      if (!text) {
        return res.status(400).json({ success: false, error: 'Command text is required' });
      }

      const reply = await executeTelegramCommand(text, senderName || 'Simulator Portal', getGeminiClient);

      return res.json({
        success: true,
        reply,
        command: text
      });
    } catch (err: any) {
      return res.status(500).json({
        success: false,
        error: err?.message || 'Gagal mengeksekusi simulasi perintah Telegram'
      });
    }
  });

  // ---------------------------------------------------------------------------
  // Central Command Handler for both Webhook and Background Poller
  // ---------------------------------------------------------------------------
  async function processTelegramIncomingMessage(
    message: any,
    token: string,
    geminiClientGetter: () => GoogleGenAI | null
  ) {
    try {
      const text: string = (message.text || '').trim();
      const chatId = message.chat?.id;
      const senderName = message.from?.first_name || 'Rekan Tim';

      if (!token || !chatId || !text) return;

      const reply = await executeTelegramCommand(text, senderName, geminiClientGetter);
      if (reply) {
        await sendTelegramMessage(token, chatId, reply, 'HTML');
      }
    } catch (err: any) {
      console.error('Telegram Command processing error:', err);
    }
  }

  // ---------------------------------------------------------------------------
  // 4. POST /api/telegram/webhook - Webhook Penerima Pesan & Perintah Slash
  // ---------------------------------------------------------------------------
  router.post('/webhook', async (req: Request, res: Response) => {
    // Balas HTTP 200 OK sesegera mungkin ke Telegram agar tidak timeout
    res.status(200).json({ ok: true });

    try {
      const update = req.body;
      if (!update || !update.message) return;

      const token = (req.query?.token as string) || resolveBotToken(req) || serverSavedBotToken || process.env.TELEGRAM_BOT_TOKEN;
      if (!token) return;

      await processTelegramIncomingMessage(update.message, token, getGeminiClient);
    } catch (err: any) {
      console.error('Telegram Webhook error:', err);
    }
  });

  // ---------------------------------------------------------------------------
  // Background Polling Engine
  // ---------------------------------------------------------------------------
  let isPollingActive = false;
  let pollingOffset = 0;
  let pollingAbortController: AbortController | null = null;

  function startBackgroundPoller() {
    if (isPollingActive) return;
    isPollingActive = true;
    console.log('[Telegram Poller] Starting background polling engine...');

    (async () => {
      while (isPollingActive) {
        const token = serverSavedBotToken || process.env.TELEGRAM_BOT_TOKEN;
        if (!token) {
          await new Promise(r => setTimeout(r, 4000));
          continue;
        }

        try {
          pollingAbortController = new AbortController();
          const timeoutId = setTimeout(() => pollingAbortController?.abort(), 22000);

          const fetchUrl = `https://api.telegram.org/bot${token}/getUpdates?offset=${pollingOffset}&timeout=15`;
          const response = await fetch(fetchUrl, {
            signal: pollingAbortController.signal
          });
          clearTimeout(timeoutId);

          const data = await response.json();
          if (data.ok && Array.isArray(data.result)) {
            for (const update of data.result) {
              pollingOffset = Math.max(pollingOffset, update.update_id + 1);
              if (update.message) {
                await processTelegramIncomingMessage(update.message, token, getGeminiClient);
              }
            }
          } else if (data.description && data.description.toLowerCase().includes('webhook is active')) {
            // Webhook is active, pause polling loop for 30s
            await new Promise(r => setTimeout(r, 30000));
          } else {
            await new Promise(r => setTimeout(r, 3000));
          }
        } catch {
          // Timeout / abort is normal in long polling
          await new Promise(r => setTimeout(r, 2000));
        }
      }
    })();
  }

  // Jalankan poller otomatis saat router dimuat
  startBackgroundPoller();

  // ---------------------------------------------------------------------------
  // Endpoint kontrol Polling
  // ---------------------------------------------------------------------------
  router.get('/polling-status', (_req: Request, res: Response) => {
    res.json({
      active: isPollingActive,
      offset: pollingOffset,
      savedTokenSet: Boolean(serverSavedBotToken)
    });
  });

  router.post('/enable-polling', async (req: Request, res: Response) => {
    try {
      const token = resolveBotToken(req);
      if (!token) {
        return res.status(400).json({ success: false, message: 'Bot token belum dikonfigurasi' });
      }

      // Hapus webhook di Telegram agar Telegram mengarahkan update ke getUpdates
      const delRes = await fetch(`https://api.telegram.org/bot${token}/deleteWebhook`);
      const delJson = await delRes.json();

      if (!isPollingActive) {
        startBackgroundPoller();
      }

      return res.json({
        success: delJson.ok,
        message: 'Polling aktif. Webhook dihapus sehingga bot langsung merespon via polling.',
        details: delJson
      });
    } catch (err: any) {
      return res.status(500).json({ success: false, error: err?.message });
    }
  });

  // ---------------------------------------------------------------------------
  // 5. POST /api/telegram/set-webhook - Memasang Webhook ke Telegram API
  // ---------------------------------------------------------------------------
  router.post('/set-webhook', async (req: Request, res: Response) => {
    try {
      const token = resolveBotToken(req);
      const { webhookUrl } = req.body;

      if (!token) {
        return res.status(400).json({ success: false, message: 'Bot Token belum dikonfigurasi.' });
      }

      serverSavedBotToken = token;

      if (!webhookUrl) {
        return res.status(400).json({ success: false, message: 'Webhook URL belum disertakan.' });
      }

      const tgRes = await fetch(`https://api.telegram.org/bot${token}/setWebhook`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          url: webhookUrl,
          allowed_updates: ['message']
        })
      });

      const tgJson = await tgRes.json();
      return res.json({
        success: tgJson.ok,
        message: tgJson.description || (tgJson.ok ? 'Webhook berhasil dipasang' : 'Gagal memasang webhook'),
        details: tgJson
      });
    } catch (err: any) {
      return res.status(500).json({ success: false, message: err?.message });
    }
  });

  // ---------------------------------------------------------------------------
  // 6. GET /api/telegram/webhook-info - Cek Status Webhook Terpasang
  // ---------------------------------------------------------------------------
  router.get('/webhook-info', async (req: Request, res: Response) => {
    try {
      const token = req.query.botToken as string || process.env.TELEGRAM_BOT_TOKEN;
      if (!token) {
        return res.status(400).json({ success: false, message: 'Bot token required' });
      }

      const tgRes = await fetch(`https://api.telegram.org/bot${token}/getWebhookInfo`);
      const tgJson = await tgRes.json();
      return res.json(tgJson);
    } catch (err: any) {
      return res.status(500).json({ success: false, message: err?.message });
    }
  });

  return router;
}
