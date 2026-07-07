'use strict';

/*
 * Азикр — сервер Telegram Mini App + бот напоминаний.
 * - Отдаёт статику Mini App (../miniapp) на PORT.
 * - Бот: /start сохраняет подписчика и даёт кнопку открытия Mini App.
 * - Крон: утреннее и вечернее напоминание всем подписчикам.
 *
 * Часовой пояс напоминаний берётся из TZ (по умолчанию Europe/Moscow).
 * Подписчики хранятся в data/subscribers.json (простое JSON-хранилище).
 */

const express = require('express');
const path = require('path');
const fs = require('fs');
const cron = require('node-cron');

const PORT = process.env.PORT || 3010;
const TOKEN = process.env.BOT_TOKEN || '';
const APP_URL = process.env.APP_URL || 'https://azkar.nurtech.dev';
const MORNING_CRON = process.env.MORNING_CRON || '30 6 * * *';
const EVENING_CRON = process.env.EVENING_CRON || '0 18 * * *';
const TZ = process.env.TZ || 'Europe/Moscow';

// ---------- статик Mini App ----------
const app = express();
app.use(express.static(path.join(__dirname, '..', 'miniapp'), { extensions: ['html'] }));
app.get('/health', (_req, res) => res.json({ ok: true, ts: Date.now() }));
app.listen(PORT, () => console.log(`[web] Mini App слушает :${PORT}`));

// ---------- хранилище подписчиков ----------
const DATA_FILE = path.join(__dirname, 'data', 'subscribers.json');
function loadSubs() {
  try { return JSON.parse(fs.readFileSync(DATA_FILE, 'utf8')); }
  catch { return {}; }
}
function saveSubs(subs) {
  fs.mkdirSync(path.dirname(DATA_FILE), { recursive: true });
  fs.writeFileSync(DATA_FILE, JSON.stringify(subs, null, 2));
}

// ---------- бот ----------
if (!TOKEN) {
  console.warn('[bot] BOT_TOKEN не задан — работает только статик-сервер, бот выключен.');
} else {
  const TelegramBot = require('node-telegram-bot-api');
  const bot = new TelegramBot(TOKEN, { polling: true });

  const openKeyboard = {
    reply_markup: { inline_keyboard: [[{ text: '🕌 Открыть азкары', web_app: { url: APP_URL } }]] }
  };

  // кнопка-меню слева от поля ввода открывает Mini App
  bot.setChatMenuButton({ menu_button: { type: 'web_app', text: 'Азкары', web_app: { url: APP_URL } } })
    .catch(() => {});

  bot.onText(/\/start/, (msg) => {
    const id = msg.chat.id;
    const subs = loadSubs();
    subs[id] = { id, name: msg.from.first_name || '', since: subs[id]?.since || Date.now() };
    saveSubs(subs);
    bot.sendMessage(id,
      'Ассаляму алейкум! 🌿\n\nЯ буду напоминать об утренних и вечерних поминаниях и после намаза. Открой приложение кнопкой ниже.',
      openKeyboard);
  });

  bot.onText(/\/stop/, (msg) => {
    const subs = loadSubs();
    delete subs[msg.chat.id];
    saveSubs(subs);
    bot.sendMessage(msg.chat.id, 'Напоминания отключены. Наберите /start, чтобы включить снова.');
  });

  function broadcast(text) {
    const subs = loadSubs();
    Object.keys(subs).forEach((id) => {
      bot.sendMessage(id, text, openKeyboard).catch((e) => {
        // 403 — пользователь заблокировал бота: чистим
        if (e && e.response && e.response.statusCode === 403) {
          const s = loadSubs(); delete s[id]; saveSubs(s);
        }
      });
    });
  }

  cron.schedule(MORNING_CRON, () => broadcast('🌅 Время утренних поминаний. Начни день с зикра.'), { timezone: TZ });
  cron.schedule(EVENING_CRON, () => broadcast('🌙 Время вечерних поминаний. Не забудь azkar.'), { timezone: TZ });

  console.log(`[bot] запущен. Напоминания: утро "${MORNING_CRON}", вечер "${EVENING_CRON}" (${TZ}).`);
}
