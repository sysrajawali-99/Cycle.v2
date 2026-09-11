#!/usr/bin/env bash
# ==============================================================================
# SCRIPT DEPLOYMENT & SETUP OTOMATIS RAJAWALI CYCLE
# SISTEM MANAJEMEN OPERASIONAL & KEUANGAN TERPADU
# KHUSUS VPS RUMAHWEB DENGAN SISTEM OPERASI UBUNTU (20.04 / 22.04 / 24.04 LTS)
# ==============================================================================
# Cara menjalankan script ini di VPS Rumahweb:
# 1. Login ke VPS via SSH:
#    ssh root@<IP_VPS_RUMAHWEB>
# 2. Unduh dan jalankan script ini:
#    chmod +x setup-vps-rumahweb.sh
#    ./setup-vps-rumahweb.sh
# ==============================================================================

set -e

# Warna output terminal
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
CYAN='\033[0;36m'
NC='\033[0m' # No Color

echo -e "${CYAN}==================================================================${NC}"
echo -e "${GREEN}   🦅 RAJAWALI CYCLE - SETUP OTOMATIS VPS RUMAHWEB (UBUNTU)      ${NC}"
echo -e "${CYAN}==================================================================${NC}"
echo -e "Memulai proses instalasi dan konfigurasi server cloud..."

# 1. Cek Hak Akses Root
if [ "$EUID" -ne 0 ]; then
  echo -e "${RED}[ERROR] Script ini harus dijalankan sebagai user root (atau gunakan sudo).${NC}"
  exit 1
fi

# 2. Update Repositori & Paket Sistem Ubuntu
echo -e "\n${YELLOW}[1/7] Memperbarui paket sistem Ubuntu...${NC}"
apt-get update -y
apt-get upgrade -y
apt-get install -y curl wget git ufw nginx build-essential software-properties-common

# 3. Instalasi Node.js 22 LTS
echo -e "\n${YELLOW}[2/7] Memasang Node.js 22 LTS & NPM...${NC}"
if ! command -v node &> /dev/null || [[ $(node -v) != v22* ]]; then
  curl -fsSL https://deb.nodesource.com/setup_22.x | bash -
  apt-get install -y nodejs
fi
echo -e "${GREEN}✓ Node.js $(node -v) & NPM $(npm -v) berhasil terpasang.${NC}"

# 4. Instalasi PM2 Process Manager Global
echo -e "\n${YELLOW}[3/7] Memasang PM2 Process Manager...${NC}"
npm install -g pm2
pm2 startup systemd -u root --hp /root || true

# 5. Persiapan Direktori Aplikasi & Hak Akses
APP_DIR="/var/www/rajawali-cycle"
echo -e "\n${YELLOW}[4/7] Mempersiapkan direktori aplikasi di ${APP_DIR}...${NC}"
mkdir -p "$APP_DIR"
mkdir -p "$APP_DIR/data/backups"

# Salin source code jika script dijalankan dari dalam repo
if [ -f "package.json" ] && [ -f "server.ts" ]; then
  echo "Menyalin file proyek lokal ke $APP_DIR..."
  cp -r ./* "$APP_DIR/" 2>/dev/null || true
  cp -r ./.* "$APP_DIR/" 2>/dev/null || true
fi

cd "$APP_DIR"

# 6. Install Dependencies & Build Proyek
echo -e "\n${YELLOW}[5/7] Menginstal dependensi & mengompilasi aplikasi...${NC}"
npm install --legacy-peer-deps
npm run build

# Buat .env jika belum ada
if [ ! -f ".env" ]; then
  echo "Membuat file konfigurasi .env..."
  cat <<EOT > .env
PORT=3000
NODE_ENV=production
GEMINI_API_KEY=
EOT
fi

# 7. Konfigurasi PM2 Service
echo -e "\n${YELLOW}[6/7] Menjalankan aplikasi dengan PM2...${NC}"
pm2 delete rajawali-cycle 2>/dev/null || true
pm2 start dist/server.cjs --name "rajawali-cycle" --time
pm2 save

# 8. Konfigurasi Nginx Reverse Proxy
echo -e "\n${YELLOW}[7/7] Mengonfigurasi Nginx Reverse Proxy & Firewall...${NC}"
NGINX_CONF="/etc/nginx/sites-available/rajawali-cycle"

cat <<'EOT' > "$NGINX_CONF"
server {
    listen 80;
    server_name _;

    client_max_body_size 50M;

    # Gzip Compression
    gzip on;
    gzip_types text/plain text/css application/json application/javascript text/xml application/xml application/xml+rss text/javascript;

    location / {
        proxy_pass http://127.0.0.1:3000;
        proxy_http_version 1.1;
        proxy_set_header Upgrade $http_upgrade;
        proxy_set_header Connection 'upgrade';
        proxy_set_header Host $host;
        proxy_cache_bypass $http_upgrade;
        proxy_set_header X-Real-IP $remote_addr;
        proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
        proxy_set_header X-Forwarded-Proto $scheme;
    }
}
EOT

ln -sf "$NGINX_CONF" /etc/nginx/sites-enabled/
rm -f /etc/nginx/sites-enabled/default
nginx -t && systemctl reload nginx

# 9. Konfigurasi Firewall UFW
ufw allow 22/tcp || true
ufw allow 80/tcp || true
ufw allow 443/tcp || true
ufw allow 3000/tcp || true
echo "y" | ufw enable || true

# 10. Konfigurasi Cron Backup Otomatis Harian (Setiap Pukul 02:00 Pagi)
CRON_JOB="0 2 * * * cd $APP_DIR && node -e \"const fs=require('fs'); const src='$APP_DIR/data/vps_live_database.json'; if(fs.existsSync(src)){ const d=new Date().toISOString().replace(/:/g,'-'); fs.copyFileSync(src, '$APP_DIR/data/backups/snapshot_auto_' + d + '.json'); console.log('Auto-backup VPS created'); }\" >> /var/log/rajawali_backup.log 2>&1"
(crontab -l 2>/dev/null | grep -v "rajawali_backup"; echo "$CRON_JOB") | crontab -

IP_PUBLIC=$(curl -s https://ifconfig.me || curl -s https://api.ipify.org || echo "<IP_VPS_RUMAHWEB>")

echo -e "\n${CYAN}==================================================================${NC}"
echo -e "${GREEN}🎉 INSTALASI & SETUP VPS RUMAHWEB SELESAI DENGAN SUKSES!${NC}"
echo -e "${CYAN}==================================================================${NC}"
echo -e "Aplikasi Rajawali Cycle kini telah aktif di VPS Ubuntu Anda:"
echo -e "  🌐 Akses Langsung via IP : ${GREEN}http://${IP_PUBLIC}${NC}"
echo -e "  ⚡ Akses Internal Port  : ${GREEN}http://${IP_PUBLIC}:3000${NC}"
echo -e "  📁 Lokasi Database VPS  : ${YELLOW}${APP_DIR}/data/vps_live_database.json${NC}"
echo -e "  📂 Direktori Backup     : ${YELLOW}${APP_DIR}/data/backups/${NC}"
echo -e "\n${CYAN}Langkah Selanjutnya:${NC}"
echo -e "1. Hubungkan Domain Rumahweb:"
echo -e "   - Arahkan A-Record domain Anda (misal: erp.perusahaan.com) ke IP: ${YELLOW}${IP_PUBLIC}${NC}"
echo -e "2. Pasang SSL Gratis (HTTPS) dengan Certbot:"
echo -e "   - Jalankan: ${YELLOW}apt install -y certbot python3-certbot-nginx && certbot --nginx${NC}"
echo -e "3. Masukkan URL VPS ${GREEN}http://${IP_PUBLIC}${NC} ke menu 'Koneksi VPS' di aplikasi"
echo -e "   agar seluruh perangkat dapat sinkron dan backup secara real-time!"
echo -e "${CYAN}==================================================================${NC}"
