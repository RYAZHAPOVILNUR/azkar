#!/usr/bin/env node
import fs from 'node:fs';
import path from 'node:path';

const root = path.resolve(new URL('../..', import.meta.url).pathname);
const normalized = path.join(root, 'content/azkar-db/normalized');
const reportPath = path.join(root, 'content/azkar-db/reports/latest-report.md');
const items = JSON.parse(fs.readFileSync(path.join(normalized, 'azkar.all.json'), 'utf8'));
const categories = JSON.parse(fs.readFileSync(path.join(normalized, 'categories.json'), 'utf8'));
const collections = JSON.parse(fs.readFileSync(path.join(normalized, 'collections.json'), 'utf8'));
let duplicates = [];
try {
  duplicates = JSON.parse(fs.readFileSync(path.join(root, 'content/azkar-db/reports/duplicate-candidates.json'), 'utf8'));
} catch (_e) {}
let hisnulImport = null;
try {
  hisnulImport = JSON.parse(fs.readFileSync(path.join(root, 'content/azkar-db/reports/hisnul-muslim-import-report.json'), 'utf8'));
} catch (_e) {}

function countBy(itemsList, getter) {
  const map = new Map();
  itemsList.forEach(item => {
    const keys = getter(item);
    (Array.isArray(keys) ? keys : [keys]).filter(Boolean).forEach(key => map.set(key, (map.get(key) || 0) + 1));
  });
  return Array.from(map.entries()).sort((a, b) => b[1] - a[1] || a[0].localeCompare(b[0]));
}

const byStatus = countBy(items, item => item.status);
const byCategory = countBy(items, item => item.category_ids);
const byCollection = countBy(items, item => item.collection_ids);
const byAudio = countBy(items, item => item.audio?.status || 'missing');
const audioAvailable = items.filter(item => ['ready', 'source_url'].includes(item.audio?.status)).length;
const exportable = items.filter(item => !['excluded_weak', 'copyright_blocked', 'needs_translation_review'].includes(item.status));

const lines = [
  '# Azkar DB report',
  '',
  `Generated: ${new Date().toISOString()}`,
  '',
  '## Summary',
  '',
  `- Items: ${items.length}`,
  `- Exported to Mini App: ${exportable.length}`,
  `- Categories: ${categories.length}`,
  `- Collections: ${collections.length}`,
  `- Items with audio available: ${audioAvailable}`,
  `- Duplicate candidate groups: ${duplicates.length}`,
  '',
  '## Status',
  '',
  ...byStatus.map(([id, count]) => `- ${id}: ${count}`),
  '',
  '## Categories',
  '',
  ...byCategory.map(([id, count]) => `- ${id}: ${count}`),
  '',
  '## Collections',
  '',
  ...byCollection.map(([id, count]) => `- ${id}: ${count}`),
  '',
  '## Audio',
  '',
  ...byAudio.map(([id, count]) => `- ${id}: ${count}`),
  '',
  ...(hisnulImport ? [
    '## Hisnul Muslim import',
    '',
    `- Source chapters: ${hisnulImport.source_chapters}`,
    `- Source items: ${hisnulImport.source_items}`,
    `- Added to normalized DB: ${hisnulImport.imported_items}`,
    `- Skipped as duplicates: ${hisnulImport.skipped_duplicate_items}`,
    `- Added to Mini App now: ${hisnulImport.ru_translations_found_for_imported}`,
    `- Waiting for Russian translation/review: ${hisnulImport.missing_ru_translation_for_imported}`,
    '',
  ] : []),
  '## Next review work',
  '',
  '- Use `node scripts/azkar/export-review-queue.mjs` to generate `review-queue.csv/json` for the 248 cards that still need source review.',
  '- Manually review `needs_source_review` Hisnul Muslim cards before moving any item to `verified`.',
  '- Keep the PDF-derived `needs_source_review` layer marked as review-needed until source refs/grades are checked item by item.',
  '- Add exact hadith source metadata and copyright status per imported item.',
  '- Keep weak/suspect narrations in `reviewed/excluded.json`, not in the Mini App export.',
  '',
];

fs.mkdirSync(path.dirname(reportPath), { recursive: true });
fs.writeFileSync(reportPath, lines.join('\n'));
console.log(`Wrote ${path.relative(root, reportPath)}`);
