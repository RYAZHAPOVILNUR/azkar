'use strict';

/*
 * Азкар — сервер Mini App + бот.
 * - Отдаёт лендинг (../landing) на / и Mini App (../miniapp) на /app.
 * - API: /api/times (времена намаза по координатам+мазхабу), /api/location (регистрация
 *   геолокации пользователя для персональных напоминаний, с проверкой Telegram initData).
 * - Бот: /start (кнопка Mini App), /stop. Напоминания включаются при первом запуске Mini App:
 *     • у кого задана геолокация — по времени намаза (утренние после Фаджра, вечерние после Асра);
 *     • у кого нет геолокации, но есть таймзона — по фиксированному расписанию в его зоне;
 *     • без таймзоны бот ничего не угадывает и не шлёт.
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

Читайте список сверху вниз, отмечайте повторения счётчиком-тасбихом. Напоминания включатся при запуске приложения, их можно отключить в настройках.`;
const HELP_TEXT = `<b>Как пользоваться Азкаром</b>

1. Нажмите кнопку ниже, чтобы открыть приложение.
2. После запуска приложения напоминания включатся по таймзоне телефона. Их можно отключить в настройках.
3. Выберите мазхаб для расчёта времени.
4. Читайте азкары сверху вниз, а счётчик-тасбих отмечает повторения касанием или свайпом вниз.
5. Перед сном бот пришлёт отдельное спокойное напоминание.`;

// ---------- хранилище ----------
const DATA_FILE = path.join(__dirname, 'data', 'subscribers.json');
function loadSubs() { try { return JSON.parse(fs.readFileSync(DATA_FILE, 'utf8')); } catch { return {}; } }
function saveSubs(s) { fs.mkdirSync(path.dirname(DATA_FILE), { recursive: true }); fs.writeFileSync(DATA_FILE, JSON.stringify(s, null, 2)); }
function validTimeZone(tz) {
  if (typeof tz !== 'string' || !tz) return false;
  try { new Intl.DateTimeFormat('ru-RU', { timeZone: tz }).format(new Date()); return true; }
  catch { return false; }
}
const TZ_APPROX_COORDS = {
  'Asia/Bishkek': { lat: 42.8746, lng: 74.5698, name: 'Бишкек' },
  'Asia/Almaty': { lat: 43.2389, lng: 76.8897, name: 'Алматы' },
  'Asia/Aqtau': { lat: 43.6532, lng: 51.1975, name: 'Актау' },
  'Asia/Aqtobe': { lat: 50.2839, lng: 57.1670, name: 'Актобе' },
  'Asia/Atyrau': { lat: 47.0945, lng: 51.9238, name: 'Атырау' },
  'Asia/Oral': { lat: 51.2278, lng: 51.3865, name: 'Уральск' },
  'Asia/Qostanay': { lat: 53.2144, lng: 63.6246, name: 'Костанай' },
  'Asia/Qyzylorda': { lat: 44.8488, lng: 65.4823, name: 'Кызылорда' },
  'Asia/Tashkent': { lat: 41.2995, lng: 69.2401, name: 'Ташкент' },
  'Asia/Samarkand': { lat: 39.6542, lng: 66.9597, name: 'Самарканд' },
  'Asia/Dushanbe': { lat: 38.5598, lng: 68.7870, name: 'Душанбе' },
  'Asia/Ashgabat': { lat: 37.9601, lng: 58.3261, name: 'Ашхабад' },
  'Europe/Moscow': { lat: 55.7558, lng: 37.6173, name: 'Москва' },
  'Europe/Minsk': { lat: 53.9006, lng: 27.5590, name: 'Минск' },
  'Europe/Kyiv': { lat: 50.4501, lng: 30.5234, name: 'Киев' },
  'Europe/Kiev': { lat: 50.4501, lng: 30.5234, name: 'Киев' },
  'Europe/Istanbul': { lat: 41.0082, lng: 28.9784, name: 'Стамбул' },
  'Asia/Yekaterinburg': { lat: 56.8389, lng: 60.6057, name: 'Екатеринбург' },
  'Asia/Omsk': { lat: 54.9885, lng: 73.3242, name: 'Омск' },
  'Asia/Novosibirsk': { lat: 55.0084, lng: 82.9357, name: 'Новосибирск' },
  'Asia/Barnaul': { lat: 53.3474, lng: 83.7784, name: 'Барнаул' },
  'Asia/Krasnoyarsk': { lat: 56.0153, lng: 92.8932, name: 'Красноярск' },
  'Asia/Irkutsk': { lat: 52.2864, lng: 104.2807, name: 'Иркутск' },
  'Asia/Yakutsk': { lat: 62.0355, lng: 129.6755, name: 'Якутск' },
  'Asia/Vladivostok': { lat: 43.1155, lng: 131.8855, name: 'Владивосток' },
  'Asia/Sakhalin': { lat: 46.9592, lng: 142.7380, name: 'Южно-Сахалинск' },
  'Asia/Kamchatka': { lat: 53.0370, lng: 158.6559, name: 'Петропавловск-Камчатский' },
  'Asia/Baku': { lat: 40.4093, lng: 49.8671, name: 'Баку' },
  'Asia/Tbilisi': { lat: 41.7151, lng: 44.8271, name: 'Тбилиси' },
  'Asia/Yerevan': { lat: 40.1872, lng: 44.5152, name: 'Ереван' },
  'Asia/Dubai': { lat: 25.2048, lng: 55.2708, name: 'Дубай' },
  'Asia/Riyadh': { lat: 24.7136, lng: 46.6753, name: 'Эр-Рияд' },
  'Asia/Qatar': { lat: 25.2854, lng: 51.5310, name: 'Доха' },
  'Asia/Kuwait': { lat: 29.3759, lng: 47.9774, name: 'Кувейт' },
  'Asia/Bahrain': { lat: 26.2235, lng: 50.5876, name: 'Манама' },
  'Asia/Muscat': { lat: 23.5880, lng: 58.3829, name: 'Маскат' },
  'Asia/Tehran': { lat: 35.6892, lng: 51.3890, name: 'Тегеран' },
  'Asia/Karachi': { lat: 24.8607, lng: 67.0011, name: 'Карачи' },
  'Asia/Kabul': { lat: 34.5553, lng: 69.2075, name: 'Кабул' },
  'Asia/Dhaka': { lat: 23.8103, lng: 90.4125, name: 'Дакка' },
  'Asia/Jakarta': { lat: -6.2088, lng: 106.8456, name: 'Джакарта' },
  'Asia/Kuala_Lumpur': { lat: 3.1390, lng: 101.6869, name: 'Куала-Лумпур' },
  'Asia/Singapore': { lat: 1.3521, lng: 103.8198, name: 'Сингапур' },
};
function timezoneOffsetHours(tz, date = new Date()) {
  try {
    const parts = new Intl.DateTimeFormat('en-US', { timeZone: tz, timeZoneName: 'shortOffset' }).formatToParts(date);
    const name = (parts.find(p => p.type === 'timeZoneName') || {}).value || '';
    const m = name.match(/^GMT([+-])(\d{1,2})(?::(\d{2}))?$/);
    if (!m) return null;
    const hours = Number(m[2]) + (Number(m[3] || 0) / 60);
    return (m[1] === '-' ? -1 : 1) * hours;
  } catch { return null; }
}
function approxCoordsForTz(tz) {
  const exact = TZ_APPROX_COORDS[tz];
  if (exact) return exact;
  const offset = timezoneOffsetHours(tz);
  if (!Number.isFinite(offset)) return null;
  return { lat: 30, lng: Math.max(-180, Math.min(180, offset * 15)), name: 'ваша таймзона' };
}

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

// примерные времена намаза по таймзоне, если пользователь ещё не дал геолокацию
app.get('/api/approx-times', (req, res) => {
  const { tz, madhab } = req.query;
  if (!validTimeZone(tz)) return res.status(400).json({ error: 'bad tz' });
  if (!adhan) return res.status(503).json({ error: 'prayer engine warming up' });
  const approx = approxCoordsForTz(tz);
  if (!approx) return res.status(404).json({ error: 'approx location not found' });
  try {
    const t = prayerTimes(approx.lat, approx.lng, madhab, new Date());
    res.json({
      approx: true, city: approx.name,
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
  const { initData, lat, lng, madhab, tz } = req.body || {};
  const user = checkInitData(initData);
  if (!user || !user.id) return res.status(401).json({ error: 'bad initData' });
  if (typeof lat !== 'number' || typeof lng !== 'number') return res.status(400).json({ error: 'lat/lng required' });
  const subs = loadSubs();
  const prev = subs[user.id] || {};
  subs[user.id] = { ...prev, id: user.id, name: user.first_name || '',
    lat, lng, madhab: madhab === 'hanafi' ? 'hanafi' : 'shafi',
    tz: validTimeZone(tz) ? tz : prev.tz,
    remindersEnabled: prev.manualDisabled === true ? false : true,
    since: prev.since || Date.now() };
  saveSubs(subs);
  res.json({ ok: true });
});

// регистрация таймзоны при запуске Mini App. Это включает напоминания, если пользователь сам их не выключал.
app.post('/api/tz', (req, res) => {
  const { initData, tz } = req.body || {};
  const user = checkInitData(initData);
  if (!user || !user.id) return res.status(401).json({ error: 'bad initData' });
  if (!validTimeZone(tz)) return res.status(400).json({ error: 'bad tz' });
  const subs = loadSubs();
  const prev = subs[user.id] || {};
  subs[user.id] = {
    ...prev,
    id: user.id,
    name: user.first_name || prev.name || '',
    tz,
    remindersEnabled: prev.manualDisabled === true ? false : true,
    since: prev.since || Date.now(),
  };
  saveSubs(subs);
  res.json({ ok: true, remindersEnabled: subs[user.id].remindersEnabled });
});

// явное включение/выключение напоминаний из Mini App
app.post('/api/reminders', (req, res) => {
  const { initData, enabled, tz, lat, lng, madhab } = req.body || {};
  const user = checkInitData(initData);
  if (!user || !user.id) return res.status(401).json({ error: 'bad initData' });
  const subs = loadSubs();
  const prev = subs[user.id] || {};
  const next = { ...prev, id: user.id, name: user.first_name || prev.name || '', since: prev.since || Date.now() };
  if (validTimeZone(tz)) next.tz = tz;
  if (typeof lat === 'number' && typeof lng === 'number') {
    next.lat = lat;
    next.lng = lng;
    next.madhab = madhab === 'hanafi' ? 'hanafi' : 'shafi';
  }
  if (enabled === true && !validTimeZone(next.tz)) return res.status(400).json({ error: 'tz required' });
  next.remindersEnabled = enabled === true;
  next.manualDisabled = enabled !== true;
  subs[user.id] = next;
  saveSubs(subs);
  res.json({ ok: true, remindersEnabled: next.remindersEnabled });
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
    if (subs[id]) {
      subs[id] = { ...subs[id], id, name: msg.from.first_name || subs[id].name || '' };
      saveSubs(subs);
    }
    bot.sendPhoto(id, WELCOME_IMAGE, { caption: WELCOME_CAPTION, parse_mode: 'HTML', ...kb })
      .catch((e) => {
        console.warn('[bot] welcome photo не отправилось:', e?.message || e);
        return bot.sendMessage(id, WELCOME_CAPTION, { parse_mode: 'HTML', ...kb });
      });
  });
  bot.onText(/\/help/, (msg) => {
    bot.sendMessage(msg.chat.id, HELP_TEXT, { parse_mode: 'HTML', ...kb });
  });
  bot.onText(/\/stop/, (msg) => {
    const s = loadSubs();
    if (s[msg.chat.id]) { s[msg.chat.id].remindersEnabled = false; s[msg.chat.id].manualDisabled = true; saveSubs(s); }
    bot.sendMessage(msg.chat.id, 'Напоминания отключены. Чтобы включить снова, открой приложение и включи их в настройках.');
  });

  function send(id, text) {
    bot.sendMessage(id, text, kb).catch((e) => {
      if (e?.response?.statusCode === 403) { const s = loadSubs(); delete s[id]; saveSubs(s); }
    });
  }
  const MORNING_MSG = '🌅 Время утренних поминаний. Начни день с зикра.';
  const EVENING_MSG = '🌙 Время вечерних поминаний.';
  const SLEEP_MSG = '🌙 Поминания перед сном. Закрой день спокойно — открой раздел «Перед сном».';
  function hhmm(d, tz) { return d.toLocaleTimeString('ru-RU', { hour: '2-digit', minute: '2-digit', timeZone: tz || TZ }); }
  function localDay(d, tz) { return d.toLocaleDateString('sv-SE', { timeZone: tz || TZ }); }   // YYYY-MM-DD в зоне пользователя
  function cronToHM(expr) { const p = String(expr).trim().split(/\s+/); const h = +p[1], m = +p[0]; return String(h).padStart(2, '0') + ':' + String(m).padStart(2, '0'); }
  const FIXED = { morning: cronToHM(MORNING_CRON), evening: cronToHM(EVENING_CRON), sleep: cronToHM(SLEEP_CRON) };

  // единый поминутный тик: КАЖДОМУ в ЕГО таймзоне (u.tz), дедуп по локальному дню пользователя
  cron.schedule('* * * * *', () => {
    const subs = loadSubs(); const now = new Date(); let changed = false;
    for (const id in subs) {
      const u = subs[id];
      if (u.remindersEnabled !== true) continue;
      const tz = validTimeZone(u.tz) ? u.tz : '';
      if (!tz) continue;
      const day = localDay(now, tz);
      const nowHM = hhmm(now, tz);
      let t = null;
      if (typeof u.lat === 'number' && typeof u.lng === 'number') {
        // точные — по геолокации пользователя
        try { t = prayerTimes(u.lat, u.lng, u.madhab, now); } catch { t = null; }
      } else {
        // примерные — по основному городу таймзоны телефона
        const approx = approxCoordsForTz(tz);
        if (approx) { try { t = prayerTimes(approx.lat, approx.lng, u.madhab, now); } catch { t = null; } }
      }
      if (t) {
        if (hhmm(t.fajr, tz) === nowHM && u.lastMorning !== day) { u.lastMorning = day; changed = true; send(id, MORNING_MSG); }
        if (hhmm(t.asr, tz) === nowHM && u.lastEvening !== day) { u.lastEvening = day; changed = true; send(id, EVENING_MSG); }
      } else {
        // крайний fallback для таймзон, которых нет в карте
        if (nowHM === FIXED.morning && u.lastMorning !== day) { u.lastMorning = day; changed = true; send(id, MORNING_MSG); }
        if (nowHM === FIXED.evening && u.lastEvening !== day) { u.lastEvening = day; changed = true; send(id, EVENING_MSG); }
      }
      // перед сном — всем, в их зоне
      if (nowHM === FIXED.sleep && u.lastSleep !== day) { u.lastSleep = day; changed = true; send(id, SLEEP_MSG); }
    }
    if (changed) saveSubs(subs);
  });

  console.log('[bot] запущен. Напоминания включаются при запуске Mini App, если известна таймзона и пользователь не выключал их.');
}
