---
project: azkar
public: true
type: fix
audience: users
title: Крупнее текст и непрерывное перелистывание
summary: Страница мусхафа стала крупнее, а быстрые повторные свайпы больше не оставляют ленту заблокированной после первого перехода.
user_impact:
  - Текст страницы занимает больше экрана, при этом строки, шапка и номер страницы остаются видимыми.
  - Можно быстро листать несколько страниц подряд без пауз на служебное центрирование.
  - Короткий незавершённый свайп возвращает текущую страницу точно в центр.
screenshots:
  - artifacts/screens/quran-mushaf-larger-fast-swipe.png
checks:
  - npm run quran:validate-pages
  - node --check bot/server.js
  - git diff --check
  - 8 rapid forward turns and 8 rapid backward turns at 390x844
  - Short-swipe cancellation at 390x844
  - Responsive checks at 375x667, 390x844, 430x932 and 844x390
deploy_url: https://azkar.nurtech.dev/app/
---

Notes for editor:
- What changed: уменьшено окно блокировки после центрирования, новый жест сразу снимает служебную защиту; SVG масштабируется по высоте с безопасным сокращением пустых боковых полей.
- Where to verify: режим «Страница», быстро перелистать 8–10 страниц подряд в обе стороны и сравнить размер текста.
- Risks: боковые поля листа стали уже; проверены длинные строки, заголовок суры и номер страницы.
