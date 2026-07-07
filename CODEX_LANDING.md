# ТЗ для Codex — лендинг на azkar.nurtech.dev (НЕ сломав Telegram Mini App)

Сейчас по `https://azkar.nurtech.dev/` отдаётся САМО приложение (Telegram Mini App), и бот
@azkarnurtechbot открывает именно этот URL. Задача: сделать по корню **красивый лендинг**, а
приложение перенести на **`/app`** — и всё перевести на новый путь, чтобы Telegram-приложение
продолжило работать.

## ⚠️ Главное правило: не сломать Mini App

- Mini App должен остаться полностью рабочим по адресу `https://azkar.nurtech.dev/app`.
- Эндпоинты `/api/times`, `/api/location`, `/health` — АБСОЛЮТНЫЕ, менять их НЕ надо, они и так
  работают на любом пути.
- Тексты азкаров, логику счётчика/намаза/напоминаний — НЕ трогать.
- Проверь локально (см. в конце), что и `/` (лендинг), и `/app` (приложение) отдаются.

## Что читать
- `bot/server.js` — тут раздача статики (сейчас `express.static(miniapp)` на корне).
- `miniapp/index.html` — приложение; `miniapp/manifest.json` — PWA-манифест.
- `README.md` — контекст проекта.

---

## ЗАДАЧА 1 — Переезд Mini App на `/app` (в `bot/server.js`)

Сейчас:
```js
app.use(express.static(path.join(__dirname, '..', 'miniapp'), { extensions: ['html'] }));
```
Сделай так (порядок важен: сначала API, потом /app, потом лендинг на /):
```js
// API и health — уже есть выше, оставь как есть (они абсолютные)
// Mini App под /app
app.use('/app', express.static(path.join(__dirname, '..', 'miniapp'), { extensions: ['html'], index: 'index.html' }));
// Лендинг на корне
app.use('/', express.static(path.join(__dirname, '..', 'landing'), { extensions: ['html'], index: 'index.html' }));
```
Убедись, что `/health` и `/api/*` объявлены ДО этих статик-раздач (они и так выше — не сломай порядок).

## ЗАДАЧА 2 — Поправить пути внутри Mini App под `/app`

В `miniapp/index.html`:
- `<link rel="manifest" href="/manifest.json">` → `href="manifest.json"` (относительный, чтобы
  под `/app/` вёл на `/app/manifest.json`).
- Иконки favicon уже относительные (`assets/icon.png`) — оставь.
- Проверь: все `assets/...` — относительные (да), `/api/...` — абсолютные (да, не трогать).

В `miniapp/manifest.json`:
- `"start_url": "/"` → `"/app"`
- `"scope": "/"` → `"/app"`
- иконки `"/assets/icon.png"` → `"/app/assets/icon.png"` (обе)

## ЗАДАЧА 3 — Перевести бота на `/app`

В `bot/server.js` дефолт APP_URL:
```js
const APP_URL = process.env.APP_URL || 'https://azkar.nurtech.dev/app';
```
(Владелец обновит `APP_URL` в `bot/.env` на `https://azkar.nurtech.dev/app` при деплое — упомяни
это в финальном сообщении.)
web_app-кнопки и `setChatMenuButton` уже используют `APP_URL` — менять их не надо, они подхватят.

---

## ЗАДАЧА 4 — Сам лендинг (`landing/index.html`)

Создай папку `landing/` с самостоятельным `index.html` (можно инлайн CSS/JS, без внешних CDN —
шрифты/картинки клади в `landing/assets/` или переиспользуй из `miniapp/assets/`).

**Дизайн — в стиле приложения** (консистентно):
- Палитра: шалфейно-зелёный `#6FA58C`, тёплая бумага `#F5F3EC`, тёмно-зелёно-серый текст `#3A433D`.
- Мягко, спокойно, воздушно, скругления, лёгкие тени. Свет + тёмная тема (по `prefers-color-scheme`).
- Арабские акценты можно теми же шрифтами (`miniapp/assets/fonts/*`), 8-конечная звезда как мотив.

**Структура лендинга:**
1. **Герой:** логотип-звезда + «Азкар», заголовок («Утренние и вечерние поминания и азкары после
   намаза»), подзаголовок, крупная кнопка-CTA **«Открыть в Telegram»** → `https://t.me/azkarnurtechbot`.
   Рядом — мокап телефона со скриншотом приложения (сделай скриншоты `/app` или используй
   `miniapp/assets/*.webp` как визуал).
2. **Возможности** (карточки-грид): счётчик-тасбих (чётки), тексты из достоверной Сунны с
   источниками, транскрипция + перевод, времена намаза по геолокации, выбор мазхаба, напоминания
   после Фаджра/Асра, выбор арабского шрифта, свет/тёмная тема, добавление на главный экран.
3. **Три раздела:** Утро / Вечер / После намаза (можно на фоне `miniapp/assets/*.webp`).
4. **Как начать:** «Открой бота → нажми Запустить → читай». Ещё одна CTA-кнопка в Telegram.
5. **Футер:** «Кейс курса AI Product Engineer» → ссылка `https://aiengineer.nurtech.dev`.

Адаптив под мобилу обязателен (лендинг будут открывать с телефона). Без внешних скриптов/аналитики.

---

## Проверка (локально, ОБЯЗАТЕЛЬНО) и финал

Запусти локально и проверь оба пути:
```bash
cd bot && npm install
PORT=3999 BOT_TOKEN= node server.js &
sleep 2
curl -s -o /dev/null -w "landing /: %{http_code}\n"        http://127.0.0.1:3999/
curl -s -o /dev/null -w "app /app/: %{http_code}\n"        http://127.0.0.1:3999/app/
curl -s -o /dev/null -w "manifest: %{http_code}\n"         http://127.0.0.1:3999/app/manifest.json
curl -s -o /dev/null -w "asset: %{http_code}\n"            http://127.0.0.1:3999/app/assets/icon.png
curl -s -o /dev/null -w "api: %{http_code}\n"              "http://127.0.0.1:3999/api/times?lat=55&lng=37&madhab=shafi"
```
Все должны отдать 200 (у /api может быть 503 «warming up» первые пару сек — это ок, повтори).
Проверь, что `/app/` открывает приложение с нормальным текстом (не кракозябры), а `/` — лендинг.

- `git add -A && git commit -m "feat(azkar): лендинг на /, Mini App на /app" && git push`
- **НЕ деплой.** Напиши владельцу: «Лендинг готов, приложение на /app — передеплой и поставь
  `APP_URL=https://azkar.nurtech.dev/app` в bot/.env». Владелец передеплоит, обновит APP_URL и
  проверит бота (кнопка должна открывать /app).
