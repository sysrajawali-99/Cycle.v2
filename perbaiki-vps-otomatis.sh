#!/usr/bin/env bash
# ==============================================================================
# SCRIPT PERBAIKAN OTOMATIS VPS RUMAHWEB (PORT 80 & 3000)
# SISTEM RAJAWALI CYCLE - FIX ENDPOINT /api/vps/status & NGINX PROXY
# ==============================================================================
set -e

GREEN='\033[0;32m'
YELLOW='\033[1;33m'
CYAN='\033[0;36m'
RED='\033[0;31m'
NC='\033[0m'

echo -e "${CYAN}==================================================================${NC}"
echo -e "${GREEN}   🦅 RAJAWALI CYCLE - PERBAIKAN CEPAT SISTEM VPS RUMAHWEB       ${NC}"
echo -e "${CYAN}==================================================================${NC}"

# Cek Hak Akses Root
if [ "$EUID" -ne 0 ]; then
  echo -e "${RED}[ERROR] Script ini harus dijalankan sebagai user root. Gunakan: sudo bash $0${NC}"
  exit 1
fi

APP_DIR="/var/www/rajawali-cycle"
mkdir -p "$APP_DIR/data/backups"
mkdir -p "$APP_DIR/dist"

echo -e "\n${YELLOW}[1/4] Memperbaiki Konfigurasi Nginx Reverse Proxy (Port 80 -> 3000)...${NC}"
NGINX_CONF="/etc/nginx/sites-available/rajawali-cycle"

cat <<'EOT' > "$NGINX_CONF"
server {
    listen 80 default_server;
    listen [::]:80 default_server;
    server_name _;

    client_max_body_size 100M;

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
        proxy_read_timeout 120s;
        proxy_connect_timeout 60s;
    }
}
EOT

rm -f /etc/nginx/sites-enabled/default || true
ln -sf "$NGINX_CONF" /etc/nginx/sites-enabled/rajawali-cycle
nginx -t && systemctl reload nginx
echo -e "${GREEN}✓ Nginx berhasil di-reload! Port 80 kini otomatis mengarah ke Port 3000.${NC}"

echo -e "\n${YELLOW}[2/4] Mengizinkan Port Firewall UFW (80, 443, 3000)...${NC}"
ufw allow 80/tcp || true
ufw allow 443/tcp || true
ufw allow 3000/tcp || true
ufw allow 22/tcp || true
echo "y" | ufw enable || true
echo -e "${GREEN}✓ Firewall Ubuntu UFW siap.${NC}"

echo -e "\n${YELLOW}[3/4] Mengompilasi & Memperbarui Server Backend Rajawali Cycle...${NC}"
cd "$APP_DIR"

# Jika ada package.json, jalankan build
if [ -f "package.json" ]; then
  npm run build || npx esbuild server.ts --bundle --platform=node --format=cjs --packages=external --sourcemap --outfile=dist/server.cjs
fi

echo -e "\n${YELLOW}[4/4] Me-restart Layanan PM2 (rajawali-cycle)...${NC}"
pm2 restart rajawali-cycle || pm2 start dist/server.cjs --name "rajawali-cycle" --time
pm2 save

echo -e "\n${YELLOW}Menguji Endpoint /api/vps/status lokal...${NC}"
sleep 2
TEST_RESP=$(curl -s http://127.0.0.1:3000/api/vps/status || echo "ERR")

if [[ "$TEST_RESP" == *"\"status\":\"ok\""* ]] || [[ "$TEST_RESP" == *"\"platform\""* ]]; then
  echo -e "${GREEN}✓ SUKSES! /api/vps/status merespon JSON dengan sempurna:${NC}"
  echo -e "${CYAN}${TEST_RESP}${NC}"
else
  echo -e "${YELLOW}Respon uji status:${NC} $TEST_RESP"
fi

IP_PUBLIC=$(curl -s https://ifconfig.me || curl -s https://api.ipify.org || echo "202.10.34.203")

echo -e "\n${CYAN}==================================================================${NC}"
echo -e "${GREEN}🎉 PERBAIKAN VPS RUMAHWEB SELESAI!${NC}"
echo -e "${CYAN}==================================================================${NC}"
echo -e "Akses Anda kini siap digunakan di aplikasi web:"
echo -e "  🌐 Akses HTTP Standar: ${GREEN}http://${IP_PUBLIC}${NC}"
echo -e "  ⚡ Akses Port 3000   : ${GREEN}http://${IP_PUBLIC}:3000${NC}"
echo -e "  📊 Cek Status JSON   : ${GREEN}http://${IP_PUBLIC}/api/vps/status${NC}"
echo -e "${CYAN}==================================================================${NC}\n"
