# Famille integration verification — 2026-11-12

All targeted tests passed in this checkout against `http://127.0.0.1:8873`.

| Coverage | Passed |
| --- | ---: |
| Native Famille `.mjs` | 197 |
| E06 identity and E09 memo writer | 7 |
| Sync v1/v2 native | 21 |
| Native member-policy Chromium tests | 2 |
| Total Node test cases | 227 |
| Targeted browser scripts | 6 |
| Browser viewport runs | 14 |
| Effects view runs (13 views × 3 widths) | 39 |

The six browser scripts are `fam-detail.cjs`, `fam-members.cjs`, `fam-agenda-memos.cjs`, `fam-agenda-memos-sync.cjs`, `fam-agenda-month.cjs`, and `family-review-effects.cjs`. Detail, members, agenda/memos and effects passed at 320/390/1440 px; memo synchronization and month navigation passed at 390 px.

Detail tests passed real native member writes, Salon/Carnet return paths, confirmed and empty magic profiles, conflict-draft retention, and spouse/child write denial. Member tests passed integrated list navigation, category/identity forms, preserved historical dates and names, invitation dependency blocks, and disabled unauthorized forms. Agenda/memo tests passed CRUD, stable identifiers/provenance, stale drafts, explicit idempotent import, and retained legacy private notes. Month navigation passed leap years, end-of-month clamping, and year boundaries. Effects passed ON/OFF painted differences, shared OFF persistence, reduced motion, duplicate mount protection, visibility pausing, and unchanged business data.

Memo synchronization used two isolated browser profiles and an intercepted HTTP fixture: six fixture writes, final revision 6, offline reload/reconnect, and no page errors. Other browser contexts aborted nonlocal requests. No real backend, SQL, remote CI, or publication was exercised.

No regression or unexpected permission failure was observed. The native member-policy command initially used its default port 8893 and failed before loading assets; the explicit 8873 rerun passed. That setup log is retained separately.

Test infrastructure changes are limited to `DOBBY_FAM_EVIDENCE` output overrides in five scripts, `DOBBY_TEST_ORIGIN` in `fam-detail.cjs`, and `CHROMIUM_PATH` in detail/sync. Prior `fam01-24` evidence was preserved. No assertion or product logic was changed.

See [results.json](results.json) for exact browser commands and counts, [native-suite-results.json](logs/native-suite-results.json) for native commands, and [sync-v1-v2-native-results.json](logs/sync-v1-v2-native-results.json) for the additional Sync commands.
