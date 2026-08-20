#!/usr/bin/env bash
# oci-cc2-node2 (CMARS-OCI-CC2-DNS) — logos.opl.io.kr + images.opl.io.kr 동일 앱 배포
set -euo pipefail

REMOTE_HOST="${REMOTE_HOST:-oci-cc2-node2}"
APP_DIR="/var/www/images.opl.io.kr"
APP_PORT="${APP_PORT:-3100}"
SERVICE_NAME="opensphere-logos"
PRIMARY_DOMAIN="logos.opl.io.kr"
IMAGES_DOMAIN="images.opl.io.kr"
LEGACY_DOMAINS="logo.opl.io.kr"
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
  --exclude 'images/*.jpg' \
  --exclude 'images/*.jpeg' \
  --exclude 'images/*.png' \
  --exclude 'images/*.webp' \
  --exclude 'images/*.gif' \
  --exclude 'logos/*.svg' \
  --exclude 'icons/**/*.svg' \
  --exclude 'pictograms/**/*.svg' \
  --exclude 'illust/*.svg' \
  --exclude 'avatars/*.svg' \
  "${LOCAL_DIR}/" \
  "${REMOTE_HOST}:${APP_DIR}/"

echo "==> 원격 빌드 및 서비스 설정"
ssh "${REMOTE_HOST}" "bash -s" <<REMOTE
set -euo pipefail

APP_DIR="${APP_DIR}"
APP_PORT="${APP_PORT}"
SERVICE_NAME="${SERVICE_NAME}"
PRIMARY_DOMAIN="${PRIMARY_DOMAIN}"
IMAGES_DOMAIN="${IMAGES_DOMAIN}"
LEGACY_DOMAINS="${LEGACY_DOMAINS}"

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

# Caddy: logos + images 동일 프록시, logo.* 만 리다이렉트
sudo cp /etc/caddy/Caddyfile /etc/caddy/Caddyfile.bak.\$(date +%Y%m%d%H%M%S) || true
sudo python3 <<'PY'
from pathlib import Path

path = Path("/etc/caddy/Caddyfile")
text = path.read_text() if path.exists() else ""

# 기존 opl.io.kr 관련 블록 제거 후 재작성
lines = text.splitlines()
filtered = []
skip = False
for line in lines:
    stripped = line.strip()
    if stripped.endswith(".opl.io.kr {") and any(
        name in stripped
        for name in (
            "logos.",
            "logo.",
            "images.",
            "illust.",
            "icons.",
            "avatars.",
            "pictograms.",
        )
    ):
        skip = True
        continue
    if skip:
        if stripped == "}":
            skip = False
        continue
    filtered.append(line)

blocks = """
logos.opl.io.kr {
    reverse_proxy localhost:3100
}

images.opl.io.kr {
    reverse_proxy localhost:3100
}

illust.opl.io.kr {
    reverse_proxy localhost:3100
}

icons.opl.io.kr {
    reverse_proxy localhost:3100
}

avatars.opl.io.kr {
    reverse_proxy localhost:3100
}

pictograms.opl.io.kr {
    reverse_proxy localhost:3100
}

logo.opl.io.kr {
    redir https://logos.opl.io.kr{uri} permanent
}
""".strip()

new_text = "\n".join(filtered).rstrip() + "\n\n" + blocks + "\n"
path.write_text(new_text)
print("Caddyfile updated for logos + images channels")
PY

sudo caddy validate --config /etc/caddy/Caddyfile
sudo systemctl reload caddy

sleep 3
curl -fsS "http://127.0.0.1:\${APP_PORT}/" >/dev/null
echo "배포 완료: https://\${PRIMARY_DOMAIN} + https://\${IMAGES_DOMAIN}"
REMOTE
