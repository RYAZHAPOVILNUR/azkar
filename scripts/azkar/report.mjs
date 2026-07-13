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
const noAudio = items.filter(item => item.audio?.status !== 'ready').length;

const lines = [
  '# Azkar DB report',
  '',
  `Generated: ${new Date().toISOString()}`,
  '',
  '## Summary',
  '',
  `- Items: ${items.length}`,
  `- Categories: ${categories.length}`,
  `- Collections: ${collections.length}`,
  `- Items without audio: ${noAudio}`,
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
  '## Next review work',
  '',
  '- Import Hisnul Muslim categories into `needs_review` only.',
  '- Add exact source metadata and copyright status per collection.',
  '- Add reviewer initials/date before moving new items to `verified`.',
  '- Keep weak/suspect narrations in `reviewed/excluded.json`, not in the main export.',
  '',
];

fs.mkdirSync(path.dirname(reportPath), { recursive: true });
fs.writeFileSync(reportPath, lines.join('\n'));
console.log(`Wrote ${path.relative(root, reportPath)}`);
