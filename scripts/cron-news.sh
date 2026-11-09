#!/bin/bash
set -e

# Директория проекта определяется по месту скрипта (scripts/..) — работает
# и в /opt/padel-russia (Timeweb), и в любой другой клоне репозитория.
cd "$(dirname "$0")/.."

# Секреты (DEEPSEEK_API_KEY, GOOGLE_PLACES_API_KEY) хранятся в .env и НЕ попадают в git
set -a
[ -f .env ] && . ./.env
set +a

if [ -z "$DEEPSEEK_API_KEY" ]; then
  echo "⚠️ DEEPSEEK_API_KEY не задан (проверьте .env в корне репозитория) — перевод будет пропущен"
fi

echo "[$(date '+%Y-%m-%d %H:%M:%S')] Запуск парсинга новостей..."

# 1. Парсинг новых статей
# (DEEPSEEK_API_KEY/GOOGLE_PLACES_API_KEY приходят из .env через docker-compose environment)
docker compose -f docker-compose.prod.yml exec -T \
  -e NODE_OPTIONS="--require /app/scripts/polyfill-file.js" \
  backend npx ts-node scripts/scrape-news.ts 2>&1 || echo "⚠️ scrape-news завершился с ошибкой"

# 2. Перевод новых статей
docker compose -f docker-compose.prod.yml exec -T \
  -e NODE_OPTIONS="--require /app/scripts/polyfill-file.js" \
  backend npx ts-node scripts/translate-articles.ts 2>&1 || echo "⚠️ translate-articles завершился с ошибкой"

echo "[$(date '+%Y-%m-%d %H:%M:%S')] Парсинг новостей завершён."