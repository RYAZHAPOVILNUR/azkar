---
project: azkar
public: true
type: fix
audience: users
title: Аяты в мусхафе больше не обрезаются по краям
summary: Исправили ширину страницы мусхафа в режиме таджвида: лист теперь показывает полный SVG-кадр и оставляет безопасные поля по бокам.
user_impact:
  - Крайние арабские слова и знаки аятов не упираются в край экрана.
  - Страница с таджвидом остаётся целиком видимой на телефоне.
  - Свайпы между страницами продолжают работать.
screenshots:
  - .updatedesk/screens/2026-08-03-azkar-mushaf-full-ayah.png
checks:
  - git diff --check
  - Playwright mobile check: page 582 with tajweed fits with 14px side margins
  - Playwright mobile check: swipe from page 582 to page 583
deploy_url: https://azkar.nurtech.dev/app
---

Notes for editor:
- What changed: страница мусхафа теперь использует полный SVG-формат 382.68×547.09 и безопасный горизонтальный отступ на мобильном экране.
- Where to verify: включить таджвид, открыть страницу 582, проверить левый край строки и пролистать на следующую страницу.
- Risks: лист стал немного меньше по ширине, зато крайние арабские слова и знаки не обрезаются.
