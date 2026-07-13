#!/usr/bin/env node
import fs from 'node:fs';
import path from 'node:path';
import vm from 'node:vm';

const root = path.resolve(new URL('../..', import.meta.url).pathname);
const htmlPath = path.join(root, 'miniapp/index.html');
const outPath = path.join(root, 'content/azkar-db/normalized/azkar.all.json');

const SESSION_META = {
  morning: {
    title_ru: 'Утренние поминания',
    short_title_ru: 'Утро',
    category_ids: ['morning', 'daily'],
    collection_ids: ['current-core', 'raslan-morning-evening'],
    timing: { type: 'session', session: 'morning' },
  },
  evening: {
    title_ru: 'Вечерние поминания',
    short_title_ru: 'Вечер',
    category_ids: ['evening', 'daily'],
    collection_ids: ['current-core', 'raslan-morning-evening'],
    timing: { type: 'session', session: 'evening' },
  },
  after: {
    title_ru: 'Поминания после намаза',
    short_title_ru: 'После намаза',
    category_ids: ['after_prayer', 'prayer', 'daily'],
    collection_ids: ['current-core', 'after-prayer-core'],
    timing: { type: 'event', event: 'after_obligatory_prayer' },
  },
  sleep: {
    title_ru: 'Поминания перед сном',
    short_title_ru: 'Перед сном',
    category_ids: ['sleep', 'daily'],
    collection_ids: ['current-core', 'sleep-core'],
    timing: { type: 'event', event: 'before_sleep' },
  },
};

function extractObjectLiteral(source, varName) {
  const markerRe = new RegExp(`(?:const|let|var)\\s+${varName}\\s*=\\s*\\{`);
  const m = markerRe.exec(source);
  if (!m) throw new Error(`Cannot find ${varName} declaration`);
  const start = source.indexOf('{', m.index);
  let depth = 0;
  let quote = '';
  let escaped = false;
  for (let i = start; i < source.length; i += 1) {
    const ch = source[i];
    if (quote) {
      if (escaped) {
        escaped = false;
      } else if (ch === '\\') {
        escaped = true;
      } else if (ch === quote) {
        quote = '';
      }
      continue;
    }
    if (ch === '"' || ch === "'" || ch === '`') {
      quote = ch;
      continue;
    }
    if (ch === '{') depth += 1;
    if (ch === '}') {
      depth -= 1;
      if (depth === 0) return source.slice(start, i + 1);
    }
  }
  throw new Error(`Cannot close ${varName} object literal`);
}

function slugifyId(input) {
  return String(input || '')
    .toLowerCase()
    .replace(/[^a-z0-9а-яё_ -]+/giu, '')
    .trim()
    .replace(/\s+/g, '-')
    .replace(/-+/g, '-');
}

function normalizeArabicSearch(text) {
  return String(text || '')
    .replace(/[\u064B-\u065F\u0670\u06D6-\u06ED]/g, '')
    .replace(/[إأآٱ]/g, 'ا')
    .replace(/ى/g, 'ي')
    .replace(/ة/g, 'ه')
    .replace(/\s+/g, ' ')
    .trim();
}

function parseSourceRefs(src) {
  const refs = [];
  const text = String(src || '');
  const parts = text.split(/[;،]/).map(s => s.trim()).filter(Boolean);
  for (const part of parts) {
    const match = part.match(/^([^0-9\[]+?)\s*(?:№|#)?\s*([0-9/,\s]+)?(?:\s*\(([^)]+)\))?$/u);
    refs.push({
      raw: part,
      collection: match ? match[1].trim().replace(/\.$/, '') : part,
      reference: match && match[2] ? match[2].trim() : '',
      grade: match && match[3] ? match[3].trim() : '',
    });
  }
  return refs;
}

function tagsFor(session, item) {
  const text = `${item.tr || ''} ${item.tl || ''} ${item.src || ''}`.toLowerCase();
  const tags = new Set([session]);
  if (text.includes('коран') || text.includes('аят') || text.includes('сура')) tags.add('коран');
  if (text.includes('шайтан')) tags.add('защита');
  if (text.includes('прощ')) tags.add('прощение');
  if (text.includes('рай')) tags.add('рай');
  if (text.includes('намаз') || session === 'after') tags.add('намаз');
  return Array.from(tags);
}

function categoryIdsFor(session, item) {
  const meta = SESSION_META[session] || { category_ids: [session] };
  const cats = new Set(meta.category_ids || [session]);
  const ar = item.ar || '';
  const text = `${item.tr || ''} ${item.tl || ''} ${item.src || ''}`.toLowerCase();
  if (
    ar.includes('اللَّهُ لَا إِلَهَ إِلَّا هُوَ الْحَيُّ الْقَيُّومُ') ||
    ar.includes('قُلْ هُوَ اللَّهُ أَحَدٌ') ||
    ar.includes('قُلْ أَعُوذُ بِرَبِّ الْفَلَقِ') ||
    ar.includes('قُلْ أَعُوذُ بِرَبِّ النَّاسِ') ||
    ar.includes('آمَنَ الرَّسُولُ') ||
    ar.includes('قُلْ يَا أَيُّهَا الْكَافِرُونَ')
  ) cats.add('quran_dua');
  if (
    ar.includes('أَعُوذُ') ||
    ar.includes('الشَّيْطَان') ||
    ar.includes('قُلْ أَعُوذُ') ||
    text.includes('защит') ||
    text.includes('шайтан') ||
    text.includes('вред')
  ) cats.add('protection');
  if (ar.includes('قُلْ أَعُوذُ') || ar.includes('اللَّهُ لَا إِلَهَ إِلَّا هُوَ الْحَيُّ الْقَيُّومُ')) cats.add('ruqyah');
  if (text.includes('тревог') || text.includes('печал') || text.includes('страх')) cats.add('anxiety');
  return Array.from(cats);
}

const html = fs.readFileSync(htmlPath, 'utf8');
const objectLiteral = extractObjectLiteral(html, 'AZKAR');
const legacyAzkar = vm.runInNewContext(`(${objectLiteral})`, {}, { timeout: 2000 });

const items = [];
for (const [session, data] of Object.entries(legacyAzkar)) {
  const meta = SESSION_META[session] || {
    title_ru: data.title || session,
    short_title_ru: data.title || session,
    category_ids: [session],
    collection_ids: ['current-core'],
    timing: { type: 'session', session },
  };
  (data.items || []).forEach((item, idx) => {
    const id = item.id || `${session}-${item.n || idx + 1}`;
    items.push({
      id,
      slug: slugifyId(id),
      legacy_id: id,
      status: 'verified',
      title_ru: `${meta.title_ru}: ${item.n || idx + 1}`,
      short_title_ru: meta.short_title_ru,
      session,
      category_ids: categoryIdsFor(session, item),
      collection_ids: meta.collection_ids,
      tags: tagsFor(session, item),
      arabic: item.ar || '',
      arabic_search: normalizeArabicSearch(item.ar),
      translit_ru: item.tl || '',
      translation_ru: item.tr || '',
      repeat: Number(item.target || 1),
      repeat_hint: item.targetHint || '',
      source_text: item.src || '',
      source_refs: parseSourceRefs(item.src),
      timing: meta.timing,
      display: {
        number: item.n || idx + 1,
        source_session_title: data.title || meta.title_ru,
      },
      audio: { status: 'missing' },
      review: {
        content_origin: 'miniapp_inline_azkar',
        imported_at: new Date().toISOString(),
        reviewer: '',
        notes: 'Перенесено из текущего проверенного массива AZKAR без изменения религиозного текста.',
      },
      legacy: {
        n: item.n || idx + 1,
        target: Number(item.target || 1),
        targetHint: item.targetHint || '',
        afterTargets: item.afterTargets || null,
        ar: item.ar || '',
        tl: item.tl || '',
        tr: item.tr || '',
        src: item.src || '',
      },
    });
  });
}

fs.mkdirSync(path.dirname(outPath), { recursive: true });
const manualPath = path.join(root, 'content/azkar-db/raw/manual/verified-extra.json');
if (fs.existsSync(manualPath)) {
  const manualItems = JSON.parse(fs.readFileSync(manualPath, 'utf8'));
  if (!Array.isArray(manualItems)) throw new Error('manual/verified-extra.json must be an array');
  items.push(...manualItems);
}
fs.writeFileSync(outPath, `${JSON.stringify(items, null, 2)}\n`);
console.log(`Imported ${items.length} azkar items -> ${path.relative(root, outPath)}`);
