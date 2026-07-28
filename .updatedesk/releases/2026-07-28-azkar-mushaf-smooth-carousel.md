---
project: azkar
public: true
type: performance
audience: users
title: Плавное перелистывание мусхафа
summary: Страницы мусхафа теперь листаются как единая горизонтальная лента, без зависаний, повторной отрисовки и скачков размера.
user_impact:
  - Страница движется прямо за жестом и ровно фиксируется после отпускания.
  - Быстрые последовательные свайпы больше не блокируются загрузкой соседней страницы.
  - Арабский текст в режиме чтения сразу отображается в стабильном размере без поздних перерисовок.
  - Развороты загружаются быстрее благодаря сжатию и постоянному серверному кэшу.
screenshots:
  - artifacts/screens/quran-mushaf-carousel-mobile.png
checks:
  - npm run quran:validate-pages
  - node --check bot/server.js
  - git diff --check
  - Mobile browser QA at 375x667, 390x844, 430x932 and 844x390
  - 18 consecutive forward/back page turns and short-swipe cancellation
  - curl gzip response check for /api/mushaf-svg/401
deploy_url: https://azkar.nurtech.dev/app/
---

Notes for editor:
- What changed: нативная трёхстраничная горизонтальная лента заменила тяжёлую вставку SVG в DOM; отключена автоматическая массовая загрузка шрифтов; SVG-кэш стал постоянным и сжатым.
- Where to verify: открыть Коран, включить «Страница», быстро перелистать несколько страниц в обе стороны и проверить кнопку настроек.
- Risks: при первом открытии ещё не прогретой страницы изображение зависит от сети; серверный кэш прогревается при деплое и сохраняется между обновлениями.
