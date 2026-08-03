---
project: azkar
public: true
type: fix
audience: users
title: Листание мусхафа больше не застревает
summary: Исправили свайпы в режиме мусхафа: страницы продолжают перелистываться дальше, даже если мобильный браузер не успел корректно завершить scroll-snap.
user_impact:
  - Мусхаф можно листать подряд без ощущения, что страницы закончились.
  - Свайп вперёд и назад работает стабильнее на телефоне.
  - Исправление не меняет внешний вид страницы.
screenshots:
  - .updatedesk/screens/2026-08-03-azkar-mushaf-fit-mobile.png
checks:
  - git diff --check
  - Playwright mobile check: 12 consecutive carousel turns
  - Playwright mobile check: synthetic touch swipes 200→208 and back 208→207
deploy_url: https://azkar.nurtech.dev/app
---

Notes for editor:
- What changed: добавлена страховка для свайпа мусхафа. Приложение теперь учитывает сам жест пальца, а не только итоговый scroll-snap браузера.
- Where to verify: открыть Коран в режиме «Страница» и пролистать 10+ страниц подряд вперёд и назад.
- Risks: направление сохранено как в текущем мусхафе: жест вправо листает вперёд, жест влево возвращает назад.
