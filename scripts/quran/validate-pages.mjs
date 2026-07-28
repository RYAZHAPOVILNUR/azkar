#!/usr/bin/env node
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const root = path.resolve(__dirname, '../..');
const quranDir = path.join(root, 'miniapp/assets/quran');
const pagesDir = path.join(quranDir, 'pages');

const readJson = (file) => JSON.parse(fs.readFileSync(file, 'utf8'));
const fail = (message) => {
  throw new Error(message);
};

const index = readJson(path.join(quranDir, 'index.json'));
const meta = readJson(path.join(pagesDir, 'meta.json'));
const suraCounts = new Map(index.map((sura) => [sura.n, sura.c]));
const expectedKeys = [];

for (const sura of index) {
  for (let ayah = 1; ayah <= sura.c; ayah += 1) {
    expectedKeys.push(`${sura.n}:${ayah}`);
  }
}

const expectedPos = new Map(expectedKeys.map((key, i) => [key, i]));
const seenFirstPage = new Map();
const actualUnique = [];
const actualSeen = new Set();
const repeatedAfterGap = [];
let lastKey = null;
let totalWords = 0;

if (meta.pages !== 604) fail(`meta.pages must be 604, got ${meta.pages}`);
if (index.length !== 114) fail(`index must contain 114 surahs, got ${index.length}`);
if (expectedKeys.length !== 6236) fail(`expected ayah count must be 6236, got ${expectedKeys.length}`);

for (let page = 1; page <= 604; page += 1) {
  const file = path.join(pagesDir, `${page}.json`);
  if (!fs.existsSync(file)) fail(`missing page file ${page}.json`);

  const data = readJson(file);
  if (data.p !== page) fail(`page ${page}: data.p is ${data.p}`);
  if (!Array.isArray(data.lines)) fail(`page ${page}: lines must be an array`);
  if (!Array.isArray(data.starts)) fail(`page ${page}: starts must be an array`);
  if (String(meta.pageJuz?.[page]) !== String(data.j)) {
    fail(`page ${page}: juz mismatch, meta=${meta.pageJuz?.[page]} data=${data.j}`);
  }

  const lineNumbers = new Set();
  const lineByNumber = new Map();
  let previousWordPos = -1;

  for (const line of data.lines) {
    if (!Number.isInteger(line.n) || line.n < 1 || line.n > 15) {
      fail(`page ${page}: invalid line number ${line.n}`);
    }
    if (lineNumbers.has(line.n)) fail(`page ${page}: duplicate line ${line.n}`);
    lineNumbers.add(line.n);
    lineByNumber.set(line.n, line);
    if (!Array.isArray(line.w)) fail(`page ${page}, line ${line.n}: w must be an array`);

    for (const word of line.w) {
      totalWords += 1;
      if (!word || typeof word.c !== 'string' || !word.c) {
        fail(`page ${page}, line ${line.n}: word has no glyph text`);
      }
      if (typeof word.k !== 'string' || !expectedPos.has(word.k)) {
        fail(`page ${page}, line ${line.n}: invalid ayah key ${word?.k}`);
      }

      const [suraRaw, ayahRaw] = word.k.split(':');
      const sura = Number(suraRaw);
      const ayah = Number(ayahRaw);
      if (!suraCounts.has(sura) || ayah < 1 || ayah > suraCounts.get(sura)) {
        fail(`page ${page}, line ${line.n}: ayah key out of range ${word.k}`);
      }

      const pos = expectedPos.get(word.k);
      if (pos < previousWordPos) {
        fail(`page ${page}, line ${line.n}: ayah order moved backwards at ${word.k}`);
      }
      previousWordPos = pos;

      if (!seenFirstPage.has(word.k)) seenFirstPage.set(word.k, page);
      if (word.k !== lastKey && actualSeen.has(word.k)) repeatedAfterGap.push(word.k);
      if (!actualSeen.has(word.k)) {
        actualSeen.add(word.k);
        actualUnique.push(word.k);
      }
      lastKey = word.k;
    }
  }

  for (const start of data.starts) {
    if (!Number.isInteger(start.s) || start.s < 1 || start.s > 114) {
      fail(`page ${page}: invalid surah start ${start.s}`);
    }
    if (!Number.isInteger(start.line) || start.line < 1 || start.line > 15) {
      fail(`page ${page}: invalid start line ${start.line}`);
    }
    const line = lineByNumber.get(start.line);
    const hasFirstAyahOnLine = !!line?.w?.some((word) => word.k === `${start.s}:1`);
    if (!hasFirstAyahOnLine) {
      fail(`page ${page}: start marker for surah ${start.s} does not point to its first ayah line`);
    }
  }
}

if (repeatedAfterGap.length) {
  fail(`ayah keys repeat after a gap: ${[...new Set(repeatedAfterGap)].slice(0, 10).join(', ')}`);
}

if (actualUnique.length !== expectedKeys.length) {
  fail(`unique ayah count mismatch: expected ${expectedKeys.length}, got ${actualUnique.length}`);
}

const mismatches = [];
for (let i = 0; i < expectedKeys.length; i += 1) {
  if (actualUnique[i] !== expectedKeys[i]) {
    mismatches.push(`at ${i + 1}: expected ${expectedKeys[i]}, got ${actualUnique[i] ?? 'missing'}`);
    if (mismatches.length >= 10) break;
  }
}
if (mismatches.length) fail(`ayah sequence mismatch: ${mismatches.join('; ')}`);

for (const sura of index) {
  const actualPage = seenFirstPage.get(`${sura.n}:1`);
  const metaPage = meta.suraStart?.[sura.n];
  if (actualPage !== metaPage) {
    fail(`surah ${sura.n}: start page mismatch, meta=${metaPage}, actual=${actualPage}`);
  }
  const listPage = meta.suraPages?.find((item) => item.n === sura.n)?.p;
  if (actualPage !== listPage) {
    fail(`surah ${sura.n}: suraPages mismatch, list=${listPage}, actual=${actualPage}`);
  }
}

const pageFiles = fs.readdirSync(pagesDir).filter((name) => /^\d+\.json$/.test(name));
if (pageFiles.length !== 604) fail(`expected 604 numeric page files, got ${pageFiles.length}`);

console.log(`Mushaf pages OK: ${actualUnique.length} ayahs across 604 pages, ${totalWords} glyph words checked.`);
