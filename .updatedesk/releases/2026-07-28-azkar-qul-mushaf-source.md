---
project: azkar
public: true
type: fix
audience: users
title: Точнее открываются суры в мусхафе
summary: Мусхаф переведен на страничные шрифты QUL/QPC, а карта начала сур сверена с фактической страничной раскладкой.
user_impact:
  - При открытии отдельных сур приложение ведет на правильную страницу мусхафа.
  - Страничный режим использует актуальные QUL/QPC-шрифты для обычного и цветного таджвида.
  - Добавлена проверка, которая ловит пропуски, сдвиги и ошибки границ во всех 604 страницах.
screenshots:
  - .updatedesk/screens/2026-07-28-azkar-qul-mushaf-page-106-mobile.png
checks:
  - npm run quran:validate-pages
  - node inline script parse check for miniapp/index.html
  - browser check page 106 with QUL font p106.woff2, 0 overflows
  - curl CORS check for QUL V4 Tajweed font
deploy_url: https://azkar.nurtech.dev/app/
---

Notes for editor:
- What changed: QUL/QPC page fonts are now the primary source for mushaf page rendering. The mushaf metadata was corrected for 15 surah starts whose first ayah is on the previous page in the Madani page layout.
- Where to verify: Open Quran, switch to page mode, then open Al-Maidah or Al-Anfal from the surah list. The page should include the surah beginning without skipping the actual start page.
- Risks: Existing cached fonts remain usable, but Quran JSON cache is bumped so corrected metadata refreshes for users.
