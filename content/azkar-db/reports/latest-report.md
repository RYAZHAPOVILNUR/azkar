# Azkar DB report

Generated: 2026-07-13T13:42:55.653Z

## Summary

- Items: 331
- Exported to Mini App: 331
- Categories: 14
- Collections: 7
- Items with audio available: 248
- Duplicate candidate groups: 17

## Status

- needs_source_review: 248
- verified: 83

## Categories

- daily: 328
- prayer: 106
- protection: 71
- morning: 46
- evening: 44
- sleep: 34
- quran_dua: 33
- anxiety: 22
- ruqyah: 17
- after_prayer: 15
- food: 14
- travel: 10
- mosque: 5
- home: 3

## Collections

- hisnul-muslim: 257
- current-core: 74
- raslan-morning-evening: 42
- sleep-core: 17
- after-prayer-core: 15

## Audio

- source_url: 248
- missing: 83

## Hisnul Muslim import

- Source chapters: 132
- Source items: 267
- Added to normalized DB: 248
- Skipped as duplicates: 18
- Added to Mini App now: 248
- Waiting for Russian translation/review: 0

## Next review work

- Use `node scripts/azkar/export-review-queue.mjs` to generate `review-queue.csv/json` for the 248 cards that still need source review.
- Manually review `needs_source_review` Hisnul Muslim cards before moving any item to `verified`.
- Keep the PDF-derived `needs_source_review` layer marked as review-needed until source refs/grades are checked item by item.
- Add exact hadith source metadata and copyright status per imported item.
- Keep weak/suspect narrations in `reviewed/excluded.json`, not in the Mini App export.
