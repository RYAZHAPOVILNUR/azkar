---
project: azkar
public: true
type: design
audience: users
title: Мусхаф стал ближе к настоящей странице
summary: Обновили экран страницы Корана: рамка стала похожа на реальный печатный мусхаф, перелистывание стало плавным, а размер текста больше не скачет при открытии и переходах.
user_impact:
  - Страницы перелистываются как горизонтальный слайдер.
  - Размер текста остаётся стабильным при открытии и между соседними страницами.
  - В режиме мусхафа больше нет дублирующей кнопки назад рядом с кнопкой Telegram.
  - Кнопка настроек получила аккуратный отступ от края экрана.
screenshots:
  - .updatedesk/screens/2026-07-28-azkar-mushaf-real-page-polish-311.png
  - .updatedesk/screens/2026-07-28-azkar-mushaf-real-page-polish-312.png
checks:
  - npm run quran:validate-pages
  - inline script syntax check
  - mobile Playwright check: page 311, slide to page 312, stable font size, hidden duplicate back button
deploy_url: https://azkar.nurtech.dev/app
---

Notes for editor:
- What changed: Restyled page-mode mushaf frame, replaced scale/fade page transitions with horizontal slide animations, stabilized page font sizing, and adjusted the Quran reader header in Telegram.
- Where to verify: Open Quran page mode, go to Surah Maryam page 311, then move to page 312.
- Risks: The ornament is CSS-based rather than a scanned asset, so it is an approximation of the printed mushaf style.
