---
project: azkar
public: true
type: fix
audience: users
title: Улучшено чтение страниц мусхафа
summary: Страница мусхафа получила рамку в стиле мединского издания, плавное RTL-перелистывание и честный учет чтения только после 30 секунд.
user_impact:
  - Свайп вправо теперь открывает следующую страницу мусхафа, а свайп влево - предыдущую.
  - Страница засчитывается прочитанной только после 30 секунд просмотра; более короткое открытие не отмечает аяты.
  - У страницы появилась бумажная рамка, а размер строк подбирается с запасом, чтобы розетки аятов не выходили за границы.
  - Данные Корана получили новую cache-версию, чтобы пользователи быстрее увидели исправленные страницы.
screenshots:
  - .updatedesk/screens/2026-07-28-azkar-mushaf-page-592-mobile.png
checks:
  - node full mushaf QCF v2_page validation
  - node inline JavaScript parse check
  - node browser page 592 overflow screenshot check
  - node page dwell threshold check
  - node RTL swipe direction check
  - git diff --check
deploy_url: https://azkar.nurtech.dev/app
---

Notes for editor:
- What changed: page mode now uses a framed paper surface, conservative page fitting, RTL swipe direction, smoother transitions, a 30-second page-read threshold, and `Q_ASSET_V=8`.
- Where to verify: open Mushaf page mode on mobile, check page 592 and swipe right/left between pages.
- Risks: this touches the Mini App reader file directly; bot logic and Quran page JSON data are unchanged in this card.
