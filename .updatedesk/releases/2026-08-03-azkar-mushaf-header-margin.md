---
project: azkar
public: true
type: fix
audience: users
title: В мусхафе убраны боковые метки и поднята шапка
summary: Исправили экран страницы Корана: шапка больше не перекрывает арабский текст, а боковые подписи хизба/джуза убраны.
user_impact:
  - Первая строка аятов читается без наложения.
  - Боковые служебные подписи не мешают чтению.
  - Текст страницы стал крупнее и спокойнее для чтения.
screenshots:
  - /tmp/azkar-112-no-margin.png
checks:
  - node --check bot/server.js
  - git diff --check
  - manual Playwright mobile check: page 112 renders without header overlap or side hizb label
deploy_url: https://azkar.nurtech.dev/app
---

Notes for editor:
- What changed: вырезали из QUL SVG margin-группу `md-non-quranic-margin-juz-hisb`, подняли собственную шапку страницы и немного увеличили горизонтальный масштаб мусхафа.
- Where to verify: открыть Коран в режиме страницы, перейти на страницу 112.
- Risks: в Telegram WebView safe-area зависит от устройства, поэтому на реальном iPhone стоит проверить отступ шапки глазами.
