# PadelRussia Backend API

Модульный бэкенд для сайта про падел теннис в России, разработанный с использованием TDD подхода.

## 🚀 Быстрый старт

### Установка зависимостей
```bash
npm install
```

### Настройка переменных окружения
Создайте файл `.env` на основе `.env.example`:

```env
DATABASE_URL="file:./dev.db"
JWT_SECRET=your-secret-key-here
DEEPSEEK_API_KEY=your-deepseek-api-key
GOOGLE_PLACES_API_KEY=your-google-places-api-key
YANDEX_MAPS_API_KEY=your-yandex-maps-api-key

# Redis (опционально для кэширования)
REDIS_ENABLED=false
REDIS_HOST=localhost
REDIS_PORT=6379
REDIS_PASSWORD=
REDIS_DB=0
```

### Запуск сервера
```bash
npm run dev
```

Сервер будет доступен на `http://localhost:3001`

## 📋 API Документация

### Базовый URL
```
http://localhost:3001/api/v1
```

### Аутентификация
API использует JWT токены для аутентификации. Получите токен через `/auth/login` и передавайте в заголовке:
```
Authorization: Bearer <your-jwt-token>
```

---

## 🏓 Корты (Courts)

### Получить список кортов
```http
GET /courts
```

**Query параметры:**
- `city` - фильтр по городу
- `type` - тип корта (indoor/outdoor/mixed)
- `search` - поиск по названию, городу или адресу
- `sort` - сортировка (rating, price_asc, price_desc, reviews)

**Пример ответа:**
```json
[
  {
    "id": 1,
    "slug": "padel-club-moscow",
    "name": "Padel Club Moscow",
    "city": "Москва",
    "address": "ул. Ленина, 10",
    "coordinates": [55.7558, 37.6176],
    "type": "indoor",
    "amenities": ["парковка", "раздевалки", "прокат ракеток"],
    "phone": "+7 (495) 123-45-67",
    "workingHours": "9:00-22:00",
    "description": "Современный падел клуб в центре Москвы",
    "prices": [],
    "rating": 4.5,
    "reviewCount": 25,
    "likes": 15,
    "courtsCount": 4,
    "tags": ["центр", "профи"],
    "source": "demo-data",
    "sourceUrl": null,
    "createdAt": "2024-01-01T00:00:00.000Z",
    "updatedAt": "2024-01-01T00:00:00.000Z"
  }
]
```

### Получить детали корта
```http
GET /courts/:slug
```

**Пример ответа:**
```json
{
  "id": 1,
  "slug": "padel-club-moscow",
  "name": "Padel Club Moscow",
  "city": "Москва",
  "address": "ул. Ленина, 10",
  "coordinates": [55.7558, 37.6176],
  "type": "indoor",
  "amenities": ["парковка", "раздевалки", "прокат ракеток"],
  "phone": "+7 (495) 123-45-67",
  "workingHours": "9:00-22:00",
  "description": "Современный падел клуб в центре Москвы",
  "prices": [],
  "rating": 4.5,
  "reviewCount": 25,
  "likes": 15,
  "courtsCount": 4,
  "tags": ["центр", "профи"],
  "source": "demo-data",
  "sourceUrl": null,
  "createdAt": "2024-01-01T00:00:00.000Z",
  "updatedAt": "2024-01-01T00:00:00.000Z",
  "reviews": [
    {
      "id": 1,
      "rating": 5,
      "comment": "Отличный клуб!",
      "createdAt": "2024-01-01T00:00:00.000Z",
      "user": {
        "id": 1,
        "name": "Иван Петров",
        "avatar": null
      }
    }
  ]
}
```

### Получить отзывы корта
```http
GET /courts/:courtId/reviews
```

---

## 📰 Новости (Articles)

### Получить список новостей
```http
GET /articles
```

**Query параметры:**
- `category` - категория новостей
- `search` - поиск по заголовку или содержимому
- `limit` - количество новостей (по умолчанию 10)
- `offset` - смещение для пагинации

**Пример ответа:**
```json
[
  {
    "id": 1,
    "slug": "turnir-v-moskve-2024",
    "title": "Крупный турнир по падел в Москве",
    "excerpt": "В Москве прошел крупнейший турнир года...",
    "content": "Полный текст новости...",
    "category": "Турниры",
    "readTime": 5,
    "author": "Редакция PadelRussia",
    "published": true,
    "image": "https://example.com/image.jpg",
    "sourceUrl": "https://original-source.com/news",
    "createdAt": "2024-01-01T00:00:00.000Z",
    "updatedAt": "2024-01-01T00:00:00.000Z"
  }
]
```

### Получить новость по slug
```http
GET /articles/:slug
```

---

## 👤 Пользователи (Users)

### Регистрация
```http
POST /auth/register
```

**Тело запроса:**
```json
{
  "name": "Иван Петров",
  "email": "ivan@example.com",
  "password": "password123"
}
```

### Авторизация
```http
POST /auth/login
```

**Тело запроса:**
```json
{
  "email": "ivan@example.com",
  "password": "password123"
}
```

**Пример ответа:**
```json
{
  "token": "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...",
  "user": {
    "id": 1,
    "name": "Иван Петров",
    "email": "ivan@example.com",
    "avatar": null
  }
}
```

---

## ⭐ Отзывы (Reviews)

### Создать отзыв
```http
POST /reviews
```

**Тело запроса:**
```json
{
  "courtId": 1,
  "rating": 5,
  "comment": "Отличный клуб!"
}
```

### Получить отзывы пользователя
```http
GET /reviews/user/:userId
```

### Поставить/убрать лайк с отзыва
```http
POST /reviews/:reviewId/like
```

---

## 🗺️ Карты (Maps)

### Получить маршрут до корта
```http
GET /maps/directions
```

**Query параметры:**
- `origin` - координаты отправной точки (lat,lng)
- `destination` - координаты корта (lat,lng)
- `mode` - тип транспорта (driving, walking, transit)

---

## 🤖 Сборщик данных (Data Collector)

### Запустить сбор новостей вручную
```http
POST /data-collector/news/collect
```

### Запустить сбор кортов вручную
```http
POST /data-collector/courts/collect
```

### Получить статус последнего запуска
```http
GET /data-collector/status
```

**Пример ответа:**
```json
{
  "news": {
    "lastRun": "2024-01-01T12:00:00.000Z",
    "success": true,
    "collected": 15
  },
  "courts": {
    "lastRun": "2024-01-01T02:00:00.000Z",
    "success": true,
    "collected": 25
  }
}
```

### Обновить конфигурацию сборщика
```http
PUT /data-collector/config
```

**Тело запроса:**
```json
{
  "enabled": true,
  "schedule": {
    "courts": "0 2 * * *",
    "news": "0 */4 * * *"
  },
  "sources": {
    "courts": ["demo-data", "google-places"],
    "news": ["rss-feeds"]
  },
  "limits": {
    "maxCourtsPerRun": 50,
    "maxNewsPerRun": 20,
    "maxRetries": 3
  }
}
```

---

## 🛠️ Система кэширования

API поддерживает Redis кэширование для улучшения производительности. Кэширование включено для GET запросов на 10 минут по умолчанию.

### Управление кэшем

#### Очистить весь кэш
```http
POST /cache/clear
```

#### Получить статистику кэша
```http
GET /cache/stats
```

**Пример ответа:**
```json
{
  "totalKeys": 45,
  "memory": {
    "used": "2048000",
    "peak": "4096000",
    "rss": "8192000"
  },
  "uptime": "3600"
}
```

---

## 🧪 Тестирование

### Запуск всех тестов
```bash
npm test
```

### Запуск тестов с покрытием
```bash
npm run test:coverage
```

### Запуск конкретного теста
```bash
npm test -- --testNamePattern="Courts API"
```

---

## 📊 Мониторинг

### Проверка здоровья системы
```http
GET /health
```

**Пример ответа:**
```json
{
  "status": "ok",
  "timestamp": "2024-01-01T12:00:00.000Z",
  "services": {
    "database": "ok",
    "redis": "disabled",
    "externalAPIs": "ok"
  }
}
```

---

## 🔧 Скрипты для разработки

### Очистка базы данных
```bash
npm run db:reset
```

### Заполнение демо-данными
```bash
npm run db:seed
```

### Генерация типов Prisma
```bash
npx prisma generate
```

### Миграции базы данных
```bash
npx prisma migrate dev
```

---

## 🏗️ Архитектура

Проект построен по модульной архитектуре:

```
src/
├── modules/           # Основные модули
│   ├── auth/         # Аутентификация и авторизация
│   ├── courts/       # Управление кортами
│   ├── articles/     # Новости и статьи
│   ├── reviews/      # Отзывы и рейтинги
│   ├── maps/         # Интеграция с картами
│   └── data-collector/ # Сборщик данных
├── middleware/       # Промежуточное ПО
├── config/          # Конфигурация
├── utils/           # Утилиты
└── tests/           # Тесты
```

### Ключевые особенности:

- **TDD подход**: Все компоненты разработаны через тестирование
- **Модульность**: Каждый функционал в отдельном модуле
- **Кэширование**: Redis для улучшения производительности
- **Автоматический сбор данных**: RSS feeds, Google Places, веб-скрапинг
- **Многоязычность**: Автоматический перевод новостей
- **JWT аутентификация**: Безопасная авторизация пользователей
- **CORS поддержка**: Интеграция с React фронтендом

---

## 📝 Лицензия

MIT License