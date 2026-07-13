#!/usr/bin/env node
console.error([
  'Sahih al-Azkar import requires a concrete edition/source file first.',
  'Place raw material under content/azkar-db/raw/sahih-al-azkar/ and keep output needs_review.',
  'Do not merge into miniapp/data until a reviewer marks items verified.',
].join('\n'));
process.exit(1);
