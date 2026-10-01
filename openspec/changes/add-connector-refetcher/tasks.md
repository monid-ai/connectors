# Tasks: add-connector-refetcher

## 1. Provider and endpoints

- [x] 1.1 Add provider metadata, API-key authentication and the USD rate card.
- [x] 1.2 Add the eleven discoverable tools with unique logical endpoint paths
      and the shared upstream POST route.
- [x] 1.3 Extend the four social profile bindings to `pages: 1..25`, default 1;
      keep one target per call.
- [x] 1.4 Estimate requested profile pages and settle actual successful units:
      delivered-array counts for Instagram/X, fetched-page counters for
      Facebook/TikTok, Facebook's compatibility fallback, TikTok's required
      counter for multi-page recent-media requests/results, and a minimum of
      one unit for every successful profile. Metadata-only TikTok success with
      `includeRecentPosts` omitted or false can omit the counter. Failed
      targets and HTTP errors remain zero.
- [x] 1.5 Preserve the response envelope and nullable platform-specific fields.
- [x] 1.6 Complete the locally prepared YouTube channel/channel-video bindings
      for optional `recentVideosLimit: 1..300` and optional `pages: 1..25`.
      Explicit counts take precedence; a page requests twelve videos, and
      omitting both inputs retains the backend's twelve-video default without
      injecting either input. Estimate `ceil(count / 12)` when a count is
      present, otherwise pages or one by default. Metadata-only channels
      estimate one; settle actual `recentVideos`/`videos` lengths divided by
      12 and rounded up, minimum one on success and zero on failure.

## 2. Offline verification

- [x] 2.1 Add minimal shared `synthetic-*` fixtures whose descriptions state
      their synthetic provenance, four scrubbed recorded success fixtures and
      a real unauthenticated HTTP 401 fixture recorded without a key or paid
      scrape.
- [x] 2.2 Exercise each sealed endpoint's request shaping, response and rate.
- [x] 2.3 Extend coverage to profile page bounds/defaults, partial delivery,
      metadata-only and empty successful profiles, counter validation and
      units exceeding the requested pages. Retain HTTP/in-body failures and
      malformed-envelope checks.
- [x] 2.4 Verify that balance, provisioning and people-search tools are absent.
- [x] 2.5 Repeat final formatting, lint, type checks, replay tests,
      deterministic double-compilation and catalog inspection for the profile
      pagination update. Type checks, formatting/lint and 24 focused tests
      passed. The full suite passed 1,165 tests with zero failures and 201
      skipped tests. Both compilations match; all eleven tools are present
      with the four profile page ranges at 1–25. Manually inspect the
      uncommitted diff for engine-contract changes: none found. The version
      script itself does not inspect uncommitted changes.
- [x] 2.6 Verify the earlier count-only YouTube expansion separately: count
      bounds and defaults, the then unsupported `pages` input, 25-unit
      maximum estimates,
      partial/empty delivery, metadata-only channels, zero-cost failures and
      unchanged individual-video billing. The verification in 2.5 predates
      this expansion. The expanded focused suite passed 29 tests with zero
      failures and one skipped live test; type checks, formatting and lint
      passed. Frozen double-compilation was byte-identical, with both
      1–300 schemas/default 12 and 25-unit estimates at 300 uploads verified
      from the compiled catalog. All eleven tools and social-profile bounds
      were preserved. These results predate the page-input update below.
- [x] 2.7 Verify both optional YouTube limit inputs through compiled endpoints:
      page bounds 1–25, count bounds 1–300, no injected defaults, default
      twelve-video behavior when both are absent, count precedence when both
      are present, metadata-only estimates, delivered-video settlement and
      rejection of deferred YouTube cursor inputs. Repeat type checks,
      formatting, lint and deterministic compilation for this update. The
      focused suite passed 34 tests with zero failures and one skipped live
      test. Repository-wide type checks and scoped formatting/lint passed.
      Both frozen compilations were byte-identical; compiled-catalog checks
      confirmed eleven tools, all described YouTube input/estimate behavior
      and unchanged social-profile bounds. The current full repository suite
      passed 1,175 tests with zero failures and 201 ignored or
      credential-gated tests in 6 minutes 25 seconds.

## 3. Documentation and review

- [x] 3.1 Add the connector README and OpenSpec proposal/specification.
- [x] 3.2 Verify automatic catalog discovery of all eleven tools through
      compilation tests; no manual root catalog table is required.
- [x] 3.3 Review the pagination diff for secrets and implementation details
      outside the public API contract; secret-pattern scan clear.

## 4. Live qualification and activation

- [x] 4.1 Qualify all eleven tools through the compiled engine with explicit
      public target inputs and an environment-supplied API key; keep the key
      out of files and test output. All eleven passed on 2026-09-22 with the
      earlier one-page connector; this is historical qualification only.
- [x] 4.2 Record and scrub four representative authenticated success responses,
      retaining synthetic boundary/error cases and the recorded HTTP 401.
- [ ] 4.3 Have maintainers confirm hosted credentials, activation and the
      commercial arrangement separately from connector correctness.
- [x] 4.4 Verify the backend Instagram cap increase to 300 with a direct
      public-API control: 300 posts, 25 fetched pages and no incomplete flag
      on 2026-09-30. This is not Monid compiled-connector qualification.
- [x] 4.5 Run expanded-profile live checks through the compiled connector on
      2026-10-01. Instagram, X and TikTok returned all 25 pages; both reported
      Instagram image/carousel URLs passed. Facebook returned 19 of 25 pages
      with an execution-deadline limitation and cursor. A separate two-call
      check used the existing `after` input to complete 24 plus one pages:
      73 unique posts, no overlap, 63.63 seconds and 25 units. Full 25-page
      Facebook delivery in a single call remains unqualified.
- [x] 4.6 Deploy and qualify the YouTube backend expansion on 2026-10-01.
      Seven production checks passed, including 300 unique videos through
      both API origins and a second account, the twelve-video default,
      explicit-count precedence, metadata-only requests and existing count
      50. The deep checks completed in 3.14–3.90 seconds. The connector update
      remains local and has not been pushed or posted to Monid.
- [x] 4.7 Qualify the compiled connector against the prepared local YouTube
      dispatcher and live Google API: both tools returned 300 unique videos
      with 25-unit estimates and usage on 2026-10-01. This does not qualify
      the deployed backend or the backup scraper.
- [x] 4.8 Confirm the YouTube expansion applies to all accounts, with no
      Monid-specific entitlement required. A second-account public request
      returned 300 unique videos for `pages: 25`. Social-profile checks used
      the supplied account and do not establish every account's limits.
- [x] 4.9 Qualify both expanded YouTube tools through the compiled connector
      and public API on 2026-10-01: channel `pages: 25` returned 300 unique
      videos in 6.79 seconds; channel-video count 300 returned 300 unique
      videos in 6.59 seconds. Each made one HTTP 200 request without contract
      errors and estimated and settled 25 units ($0.0225 USD). These checks
      validate connector usage, not customer-ledger deductions.

## 5. Current status (2026-10-01)

The YouTube backend expansion is deployed for all accounts. Both channel tools
accept optional `pages: 1..25` or `recentVideosLimit: 1..300`. A page requests
twelve videos; an explicit count takes precedence, and omitting both preserves
the twelve-video default. Seven production checks passed, including both API
origins and a second account returning 300 unique, dated videos. The connector
update remains local and has not been pushed or posted to Monid. Maintainer
confirmation of hosted credentials, activation and commercial terms is still
pending. Both expanded YouTube tools also passed through the compiled
connector against the public API: 300 unique videos each, one HTTP 200 request,
6.79 and 6.59 seconds, and 25-unit estimates and usage ($0.0225 USD) per call.

Current offline evidence: 34 focused tests passed with zero failures and one
skipped live test; September 30 full repository verification passed 1,175 tests
with zero failures and 201 ignored or credential-gated tests. Fresh compilation
matches that fully tested catalog byte for byte. Repository-wide type
checks, scoped formatting/lint, secret scanning and manual review passed.
Frozen double-compilation was byte-identical, with catalog SHA-256
`d86031efb3992194bb011401bc76d0dc4df69140ecc573c37a5a4f1517f92105`.
The catalog verified eleven tools, optional page/count bounds without
injected defaults, the twelve-video fallback, count precedence, metadata-only
one-unit estimates, absent deferred cursor inputs and unchanged social-profile
bounds. Fresh October 1 focused verification repeated 34 passes with zero
failures and one gated live test skipped; repository-wide type checks also
passed.

Public compiled-connector checks on October 1 returned 300 Instagram posts/25
pages in 16.13 seconds, 125 X posts/25 pages in 6.21 seconds, and 300 TikTok
posts/25 pages in 51.64 seconds, all complete. Both reported Instagram
image/carousel URLs passed. Facebook returned 55 posts/19 pages in 49.54
seconds, marked incomplete at its execution deadline, with a continuation
cursor and 19 units. A separate check returned 24 pages/70 posts in 48.78
seconds, then one page/three new posts through `after` in 14.85 seconds:
25 pages, 73 unique posts without overlap, 63.63 seconds and 25 units in total.
Full 25-page Facebook completion in one call remains unqualified.

The backup YouTube scraper remains unqualified for 300 videos: its previous
87.10-second retrieval exceeded the unchanged 25-second dispatcher timeout,
and the tested compact subscriber count failed exact-subscriber validation.
Successful production checks qualify the primary path only. YouTube cursor
inputs and cross-source continuation are deferred. Connector usage checks are
not customer-ledger audits, and no result promises complete history or fixed
latency for every target. Social-profile checks establish the supplied
account's behavior without making a blanket claim about other account limits.

Historical evidence: the September 22 live smoke test passed all eleven tools
through the compiled engine at one-page/twelve-upload bounds, with one HTTP
200 request and $0.0009 USD usage per successful tool run. The run took about
47 seconds. The later social-page update passed 1,165 repository tests, and
the count-only YouTube update passed 29 focused tests. These earlier results
are superseded for current inputs by the verification above and remain
bounded to their original scope.
