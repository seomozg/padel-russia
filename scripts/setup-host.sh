#!/usr/bin/env bash
# Подготовка хоста под padel-russia (Timeweb / Ubuntu 18.04).
# Идемпотентен, безопасен для соседних проектов: ничего чужого не трогает.
set -euo pipefail

echo '== 1/3 swap (Next.js build требует памяти) =='
if swapon --show | grep -q /; then
  echo 'swap уже есть — пропускаю'
else
  fallocate -l 4G /swapfile
  chmod 600 /swapfile
  mkswap /swapfile >/dev/null
  swapon /swapfile
  grep -q '/swapfile' /etc/fstab || echo '/swapfile none swap sw 0 0' >> /etc/fstab
  echo 'swap создан'
fi

echo '== 2/3 docker engine + compose v2 =='
if docker --version >/dev/null 2>&1; then
  echo 'docker уже есть — пропускаю'
else
  export DEBIAN_FRONTEND=noninteractive
  apt-get update -yqq
  apt-get install -y -qq ca-certificates curl gnupg
  install -m 0755 -d /etc/apt/keyrings
  curl -fsSL https://download.docker.com/linux/ubuntu/gpg \
    | gpg --dearmor -o /etc/apt/keyrings/docker.gpg
  chmod a+r /etc/apt/keyrings/docker.gpg
  echo "deb [arch=amd64 signed-by=/etc/apt/keyrings/docker.gpg] https://download.docker.com/linux/ubuntu $(. /etc/os-release && echo "$VERSION_CODENAME") stable" \
    > /etc/apt/sources.list.d/docker.list
  if apt-get update -yqq && apt-cache show docker-ce >/dev/null 2>&1; then
    apt-get install -y -qq docker-ce docker-ce-cli containerd.io
  else
    # bionic выпилена из репозитория Docker — официальный пакет из universe
    echo 'bionic недоступна в download.docker.com — ставлю docker.io из universe'
    rm -f /etc/apt/sources.list.d/docker.list
    apt-get update -yqq
    apt-get install -y -qq docker.io
  fi
fi

if ! docker compose version >/dev/null 2>&1; then
  echo 'ставлю compose v2 как cli-plugin'
  mkdir -p /usr/local/lib/docker/cli-plugins
  curl -fsSL https://github.com/docker/compose/releases/download/v2.29.7/docker-compose-linux-x86_64 \
    -o /usr/local/lib/docker/cli-plugins/docker-compose
  chmod +x /usr/local/lib/docker/cli-plugins/docker-compose
fi

systemctl enable docker >/dev/null 2>&1 || true
systemctl start docker || true

echo '== 3/3 статика /images: nginx (www-data) ходит в volume напрямую =='
# Системный nginx отдаёт /images из /var/lib/docker/volumes/... — нужен traverse.
# docker при перезапуске демона сбрасывает право, поэтому закреплено drop-in'ом.
mkdir -p /etc/systemd/system/docker.service.d
printf '[Service]\nExecStartPost=/usr/bin/chmod o+x /var/lib/docker\n' \
  > /etc/systemd/system/docker.service.d/padel-images.conf
chmod o+x /var/lib/docker
systemctl daemon-reload

echo '== VERIFY =='
docker --version
docker compose version
swapon --show || true
ls -ld /var/lib/docker
