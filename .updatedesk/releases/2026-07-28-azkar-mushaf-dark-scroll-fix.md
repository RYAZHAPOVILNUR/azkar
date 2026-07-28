---
project: azkar
public: true
type: fix
audience: users
title: Исправлено отображение мусхафа в тёмной теме
summary: Текст на светлой странице мусхафа снова остаётся тёмным, рамка стала спокойнее, а область страницы больше не блокирует внутреннюю прокрутку.
user_impact:
  - В тёмной теме основной текст мусхафа больше не становится белым на светлой бумаге.
  - Страничный режим не ощущается зависшим: область мусхафа может прокручиваться, если экрану не хватает высоты.
  - Обрамление стало менее ярким и не спорит с текстом.
screenshots:
  - .updatedesk/screens/2026-07-28-azkar-mushaf-dark-scroll-fix-page-307.png
checks:
  - npm run quran:validate-pages
  - node inline script parse check for miniapp/index.html
  - browser dark-theme page 307 check: font palette normal, dark text, 0 overflows
  - browser low-height page 307 check: qrAyahs overflow-y auto
deploy_url: https://azkar.nurtech.dev/app/
---

Notes for editor:
- What changed: Page-mode paper now opts out of the dark COLRv1 palette, the page container scrolls internally, and the decorative frame colors were muted.
- Where to verify: Open Quran page mode in dark theme around page 307.
- Risks: The fix is scoped to page-mode paper; non-page reading modes keep their dark-theme tajweed palette.
