# Azkar DB implementation status

## Что уже сделано в ветке `codex/azkar-db-engine`

- Текущий inline-массив `AZKAR` из `miniapp/index.html` перенесён в нормализованную JSON-базу.
- В базе сейчас 74 азкара: утро, вечер, после намаза, перед сном.
- Религиозные тексты не переписывались и не редактировались: перенос выполнен из текущего массива без изменения арабского текста, перевода, транскрипции и источников.
- Добавлены категории, коллекции, источники, схемы JSON, отчёты и reviewed/raw директории.
- Добавлен pipeline:
  - `scripts/azkar/import-current.mjs`
  - `scripts/azkar/validate.mjs`
  - `scripts/azkar/detect-duplicates.mjs`
  - `scripts/azkar/report.mjs`
  - `scripts/azkar/export-miniapp.mjs`
  - `scripts/azkar/normalize.mjs`
- Добавлен осторожный каркас внешних импортов:
  - `import-hisnul-muslim.mjs`
  - `import-sahih-al-azkar.mjs`
  - `import-quranenc.mjs`
  - `import-hadeethenc.mjs`
- Новые внешние тексты не попадают в Mini App автоматически. Они должны входить как `needs_review` и проходить ручную проверку.
- Mini App теперь пробует загрузить `miniapp/data/manifest.json` и JSON-файлы из `miniapp/data/`.
- Если JSON не загрузился, приложение работает на старом inline `AZKAR` как fallback.
- На главной добавлен вход в «Библиотеку азкаров».
- Добавлен экран библиотеки:
  - счётчик базы;
  - статус JSON-базы;
  - категории;
  - поиск по арабскому, переводу, транскрипции, источникам и тегам;
  - переход из результата поиска сразу в чтение нужного раздела.

## Команды

```bash
node scripts/azkar/normalize.mjs
```

Полный локальный цикл:

```bash
node scripts/azkar/import-current.mjs
node scripts/azkar/validate.mjs
node scripts/azkar/detect-duplicates.mjs
node scripts/azkar/report.mjs
node scripts/azkar/export-miniapp.mjs
```

## Что проверено

- `node --check` всех новых скриптов.
- `node scripts/azkar/normalize.mjs`.
- HTML parse.
- Inline JS syntax check из `miniapp/index.html`.
- Browser smoke на мобильном viewport 390x844:
  - главная открывается;
  - библиотека открывается;
  - JSON-база активна;
  - видно 74 азкара;
  - 14 категорий;
  - поиск по `Бухари` находит результаты;
  - переход из результата открывает экран чтения;
  - горизонтального overflow нет.

## Важные правила продолжения

- Не добавлять новый азкар в `verified`, пока не сверены арабский текст, перевод, источник, степень и права.
- Не писать авторские шархи или пояснения.
- Не копировать чужие приложения напрямую.
- Хиснуль Муслим можно использовать как структуру каталога, но полный русский текст и перевод должны проходить проверку прав и источников.
- Слабые и сомнительные тексты хранить в `reviewed/excluded.json`, а не в основном export.

## Следующие шаги

1. Подготовить сырой импорт «Крепости мусульманина» в `content/azkar-db/raw/hisnul-muslim/items.json`.
2. Прогнать `node scripts/azkar/import-hisnul-muslim.mjs`.
3. Сделать review UI/таблицу для ревизора: арабский текст, перевод, источник, статус, комментарий.
4. Сверить первые 20-30 новых азкаров и только после этого переводить их в `verified`.
5. Добавить аудио и избранные коллекции после стабилизации текстовой базы.
