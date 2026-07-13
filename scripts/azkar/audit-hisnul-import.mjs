#!/usr/bin/env node
import fs from 'node:fs';
import path from 'node:path';

const root = path.resolve(new URL('../..', import.meta.url).pathname);
const rawDir = path.join(root, 'content/azkar-db/raw/hisnul-muslim');
const normalizedPath = path.join(root, 'content/azkar-db/normalized/azkar.all.json');
const reportsDir = path.join(root, 'content/azkar-db/reports');
const reportPath = path.join(reportsDir, 'hisnul-automated-audit.json');
const mdPath = path.join(reportsDir, 'hisnul-automated-audit.md');

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

function itemNumber(id) {
  const m = String(id || '').match(/hisnul-(\d+)/);
  return m ? Number(m[1]) : 0;
}

async function checkUrl(url) {
  if (!url) return { ok: false, status: 0, content_type: '' };
  try {
    const httpsUrl = String(url).replace(/^http:\/\//i, 'https://');
    const res = await fetch(httpsUrl, { method: 'HEAD' });
    return { ok: res.ok, status: res.status, content_type: res.headers.get('content-type') || '' };
  } catch (e) {
    return { ok: false, status: 0, content_type: '', error: e.message };
  }
}

const raw = readJson(path.join(rawDir, 'husn_en.json'));
const chapters = Array.isArray(raw) ? raw : raw.English;
const rawByNumber = new Map();
for (const chapter of chapters || []) {
  for (const row of chapter.TEXT || []) {
    rawByNumber.set(Number(row.ID), { chapter_id: Number(chapter.ID), chapter_title_en: chapter.TITLE || '', row });
  }
}

const items = readJson(normalizedPath).filter(item => item.id?.startsWith('hisnul-'));
const rows = [];

for (const item of items) {
  const no = itemNumber(item.id);
  const rawItem = rawByNumber.get(no);
  const audio = item.audio || {};
  const audioCheck = await checkUrl(audio.url);
  const arabicMatchesRaw = rawItem ? normalizeArabic(item.arabic) === normalizeArabic(rawItem.row.ARABIC_TEXT) : false;
  const hasRussianTranslation = !!String(item.translation_ru || '').trim() && item.translation_ru !== 'Требуется сверка перевода.';
  const hasSourceRef = Array.isArray(item.source_refs) && item.source_refs.length > 0;
  const hasHisnulSource = String(item.source_text || '').includes('Крепость мусульманина');
  const machinePassed = !!rawItem && arabicMatchesRaw && hasRussianTranslation && hasSourceRef && hasHisnulSource && audioCheck.ok;

  rows.push({
    id: item.id,
    status: item.status,
    hisnul_number: no,
    chapter_id: rawItem?.chapter_id || item.display?.source_chapter_id || '',
    title_ru: item.title_ru,
    machine_checks: {
      raw_item_found: !!rawItem,
      arabic_matches_raw: arabicMatchesRaw,
      russian_translation_present: hasRussianTranslation,
      source_ref_present: hasSourceRef,
      source_text_is_hisnul: hasHisnulSource,
      audio_url_reachable: audioCheck.ok,
    },
    audio: {
      url: audio.url || '',
      checked_url: audio.url ? String(audio.url).replace(/^http:\/\//i, 'https://') : '',
      status: audioCheck.status,
      content_type: audioCheck.content_type,
      error: audioCheck.error || '',
    },
    conclusion: machinePassed
      ? 'machine_matched_raw_not_scholarly_verified'
      : 'needs_manual_review',
    note: machinePassed
      ? 'Автопроверка подтверждает совпадение с raw-импортом и доступность аудио, но не заменяет религиозную сверку хадисов, степени и прав перевода.'
      : 'Нужна ручная проверка: raw, перевод, источник, степень, права или аудио.',
  });
}

const summary = {
  generated_at: new Date().toISOString(),
  total_hisnul_items: rows.length,
  status_counts: rows.reduce((acc, row) => ({ ...acc, [row.status]: (acc[row.status] || 0) + 1 }), {}),
  machine_matched_raw_not_scholarly_verified: rows.filter(row => row.conclusion === 'machine_matched_raw_not_scholarly_verified').length,
  needs_manual_review: rows.filter(row => row.conclusion === 'needs_manual_review').length,
  failed_checks: {
    raw_item_missing: rows.filter(row => !row.machine_checks.raw_item_found).length,
    arabic_mismatch: rows.filter(row => !row.machine_checks.arabic_matches_raw).length,
    russian_translation_missing: rows.filter(row => !row.machine_checks.russian_translation_present).length,
    source_ref_missing: rows.filter(row => !row.machine_checks.source_ref_present).length,
    audio_unreachable: rows.filter(row => !row.machine_checks.audio_url_reachable).length,
  },
};

fs.mkdirSync(reportsDir, { recursive: true });
fs.writeFileSync(reportPath, `${JSON.stringify({ summary, items: rows }, null, 2)}\n`);

const md = [
  '# Hisnul Muslim automated audit',
  '',
  `Generated: ${summary.generated_at}`,
  '',
  '## Summary',
  '',
  `- Hisnul items: ${summary.total_hisnul_items}`,
  `- Machine matched raw import: ${summary.machine_matched_raw_not_scholarly_verified}`,
  `- Needs manual review: ${summary.needs_manual_review}`,
  '',
  '## Failed checks',
  '',
  `- Raw item missing: ${summary.failed_checks.raw_item_missing}`,
  `- Arabic mismatch: ${summary.failed_checks.arabic_mismatch}`,
  `- Russian translation missing: ${summary.failed_checks.russian_translation_missing}`,
  `- Source ref missing: ${summary.failed_checks.source_ref_missing}`,
  `- Audio unreachable: ${summary.failed_checks.audio_unreachable}`,
  '',
  '## Important',
  '',
  'This audit only checks mechanical consistency against the raw imported Hisnul Muslim files.',
  'It does not replace scholarly verification of hadith source, grading, Arabic edition, Russian translation rights, or final religious review.',
  '',
].join('\n');
fs.writeFileSync(mdPath, md);

console.log(`Audited ${rows.length} Hisnul items`);
console.log(`Machine matched raw import: ${summary.machine_matched_raw_not_scholarly_verified}`);
console.log(`Needs manual review: ${summary.needs_manual_review}`);
