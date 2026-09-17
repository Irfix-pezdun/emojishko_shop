# Деплой фронтенда на Cloudflare Pages

Cloudflare Pages хостит **только Mini App (frontend)**.  
Backend (FastAPI) + бот + папка `assets/packs` должны быть на другом хосте (Oracle / Railway / VPS) с HTTPS.

---

## 1. Backend уже должен быть доступен по HTTPS

Пример: `https://api.example.com`

Проверка:
```bash
curl https://api.example.com/api/health
curl https://api.example.com/api/catalog
```

В `.env` backend:
```
CORS_ORIGINS=https://твой-проект.pages.dev,https://custom-domain.com
```
(после первого деплоя Pages подставь реальный URL)

`assets/packs` должны отдаваться с того же хоста (`/assets/packs/...`).

---

## 2. GitHub

Залей репозиторий на GitHub (весь `emoji-shop`, не только frontend).

---

## 3. Cloudflare Pages

1. [dash.cloudflare.com](https://dash.cloudflare.com) → **Workers & Pages** → **Create** → **Pages** → **Connect to Git**
2. Выбери репозиторий

### Build settings

| Поле | Значение |
|------|----------|
| **Framework preset** | Vite |
| **Root directory** | `frontend` |
| **Build command** | `npm install && npm run build` |
| **Build output directory** | `dist` |

### Environment variables (Production)

| Name | Value |
|------|--------|
| `VITE_API_BASE_URL` | `https://api.example.com` (твой backend, **без** `/` в конце) |

> Переменная должна быть задана **до** сборки: Vite вшивает `import.meta.env.VITE_*` в бандл на этапе `npm run build`.

3. **Save and Deploy**

Через 1–2 минуты получишь URL вида:
```
https://emoji-shop-xxxx.pages.dev
```

---

## 4. После деплоя

1. **Backend** `.env`:
   ```
   CORS_ORIGINS=https://emoji-shop-xxxx.pages.dev
   ```
   Перезапусти API.

2. **Общий** `.env` (бот):
   ```
   WEBAPP_URL=https://emoji-shop-xxxx.pages.dev
   ```
   Перезапусти бота.

3. **BotFather** → Bot Settings → Menu Button / Configure Mini App → тот же HTTPS URL.

4. Открой бота в Telegram → кнопка мини-аппа.

---

## 5. Кастомный домен (по желанию)

Pages → проект → **Custom domains** → Add.  
SSL выдаст Cloudflare. Не забудь добавить домен в `CORS_ORIGINS` и `WEBAPP_URL`.

---

## 6. Локальная проверка production-сборки

```bash
cd frontend
VITE_API_BASE_URL=https://api.example.com npm run build
npx serve dist
```

---

## Частые ошибки

| Симптом | Причина |
|---------|---------|
| Каталог пустой / Network error | Не задан `VITE_API_BASE_URL` или backend недоступен |
| TGS не грузятся (404 на pages.dev) | Старая сборка без `assetUrl()` — пересобери с актуальным кодом |
| CORS error в консоли | Backend `CORS_ORIGINS` не включает URL Pages |
| Mini App не открывается | URL не HTTPS или не прописан в BotFather / `WEBAPP_URL` |

---

## Важно

Pages **не** запускает Python-бот и FastAPI.  
Для API+бота используй Oracle Always Free / Railway / VPS — см. основной README.
