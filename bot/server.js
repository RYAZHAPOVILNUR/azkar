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
const { spawn } = require('child_process');

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

// прогресс заучивания/чтения Корана — чтобы бот мог напоминать о повторениях
app.post('/api/hifz', (req, res) => {
  const { initData, khatm, read, mem, srs, totAy, totSec, tz } = req.body || {};
  const user = checkInitData(initData);
  if (!user || !user.id) return res.status(401).json({ error: 'bad initData' });
  const subs = loadSubs();
  const prev = subs[user.id] || {};
  const next = { ...prev, id: user.id, name: user.first_name || prev.name || '', since: prev.since || Date.now() };
  if (validTimeZone(tz)) next.tz = next.tz || tz;
  let srsClean = {};
  if (srs && typeof srs === 'object') { let n = 0; for (const k in srs) { if (n++ > 300) break; const v = srs[k]; if (v && typeof v.i === 'number' && typeof v.d === 'number') srsClean[k] = { i: v.i | 0, d: v.d | 0 }; } }
  next.hifz = {
    khatm: Number(khatm) || 0,
    read: (typeof read === 'string' && read.length < 4000) ? read : (prev.hifz && prev.hifz.read) || '',
    mem: (typeof mem === 'string' && mem.length < 4000) ? mem : (prev.hifz && prev.hifz.mem) || '',
    srs: srsClean,
    totAy: Number(totAy) || 0,
    totSec: Number(totSec) || 0,
    updated: Date.now(),
  };
  subs[user.id] = next;
  saveSubs(subs);
  res.json({ ok: true });
});

// ---------- радио: аудио из YouTube-лайва (один общий ffmpeg раздаёт mp3 всем) ----------
const RADIO_URL = process.env.RADIO_URL || 'https://www.youtube.com/@bmagrifa/live';
// PO-token провайдер (bgutil) — обход антибот-проверки YouTube с дата-центрового IP.
// Пустая строка POT_PROVIDER_URL отключает провайдер (например, при переходе на куки).
const POT_PROVIDER_URL = ('POT_PROVIDER_URL' in process.env) ? process.env.POT_PROVIDER_URL : 'http://bgutil-provider:4416';
// Куки залогиненного YouTube-аккаунта (Netscape cookies.txt) — обязательны на зафлаганном
// дата-центровом IP: без них YouTube отдаёт LOGIN_REQUIRED ещё до стадии PO-токена.
// Файл лежит в томе данных (переживает пересборку, НЕ в образе/гите). Положить: /opt/azkar -> volume.
const YT_COOKIES = process.env.YT_COOKIES || path.join(__dirname, 'data', 'cookies.txt');
function radioHasCookies() { try { return !!YT_COOKIES && fs.existsSync(YT_COOKIES); } catch { return false; } }
function ytdlpArgs() {
  // --js-runtimes node: включить node как JS-раннер для решения n-challenge (deno по умолчанию,
  // но его нет в alpine; node>=22 в образе поддерживается). yt-dlp-ejs даёт solver-скрипты.
  const a = ['-f', 'bestaudio/best', '-g', '--no-warnings', '--no-playlist', '--js-runtimes', 'node'];
  if (radioHasCookies()) a.push('--cookies', YT_COOKIES);
  if (POT_PROVIDER_URL) a.push('--extractor-args', 'youtubepot-bgutilhttp:base_url=' + POT_PROVIDER_URL);
  a.push(RADIO_URL);
  return a;
}
const radio = { proc: null, clients: new Set(), tail: [], starting: false, idleTimer: null, lastOk: 0, failCount: 0 };
// yt-dlp при успешном резолве ПЕРЕЗАПИСЫВАЕТ cookies.txt свежими (ротированными) куками — так
// сессия YouTube живёт, пока эфир регулярно резолвится. Держим бэкап, чтобы битый прогон не затёр рабочие.
const YT_COOKIES_BAK = YT_COOKIES + '.bak';
function cookieBackup() { try { if (radioHasCookies()) fs.copyFileSync(YT_COOKIES, YT_COOKIES_BAK); } catch {} }
function cookieRestore() { try { if (fs.existsSync(YT_COOKIES_BAK)) fs.copyFileSync(YT_COOKIES_BAK, YT_COOKIES); } catch {} }
// алерт владельцу (опц., env RADIO_ALERT_CHAT_ID): эфир не поднимается — вероятно, протухли куки
const RADIO_ALERT_CHAT_ID = process.env.RADIO_ALERT_CHAT_ID || '';
let _radioAlertedAt = 0;
function radioAlert(err) {
  if (!RADIO_ALERT_CHAT_ID || !TOKEN) return;
  const now = Date.now(); if (now - _radioAlertedAt < 6 * 3600 * 1000) return; _radioAlertedAt = now;   // не спамить (≤1/6ч)
  const text = '⚠️ Радио: не удаётся поднять эфир (вероятно, протухли YouTube-куки — обнови cookies.txt).\n' + String((err && err.message) || err).slice(0, 200);
  try { fetch(`https://api.telegram.org/bot${TOKEN}/sendMessage`, { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ chat_id: RADIO_ALERT_CHAT_ID, text }) }).catch(() => {}); } catch {}
}
function radioResolve() {
  return new Promise((resolve, reject) => {
    if (radioHasCookies()) cookieBackup();
    const yt = spawn('yt-dlp', ytdlpArgs());
    let out = '', err = '';
    yt.stdout.on('data', (d) => (out += d));
    yt.stderr.on('data', (d) => (err += d));
    yt.on('error', (e) => { cookieRestore(); reject(e); });
    const to = setTimeout(() => { try { yt.kill('SIGKILL'); } catch {} cookieRestore(); reject(new Error('yt-dlp timeout')); }, 25000);
    yt.on('close', (code) => { clearTimeout(to); const url = out.trim().split('\n')[0];
      if (code === 0 && url) { cookieBackup(); resolve(url); }              // успех: сохранить свежий бэкап
      else { cookieRestore(); reject(new Error('yt-dlp ' + code + ': ' + err.slice(0, 160))); } });
  });
}
// несколько попыток с backoff — переживать разовые сбои резолва/сети
async function radioResolveRetry(tries) {
  let lastErr;
  for (let i = 0; i < tries; i++) {
    try { return await radioResolve(); }
    catch (e) { lastErr = e; if (i < tries - 1) await new Promise((r) => setTimeout(r, 1500 * (i + 1))); }
  }
  throw lastErr;
}
async function radioStart() {
  if (radio.proc || radio.starting) return;
  radio.starting = true;
  try {
    const url = await radioResolveRetry(3);
    const ff = spawn('ffmpeg', ['-hide_banner', '-loglevel', 'error', '-reconnect', '1', '-reconnect_streamed', '1', '-reconnect_delay_max', '5', '-i', url, '-vn', '-c:a', 'libmp3lame', '-b:a', '64k', '-f', 'mp3', 'pipe:1']);
    radio.proc = ff; radio.lastOk = Date.now(); radio.failCount = 0;
    ff.stdout.on('data', (chunk) => {
      radio.tail.push(chunk);
      let total = radio.tail.reduce((s, c) => s + c.length, 0);
      while (total > 96 * 1024 && radio.tail.length > 1) total -= radio.tail.shift().length;
      for (const res of radio.clients) { try { res.write(chunk); } catch {} }
    });
    ff.stderr.on('data', () => {});
    ff.on('close', () => { radio.proc = null; radio.tail = []; if (radio.clients.size) setTimeout(() => radioStart(), 1500); });
    ff.on('error', () => { radio.proc = null; radio.tail = []; });
  } catch (e) {
    console.warn('[radio] не удалось запустить эфир:', e.message);
    radio.proc = null; radio.tail = []; radio.failCount = (radio.failCount || 0) + 1; radioAlert(e);
    for (const res of radio.clients) { try { res.end(); } catch {} }
    radio.clients.clear();
  } finally { radio.starting = false; }
}
function radioStopIfIdle() {
  if (radio.idleTimer) clearTimeout(radio.idleTimer);
  radio.idleTimer = setTimeout(() => {
    if (radio.clients.size === 0 && radio.proc) { try { radio.proc.kill('SIGKILL'); } catch {} radio.proc = null; radio.tail = []; }
  }, 20000);
}
// keep-alive кук: периодически тихо резолвим эфир, чтобы yt-dlp освежил куки (write-back) и сессия
// YouTube не протухла от простоя — работает и без слушателей. Только в простое (идёт эфир → куки и так свежие).
const RADIO_KEEPALIVE_CRON = process.env.RADIO_KEEPALIVE_CRON || '17 */4 * * *';   // каждые 4 часа
async function radioKeepAlive(reason) {
  if (!radioHasCookies() || radio.starting || radio.proc) return;
  try { await radioResolve(); radio.lastOk = Date.now(); radio.failCount = 0; console.log('[radio] keep-alive ok (' + reason + '): куки освежены'); }
  catch (e) { radio.failCount = (radio.failCount || 0) + 1; console.warn('[radio] keep-alive FAIL (' + reason + '):', e.message); radioAlert(e); }
}
try { cron.schedule(RADIO_KEEPALIVE_CRON, () => radioKeepAlive('cron'), { timezone: TZ }); }
catch (e) { console.warn('[radio] keep-alive cron не запланирован:', e.message); }
setTimeout(() => radioKeepAlive('boot'), 60000);   // прогрев + самопроверка через минуту после старта
app.get('/api/radio/stream', (req, res) => {
  if (radio.clients.size >= 30) return res.status(503).end('busy');
  res.writeHead(200, { 'Content-Type': 'audio/mpeg', 'Cache-Control': 'no-cache, no-store', 'Access-Control-Allow-Origin': '*' });
  radio.clients.add(res);
  for (const c of radio.tail) { try { res.write(c); } catch {} }
  radioStart();
  req.on('close', () => { radio.clients.delete(res); radioStopIfIdle(); });
});
app.get('/api/radio/status', (_req, res) => res.json({ live: !!radio.proc, listeners: radio.clients.size, cookies: radioHasCookies(), pot: !!POT_PROVIDER_URL, lastOk: radio.lastOk || 0, fails: radio.failCount || 0 }));

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
  const HIFZ_HM = process.env.HIFZ_TIME || '09:00';   // время напоминания о повторении (в зоне пользователя)
  function popcountB64(b64) { try { const bin = Buffer.from(b64 || '', 'base64'); let c = 0; for (let i = 0; i < bin.length; i++) { let b = bin[i]; while (b) { c += b & 1; b >>= 1; } } return c; } catch { return 0; } }
  function pluralN(n, a, b, c) { n = Math.abs(n); const d = n % 100, e = n % 10; if (d > 10 && d < 20) return c; if (e > 1 && e < 5) return b; if (e === 1) return a; return c; }
  function weekdayInTz(now, tz) { try { return new Date(now.toLocaleString('en-US', { timeZone: tz || TZ })).getDay(); } catch { return now.getDay(); } }

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
      // хифз: напоминание о повторении заученного + недельный дайджест (в зоне пользователя)
      if (u.hifz && nowHM === HIFZ_HM && u.lastHifz !== day) {
        const today = Math.floor(Date.now() / 86400000);
        const srs = u.hifz.srs || {}; let due = 0;
        for (const s in srs) { if (srs[s] && srs[s].d <= today) due++; }
        if (due > 0) {
          u.lastHifz = day; changed = true;
          send(id, `📖 Пора повторить заученное: ${due} ${pluralN(due, 'сура', 'суры', 'сур')}. Открой раздел «Прогресс» → «Повторить».`);
        } else if (weekdayInTz(now, tz) === 6) {   // суббота — дайджест
          u.lastHifz = day; changed = true;
          const pctR = Math.round(popcountB64(u.hifz.read) / 6236 * 100);
          const memC = popcountB64(u.hifz.mem);
          send(id, `📊 Твой Коран за неделю: прочитано ${pctR}%, заучено ${memC} ${pluralN(memC, 'аят', 'аята', 'аятов')}, хатмов ${u.hifz.khatm || 0}. Так держать! 🤲`);
        }
      }
    }
    if (changed) saveSubs(subs);
  });

  console.log('[bot] запущен. Напоминания включаются при запуске Mini App, если известна таймзона и пользователь не выключал их.');
}
