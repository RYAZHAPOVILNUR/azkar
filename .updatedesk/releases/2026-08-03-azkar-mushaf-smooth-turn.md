---
project: azkar
public: true
type: fix
audience: users
title: Перелистывание мусхафа стало спокойнее
summary: Убрали лишнюю догрузочную перерисовку страницы и вибрацию при переходе между страницами мусхафа.
user_impact:
  - Страница больше не дёргается после перелистывания.
  - При свайпе не включается лишняя вибрация Telegram.
  - Соседние страницы по-прежнему подгружаются заранее.
screenshots:
  - /tmp/azkar-smooth-after.png
checks:
  - node --check bot/server.js
  - git diff --check
  - manual Playwright mobile check: page turns 584 → 579 with one render per page
deploy_url: https://azkar.nurtech.dev/app
---

Notes for editor:
- What changed: режим страницы теперь предзагружает только SVG-страницы и больше не подменяет текущий лист после догрузки шрифтового слоя.
- Where to verify: открыть Коран в режиме страницы и несколько раз свайпнуть между страницами.
- Risks: на реальном Telegram WebView стоит проверить ощущение свайпа рукой, потому что браузерные проверки не полностью повторяют физический жест.
