---
project: azkar
public: true
type: design
audience: users
title: Переработанное радио с паузой
summary: Раздел радио стал удобным: карточка «Сейчас играет» с паузой и стопом, переключение станций без закрытия шторки.
user_impact:
  - Карточка «Сейчас играет»: индикатор эфира, статус, кнопки Пауза/Продолжить и Стоп.
  - Станции переключаются прямо в списке, шторка не закрывается на каждый тап.
  - Появилась пауза и возобновление эфира.
checks:
  - node --check (инлайн-скрипт index.html)
  - Визуальная проверка шторки радио
deploy_url: https://azkar.nurtech.dev/app
---

Notes for editor:
- What changed: #radioNow (now-playing), pauseRadio/resumeRadio, selectRadioStation без closeRadioSheet.
- Where to verify: шапка Коран-читалки → кнопка радио.
- Risks: пауза live-потока возобновляется с live; ретраи не идут на паузе.
