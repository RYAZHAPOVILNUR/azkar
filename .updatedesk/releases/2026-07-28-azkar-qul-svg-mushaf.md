---
project: azkar
public: true
type: design
audience: users
title: Мусхаф теперь открывается настоящей QUL SVG-страницей
summary: Режим страницы Корана перевели на настоящий SVG-мусхаф QUL вместо самодельной CSS-имитации. Интерфейс чтения стал чище: без внутренней шапки, без нижних кнопок, со свайпом как у PDF.
user_impact:
  - Страница мусхафа отображается как готовая SVG-страница QUL с фиксированной печатной раскладкой.
  - Нижние кнопки перехода убраны из режима мусхафа.
  - Внутренняя шапка приложения скрыта, выход остаётся через Telegram Back.
  - Перелистывание сохраняет поведение единого горизонтального полотна.
screenshots:
  - .updatedesk/screens/2026-07-28-azkar-qul-svg-mushaf-immersive-311.png
  - .updatedesk/screens/2026-07-28-azkar-qul-svg-mushaf-immersive-mid.png
checks:
  - node --check bot/server.js
  - npm run quran:validate-pages
  - inline script syntax check
  - local API check: /api/mushaf-svg/311 returns Mushaf_Page_311 SVG from QUL
  - mobile Playwright check: QUL SVG page 311, immersive mode, hidden navigation buttons, continuous strip to page 312
deploy_url: https://azkar.nurtech.dev/app
---

Notes for editor:
- What changed: Added a cached server endpoint for QUL SVG pages and made page mode render those SVG pages first, with the previous local QCF rendering retained as fallback.
- Where to verify: Open Quran page mode and go to page 311, then swipe to page 312.
- Risks: First load of a page depends on QUL availability; after the first request, the server caches that SVG page.
