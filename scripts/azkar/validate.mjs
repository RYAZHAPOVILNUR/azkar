#!/usr/bin/env node
import fs from 'node:fs';
import path from 'node:path';

const root = path.resolve(new URL('../..', import.meta.url).pathname);
const dbDir = path.join(root, 'content/azkar-db/normalized');
const itemsPath = path.join(dbDir, 'azkar.all.json');
const categoriesPath = path.join(dbDir, 'categories.json');
const collectionsPath = path.join(dbDir, 'collections.json');

function readJson(file) {
  return JSON.parse(fs.readFileSync(file, 'utf8'));
}

function fail(errors) {
  console.error(errors.map(e => `- ${e}`).join('\n'));
  process.exit(1);
}

const errors = [];
const items = readJson(itemsPath);
const categories = readJson(categoriesPath);
const collections = readJson(collectionsPath);
const categoryIds = new Set(categories.map(c => c.id));
const collectionIds = new Set(collections.map(c => c.id));
const seen = new Set();

const allowedStatus = new Set([
  'verified',
  'needs_review',
  'needs_arabic_review',
  'needs_translation_review',
  'needs_source_review',
  'duplicate_candidate',
  'excluded_weak',
  'copyright_blocked',
]);

items.forEach((item, idx) => {
  const label = item.id || `#${idx}`;
  if (!item.id) errors.push(`${label}: missing id`);
  if (seen.has(item.id)) errors.push(`${label}: duplicate id`);
  seen.add(item.id);
  if (!allowedStatus.has(item.status)) errors.push(`${label}: invalid status ${item.status}`);
  if (!item.arabic) errors.push(`${label}: missing arabic`);
  if (!item.translation_ru) errors.push(`${label}: missing translation_ru`);
  if (!item.source_text) errors.push(`${label}: missing source_text`);
  if (!Number.isFinite(Number(item.repeat)) || Number(item.repeat) < 1) errors.push(`${label}: repeat must be positive`);
  if (!Array.isArray(item.category_ids) || !item.category_ids.length) errors.push(`${label}: missing category_ids`);
  (item.category_ids || []).forEach(id => { if (!categoryIds.has(id)) errors.push(`${label}: unknown category ${id}`); });
  (item.collection_ids || []).forEach(id => { if (!collectionIds.has(id)) errors.push(`${label}: unknown collection ${id}`); });
  if (item.status === 'verified' && !item.source_refs?.length) errors.push(`${label}: verified item must have source_refs`);
});

if (errors.length) fail(errors);

console.log(`Validated ${items.length} items, ${categories.length} categories, ${collections.length} collections`);
