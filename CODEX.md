# Инструкция для Codex — проект «Азикр» (Telegram Mini App)

Привет, Codex. Ты доводишь до прода Telegram Mini App для чтения исламских поминаний
(азкары): утренние, вечерние, после намаза. Дизайн и контент уже готовы — тебе нужно
**задеплоить** и **сгенерировать обложки**. Ниже всё, что нужно.

---

## 0. Где ты и что читать

- Рабочая папка (тут открыт чат): `/Users/ilnur_ryazhapov/Desktop/code_src/azkar`
- Репозиторий: `https://github.com/RYAZHAPOVILNUR/azkar` (приватный, owner RYAZHAPOVILNUR)
- Прочитай перед стартом: `README.md`, `DEPLOY.md`, `miniapp/index.html`, `bot/server.js`, `bot/.env`.

## 1. Что уже сделано (НЕ переделывай)

- **Фронт** — `miniapp/index.html`: цельный self-contained HTML/CSS/JS. Внутри:
  мягкий шалфейный дизайн, liquid glass, свет/тёмная тема, экраны (главный / чтение / настройки),
  **тасбих-счётчик** (кольцо с бусинами-чётками, «Осталось N», кнопки сброс/готово),
  тексты азкаров в JS-массиве `AZKAR`, интеграция Telegram WebApp SDK (expand/тема/back/haptic).
  `design/prototype.html` — его копия-близнец (держи синхронной).
- **Важно:** в начале файла есть `<meta charset="utf-8">` и `<meta viewport>`. **НЕ УДАЛЯЙ ИХ** —
  без charset текст (кириллица+арабский) превращается в кракозябры при отдаче своим сервером.
- **Бот** — `bot/server.js`: express отдаёт `../miniapp`, бот на polling, крон-напоминания
  (утро 06:30 / вечер 18:00 по TZ из .env, МСК) шлёт подписчикам сообщение с кнопкой Mini App.
  Напоминания уже реализованы — трогать не нужно.
- **Токен бота** лежит в локальном `bot/.env` (в git его НЕТ, он gitignored). Возьми токен оттуда.

## 2. Структура

```
azkar/
├── miniapp/index.html   ← прод-фронт (charset+viewport+Telegram SDK+тасбих)
├── design/prototype.html← копия-близнец (синхронь с miniapp при правках)
├── bot/
│   ├── server.js        ← express-статик + бот (polling) + крон-напоминания
│   ├── package.json     ← express, node-cron, node-telegram-bot-api
│   └── .env             ← локально есть BOT_TOKEN (не в git). На сервере создашь свой.
├── deploy/
│   ├── nginx-azkar.conf ← vhost azkar.nurtech.dev → 127.0.0.1:3010
│   ├── azkar.service    ← systemd unit
│   └── deploy.sh        ← обновление на сервере
└── DEPLOY.md
```

---

## ЗАДАЧА A — Задеплоить

**Сервер:** `45.77.66.108`, пользователь **root**. **Домен:** `azkar.nurtech.dev` (A-запись уже
настроена владельцем → 45.77.66.108).

> ⚠️ **ЭТО ОБЩИЙ PROD-СЕРВЕР EasyBot** с реальными данными. Ставь azkar РЯДОМ, ничего чужого
> не ломая:
> - отдельный порт **3010**, отдельный пользователь **azkar**, отдельный systemd-юнит **azkar**,
>   отдельный nginx-vhost только для `azkar.nurtech.dev`;
> - **НЕ трогай** конфиги/сайты/сервисы EasyBot, его базы, `.env`;
> - nginx только `reload` (НЕ `restart`), и только после добавления своего vhost;
> - перед стартом проверь, что порт 3010 свободен (`ss -ltnp | grep 3010`).

Шаги (детали — в `DEPLOY.md`):

1. SSH-проверка: `ssh root@45.77.66.108 'hostname'`.
2. Убедись, что стоят nginx/node/npm/git/certbot (доставь при необходимости, не задев EasyBot).
3. `git clone https://github.com/RYAZHAPOVILNUR/azkar.git /opt/azkar`.
4. `adduser --system --group azkar`, дай ему права на `/opt/azkar`.
5. Создай `/opt/azkar/bot/.env` — скопируй значения из локального `bot/.env`
   (BOT_TOKEN, APP_URL=https://azkar.nurtech.dev, PORT=3010, TZ=Europe/Moscow, крон-строки).
6. `cd /opt/azkar/bot && npm ci --omit=dev`.
7. systemd: `cp deploy/azkar.service /etc/systemd/system/`, `systemctl daemon-reload`,
   `systemctl enable --now azkar`. Проверь `systemctl status azkar`.
8. nginx: `cp deploy/nginx-azkar.conf /etc/nginx/sites-available/azkar.nurtech.dev`,
   симлинк в sites-enabled, `nginx -t && systemctl reload nginx`.
9. SSL: `certbot --nginx -d azkar.nurtech.dev`.
10. Проверка: `curl -sf https://azkar.nurtech.dev/health` → `{"ok":true}`; открой домен в браузере —
    должен отрендериться Mini App с нормальным текстом (НЕ кракозябрами; если каша — проверь charset).
11. В Telegram напиши боту `/start` → должна прийти кнопка «🕌 Открыть азкары», по ней Mini App
    открывается внутри Telegram. (Сервер сам выставляет кнопку-меню через setChatMenuButton.)

**BotFather:** если Mini App ещё не привязан к домену — в `/myapps` укажи `azkar.nurtech.dev`.

Обновления в будущем: `ssh root@45.77.66.108 'cd /opt/azkar && bash deploy/deploy.sh'`.

---

## ЗАДАЧА B — Сгенерировать обложки и вставить

Сейчас карточки трёх сессий на главном экране используют нарисованные SVG (внутри каждого
`<div class="session">` есть `<div class="art">…</div>`). Замени их на сгенерированные картинки.
Плюс сделай иконку приложения.

### Стиль (для всех баннеров): мягко, спокойно, пастельно, БЕЗ текста/людей/зданий мечети

> Soft, calm, minimalist nature illustration, pastel muted colors, gentle gradients, lots of airy
> negative space, flat/matte finish, subtle grain, serene and non-distracting. No people, no text,
> no mosque buildings. Left side lighter (там ляжет тёмный текст).

| Файл | Размер | Промпт | Палитра |
|---|---|---|---|
| `miniapp/assets/morning.webp` | 1600×900 | soft sunrise over gentle rolling hills, warm apricot and cream sky, small pale sun, misty calm dawn, pastel peach tones | `#FCE3C6 #F7D3C4 #FFF1D9` |
| `miniapp/assets/evening.webp` | 1600×900 | quiet dusk, soft dusty-blue and lavender sky, faint crescent moon and few stars, calm rolling hills silhouette, muted twilight | `#D2DAF0 #C2C9E4 #F3EFDD` |
| `miniapp/assets/after.webp` | 1600×900 | serene minimal scene, soft mint-green and sage tones, gentle light, subtle faint geometric islamic star pattern in a corner, tranquil | `#CFE7D8 #BCDBC8 #FFFFFF` |
| `miniapp/assets/icon.png` | 1024×1024 | single elegant 8-pointed islamic star (khatam) in sage green `#6FA58C` on warm cream `#F5F3EC`, minimal, flat, centered, rounded | sage on cream |

Negative: `text, letters, people, faces, realistic photo, mosque building, harsh contrast, dark heavy colors, busy details, watermark`.

Генерируй доступным image-инструментом (gpt-image / DALL·E). Баннеры оптимизируй в webp (~q80, < 200 КБ).

### Куда вставлять (в `miniapp/index.html` И синхронно в `design/prototype.html`)

1. В каждой из 3 карточек `.session` замени содержимое `<div class="art">…</div>` на фон-картинку:
   `<div class="art" style="background:url('assets/morning.webp') center/cover"></div>`
   (evening.webp / after.webp — для вечера и после намаза).
2. Сохрани читаемость текста: добавь в `.session .body` мягкий градиент-подложку слева-снизу,
   напр. `background:linear-gradient(90deg, rgba(255,255,255,.55), rgba(255,255,255,0) 70%)`,
   для тёмной темы — тёмный вариант. Проверь контраст текста `--sess-ink` в ОБЕИХ темах.
3. Иконку подключи как favicon: сразу после `<meta viewport>` добавь
   `<link rel="icon" type="image/png" href="assets/icon.png">` и
   `<link rel="apple-touch-icon" href="assets/icon.png">`.
4. Проверь визуально на узком экране (~412px) в свете и в тьме.

### Финал задачи B

- `git add -A && git commit -m "feat(azkar): обложки сессий + иконка" && git push`
- Передеплой: `ssh root@45.77.66.108 'cd /opt/azkar && bash deploy/deploy.sh'`
- Открой `https://azkar.nurtech.dev` — карточки с картинками, текст читается в обеих темах.

---

## Правила

- Токен — только в `.env` (локально и на сервере), НИКОГДА в git и не в этот файл.
- **Не сломай EasyBot** на 45.77.66.108 — добавляй только своё (порт 3010, юзер azkar, свой vhost),
  nginx только `reload`.
- **Не удаляй** `<meta charset="utf-8">` и `<meta viewport>` из HTML.
- Тексты азкаров в массиве `AZKAR` НЕ меняй — они выверены по источникам (Бухари/Муслим/Раслян).
- После правок фронта держи `miniapp/index.html` и `design/prototype.html` синхронными.

История решений по проекту — в `README.md`. Погнали: сначала A, потом B.
