---
project: azkar
public: true
type: fix
audience: users
title: Полностью сверили страницы мусхафа
summary: Все 604 страницы мусхафа сверены с QCF-разметкой; найденные пропуски на границах страниц исправлены.
user_impact:
  - Восстановлены пропущенные аяты на страницах 120, 121, 122, 145, 531, 532, 533, 564, 567, 569, 575, 583 и 592-600.
  - Проверка теперь подтверждает совпадение всех 6236 аятов по страницам, глифам и маркерам конца аята.
screenshots: []
checks:
  - node full mushaf QCF v2_page validation
  - git diff --check
deploy_url: https://azkar.nurtech.dev/app
---

Notes for editor:
- What changed: 21 page JSON rebuilt for affected QCF page-boundary gaps using quran-qcf4 line positions and Quran.com code_v2 glyphs.
- Where to verify: open Mushaf pages 120, 145, 531-533, 592-600 and confirm the restored page-boundary ayahs appear.
- Risks: data-only change in `miniapp/assets/quran/pages`; Mini App logic and bot settings are unchanged.
