# Деплой — Telegram Mini App на Vultr

Домен: **azkar.nurtech.dev** · Хостинг: **Vultr** (Timeweb не годится — Telegram блокируется РКН).

## Что нужно один раз

1. **Бот** — создать у [@BotFather](https://t.me/BotFather): `/newbot` → получить `BOT_TOKEN`.
   Затем `/newapp` (или `/myapps`) → привязать Mini App к домену `https://azkar.nurtech.dev`.
2. **DNS** — в панели управления доменом `nurtech.dev` добавить запись:
   `A  azkar  →  <IP Vultr-сервера>`
3. **Сервер Vultr** — Ubuntu 22.04+, доступ по SSH.

## Установка на сервере

```bash
# базовое
sudo apt update && sudo apt install -y nginx nodejs npm git certbot python3-certbot-nginx
sudo adduser --system --group azkar

# код
sudo git clone https://github.com/RYAZHAPOVILNUR/azkar.git /opt/azkar
sudo chown -R azkar:azkar /opt/azkar

# конфиг бота
cd /opt/azkar/bot
cp .env.example .env
nano .env          # вставить BOT_TOKEN, проверить APP_URL/TZ
npm ci --omit=dev

# systemd
sudo cp /opt/azkar/deploy/azkar.service /etc/systemd/system/azkar.service
sudo systemctl daemon-reload
sudo systemctl enable --now azkar

# nginx + SSL
sudo cp /opt/azkar/deploy/nginx-azkar.conf /etc/nginx/sites-available/azkar.nurtech.dev
sudo ln -s /etc/nginx/sites-available/azkar.nurtech.dev /etc/nginx/sites-enabled/
sudo nginx -t && sudo systemctl reload nginx
sudo certbot --nginx -d azkar.nurtech.dev   # выпустит HTTPS
```

Проверка: открой `https://azkar.nurtech.dev` в браузере → должен отрендериться Mini App.
В Telegram: напиши боту `/start` → кнопка «🕌 Открыть азкары».

## Обновления

```bash
cd /opt/azkar && bash deploy/deploy.sh
```

## Заметки

- Напоминания шлёт крон по `TZ` из `.env` (по умолчанию `Europe/Moscow`), утро `06:30`, вечер `18:00`.
- Персональные часовые пояса/время у каждого пользователя — доработка следующего этапа (сейчас — общее расписание).
- Подписчики хранятся в `bot/data/subscribers.json`.
