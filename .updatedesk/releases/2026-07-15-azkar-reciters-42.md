---
project: azkar
public: true
type: feature
audience: users
title: 42 чтеца Корана и быстрая смена
summary: В читалку добавлены все основные чтецы (как на quran.nurtech.dev), сменить чтеца можно прямо из мини-плеера.
user_impact:
  - Доступны 42 чтеца: аль-Хусари, ас-Судайс, аль-Афаси, аш-Шатри, Абдуль-Басит и муджаввад-варианты и др.
  - Тап по подписи чтеца в мини-плеере открывает прокручиваемый список выбора.
  - Выбор сохраняется; по умолчанию — аль-Хусари.
checks:
  - node --check (инлайн-скрипт index.html)
  - Проверка: лист из 42 чтецов, текущий подсвечен
deploy_url: https://azkar.nurtech.dev/app
---

Notes for editor:
- What changed: QRECITERS расширен до 42 (everyayah), лист выбора через qSheet, тап по .qp-mid.
- Where to verify: Коран → играть аят → мини-плеер → подпись чтеца.
- Risks: нет.
