# AGENTS — правила совместной работы

Над проектом работают два агента (Claude и Codex). Чтобы не затирать работу друг друга,
за каждым закреплены свои файлы. **Соблюдайте границы владения.**

## ⛔ КОНТЕНТ: шархи, пояснения, переводы — СТРОГО (религиозная точность)

**ЗАПРЕЩЕНО любому агенту (и Codex, и Claude) писать собственные шархи / пояснения / пересказы
смысла зикров «своими словами». Даже «с опорой на книги учёных» — НЕЛЬЗЯ.**

Разрешено ТОЛЬКО:
- **Перевод самого зикра** (аят/хадис ар→рус) — это перевод, он ок.
- **Точный перевод шарха конкретного учёного** (Ибн Баз, Ибн ‘Усаймин, Фаузан, Абдурраззак аль-Бадр,
  Раслян, Ибн Теймийя и т.п.) с ОБЯЗАТЕЛЬНОЙ атрибуцией: чей это шарх и из какой книги/лекции.
- Где сверенного перевода ещё НЕТ — показывать ТОЛЬКО ссылки на оригинальные источники;
  ничего не сочинять, не «заполнять пока», не выдавать авторский текст за «проверенный перевод шарха».

Текущие `sharhFor` / `richSharhFor` в miniapp/index.html — это АВТОРСКИЙ ПЕРЕСКАЗ; он МЁРТВЫЙ и НЕ
показывается. НЕ включать его обратно.

**Что показывается сейчас (правильно):** секция «Перевод смысла» = `verifiedSharhFor(z)` берёт
`SHARH_RU[z._id]` — сверенный русский ПЕРЕВОД СМЫСЛА зикра (72/74 сделаны Claude через воркфлоу с
проверкой каждого отдельным ревизором на достоверность). Подпись честная: «Перевод смысла по
достоверным источникам · источники» — НЕ выдаётся за дословную цитату конкретного учёного. Где
перевода нет — секция скрыта, видны только ссылки.

**Правило для добавления/правки переводов смысла (обоим агентам):** только сверенный по достоверным
источникам смысл (аль-Бадр, Ибн Баз, ас-Сабт, и т.п. + сам хадис); без выдуманных наград/постановлений,
без сектантства, без выдачи за дословную цитату; честная подпись «перевод смысла». Ключ — `SHARH_RU`
(id зикра → текст) в miniapp/index.html.

## Владение файлами

| Файл / папка | Владелец | Правило |
|---|---|---|
| `miniapp/index.html` | **Claude** | Только Claude правит фронтенд Mini App. Codex — НЕ редактирует. |
| `bot/server.js`, `bot/*` | **Claude** | Логика бота, API, напоминания, времена намаза. Codex — НЕ трогает. |
| `miniapp/assets/**` (картинки, иконки, шрифты) | **Codex** | Генерация/оптимизация обложек, иконок, dark-версий. |
| `landing/**` | **Codex** | Лендинг на `/`. |
| `deploy/`, `Dockerfile`, `docker-compose.yml` | **Claude** | Инфраструктура и деплой. |

## Общие правила

- **Перед любой правкой: `git pull`.** Работать только с актуальным `master`.
- **Не редактируй чужие файлы.** Если нужна правка в чужой зоне — оставь заметку в этом файле
  или в коммите, владелец применит.
- **Деплой делает только Claude** (rsync + docker на 45.77.66.108). Codex НЕ деплоит.
  ⚠️ ПРИ RSYNC ИСКЛЮЧАТЬ `bot/.env` (`--exclude='bot/.env'`) — иначе локальный .env затирает
  серверный конфиг. Серверный `/opt/azkar/bot/.env` = источник правды (APP_URL=https://azkar.nurtech.dev/app,
  токен). Был баг: без исключения APP_URL откатывался на корень (лендинг) вместо /app.
- Токен бота — только в `bot/.env` (gitignored), никогда в git.
- Тексты азкаров (массив `AZKAR` в miniapp/index.html) — не менять без сверки с достоверными
  источниками (Бухари/Муслим/Абу Дауд/Тирмизи/книга Расляна).

## История конфликта (для контекста)

Ранее Codex и Claude оба правили `miniapp/index.html` и перезатирали изменения (в т.ч. пропала
GitHub-тема). Владелец решил: **приложение (`miniapp/index.html`, `bot/`) ведёт Claude**,
Codex — только картинки (`miniapp/assets/`) и лендинг (`landing/`).

## UpdateDesk Release Cards

After every user-visible product change, Claude/Codex must create a release card for UpdateDesk.

Required flow:

1. Finish the code change.
2. Run the relevant checks.
3. Capture screenshots when UI changed.
4. Create a release card in `.updatedesk/releases/`.
5. Commit the release card together with the code when possible.
6. Mention the release card path in the commit body.

Card path:

```txt
.updatedesk/releases/YYYY-MM-DD-project-short-title.md
```

Use the helper when possible:

```bash
npm run updatedesk:note -- --project <project-slug> --title "<public title>"
```

Required fields:

- `project`: UpdateDesk project slug.
- `public`: `true` for Telegram-ready updates, `false` for internal work.
- `type`: `feature`, `fix`, `design`, `performance`, `release`, `docs`, or `internal`.
- `audience`: `users`, `admins`, `team`, or a custom segment.
- `title`: short public title.
- `summary`: clear user-facing summary.
- `user_impact`: concrete effects for the user.
- `screenshots`: local paths or public URLs when UI changed.
- `checks`: commands or manual checks that passed.
- `deploy_url`: where the result can be verified.

When committing, mention the card path in the commit body:

```txt
UpdateDesk:
release-card: .updatedesk/releases/YYYY-MM-DD-project-short-title.md
public: true
```

Git diffs and commit messages are fallback signals. The release card is the primary source for Telegram posts.
