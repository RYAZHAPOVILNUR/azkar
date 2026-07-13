#!/usr/bin/env node
console.error([
  'HadeethEnc import is intentionally not automatic yet.',
  'Use it for source verification and metadata, not blind publishing.',
  'Every imported hadith dua must enter as needs_source_review or needs_review.',
].join('\n'));
process.exit(1);
