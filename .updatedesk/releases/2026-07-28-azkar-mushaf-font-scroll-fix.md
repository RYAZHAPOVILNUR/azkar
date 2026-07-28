---
project: azkar
public: true
type: fix
audience: users
title: Мусхаф открывается без странных букв
summary: Исправили отображение мусхафа в режиме аятов с переводом и на страницах. Арабский текст больше не мигает служебными символами до загрузки шрифта, а строки страницы не смешиваются с нижней навигацией.
user_impact:
  - При открытии суры с переводом вместо непонятных символов показывается аккуратная загрузка текста мусхафа.
  - При прокрутке страницы мусхафа строки не залезают под кнопки перехода.
screenshots:
  - .updatedesk/screens/2026-07-28-azkar-mushaf-font-scroll-fix-page-311.png
checks:
  - npm run quran:validate-pages
  - inline script syntax check
  - mobile Playwright check: font wait, page 311 frame, bottom navigation gap
deploy_url: https://azkar.nurtech.dev/app
---

Notes for editor:
- What changed: Protected QCF glyph rendering until the matching mushaf font is ready and added extra bottom clearance for page mode.
- Where to verify: Open Quran, switch to reading mode with translation, open Surah Maryam around ayah 77, then switch to page mode and check page 311.
- Risks: First-time font downloads can still take time on a slow connection, but users should see hidden/loading text instead of broken glyphs.
