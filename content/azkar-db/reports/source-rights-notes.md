# Source and rights notes for Azkar DB

Generated: 2026-07-13

## What can be confirmed now

- The current imported Hisnul Muslim layer has 248 items.
- `scripts/azkar/audit-hisnul-import.mjs` mechanically checks every imported item against `content/azkar-db/raw/hisnul-muslim/husn_en.json`.
- The automated audit confirms:
  - raw item exists for every imported Hisnul item;
  - Arabic text in normalized DB matches the raw Hisnul source after normalization;
  - Russian translation field is present for every item;
  - source reference field is present for every item;
  - audio URL is reachable for every item.

This is enough to say: **the import is mechanically consistent with our raw files**.

This is not enough to say: **the hadith grading, Russian translation rights, and final religious review are fully verified**.

## External source findings

### IslamHouse Russian Hisnul Muslim page

URL: https://islamhouse.com/en/books/888254/

Observed:

- The page identifies the material as `Fortification of the Muslim through Remembrance and Supplication from the Quran and Sunnah`.
- Authors are listed as Saeed Bin Ali Bin Wahf Al-Qahtani and Abu AbdulRahman Al-Dagestani.
- Reviewing is listed as Abu AbdulRahman Al-Dagestani.
- The description says the Russian book contains simple authentic supplications based on Quranic and Prophetic texts.
- The page provides PDF/DOCX downloads.

Use in project:

- Good public reference for Russian Hisnul Muslim material.
- Does not by itself complete item-by-item hadith grading review inside our app.
- Copyright/license terms still need explicit confirmation if we want to mark Russian translation rights as fully cleared.

### IslamHouse multilingual Hisnul Muslim page

URL: https://islamhouse.com/en/books/2819940/

Observed:

- The page identifies the author as Saeed Bin Ali Bin Wahf Al-Qahtani.
- Publisher is listed as Islamic Propagation Office in Rabwah.
- The page has downloads and lists many translations.

Use in project:

- Good source for confirming the broad corpus and publication context.
- Not enough alone for item-by-item Russian translation rights.

### AbdurRahman.Org Hisn Al Muslim page

URL: https://abdurrahman.org/hisn-al-muslim/

Observed:

- The page describes Hisn Al Muslim as `Authentic Supplications from Qur’an and Sunnah`.
- It links a Word/PDF version and audio download of all duas in Arabic.
- It provides an alphabetical index by topics.

Use in project:

- Useful benchmark and cross-reference for English/Arabic structure and audio availability.
- Not a Russian rights source.

### Ahadith.co.uk Fortress of the Muslim page

URL: https://ahadith.co.uk/fortressofthemuslim.php

Observed:

- Site footer says `Hadith © No Copyright 2010 - 2026`.

Use in project:

- Potentially useful open reference for hadith/English Fortress data.
- Needs separate comparison before replacing or supplementing Russian material.

## Policy for `verified`

Only mark an item as `verified` when all of these are true:

1. Arabic text matches a known source/edition.
2. Russian translation has been reviewed or is our own reviewed translation.
3. Hadith/source reference is explicit enough for the item.
4. Grade is known where relevant.
5. Copyright/permission status is acceptable for publication.
6. A human reviewer has accepted the item.

If only the automated audit passes, use:

```txt
machine_matched_raw_not_scholarly_verified
```

That means the item is technically consistent, but not yet final religious verification.
