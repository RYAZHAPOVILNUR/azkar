'use strict';

/*
 * Азкар — сервер Mini App + бот.
 * - Отдаёт лендинг (../landing) на / и Mini App (../miniapp) на /app.
 * - API: /api/times (времена намаза по координатам+мазхабу), /api/location (регистрация
 *   геолокации пользователя для персональных напоминаний, с проверкой Telegram initData).
 * - Бот: /start (кнопка Mini App), /stop. Напоминания:
 *     • у кого задана геолокация — по времени намаза (утренние после Фаджра, вечерние после Асра);
 *     • у кого нет — по фиксированному расписанию (MORNING_CRON/EVENING_CRON);
 *     • перед сном — по SLEEP_CRON для всех подписчиков.
 */

const express = require('express');
const path = require('path');
const fs = require('fs');
const crypto = require('crypto');
const cron = require('node-cron');

// adhan v4 — ESM-only, грузим динамическим import (server.js — CommonJS)
let adhan = null;
import('adhan').then(m => { adhan = m.default || m; console.log('[adhan] загружен'); })
  .catch(e => console.error('[adhan] ошибка загрузки:', e));

const PORT = process.env.PORT || 3010;
const TOKEN = process.env.BOT_TOKEN || '';
const APP_URL = process.env.APP_URL || 'https://azkar.nurtech.dev/app';
const MORNING_CRON = process.env.MORNING_CRON || '30 6 * * *';
const EVENING_CRON = process.env.EVENING_CRON || '0 18 * * *';
const SLEEP_CRON = process.env.SLEEP_CRON || '30 22 * * *';
const TZ = process.env.TZ || 'Europe/Moscow';
const WELCOME_IMAGE = path.join(__dirname, 'assets', 'welcome.png');
const BOT_NAME = 'Азкар — поминания';
const BOT_SHORT_DESCRIPTION = 'Утренние, вечерние, перед сном и после намаза. Счётчик-тасбих, напоминания по времени намаза.';
const BOT_DESCRIPTION = `🕌 Азкар — утренние, вечерние, перед сном и азкары после намаза из достоверной Сунны.

• Читай список сверху вниз: арабский, транскрипция, перевод и источник
• Счётчик-тасбих — отмечай повторения касанием
• Есть поминания перед сном
• Напоминания приходят по времени твоего намаза (после Фаджра и Асра) и вечером перед сном
• Выбор мазхаба, светлая и тёмная тема

Нажми «Запустить», чтобы открыть приложение.`;
const BOT_COMMANDS = [
  { command: 'start', description: 'Открыть приложение' },
  { command: 'help', description: 'Как пользоваться' },
];
const WELCOME_CAPTION = `<b>Ассаляму алейкум 🌿</b>

Добро пожаловать в <b>Азкар</b> — приложение для утренних, вечерних, перед сном и азкаров после намаза.

Читайте список сверху вниз, отмечайте повторения счётчиком-тасбихом и включайте напоминания по времени намаза.`;
const HELP_TEXT = `<b>Как пользоваться Азкаром</b>

1. Нажмите кнопку ниже, чтобы открыть приложение.
2. В настройках включите геолокацию — напоминания будут приходить после Фаджра и Асра по вашему времени намаза.
3. Выберите мазхаб для расчёта времени.
4. Читайте азкары сверху вниз, а счётчик-тасбих отмечает повторения касанием или свайпом вниз.
5. Перед сном бот пришлёт отдельное спокойное напоминание.`;

// ---------- хранилище ----------
const DATA_FILE = path.join(__dirname, 'data', 'subscribers.json');
function loadSubs() { try { return JSON.parse(fs.readFileSync(DATA_FILE, 'utf8')); } catch { return {}; } }
function saveSubs(s) { fs.mkdirSync(path.dirname(DATA_FILE), { recursive: true }); fs.writeFileSync(DATA_FILE, JSON.stringify(s, null, 2)); }

// ---------- расчёт времён намаза ----------
function prayerTimes(lat, lng, madhab, date) {
  if (!adhan) throw new Error('adhan not loaded yet');
  const coords = new adhan.Coordinates(Number(lat), Number(lng));
  const params = adhan.CalculationMethod.MuslimWorldLeague();
  params.madhab = madhab === 'hanafi' ? adhan.Madhab.Hanafi : adhan.Madhab.Shafi;
  return new adhan.PrayerTimes(coords, date || new Date(), params);
}

// ---------- статик + API ----------
const app = express();
app.use(express.json());
app.get('/health', (_req, res) => res.json({ ok: true, ts: Date.now() }));

// времена намаза на сегодня (ISO в UTC — клиент форматирует в свою зону)
app.get('/api/times', (req, res) => {
  const { lat, lng, madhab } = req.query;
  if (!lat || !lng) return res.status(400).json({ error: 'lat/lng required' });
  if (!adhan) return res.status(503).json({ error: 'prayer engine warming up' });
  try {
    const t = prayerTimes(lat, lng, madhab, new Date());
    res.json({
      fajr: t.fajr, sunrise: t.sunrise, dhuhr: t.dhuhr,
      asr: t.asr, maghrib: t.maghrib, isha: t.isha,
    });
  } catch (e) { res.status(500).json({ error: String(e) }); }
});

// проверка подписи Telegram WebApp initData
function checkInitData(initData) {
  if (!initData || !TOKEN) return null;
  const url = new URLSearchParams(initData);
  const hash = url.get('hash');
  url.delete('hash');
  const dcs = [...url.entries()].map(([k, v]) => `${k}=${v}`).sort().join('\n');
  const secret = crypto.createHmac('sha256', 'WebAppData').update(TOKEN).digest();
  const calc = crypto.createHmac('sha256', secret).update(dcs).digest('hex');
  if (calc !== hash) return null;
  try { return JSON.parse(url.get('user')); } catch { return null; }
}

// регистрация геолокации пользователя (для персональных напоминаний)
app.post('/api/location', (req, res) => {
  const { initData, lat, lng, madhab } = req.body || {};
  const user = checkInitData(initData);
  if (!user || !user.id) return res.status(401).json({ error: 'bad initData' });
  if (typeof lat !== 'number' || typeof lng !== 'number') return res.status(400).json({ error: 'lat/lng required' });
  const subs = loadSubs();
  subs[user.id] = { ...(subs[user.id] || {}), id: user.id, name: user.first_name || '',
    lat, lng, madhab: madhab === 'hanafi' ? 'hanafi' : 'shafi', since: subs[user.id]?.since || Date.now() };
  saveSubs(subs);
  res.json({ ok: true });
});

// Mini App живёт под /app, лендинг — на корне. API и health объявлены выше.
app.use('/app', express.static(path.join(__dirname, '..', 'miniapp'), { extensions: ['html'], index: 'index.html' }));
app.use('/', express.static(path.join(__dirname, '..', 'landing'), { extensions: ['html'], index: 'index.html' }));

app.listen(PORT, () => console.log(`[web] Mini App + API на :${PORT}`));

// ---------- бот ----------
if (!TOKEN) {
  console.warn('[bot] BOT_TOKEN не задан — только статик/API, бот выключен.');
} else {
  const TelegramBot = require('node-telegram-bot-api');
  const bot = new TelegramBot(TOKEN, { polling: true });
  const kb = { reply_markup: { inline_keyboard: [[{ text: '🕌 Открыть азкары', web_app: { url: APP_URL } }]] } };
  async function botApi(method, payload) {
    const res = await fetch(`https://api.telegram.org/bot${TOKEN}/${method}`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(payload),
    });
    const json = await res.json();
    if (!json.ok) throw new Error(json.description || `${method} failed`);
    return json.result;
  }
  async function applyBotBranding() {
    const steps = [
      ['menu button', () => botApi('setChatMenuButton', { menu_button: { type: 'web_app', text: 'Азкары', web_app: { url: APP_URL } } })],
      ['name', () => bot.setMyName({ name: BOT_NAME })],
      ['short description', () => bot.setMyShortDescription({ short_description: BOT_SHORT_DESCRIPTION })],
      ['description', () => bot.setMyDescription({ description: BOT_DESCRIPTION })],
      ['commands', () => bot.setMyCommands(BOT_COMMANDS)],
    ];
    for (const [label, run] of steps) {
      try { await run(); }
      catch (e) { console.warn(`[bot] ${label} не применился:`, e?.message || e); }
    }
  }
  applyBotBranding();

  bot.onText(/\/start/, (msg) => {
    const id = msg.chat.id, subs = loadSubs();
    subs[id] = { ...(subs[id] || {}), id, name: msg.from.first_name || '', since: subs[id]?.since || Date.now() };
    saveSubs(subs);
    bot.sendPhoto(id, WELCOME_IMAGE, { caption: WELCOME_CAPTION, parse_mode: 'HTML', ...kb })
      .catch((e) => {
        console.warn('[bot] welcome photo не отправилось:', e?.message || e);
        return bot.sendMessage(id, WELCOME_CAPTION, { parse_mode: 'HTML', ...kb });
      });
  });
  bot.onText(/\/help/, (msg) => {
    bot.sendMessage(msg.chat.id, HELP_TEXT, { parse_mode: 'HTML', ...kb });
  });
  bot.onText(/\/stop/, (msg) => { const s = loadSubs(); delete s[msg.chat.id]; saveSubs(s); bot.sendMessage(msg.chat.id, 'Напоминания отключены. /start — включить снова.'); });

  function send(id, text) {
    bot.sendMessage(id, text, kb).catch((e) => {
      if (e?.response?.statusCode === 403) { const s = loadSubs(); delete s[id]; saveSubs(s); }
    });
  }
  const MORNING_MSG = '🌅 Время утренних поминаний. Начни день с зикра.';
  const EVENING_MSG = '🌙 Время вечерних поминаний.';
  const SLEEP_MSG = '🌙 Поминания перед сном. Закрой день спокойно — открой раздел «Перед сном».';
  const todayKey = () => new Date().toISOString().slice(0, 10);
  function hhmm(d, tz) { return d.toLocaleTimeString('ru-RU', { hour: '2-digit', minute: '2-digit', timeZone: tz || TZ }); }

  // персональные напоминания по времени намаза — тик раз в минуту
  cron.schedule('* * * * *', () => {
    const subs = loadSubs(); const now = new Date(); const day = todayKey();
    const nowHM = hhmm(now, TZ);
    let changed = false;
    for (const id in subs) {
      const u = subs[id];
      if (typeof u.lat !== 'number') continue; // без геолокации — фиксированный крон ниже
      const tz = u.tz || TZ;
      let t; try { t = prayerTimes(u.lat, u.lng, u.madhab, now); } catch { continue; }
      if (hhmm(t.fajr, tz) === hhmm(now, tz) && u.lastMorning !== day) { u.lastMorning = day; changed = true; send(id, MORNING_MSG); }
      if (hhmm(t.asr, tz) === hhmm(now, tz) && u.lastEvening !== day) { u.lastEvening = day; changed = true; send(id, EVENING_MSG); }
    }
    if (changed) saveSubs(subs);
  }, { timezone: TZ });

  // фиксированное расписание — только для тех, у кого нет геолокации
  function fixedBroadcast(text, mark) {
    const subs = loadSubs(); const day = todayKey(); let changed = false;
    for (const id in subs) {
      const u = subs[id];
      if (typeof u.lat === 'number') continue;
      if (u[mark] === day) continue;
      u[mark] = day; changed = true; send(id, text);
    }
    if (changed) saveSubs(subs);
  }
  cron.schedule(MORNING_CRON, () => fixedBroadcast(MORNING_MSG, 'lastMorning'), { timezone: TZ });
  cron.schedule(EVENING_CRON, () => fixedBroadcast(EVENING_MSG, 'lastEvening'), { timezone: TZ });

  function allBroadcast(text, mark) {
    const subs = loadSubs(); const day = todayKey(); let changed = false;
    for (const id in subs) {
      const u = subs[id];
      if (u[mark] === day) continue;
      u[mark] = day; changed = true; send(id, text);
    }
    if (changed) saveSubs(subs);
  }
  cron.schedule(SLEEP_CRON, () => allBroadcast(SLEEP_MSG, 'lastSleep'), { timezone: TZ });

  console.log(`[bot] запущен. Персональные напоминания по намазу + фикс. фолбэк + перед сном (${TZ}).`);
}
