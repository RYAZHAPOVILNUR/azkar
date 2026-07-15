---
project: azkar
public: true
type: fix
audience: users
title: Читаемый таджвид-мусхаф в тёмной теме
summary: В тёмной теме цветной мусхаф с таджвидом больше не тонет — буквы светлые прямо на тёмном фоне, как на quran.nurtech.dev.
user_impact:
  - Тёмная тема + цвета таджвида: базовые буквы стали светлыми, цвета правил читаемы, без светлой подложки.
  - Работает в режимах Чтение, Мусхаф и Страница.
checks:
  - Визуальная проверка светлой и тёмной темы
  - node --check (инлайн-скрипт index.html)
deploy_url: https://azkar.nurtech.dev/app
---

Notes for editor:
- What changed: QCFT — COLRv1-шрифт со встроенными палитрами; включена тёмная палитра через font-palette base-palette:1 (было чёрное base на тёмном фоне).
- Where to verify: Коран → тёмная тема → любая сура.
- Risks: font-palette поддерживается Safari 15.4+/Chromium; старые движки покажут базовую палитру.
