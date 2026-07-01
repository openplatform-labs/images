#!/usr/bin/env bash
# cc2-dns1(images.opl.io.kr) 원격 배포 스크립트
set -euo pipefail

REMOTE_HOST="${REMOTE_HOST:-cc2-dns1}"
APP_DIR="/var/www/images.opl.io.kr"
APP_PORT="${APP_PORT:-3100}"
SERVICE_NAME="opensphere-logos"
DOMAIN="images.opl.io.kr"
LOCAL_DIR="$(cd "$(dirname "$0")/.." && pwd)"

echo "==> 소스 동기화: ${LOCAL_DIR} -> ${REMOTE_HOST}:${APP_DIR}"
rsync -az --delete \
  --exclude 'node_modules' \
  --exclude '.next' \
  --exclude '.git' \
  --exclude 'data/*.sqlite' \
  --exclude 'data/*.sqlite-*' \
  --exclude '.env*.local' \
  --exclude '.env.production' \
  "${LOCAL_DIR}/" \
  "${REMOTE_HOST}:${APP_DIR}/"

echo "==> 원격 빌드 및 서비스 설정"
ssh "${REMOTE_HOST}" "bash -s" <<REMOTE
set -euo pipefail

APP_DIR="${APP_DIR}"
APP_PORT="${APP_PORT}"
SERVICE_NAME="${SERVICE_NAME}"
DOMAIN="${DOMAIN}"

# E2.Micro 메모리 부족 방지용 swap
if [ ! -f /swapfile ]; then
  sudo fallocate -l 2G /swapfile || sudo dd if=/dev/zero of=/swapfile bs=1M count=2048
  sudo chmod 600 /swapfile
  sudo mkswap /swapfile
  sudo swapon /swapfile
  echo '/swapfile none swap sw 0 0' | sudo tee -a /etc/fstab >/dev/null
fi

sudo mkdir -p "\${APP_DIR}/data"
sudo chown -R ubuntu:ubuntu "\${APP_DIR}"

cd "\${APP_DIR}"

if [ ! -f .env.production ]; then
  echo "ERROR: .env.production 이 없습니다. 서버에 환경 변수 파일을 먼저 생성하세요."
  exit 1
fi

export NODE_OPTIONS="--max-old-space-size=768"
npm ci
npm run build

sudo tee /etc/systemd/system/\${SERVICE_NAME}.service >/dev/null <<UNIT
[Unit]
Description=OpenSphere Logos Web (Next.js)
After=network.target

[Service]
Type=simple
User=ubuntu
WorkingDirectory=\${APP_DIR}
Environment=NODE_ENV=production
Environment=PORT=\${APP_PORT}
EnvironmentFile=\${APP_DIR}/.env.production
ExecStart=/usr/bin/npm run start -- -p \${APP_PORT}
Restart=on-failure
RestartSec=5

[Install]
WantedBy=multi-user.target
UNIT

sudo systemctl daemon-reload
sudo systemctl enable \${SERVICE_NAME}
sudo systemctl restart \${SERVICE_NAME}

# Caddy 리버스 프록시
if ! grep -q "\${DOMAIN}" /etc/caddy/Caddyfile; then
  sudo tee -a /etc/caddy/Caddyfile >/dev/null <<CADDY

\${DOMAIN} {
    reverse_proxy localhost:\${APP_PORT}
}
CADDY
  sudo systemctl reload caddy
fi

sleep 2
curl -fsS "http://127.0.0.1:\${APP_PORT}/" >/dev/null
echo "배포 완료: https://\${DOMAIN}"
REMOTE
