#!/usr/bin/env node
import fs from 'node:fs';
import path from 'node:path';

const root = path.resolve(new URL('../..', import.meta.url).pathname);
const normalizedDir = path.join(root, 'content/azkar-db/normalized');
const reportsDir = path.join(root, 'content/azkar-db/reports');

function readJson(file) {
  return JSON.parse(fs.readFileSync(file, 'utf8').replace(/^\uFEFF/, ''));
}

function csvCell(value) {
  return `"${String(value == null ? '' : value).replace(/"/g, '""')}"`;
}

function cleanTitle(text) {
  return String(text || '')
    .replace(/:\s*\d+$/u, '')
    .replace(/\s+/g, ' ')
    .trim();
}

const CHAPTER_TITLE_OVERRIDES = {
  16: 'Перед началом молитвы',
  17: 'Во время поясного поклона',
  18: 'После выпрямления из поясного поклона',
  20: 'Между двумя земными поклонами',
  21: 'Земной поклон при чтении Корана',
  23: 'Салават Пророку ﷺ после ташаххуда',
  25: 'После завершения молитвы',
  29: 'Если испугался во сне',
  30: 'Если страшно засыпать или одиноко',
  31: 'Если увидел сон',
  32: 'Кунут в витр-намазе',
  33: 'После витр-намаза',
  34: 'При тревоге и печали',
  35: 'При трудности',
  36: 'При встрече с врагом',
  37: 'От несправедливости правителя',
  40: 'Против врага',
  42: 'От наущений шайтана в молитве и чтении Корана',
  43: 'Если дело стало трудным',
  46: 'Если случилось нежеланное',
  48: 'Защита детей',
  49: 'За больного при посещении',
  50: 'Достоинство посещения больного',
  51: 'Для тяжелобольного',
  53: 'При беде',
  55: 'За умершего в погребальной молитве',
  56: 'За умершего ребёнка',
  58: 'При опускании умершего в могилу',
  61: 'Когда дует ветер',
  68: 'При разговении',
  71: 'Дуа гостя за хозяина',
  74: 'Если постящемуся предлагают еду',
  76: 'При виде первых плодов сезона',
  80: 'В брачную ночь или при покупке животного',
  81: 'Перед близостью',
  82: 'При гневе',
  86: 'За сказавшего: «Да простит тебя Аллах»',
  88: 'Защита от Даджаля',
  89: 'За сказавшего: «Я люблю тебя ради Аллаха»',
  94: 'Если увидел плохую примету',
  96: 'В путешествии',
  98: 'При входе на рынок',
  100: 'Дуа путника за остающегося',
  103: 'Путнику перед рассветом',
  105: 'При возвращении из путешествия',
  106: 'Когда что-то радует или огорчает',
  107: 'Достоинство салавата Пророку ﷺ',
  109: 'Ответ немусульманину на салям',
  110: 'При крике петуха и крике осла',
  111: 'При лае собак ночью',
  116: 'Такбир у Чёрного камня',
  117: 'Между йеменским углом и Чёрным камнем',
  118: 'На холмах Сафа и Марва',
  120: 'В аль-Маш‘ар аль-Харам',
  130: 'Достоинство поминания Аллаха',
  131: 'Как Пророк ﷺ прославлял Аллаха',
};

function suggestedTitle(item) {
  const chapterId = Number(item.display?.source_chapter_id || 0);
  return CHAPTER_TITLE_OVERRIDES[chapterId]
    || cleanTitle(item.display?.source_chapter_title_ru)
    || cleanTitle(item.short_title_ru)
    || cleanTitle(item.title_ru);
}

const items = readJson(path.join(normalizedDir, 'azkar.all.json'));
const reviewItems = items
  .filter(item => item.status !== 'verified')
  .sort((a, b) => {
    const aChapter = Number(a.display?.source_chapter_id || 9999);
    const bChapter = Number(b.display?.source_chapter_id || 9999);
    return aChapter - bChapter || Number(a.display?.number || 9999) - Number(b.display?.number || 9999) || a.id.localeCompare(b.id);
  });

const rows = reviewItems.map(item => ({
  id: item.id,
  status: item.status,
  suggested_title_ru: suggestedTitle(item),
  current_title_ru: item.title_ru,
  chapter_id: item.display?.source_chapter_id || '',
  hisnul_number: item.display?.number || '',
  categories: (item.category_ids || []).join(';'),
  collections: (item.collection_ids || []).join(';'),
  repeat: item.repeat || 1,
  source_text: item.source_text,
  source_refs: (item.source_refs || []).map(ref => ref.raw || `${ref.collection || ''} ${ref.reference || ''}`.trim()).filter(Boolean).join('; '),
  audio_status: item.audio?.status || 'missing',
  audio_url: item.audio?.url || '',
  arabic: item.arabic,
  translit_ru: item.translit_ru,
  translation_ru: item.translation_ru,
  review_notes: item.review?.notes || '',
}));

fs.mkdirSync(reportsDir, { recursive: true });
fs.writeFileSync(path.join(reportsDir, 'review-queue.json'), `${JSON.stringify(rows, null, 2)}\n`);

const headers = Object.keys(rows[0] || {
  id: '', status: '', suggested_title_ru: '', current_title_ru: '', chapter_id: '', hisnul_number: '',
  categories: '', collections: '', repeat: '', source_text: '', source_refs: '', audio_status: '', audio_url: '',
  arabic: '', translit_ru: '', translation_ru: '', review_notes: '',
});
const csv = [headers.map(csvCell).join(','), ...rows.map(row => headers.map(key => csvCell(row[key])).join(','))].join('\n');
fs.writeFileSync(path.join(reportsDir, 'review-queue.csv'), `${csv}\n`);

console.log(`Exported ${rows.length} review items to ${path.relative(root, reportsDir)}/review-queue.{json,csv}`);
