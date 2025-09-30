# MedX I18n Style Policy

This document captures the locale style policy used across the MedX interface so strings remain consistent across surfaces.

## Locale naming

- Use autonyms for every locale.
- Display names follow `{language} ({region})` and should be rendered with local scripts (e.g. `हिन्दी (भारत)`, `Español (México)`, `العربية (مصر)`, `中文（中国）`).
- Locale chips and menus should prefer the locale label from `useLocale()` rather than raw country codes.

## Mode labels

- **Hindi and related Indic locales (hi, bn, ur):** use Hinglish transliterations such as “वेलनेस”, “थेरेपी”, “रिसर्च”, “क्लिनिकल”, “एआई डॉक”.
- **Arabic:** use native Arabic terms (e.g. `العافية`, `العلاج`).
- **Romance / Latin locales (es, fr, it):** translate modes into the local language (e.g. `Bienestar`, `Recherche`).
- **English:** keep title case labels (`Wellness`, `Therapy`, `Research`, `Clinical`, `AI Doc`).

## Composer UI

- Button labels and tooltips should reuse the `ui.composer.*` keys.
- Aria labels mirror the visible text for consistency.

## Therapy copy

- Therapy banner copy comes from `therapy.banner.*` keys to keep grammar localized.
- Auto greetings use `system.autoGreeting.*`. Do not inline copy inside components.

## Threads

- System generated titles use `threads.systemTitles.*`. User-supplied titles must never be altered.

## Numerals and direction

- Default to Latin numerals for structural UI (IDs, codes). Number formatters may request locale digits later.
- Use `useT().dir` or `useLocale().dir` when adjusting directional styles; Arabic is RTL, others are LTR.

## Accessibility strings

- aria-label, aria-describedby, and tooltip strings must be translatable through the existing dictionaries.

Following this policy keeps the UI predictable across tabs, modals, and banners regardless of the active locale.
