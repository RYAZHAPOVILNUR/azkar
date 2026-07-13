#!/usr/bin/env node
import fs from 'node:fs';
import path from 'node:path';

const root = path.resolve(new URL('../..', import.meta.url).pathname);
const itemsPath = path.join(root, 'content/azkar-db/normalized/azkar.all.json');
const outPath = path.join(root, 'content/azkar-db/reports/duplicate-candidates.json');

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

const items = JSON.parse(fs.readFileSync(itemsPath, 'utf8'));
const groups = new Map();
items.forEach(item => {
  const key = normalizeArabic(item.arabic);
  if (!key) return;
  const list = groups.get(key) || [];
  list.push({ id: item.id, session: item.session, source_text: item.source_text });
  groups.set(key, list);
});

const duplicates = Array.from(groups.entries())
  .filter(([, list]) => list.length > 1)
  .map(([arabic_search, items]) => ({ arabic_search, items }));

fs.mkdirSync(path.dirname(outPath), { recursive: true });
fs.writeFileSync(outPath, `${JSON.stringify(duplicates, null, 2)}\n`);
console.log(`Duplicate candidate groups: ${duplicates.length}`);
