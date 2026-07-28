---
project: azkar
public: true
type: fix
audience: users
title: Плавнее перелистываются страницы мусхафа
summary: Перелистывание в страничном режиме стало ближе к настоящему переходу между страницами: старая страница уходит, новая входит с правильной стороны.
user_impact:
  - Свайпы вправо и влево дают понятный плавный переход между страницами.
  - Быстрые повторные переходы больше не могут показать устаревшую загруженную страницу поверх новой.
  - Переход из списка сур или джузов тоже анимируется по направлению страницы.
screenshots:
  - .updatedesk/screens/2026-07-28-azkar-mushaf-transition-page-592.png
checks:
  - npm run quran:validate-pages
  - node inline script parse check for miniapp/index.html
  - browser transition check: page 592 -> 593 -> 592, outgoing page removed
  - browser stable layout check: page 593, 0 overflows
deploy_url: https://azkar.nurtech.dev/app/
---

Notes for editor:
- What changed: Page mode now keeps a temporary outgoing page during navigation and removes it after the animation, while guarding against stale async page loads.
- Where to verify: Open Quran page mode around pages 592-593, then swipe in both directions and use the page picker.
- Risks: The change only affects page-mode transitions; reduced-motion users get the non-animated fallback.
