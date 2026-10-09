# Tasks: add-connector-transcribe-so

## 1. Decisions (owner, 2026-09-26)

- [x] 1.1 Scoped connector: ONE endpoint, no by-id reads (shared key)
- [x] 1.2 Pool = US dollars; the fold settles — no `charge_usd` claim (D6,
      review 2026-09-26)
- [x] 1.3 Input = monid shape (`url` + `formats`), `source` derived from
      the host; `max_charge_usd` REQUIRED; no `toRequest`
- [x] 1.4 Lifecycle on the provider; polling (no callbacks); no stop
- [x] 1.5 Dedicated `monid@transcribe.so` PAYG account funds the key

## 2. Provider

- [x] 2.1 `provider.ts`: meta + 7 shared notes, bearer auth,
      `baseUrl https://transcribe.so/api/v1`, timeouts (35 s / 6 h / 2 s),
      the shared-key comment block, `lifecycle.start` (flat wire body,
      Idempotency-Key = run id, 409/429/5xx throw, other non-2xx data,
      `quoted` → 502) / `lifecycle.poll` (`/wait?timeout=25&include=chapters`,
      429 → RUNNING with Retry-After, in-flight → RUNNING with stage, failed /
      cancelled / quoted → fixed 502, completed → `Promise.all` artifact
      reads gated by `formats`, 409 reasons, empty text accepted, detected
      language, chapter stripping, no `charge_usd`), dollars pool, NO
      `usage.consolidate` (D6)

## 3. Endpoint (1)

- [x] 3.1 `endpoints/transcriptions/schema/inputs.ts`: `url`,
      `duration_seconds?`, `language?`, `max_charge_usd?`, `formats?` —
      optionality only, `.strict()`, `.describe()` before `.optional()`
- [x] 3.2 `endpoints/transcriptions/endpoint.ts`: `POST /transcriptions`
      (id `transcribe-so#transcriptions`), binding
      `.required({max_charge_usd})` + defaults `language "auto"`,
      `formats ["markdown"]`, leaf `PER_UNIT · MINUTE` at 0.016667,
      estimate = ceil(max_charge_usd / 0.016667), evidence =
      ceil(duration_seconds / 60)

## 4. Fixtures (provider-level shared chains)

- [x] 4.1 `happy.json` (RECORDED 2026-09-26, all formats: 202 → timed-out
      wait → completed wait with chapters → transcript md in the export's
      Table-of-Contents layout → srt → vtt; serves the happy path and the
      formats-gating slices),
      `synthetic-insufficient-funds` (402), `synthetic-failed` (failed row
      with internal error text), `synthetic-poll-rate-limited` (429 +
      Retry-After 7 on the read), `synthetic-create-conflict` (409 +
      Retry-After 1 on the create, then the replayed 202)

## 5. Tests

- [x] 5.1 `lifecycle.test.ts`: happy (usage deep-equals the fold
      `{default: 0.033334}` / `{MINUTE: 2}` with no mismatch, attempts 2,
      output keys, detected language, chapters stripped, no id in the
      output), 402 pass-through zero usage, failed → 502 with fixed strings,
      429 poll → RUNNING pollAfterMs 7000 then settle, 409 create → throw
      then the retry converges, provenance (start/poll on the provider, no
      consolidate, no stop, timeouts, model, category), live test gated on
      `TRANSCRIBE_SO_API_KEY` asserting shapes, not amounts
- [x] 5.2 `endpoint.test.ts`: estimate purity + values (6 / 60 / exact
      multiple / duration advisory), 13 INVALID_INPUT gates + 5 accepted
      shapes, formats gating (all three / srt only / markdown only)
- [x] 5.3 Verify: fmt · lint · check · test · ids:check
- [x] 5.4 Record the real happy chain against
      `https://transcribe.so/test-90s.m4a` (`source external_url`,
      `duration_seconds 90`, `max_charge_usd 0.1`) with the monid@ key,
      hand-minimize into `fixtures/`, replace `synthetic-happy.json`,
      re-run tests, confirm size < 32 KiB and `rg tsk_live` is empty

## 6. Follow-ups (not in this change)

- [ ] 6.1 transcribe.so: per-key rate-limit override for the monid key
- [ ] 6.2 Ask monid for the hosted output-size cap (a long recording's
      markdown runs to hundreds of KB)
