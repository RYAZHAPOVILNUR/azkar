#!/usr/bin/env node
import fs from 'node:fs';
import path from 'node:path';

const root = path.resolve(new URL('../..', import.meta.url).pathname);
const rawDir = path.join(root, 'content/azkar-db/raw/hisnul-muslim');
const jsonPath = path.join(rawDir, 'husn_en.json');
const ruTextPath = path.join(rawDir, 'ru_Hisn_Almuslim.txt');
const basePath = path.join(root, 'content/azkar-db/normalized/azkar.all.json');
const outPath = path.join(root, 'content/azkar-db/normalized/imports/hisnul-muslim.needs-review.json');
const reportPath = path.join(root, 'content/azkar-db/reports/hisnul-muslim-import-report.json');

function fail(message) {
  console.error(message);
  process.exit(1);
}

function readJson(file) {
  return JSON.parse(fs.readFileSync(file, 'utf8').replace(/^\uFEFF/, ''));
}

function normalizeArabic(text) {
  return String(text || '')
    .replace(/[\u064B-\u065F\u0670\u06D6-\u06ED]/g, '')
    .replace(/[إأآٱ]/g, 'ا')
    .replace(/ى/g, 'ي')
    .replace(/ة/g, 'ه')
    .replace(/[^\u0600-\u06FF\s]/g, '')
    .replace(/\s+/g, ' ')
    .trim();
}

function slugifyId(input) {
  return String(input || '')
    .toLowerCase()
    .replace(/[^a-z0-9а-яё_ -]+/giu, '')
    .trim()
    .replace(/\s+/g, '-')
    .replace(/-+/g, '-');
}

function sentenceCaseRu(text) {
  const clean = String(text || '')
    .replace(/\s+/g, ' ')
    .replace(/_/g, ' ')
    .replace(/[._]+$/g, '')
    .trim()
    .toLocaleLowerCase('ru-RU');
  const titled = clean ? clean[0].toLocaleUpperCase('ru-RU') + clean.slice(1) : '';
  return titled
    .replace(/аллах/giu, 'Аллах')
    .replace(/коран/giu, 'Коран')
    .replace(/пророк/giu, 'Пророк')
    .replace(/\s+/g, ' ')
    .trim();
}

function upperRatio(text) {
  const letters = Array.from(String(text || '')).filter(ch => /\p{Letter}/u.test(ch));
  if (!letters.length) return 0;
  return letters.filter(ch => ch === ch.toLocaleUpperCase('ru-RU')).length / letters.length;
}

function parseRussianHisnText(file) {
  if (!fs.existsSync(file)) return { titlesByChapter: new Map(), translationsByItem: new Map() };
  const lines = fs.readFileSync(file, 'utf8').split(/\r?\n/);
  const titlesByChapter = new Map();
  const starts = [];
  const seenItems = new Set();

  lines.forEach((line, index) => {
    const s = line.trim();
    const chapter = s.match(/^(\d{1,3})\.\s+(.+)$/u);
    if (chapter) {
      const rest = chapter[2].trim();
      if (upperRatio(rest) > 0.75 && !rest.startsWith('"')) {
        const id = Number(chapter[1]);
        if (!titlesByChapter.has(id)) titlesByChapter.set(id, sentenceCaseRu(rest));
      }
    }

    const item = s.match(/^(\d{1,3})(?:\.|:)\s*(.*)$/u);
    if (!item) return;
    const id = Number(item[1]);
    const rest = item[2].trim();
    if (id < 1 || id > 267 || seenItems.has(id)) return;
    if (upperRatio(rest) > 0.75 && !rest.startsWith('"') && !rest.startsWith('(')) return;
    starts.push({ id, index, raw: s });
    seenItems.add(id);
  });

  const translationsByItem = new Map();
  starts.forEach((start, idx) => {
    const end = idx + 1 < starts.length ? starts[idx + 1].index : lines.length;
    const block = lines.slice(start.index, end).join('\n');
    const at = block.indexOf('Перевод:');
    if (at === -1) return;
    const out = [];
    for (const line of block.slice(at + 'Перевод:'.length).split(/\r?\n/)) {
      const clean = line.replace(/\f/g, '').trim();
      if (!clean || /^\d+$/.test(clean)) continue;
      const chapter = clean.match(/^(\d{1,3})\.\s+(.+)$/u);
      if (chapter && upperRatio(chapter[2]) > 0.5 && !chapter[2].trim().startsWith('"')) break;
      out.push(clean);
    }
    const translated = out.join(' ').replace(/\s+/g, ' ').trim();
    if (translated) translationsByItem.set(start.id, translated);
  });

  return { titlesByChapter, translationsByItem };
}

function categoryIdsFor(chapterId, title, arabic) {
  const t = `${title || ''}`.toLowerCase();
  const cats = new Set(['daily']);
  if ([27].includes(chapterId) || t.includes('утром') || t.includes('вечером')) cats.add('morning'), cats.add('evening');
  if ([28, 29, 30, 31].includes(chapterId) || t.includes('сном') || t.includes('сна')) cats.add('sleep');
  if ((chapterId >= 15 && chapterId <= 33) || t.includes('молит') || t.includes('намаз') || t.includes('азан') || t.includes('витр')) cats.add('prayer');
  if ([12, 13, 14].includes(chapterId) || t.includes('мечет')) cats.add('mosque');
  if ([10, 11].includes(chapterId) || t.includes('дом')) cats.add('home');
  if ((chapterId >= 73 && chapterId <= 77) || t.includes('еды') || t.includes('пить') || t.includes('плод')) cats.add('food');
  if ((chapterId >= 89 && chapterId <= 105) || t.includes('путешеств') || t.includes('путник') || t.includes('дорог')) cats.add('travel');
  if ((chapterId >= 34 && chapterId <= 42) || t.includes('страх') || t.includes('груст') || t.includes('скорб') || t.includes('тревог')) cats.add('anxiety');
  if (arabic.includes('أَعُوذُ') || arabic.includes('الشَّيْطَان') || arabic.includes('الشَّيْطَان') || t.includes('защит')) cats.add('protection');
  if (arabic.includes('قُلْ أَعُوذُ') || t.includes('болез') || t.includes('сглаз') || t.includes('леч')) cats.add('ruqyah');
  if (arabic.includes('﴿') || t.includes('коран') || t.includes('аят') || t.includes('сура')) cats.add('quran_dua');
  return Array.from(cats);
}

function timingFor(chapterId) {
  if (chapterId === 27) return { type: 'session', session: 'morning_evening' };
  if (chapterId === 28) return { type: 'event', event: 'before_sleep' };
  if (chapterId >= 15 && chapterId <= 33) return { type: 'event', event: 'prayer_related' };
  if ([12, 13, 14].includes(chapterId)) return { type: 'event', event: 'mosque' };
  if ([10, 11].includes(chapterId)) return { type: 'event', event: 'home' };
  return { type: 'event', event: 'hisnul_muslim_chapter' };
}

if (!fs.existsSync(jsonPath)) fail(`No raw JSON found: ${path.relative(root, jsonPath)}`);
if (!fs.existsSync(basePath)) fail(`No base DB found: ${path.relative(root, basePath)}. Run import-current first.`);

const raw = readJson(jsonPath);
const chapters = Array.isArray(raw) ? raw : raw.English;
if (!Array.isArray(chapters)) fail('Unsupported Hisnul Muslim JSON format');

const { titlesByChapter, translationsByItem } = parseRussianHisnText(ruTextPath);
const baseItems = readJson(basePath);
const existingArabic = new Set(baseItems.map(item => normalizeArabic(item.arabic)).filter(Boolean));
const imports = [];
const skippedDuplicates = [];
const missingRuTranslation = [];

for (const chapter of chapters) {
  const chapterId = Number(chapter.ID);
  const chapterTitle = titlesByChapter.get(chapterId) || sentenceCaseRu(chapter.TITLE || `Глава ${chapterId}`);
  const texts = Array.isArray(chapter.TEXT) ? chapter.TEXT : [];
  for (const row of texts) {
    const itemNo = Number(row.ID);
    const arabic = String(row.ARABIC_TEXT || '').trim();
    const arKey = normalizeArabic(arabic);
    if (!arabic || !arKey) continue;
    if (existingArabic.has(arKey)) {
      skippedDuplicates.push({ hisnul_id: itemNo, chapter_id: chapterId, title_ru: chapterTitle });
      continue;
    }
    existingArabic.add(arKey);

    const ruTranslation = translationsByItem.get(itemNo) || '';
    if (!ruTranslation) missingRuTranslation.push(itemNo);
    const fallbackTranslation = String(row.TRANSLATED_TEXT || row.LANGUAGE_ARABIC_TRANSLATED_TEXT || '').replace(/\s+/g, ' ').trim();
    const translit = String(row.LANGUAGE_ARABIC_TRANSLATED_TEXT || '').replace(/\s+/g, ' ').trim();
    const status = ruTranslation ? 'needs_source_review' : 'needs_translation_review';
    imports.push({
      id: `hisnul-${String(itemNo).padStart(3, '0')}`,
      slug: slugifyId(`hisnul-${itemNo}-${chapterTitle}`),
      legacy_id: `hisnul-${itemNo}`,
      status,
      title_ru: `${chapterTitle}: ${itemNo}`,
      short_title_ru: chapterTitle,
      session: '',
      category_ids: categoryIdsFor(chapterId, chapterTitle, arabic),
      collection_ids: ['hisnul-muslim'],
      tags: ['крепость-мусульманина', `глава-${chapterId}`, `номер-${itemNo}`],
      arabic,
      arabic_search: arKey,
      translit_ru: translit,
      translation_ru: ruTranslation || fallbackTranslation || 'Требуется сверка перевода.',
      repeat: Number(row.REPEAT || 1) > 0 ? Number(row.REPEAT || 1) : 1,
      repeat_hint: Number(row.REPEAT || 1) > 1 ? `${row.REPEAT} раз(а)` : '',
      source_text: `Крепость мусульманина, глава ${chapterId}, № ${itemNo}`,
      source_refs: [
        {
          raw: `Крепость мусульманина, № ${itemNo}`,
          collection: 'Крепость мусульманина',
          reference: String(itemNo),
          grade: '',
        },
      ],
      timing: timingFor(chapterId),
      display: {
        number: itemNo,
        source_chapter_id: chapterId,
        source_chapter_title_ru: chapterTitle,
        source_chapter_title_en: chapter.TITLE || '',
      },
      audio: row.AUDIO ? { status: 'source_url', url: row.AUDIO } : { status: 'missing' },
      review: {
        content_origin: 'raw/hisnul-muslim/husn_en.json + raw/hisnul-muslim/ru_Hisn_Almuslim.txt',
        imported_at: new Date().toISOString(),
        reviewer: '',
        notes: ruTranslation
          ? 'Автоимпорт. Перед переводом в verified сверить арабский текст, русский перевод, источник хадиса и права на перевод.'
          : 'Автоимпорт. Русский перевод не сопоставлен автоматически; сейчас используется временный перевод/транслитерация из JSON. Перед verified обязателен русский перевод и ручная сверка.',
      },
      legacy: {
        n: itemNo,
        target: Number(row.REPEAT || 1) > 0 ? Number(row.REPEAT || 1) : 1,
        targetHint: Number(row.REPEAT || 1) > 1 ? `${row.REPEAT} раз(а)` : '',
        ar: arabic,
        tl: translit,
        tr: ruTranslation || fallbackTranslation || 'Требуется сверка перевода.',
        src: `Крепость мусульманина, № ${itemNo}`,
      },
    });
  }
}

const merged = [...baseItems, ...imports];
fs.mkdirSync(path.dirname(outPath), { recursive: true });
fs.mkdirSync(path.dirname(reportPath), { recursive: true });
fs.writeFileSync(outPath, `${JSON.stringify(imports, null, 2)}\n`);
fs.writeFileSync(basePath, `${JSON.stringify(merged, null, 2)}\n`);
fs.writeFileSync(reportPath, `${JSON.stringify({
  generated_at: new Date().toISOString(),
  source_chapters: chapters.length,
  source_items: chapters.reduce((sum, chapter) => sum + (chapter.TEXT || []).length, 0),
  base_items_before_import: baseItems.length,
  imported_items: imports.length,
  skipped_duplicate_items: skippedDuplicates.length,
  ru_chapter_titles_found: titlesByChapter.size,
  ru_translations_found_for_imported: imports.filter(item => item.status === 'needs_source_review').length,
  missing_ru_translation_for_imported: missingRuTranslation.length,
  missing_ru_translation_ids: missingRuTranslation,
  skipped_duplicates: skippedDuplicates,
}, null, 2)}\n`);

console.log(`Imported ${imports.length} Hisnul Muslim items, skipped ${skippedDuplicates.length} duplicates -> ${path.relative(root, outPath)}`);
