---
project: azkar
public: true
type: feature
audience: users
title: Тафсир Ибн Касира в Коране
summary: В разделе Корана появился выбор тафсира: теперь в шторке аята можно переключиться с ас-Саади на русский тафсир Ибн Касира.
user_impact:
  - Пользователь может выбрать Ибн Касира прямо в окне тафсира аята.
  - Текст Ибн Касира хранится отдельно и не смешивается с тафсиром ас-Саади.
  - Выбранный источник сохраняется и используется при следующем открытии тафсира.
screenshots:
  - .updatedesk/screens/2026-08-04-azkar-ibn-kathir-tafsir.png
checks:
  - git pull
  - git diff --check
  - node JSON validation for 114 tafsir-ibn-kathir files
  - inline script parse check for miniapp/index.html
  - local HTTP check: /health and /app/assets/quran/tafsir-ibn-kathir/source.json returned 200
  - in-app browser check: Al-Fatihah opens, Tafsir Ibn Kathir renders, Quran tafsir sheet scrolls inside the app UI
  - in-app browser check: desktop Quran reader keeps 430px app width when returning to the sura list
  - in-app browser check: app/page frame keeps matching external top and bottom spacing on desktop
  - in-app browser check: app frame highlight is applied globally through the shared phone container
deploy_url: https://azkar.nurtech.dev/app
---

Notes for editor:
- What changed: добавлен локальный набор русского Tafsir Ibne Kathir из Quranic Universal Library (QUL) / Tarteel AI и переключатель источника в существующей шторке тафсира.
- Where to verify: открыть Коран, открыть любую суру, нажать «Тафсир» у аята, выбрать «Ибн Касир» и убедиться, что заголовок и подпись источника изменились.
- Risks: корпус тафсира большой; при первом открытии длинных аятов шторка может показывать заметно больше текста, чем у ас-Саади.
