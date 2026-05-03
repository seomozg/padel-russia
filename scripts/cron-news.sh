#!/bin/bash
set -e

cd /var/www/padel-russia

echo "[$(date '+%Y-%m-%d %H:%M:%S')] Запуск парсинга новостей..."

# 1. Парсинг новых статей
docker-compose exec -T \
  -e NODE_OPTIONS="--require /app/scripts/polyfill-file.js" \
  -e DEEPSEEK_API_KEY=sk-71fd8f457ede4e279daa7f2ae7f0db39 \
  -e GOOGLE_PLACES_API_KEY=AIzaSyAx3DftQHtQ3C9IqkAUK3U-eMUF8wY0OYQ \
  backend npx ts-node scripts/scrape-news.ts 2>&1 || echo "⚠️ scrape-news завершился с ошибкой"

# 2. Перевод новых статей
docker-compose exec -T \
  -e NODE_OPTIONS="--require /app/scripts/polyfill-file.js" \
  -e DEEPSEEK_API_KEY=sk-71fd8f457ede4e279daa7f2ae7f0db39 \
  -e GOOGLE_PLACES_API_KEY=AIzaSyAx3DftQHtQ3C9IqkAUK3U-eMUF8wY0OYQ \
  backend npx ts-node scripts/translate-articles.ts 2>&1 || echo "⚠️ translate-articles завершился с ошибкой"

echo "[$(date '+%Y-%m-%d %H:%M:%S')] Парсинг новостей завершён."