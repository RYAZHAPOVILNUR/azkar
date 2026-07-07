# Инструкция для Codex — деплой + обложки приложения «Азикр»

Привет, Codex. Ты помогаешь довести до продакшена Telegram Mini App для чтения
исламских поминаний (азкары). Ниже — контекст, что читать, что сделать, куда что класть.

---

## 0. Где ты находишься

- Рабочая папка (открой новый чат ЗДЕСЬ): `/Users/ilnur_ryazhapov/Desktop/code_src/azkar`
- Репозиторий на GitHub: `https://github.com/RYAZHAPOVILNUR/azkar` (приватный, owner RYAZHAPOVILNUR)
- Прочитай сначала эти файлы, чтобы понять проект:
  - `README.md` — что за приложение и структура
  - `DEPLOY.md` — пошаговый деплой (следуй ему)
  - `miniapp/index.html` — прод-версия Mini App (это и есть весь фронт, один файл)
  - `design/prototype.html` — идентичная копия-прототип (правь оба или синхронизируй)
  - `bot/server.js` — бот напоминаний + статик-сервер
  - `bot/.env` — ЛОКАЛЬНЫЙ файл с токеном (в git его нет). Возьми оттуда BOT_TOKEN.

## 1. Структура проекта

```
azkar/
├── miniapp/index.html   ← фронт Mini App (self-contained HTML/CSS/JS, тексты азкаров в JS-массиве AZKAR)
├── design/prototype.html← копия для дизайна (держи синхронной с miniapp)
├── bot/
│   ├── server.js        ← express (отдаёт miniapp/) + бот (polling, крон-напоминания)
│   ├── package.json
│   └── .env             ← локально есть токен; на сервере создашь свой
├── deploy/
│   ├── nginx-azkar.conf ← vhost для azkar.nurtech.dev → 127.0.0.1:3010
│   ├── azkar.service    ← systemd unit
│   └── deploy.sh        ← обновление на сервере
└── DEPLOY.md
```

---

## ЗАДАЧА A — Задеплоить на сервер

**Сервер:** `85.239.36.234` (это IP, на который указывает A-запись `azkar.nurtech.dev`).
**Пользователь SSH:** `root`.
**Домен:** `azkar.nurtech.dev` (DNS уже настроен владельцем, A-запись → 85.239.36.234).
**Токен бота:** возьми из локального `bot/.env` (значение `BOT_TOKEN=...`). На сервере создай
`/opt/azkar/bot/.env` с этим токеном. НИКОГДА не коммить токен в git.

Шаги (подробности — в `DEPLOY.md`):

1. Проверь SSH: `ssh root@85.239.36.234 'hostname'`.
2. Проверь, что порт `3010` свободен и nginx/node/certbot стоят (`apt install` при необходимости).
   Если на сервере уже крутятся другие сайты — НЕ трогай их конфиги, добавляй только своё.
3. `git clone https://github.com/RYAZHAPOVILNUR/azkar.git /opt/azkar`.
4. Создай `/opt/azkar/bot/.env` (скопируй значения из локального `bot/.env`, APP_URL=https://azkar.nurtech.dev).
5. `cd /opt/azkar/bot && npm ci --omit=dev`.
6. systemd: скопируй `deploy/azkar.service` в `/etc/systemd/system/`, создай пользователя `azkar`
   (`adduser --system --group azkar`, дай ему права на `/opt/azkar`), `systemctl enable --now azkar`.
7. nginx: скопируй `deploy/nginx-azkar.conf` в sites-available, симлинк в sites-enabled,
   `nginx -t && systemctl reload nginx`.
8. SSL: `certbot --nginx -d azkar.nurtech.dev`.
9. Проверь: `curl -sf https://azkar.nurtech.dev/health` → `{"ok":true}`; открой домен в браузере.
10. В Telegram напиши боту `/start` — должна прийти кнопка «🕌 Открыть азкары», по ней Mini App
    открывается внутри Telegram. (Сервер сам вызывает setChatMenuButton — кнопка-меню тоже появится.)

**BotFather (если ещё не сделано владельцем):** в `/newapp`/`/myapps` привяжи Mini App к домену
`azkar.nurtech.dev`, иначе кнопка web_app может не открыться.

Дальнейшие обновления: `cd /opt/azkar && bash deploy/deploy.sh`.

---

## ЗАДАЧА B — Сгенерировать обложки и вставить

Сейчас карточки трёх сессий на главном экране используют нарисованные SVG-градиенты
(в `miniapp/index.html` внутри каждого `<div class="session">` есть `<div class="art"><svg>…</svg></div>`).
Замени их на сгенерированные картинки. Плюс сделай иконку приложения.

### Что генерировать (стиль — мягкий, спокойный, пастельный, БЕЗ текста, БЕЗ людей, БЕЗ зданий мечети)

Общий стиль для всех баннеров:
> Soft, calm, minimalist nature illustration, pastel muted colors, gentle gradients,
> lots of airy negative space, flat/matte finish, subtle grain, serene and non-distracting.
> No people, no text, no mosque buildings. Left side lighter (там ляжет тёмный текст).

| Файл | Размер | Промпт | Палитра |
|---|---|---|---|
| `miniapp/assets/morning.webp` | 1600×900 | soft sunrise over gentle rolling hills, warm apricot and cream sky, small pale sun, misty calm dawn, pastel peach tones | `#FCE3C6 #F7D3C4 #FFF1D9` |
| `miniapp/assets/evening.webp` | 1600×900 | quiet dusk, soft dusty-blue and lavender sky, faint crescent moon and few stars, calm rolling hills silhouette, muted twilight | `#D2DAF0 #C2C9E4 #F3EFDD` |
| `miniapp/assets/after.webp` | 1600×900 | serene minimal scene, soft mint-green and sage tones, gentle light, subtle faint geometric islamic star pattern in a corner, tranquil | `#CFE7D8 #BCDBC8 #FFFFFF` |
| `miniapp/assets/icon.png` | 1024×1024 | single elegant 8-pointed islamic star (khatam) in sage green `#6FA58C` on warm cream `#F5F3EC` background, minimal, flat, centered, rounded | sage on cream |

Negative для всех: `text, letters, people, faces, realistic photo, mosque building, harsh contrast, dark heavy colors, busy details, watermark`.

Генерируй через доступный тебе image-инструмент (gpt-image / DALL·E). Сохрани файлы точно по путям выше.
Оптимизируй баннеры в webp (качество ~80), вес каждого желательно < 200 КБ.

### Куда вставлять

В `miniapp/index.html` (и синхронно в `design/prototype.html`):

1. Для каждой из трёх карточек `.session` замени содержимое `<div class="art">…</div>`
   (сейчас там `<svg>`) на фон-картинку. Проще всего — задать `.art` фоновым изображением:
   ```html
   <div class="art" style="background:url('assets/morning.webp') center/cover"></div>
   ```
   (evening.webp / after.webp — для вечерней и после намаза).
2. Текст на карточке должен оставаться читаемым. Добавь мягкий градиент-оверлей: в CSS для
   `.session .body` добавь снизу-слева полупрозрачную подложку, например
   `background:linear-gradient(90deg, rgba(255,255,255,.55), rgba(255,255,255,0) 70%)`
   (для тёмной темы — соответствующий тёмный вариант через токены/медиазапрос). Проверь контраст
   в обеих темах (свет/тьма) — текст `--sess-ink` не должен теряться.
3. Иконку `icon.png` подключи как favicon Mini App: добавь в `<head>` (или начало body, т.к. head
   формируется артефактом-обёрткой — в проде это обычный index.html, можно `<link rel="icon">`):
   ```html
   <link rel="icon" type="image/png" href="assets/icon.png">
   <link rel="apple-touch-icon" href="assets/icon.png">
   ```
4. Проверь визуально в браузере на узком экране (~412px) и в обеих темах.

### Финал задачи B

- `git add -A && git commit -m "feat(azkar): обложки сессий + иконка"` и `git push`.
- Передеплой: `ssh root@85.239.36.234 'cd /opt/azkar && bash deploy/deploy.sh'`.
- Открой `https://azkar.nurtech.dev`, убедись что карточки с картинками и всё читается.

---

## Правила

- Токен бота — только в `.env` (локально и на сервере), НИКОГДА в git и не в этот файл при коммите.
- Не ломай чужие сайты/сервисы на сервере — добавляй только своё (порт 3010, отдельный vhost, юзер azkar).
- Тексты азкаров НЕ меняй — они выверены по источникам (Бухари/Муслим/Раслян). Меняешь только визуал/инфру.
- После правок фронта держи `miniapp/index.html` и `design/prototype.html` синхронными.

Вопросы по логике/дизайну — вся история решений в `README.md`. Погнали.
