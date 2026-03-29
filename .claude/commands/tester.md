# /tester – Olam Katan Test Suite

Run the full Olam Katan test suite against the **sandbox** environment (no Supabase, isolated jsdom localStorage). Production data is never read or written.

## What to do

1. Run `npm test` in the project root (`C:\Users\ilanb\.cursor\projects\olam-katan`).
2. Report the results: total tests, passed, failed, skipped.
3. If any tests fail, show the failing test names and error messages grouped by file.
4. If all tests pass, confirm the sandbox ran successfully (no Supabase connection, no production data affected).

## Sandbox guarantee

- `VITE_SUPABASE_URL` and `VITE_SUPABASE_ANON_KEY` are empty in `vitest.config.js` → Supabase is disabled.
- `src/utils/supabase` is mocked via `src/tests/setup.js` → `isSupabaseEnabled()` always returns `false`.
- jsdom `localStorage` is cleared before every test → no cross-test or cross-run contamination.
- No production data is read, written, or mutated.

## Test coverage

| File | Area |
|------|------|
| `src/tests/adviceEngine.test.js` | Rule-based advice engine – upcoming events, parent promises, staff gifts, incidents, sorting, deduplication |
| `src/tests/storage.test.js` | Storage layer – advisor config defaults & persistence, cache getters, save/load round-trips |
| `src/tests/businessLogic.test.js` | Pure business logic – work hours parsing, decimal↔time conversion, date parsing, age/group calculation, config defaults |
| `src/tests/dataModels.test.js` | Data model structure validation – children, employees, age groups, events, schedule |
