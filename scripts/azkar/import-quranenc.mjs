#!/usr/bin/env node
console.error([
  'QuranEnc import is intentionally not automatic yet.',
  'Add a reviewed source file under content/azkar-db/raw/quranenc/ and map only exact ayah references.',
  'Every imported translation must keep attribution and status needs_translation_review until checked.',
].join('\n'));
process.exit(1);
