#!/usr/bin/env node
import fs from 'node:fs';
import path from 'node:path';

const root = path.resolve(new URL('../..', import.meta.url).pathname);
const normalized = path.join(root, 'content/azkar-db/normalized');
const outDir = path.join(root, 'miniapp/data');

function readJson(name) {
  return JSON.parse(fs.readFileSync(path.join(normalized, name), 'utf8'));
}

function normalizeSearch(text) {
  return String(text || '')
    .toLowerCase()
    .replace(/[\u064B-\u065F\u0670\u06D6-\u06ED]/g, '')
    .replace(/[إأآٱ]/g, 'ا')
    .replace(/ى/g, 'ي')
    .replace(/ة/g, 'ه')
    .replace(/ё/g, 'е')
    .replace(/\s+/g, ' ')
    .trim();
}

const allItems = readJson('azkar.all.json');
const categories = readJson('categories.json');
const collections = readJson('collections.json');
const exportableItems = allItems.filter(item => !['excluded_weak', 'copyright_blocked'].includes(item.status));
const search = exportableItems.map(item => ({
  id: item.id,
  session: item.session,
  category_ids: item.category_ids,
  collection_ids: item.collection_ids,
  text: normalizeSearch([
    item.title_ru,
    item.short_title_ru,
    item.translation_ru,
    item.translit_ru,
    item.source_text,
    item.tags?.join(' '),
    item.arabic_search,
  ].filter(Boolean).join(' ')),
}));
const manifest = {
  version: 1,
  generated_at: new Date().toISOString(),
  item_count: exportableItems.length,
  verified_count: exportableItems.filter(item => item.status === 'verified').length,
  files: {
    azkar: 'azkar.v1.json',
    categories: 'categories.v1.json',
    collections: 'collections.v1.json',
    search: 'search-index.v1.json',
  },
};

fs.mkdirSync(outDir, { recursive: true });
fs.writeFileSync(path.join(outDir, 'manifest.json'), `${JSON.stringify(manifest, null, 2)}\n`);
fs.writeFileSync(path.join(outDir, 'azkar.v1.json'), `${JSON.stringify(exportableItems, null, 2)}\n`);
fs.writeFileSync(path.join(outDir, 'categories.v1.json'), `${JSON.stringify(categories, null, 2)}\n`);
fs.writeFileSync(path.join(outDir, 'collections.v1.json'), `${JSON.stringify(collections, null, 2)}\n`);
fs.writeFileSync(path.join(outDir, 'search-index.v1.json'), `${JSON.stringify(search, null, 2)}\n`);
console.log(`Exported ${exportableItems.length} items -> ${path.relative(root, outDir)}`);
