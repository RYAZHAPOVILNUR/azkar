---
project: azkar
public: true
type: fix
audience: users
title: Мусхаф листается ровно под пальцем
summary: Исправили режим мусхафа: страница больше не раздувается при перелистывании, свайп держит полотно под пальцем и после отпускания аккуратно защёлкивает нужную страницу.
user_impact:
  - В мусхафе больше нет скачка от огромного текста к мелкому во время перехода.
  - Горизонтальное перелистывание работает как PDF: страница двигается вместе с пальцем.
  - Кнопка настроек снова доступна в режиме мусхафа, чтобы можно было сменить режим чтения.
screenshots:
  - artifacts/screens/quran-mushaf-page.png
checks:
  - npm run quran:validate-pages
  - git diff --check
  - mobile Playwright touch test for QUL SVG page width, drag-follow, snap, settings button, and mode switch
deploy_url: https://azkar.nurtech.dev/app
---

Notes for editor:
- What changed: fixed the QUL SVG page slider sizing, added cached adjacent pages, implemented finger-tracking drag with snap, restored a floating settings button in page mode, and disabled the global back-swipe while reading the mushaf.
- Where to verify: open Quran, switch to page/mushaf mode, swipe horizontally across a page, then open the floating settings button.
- Risks: first swipe may wait for the adjacent page if the network is still loading it; after preload the drag is local and instant.
