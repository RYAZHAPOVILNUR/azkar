---
project: azkar
public: true
type: design
audience: users
title: Обновлено обрамление страниц мусхафа
summary: Страницы мусхафа получили более богатую рамку в стиле печатного мединского мусхафа: золотой контур, цветные боковые орнаменты и угловые медальоны.
user_impact:
  - Страница визуально ближе к реальному мединскому мусхафу.
  - Орнамент не перекрывает аяты и автоматически учитывается при подгонке текста.
  - Плотные страницы сохраняют все аятные знаки внутри рамки.
screenshots:
  - .updatedesk/screens/2026-07-28-azkar-mushaf-ornate-frame-page-592.png
checks:
  - npm run quran:validate-pages
  - node inline script parse check for miniapp/index.html
  - browser layout check: pages 1, 592, 604 with ornate frame and 0 overflows
deploy_url: https://azkar.nurtech.dev/app/
---

Notes for editor:
- What changed: The simple double border was replaced by a dedicated CSS frame layer with colored strips, gold outlines, and corner medallions inspired by Madani mushaf page borders.
- Where to verify: Open Quran page mode and check dense pages around 592 plus the final page 604.
- Risks: The fit algorithm now performs an extra bounds pass after render so QCF glyph overhangs stay inside the page.
