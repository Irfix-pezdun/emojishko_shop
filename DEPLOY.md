# Финальный деплой: Cloudflare Pages + Render

Две площадки:

1. **Render** — бот + касса (backend) + файлы эмодзи  
2. **Cloudflare Pages** — витрина (то, что открывается в Telegram)

---

## Часть 1. GitHub

1. Зарегистрируйся на [github.com](https://github.com), если ещё нет.
2. **New repository** → имя например `emoji-shop` → Create (без README).
3. Залей папку проекта:
   - через сайт: **uploading an existing file** (перетащи всю папку), или
   - через Git, если умеешь.

В репозитории должны быть видны папки: `frontend`, `backend`, `bot`, `assets`, файл `start.sh`.

---

## Часть 2. Render (бот + backend)

1. Зайди на [render.com](https://render.com) → Sign Up (удобно **через GitHub**).
2. **Dashboard** → **New +** → **Web Service**.
3. Подключи репозиторий `emoji-shop` → **Connect**.

### Настройки сервиса

| Поле | Что вписать |
|------|-------------|
| **Name** | `emoji-shop-api` (любое) |
| **Region** | ближе к тебе (Frankfurt и т.п.) |
| **Root Directory** | *оставь пустым* (корень репо) |
| **Runtime** | `Python 3` |
| **Build Command** | см. ниже |
| **Start Command** | см. ниже |
| **Instance type** | **Free** |

**Build Command** (скопируй целиком):

```bash
pip install -r backend/requirements.txt -r bot/requirements.txt
```

**Start Command** (скопируй целиком):

```bash
bash start.sh
```

Если `start.sh` не запускается, альтернатива:

```bash
bash -c "cd backend && uvicorn app.main:app --host 0.0.0.0 --port $PORT & cd ../bot && python bot.py"
```

### Environment (Environment Variables)

Нажми **Add Environment Variable** для каждой строки:

| Key | Value |
|-----|--------|
| `BOT_TOKEN` | токен от @BotFather |
| `CHANNEL_USERNAME` | `@IRF_dsgn` |
| `AUTHOR_USERNAME` | `@IRFIX_Factor` |
| `AUTHOR_TELEGRAM_ID` | пока можно `0`, потом свой id |
| `WEBAPP_URL` | пока `https://example.com` — заменим после Pages |
| `API_BASE_URL` | пока пусто — заменим на URL Render после деплоя |
| `CORS_ORIGINS` | `*` (потом сузим) |
| `SKIP_INIT_DATA_CHECK` | `false` |

→ **Create Web Service** и жди деплой (3–5 минут).

### После деплоя Render

Сверху страницы сервиса будет URL вида:

```text
https://emoji-shop-api-xxxx.onrender.com
```

Проверь в браузере:

```text
https://emoji-shop-api-xxxx.onrender.com/api/health
```

Должно быть что-то вроде `{"ok":true}`.

В **Environment** Render допиши/исправь:

| Key | Value |
|-----|--------|
| `API_BASE_URL` | `https://emoji-shop-api-xxxx.onrender.com` |

**Manual Deploy** → **Deploy latest commit** (чтобы подтянуть env) — или просто **Save**.

Напиши боту в Telegram `/start`, потом `/myid` → скопируй число →  
`AUTHOR_TELEGRAM_ID` = это число → снова Save/Redeploy.

---

## Часть 3. Cloudflare Pages (витрина)

1. [dash.cloudflare.com](https://dash.cloudflare.com) → регистрация.
2. **Workers & Pages** → **Create** → **Pages** → **Connect to Git**.
3. Тот же репозиторий `emoji-shop`.

### Build settings

| Поле | Значение |
|------|----------|
| **Project name** | любое, например `emoji-shop` |
| **Production branch** | `main` (или `master`) |
| **Root directory** | `frontend` |
| **Framework preset** | Vite |
| **Build command** | `npm install && npm run build` |
| **Build output directory** | `dist` |

### Environment variables → Production

| Name | Value |
|------|--------|
| `VITE_API_BASE_URL` | `https://emoji-shop-api-xxxx.onrender.com` |

**Без** слэша в конце. Это URL **Render**, не Pages.

→ **Save and Deploy**.

Через 1–2 минуты будет:

```text
https://emoji-shop-xxxx.pages.dev
```

---

## Часть 4. Склеить ссылки

### На Render (Environment)

| Key | Value |
|-----|--------|
| `WEBAPP_URL` | `https://emoji-shop-xxxx.pages.dev` |
| `CORS_ORIGINS` | `https://emoji-shop-xxxx.pages.dev` |

Сохрани и сделай **Redeploy** сервиса на Render.

### BotFather

1. [@BotFather](https://t.me/BotFather) → `/mybots` → твой бот  
2. **Bot Settings** → **Menu Button** (или Configure Mini App)  
3. URL: `https://emoji-shop-xxxx.pages.dev`

### Канал

Бот должен быть **администратором** канала `@IRF_dsgn`.

---

## Часть 5. Проверка

1. Открой бота → `/start` → кнопка мини-аппа.  
2. Должны открыться экраны, эмодзи в портфолио.  
3. «Бесплатный эмодзи» → подписка → описание → заявка → тебе сообщение с **кодом IRF-…**.  
4. `/leads` у бота — список заявок с кодами.

---

## Если что-то не работает

| Проблема | Что сделать |
|----------|-------------|
| Render Build failed | Смотри **Logs** — часто ошибка в `pip install` |
| `/api/health` не открывается | Сервис ещё деплоится или упал Start Command — смотри Logs |
| Мини-апп пустой | `VITE_API_BASE_URL` неверный → исправь env на Pages → **Retry deployment** |
| CORS в консоли браузера | `CORS_ORIGINS` на Render = URL Pages |
| Бот не отвечает | Free Render **заснул** — подожди 30–60 сек или открой `/api/health` |
| Нет уведомлений о заявках | `AUTHOR_TELEGRAM_ID` + напиши боту `/start` |
| «Сначала подпишись» всегда | Бот не админ канала |

---

## Команды — шпаргалка

**Render Build:**
```bash
pip install -r backend/requirements.txt -r bot/requirements.txt
```

**Render Start:**
```bash
bash start.sh
```

**Pages Build:**
```bash
npm install && npm run build
```

**Pages env:**
```text
VITE_API_BASE_URL=https://ТВОЙ.onrender.com
```
EOF
