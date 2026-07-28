---
project: azkar
public: true
type: design
audience: users
title: Страницы мусхафа листаются как единое полотно
summary: Перелистывание страниц Корана стало ближе к PDF-слайдеру: соседняя страница теперь стоит рядом с текущей, а переход двигает всю горизонтальную ленту целиком.
user_impact:
  - При переходе между страницами больше нет ощущения отдельных входящих и уходящих листов.
  - Страницы выглядят как непрерывное горизонтальное полотно.
  - Масштаб текста сохраняется стабильным во время перехода.
screenshots:
  - .updatedesk/screens/2026-07-28-azkar-mushaf-continuous-slider-311.png
  - .updatedesk/screens/2026-07-28-azkar-mushaf-continuous-slider-mid.png
  - .updatedesk/screens/2026-07-28-azkar-mushaf-continuous-slider-312.png
checks:
  - npm run quran:validate-pages
  - inline script syntax check
  - mobile Playwright check: page 311 to 312 uses one horizontal strip with two panes
deploy_url: https://azkar.nurtech.dev/app
---

Notes for editor:
- What changed: Replaced separate page in/out animation with a two-pane horizontal strip so the transition behaves like a continuous slider.
- Where to verify: Open Quran page mode, go to page 311, then move to page 312.
- Risks: Drag-following is still triggered after the page navigation action; this change focuses on the visual transition as a continuous strip.
