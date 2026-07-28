---
project: azkar
public: true
type: fix
audience: users
title: Коран открывается без пустого арабского текста
summary: Исправили открытие суры в режиме аятов с переводом, сохранение выбранного режима мусхафа и свайп-навигацию внутри страницы.
user_impact:
  - Арабский текст аятов показывается сразу, даже пока декоративный QCF-шрифт догружается.
  - Выбранный режим чтения, включая страницу мусхафа, сохраняется после выхода и повторного входа.
  - Горизонтальный свайп в режиме мусхафа переключает страницы и не должен случайно закрывать экран назад.
screenshots:
  - .updatedesk/screens/2026-07-28-azkar-quran-prefs-swipe-fix-reading.png
checks:
  - node --check bot/server.js
  - npm run quran:validate-pages
  - inline script syntax check
  - mobile Playwright check: delayed QCF font shows Arabic fallback immediately
  - mobile Playwright check: page mode preference persists after reload
  - mobile Playwright check: horizontal touchmove is prevented in page mode
deploy_url: https://azkar.nurtech.dev/app
---

Notes for editor:
- What changed: Reading mode now renders normal Arabic immediately until QCF page fonts are ready; page mode is accepted in saved Quran preferences; horizontal touch movement is prevented inside page mode so the gesture belongs to mushaf navigation.
- Where to verify: Open Surah Al-Isra in reading mode on a fresh load, switch to page mode, leave and reopen Quran, then swipe horizontally on the mushaf page.
- Risks: Browser-level edge gestures may vary by Telegram/iOS version, but the app now actively prevents horizontal touchmove inside the mushaf surface.
