# PadelRussia Frontend (Next.js)

Next.js 14 (App Router) фронтенд с SSR для SEO-оптимизации.

## Запуск локально

```bash
# Установка зависимостей
npm install --legacy-peer-deps

# Dev-режим (нужен запущенный backend на http://localhost:3001)
NEXT_PUBLIC_API_URL=http://localhost:3001 npm run dev

# Сборка
npm run build

# Production-режим
npm start
```

## Переменные окружения

| Переменная | Описание | Default |
|-----------|----------|---------|
| `NEXT_PUBLIC_API_URL` | URL backend API (пустой в prod — nginx проксирует) | `""` |
| `NEXT_PUBLIC_SITE_URL` | URL сайта для canonical/sitemap/OG | `https://padel-russia.online` |
| `NEXT_PUBLIC_YANDEX_MAPS_API_KEY` | API ключ Яндекс.Карт | — |
| `BACKEND_URL` | Внутренний URL backend для серверных fetch (Docker) | `http://localhost:3001` |

## Структура

```
app/
├── layout.tsx              # корневой layout + metadata
├── page.tsx                # главная (SSR)
├── not-found.tsx           # 404
├── sitemap.ts              # динамический sitemap.xml
├── robots.ts               # динамический robots.txt
├── courts/
│   ├── page.tsx            # каталог (SSR + клиентские фильтры)
│   └── [slug]/page.tsx     # детали корта (SSR + JSON-LD)
├── map/page.tsx            # карта (SSR + клиентская карта)
├── news/
│   ├── page.tsx            # список статей (SSR)
│   └── [slug]/page.tsx     # статья (SSR + JSON-LD)
└── admin/page.tsx          # админка (client-only, noindex)
```

## SEO-возможности

- ✅ SSR на каждый запрос (актуальные отзывы/лайки)
- ✅ `generateMetadata` — уникальные title/description/canonical/OG на каждой странице
- ✅ JSON-LD: SportsActivityLocation, Article, BreadcrumbList, AggregateRating, WebSite+SearchAction
- ✅ Динамический `sitemap.xml` (все корты + статьи + статичные страницы)
- ✅ Динамический `robots.txt` (Disallow /admin, Host, Sitemap)
- ✅ `manifest.json` (PWA)
- ✅ 404 для несуществующих страниц (через `notFound()`)
- ✅ Хлебные крошки (визуальные + BreadcrumbList JSON-LD)
- ✅ Canonical URL на каждой странице
- ✅ `next/font` — самохостинг шрифтов (Inter, Unbounded)
- ✅ Уникальные `alt` у изображений

## ⚠️ БЕЗОПАСНОСТЬ БД

**БД (SQLite в volume `db-data`) НЕ затрагивается при деплое этого frontend.**

- Backend-контейнер НЕ пересобирается при обновлении frontend
- Volume `db-data` персистентный, не удаляется при `docker compose up -d`
- Используйте `docker compose up -d --no-deps frontend` для обновления только frontend

### ❌ ЗАПРЕЩЁННЫЕ команды (удалит БД!):
- `docker compose down -v` (флаг `-v` удаляет volumes)
- `docker volume rm db-data`
- `prisma migrate reset` (стирает все данные)

### ✅ Backup перед деплоем (страховка):
```bash
docker compose exec backend cp /app/prisma/dev.db /app/prisma/dev.db.backup.$(date +%Y%m%d)
```
