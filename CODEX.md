# Инструкция для Codex — обложки для приложения «Азкар»

Привет, Codex. Проект «Азкар» — Telegram Mini App для чтения исламских поминаний (азкары).
Он **уже задеплоен и работает** на https://azkar.nurtech.dev — деплоем занимается владелец,
тебе его делать НЕ нужно. Твоя единственная задача — **сгенерировать обложки и вставить их**.

---

## 0. Где ты и что читать

- Рабочая папка (тут открыт чат): `/Users/ilnur_ryazhapov/Desktop/code_src/azkar`
- Репозиторий: `https://github.com/RYAZHAPOVILNUR/azkar`
- Файлы, которые правишь: `miniapp/index.html` и его копия-близнец `design/prototype.html`
  (они должны остаться идентичными).

## 1. Что НЕ трогать

- Не деплой, не лезь на сервер, не запускай docker — этим занимается владелец.
- Не меняй тексты азкаров (массив `AZKAR` в JS), логику счётчика, дизайн-токены.
- Не удаляй `<meta charset="utf-8">` и `<meta viewport>` в начале файла.
- Токены/секреты не трогай.

---

## ЗАДАЧА — Сгенерировать обложки и вставить

Сейчас три карточки сессий на главном экране используют нарисованные SVG (внутри каждого
`<div class="session">` есть `<div class="art">…</div>` со `<svg>`). Замени их на сгенерированные
картинки. Плюс сделай иконку приложения.

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
   (evening.webp / after.webp — для вечера и после намаза; порядок карточек: утро, вечер, после намаза).
2. Сохрани читаемость текста: в `.session .body` добавь мягкий градиент-подложку слева-снизу,
   напр. `background:linear-gradient(90deg, rgba(255,255,255,.55), rgba(255,255,255,0) 70%)`,
   для тёмной темы — тёмный вариант через медиазапрос/токены. Проверь контраст текста
   `--sess-ink` в ОБЕИХ темах (свет/тьма).
3. Иконку подключи как favicon: сразу после `<meta viewport>` добавь
   `<link rel="icon" type="image/png" href="assets/icon.png">` и
   `<link rel="apple-touch-icon" href="assets/icon.png">`.
4. Проверь визуально на узком экране (~412px) в свете и тьме — текст на карточках читаем.

### Финал

- Держи `miniapp/index.html` и `design/prototype.html` идентичными.
- `git add -A && git commit -m "feat(azkar): обложки сессий + иконка" && git push`
- **НЕ деплой.** После пуша просто скажи владельцу: «Обложки готовы и запушены» —
  он передеплоит `https://azkar.nurtech.dev` сам (одной командой).

Контекст проекта — в `README.md`. Спасибо!
