#!/usr/bin/env node
import fs from 'node:fs';
import path from 'node:path';

const root = path.resolve(new URL('../..', import.meta.url).pathname);
const rawPath = path.join(root, 'content/azkar-db/raw/hisnul-muslim/items.json');
const outPath = path.join(root, 'content/azkar-db/normalized/imports/hisnul-muslim.needs-review.json');

function fail(message) {
  console.error(message);
  process.exit(1);
}

if (!fs.existsSync(rawPath)) {
  fail(`No raw file found: ${path.relative(root, rawPath)}\nExpected an array of imported items. New texts must stay needs_review until manually checked.`);
}

const raw = JSON.parse(fs.readFileSync(rawPath, 'utf8'));
if (!Array.isArray(raw)) fail('Raw Hisnul Muslim import must be an array');

const items = raw.map((item, idx) => ({
  id: item.id || `hisnul-muslim-${String(idx + 1).padStart(4, '0')}`,
  slug: item.slug || `hisnul-muslim-${idx + 1}`,
  status: 'needs_review',
  title_ru: item.title_ru || item.chapter_ru || 'Азкар из Крепости мусульманина',
  short_title_ru: item.short_title_ru || item.chapter_ru || '',
  session: item.session || '',
  category_ids: item.category_ids || ['daily'],
  collection_ids: ['hisnul-muslim'],
  tags: item.tags || [],
  arabic: item.arabic || item.ar || '',
  arabic_search: item.arabic_search || '',
  translit_ru: item.translit_ru || item.tl || '',
  translation_ru: item.translation_ru || item.tr || '',
  repeat: Number(item.repeat || item.target || 1),
  repeat_hint: item.repeat_hint || item.targetHint || '',
  source_text: item.source_text || item.src || '',
  source_refs: item.source_refs || [],
  timing: item.timing || { type: 'event', event: item.event || '' },
  audio: { status: 'missing' },
  review: {
    content_origin: 'raw/hisnul-muslim/items.json',
    imported_at: new Date().toISOString(),
    reviewer: '',
    notes: 'Автоимпорт. Нельзя экспортировать как verified без сверки арабского, перевода, источника и прав.',
  },
}));

fs.mkdirSync(path.dirname(outPath), { recursive: true });
fs.writeFileSync(outPath, `${JSON.stringify(items, null, 2)}\n`);
console.log(`Imported ${items.length} needs_review items -> ${path.relative(root, outPath)}`);
