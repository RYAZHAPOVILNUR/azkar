---
project: azkar
public: true
type: feature
audience: users
title: Аудио аскаров — кнопка «Прослушать»
summary: Аскары теперь можно слушать: у карточек с аудио появилась кнопка воспроизведения, звук идёт через собственный прокси приложения.
user_impact:
  - На карточке аската с аудио есть кнопка «▶ Прослушать» — тап играет, повтор ставит на паузу.
  - Аудио проксируется через сервер приложения, поэтому воспроизведение работает в Telegram на iOS (раньше .play() молча падал на стороннем домене).
checks:
  - node --check (инлайн-скрипт index.html)
  - Прокси /api/azkar-audio — 206 Range, audio/mpeg (проверено curl с прода)
deploy_url: https://azkar.nurtech.dev/app
---

Notes for editor:
- What changed: включена кнопка озвучки на карточке + same-origin прокси mp3 (hisnmuslim) для обхода блокировок Telegram WKWebView.
- Where to verify: аскар с аудио → «Прослушать».
- Risks: зависит от доступности источника mp3; сервер тянет и кэширует.
