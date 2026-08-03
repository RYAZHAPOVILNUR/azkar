---
project: azkar
public: true
type: fix
audience: users
title: Страница мусхафа стала чище и больше похожа на печатный лист
summary: Экран чтения Корана в режиме страницы теперь показывает чистый лист мусхафа без лишней внутренней шапки и без обрезания арабского текста.
user_impact:
  - Аяты на странице помещаются целиком и не режутся по краям.
  - Вверху показаны джуз, название суры и иконка закладки в стиле печатного мусхафа.
  - Номер страницы вынесен вниз отдельной подписью.
screenshots:
  - /tmp/azkar-584-final-fit.png
checks:
  - node --check bot/server.js
  - git diff --check
  - manual Playwright mobile check: page 584 renders without cut text and page turns 584 → 581
deploy_url: https://azkar.nurtech.dev/app
---

Notes for editor:
- What changed: режим страницы Корана теперь использует чистый SVG мусхафа как основной слой, без подмены на самодельную HTML-раскладку.
- Where to verify: открыть Коран, режим страницы, перейти на страницу 584 и проверить, что аят не обрезается по краям.
- Risks: точная ширина строки зависит от встроенного Telegram WebView и safe-area, поэтому на реальном iPhone стоит проверить ещё раз глазами.
