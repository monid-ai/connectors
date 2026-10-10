# Proposal: add-connector-refetcher

## Why

Refetcher exposes public social-media data through one authenticated JSON API.
Separate catalog tools make its platform/resource choices discoverable without
requiring callers to learn the unified request router.

## What Changes

- Add `connectors/refetcher` with eleven synchronous tools: Instagram post and
  profile, TikTok video and profile, Facebook post and profile, X post and
  profile, and YouTube video, channel and channel videos.
- Give every tool a distinct logical `endpoint` while sending its request to
  `POST https://api.refetcher.com/`. Authenticate through the existing
  `X-API-Key` header and `REFETCHER_CREDENTIALS_API_KEY` convention.
- Keep one target per run and allow Instagram, TikTok, Facebook and X profile
  requests to specify `pages: 1..25`, defaulting to 1. Locally prepare YouTube
  channel and channel-video requests with optional `pages: 1..25` and optional
  `recentVideosLimit: 1..300`. A page requests up to 12 videos. An explicit
  count takes precedence over pages; with neither input the backend retains
  its 12-video default. Neither input is default-injected by the connector.
  The matching YouTube backend is deployed for all accounts as of
  2026-10-01. The connector update remains local and has not been pushed to
  Monid; these YouTube limits need no Monid-specific account entitlement.
- Declare the published USD rate, $0.0009 per billable unit, through a metered
  model. Profile estimates use requested pages; settlement uses the returned
  data and page counters to reproduce the provider's unit count. Every
  successful profile costs at least one unit, even when recent media is empty
  or not requested. YouTube channel and channel-video estimates use
  `ceil(recentVideosLimit / 12)` when a count is present, otherwise requested
  `pages` or one by default. A channel with `includeRecentVideos: false`
  estimates one regardless of either limit. Their successful settlement uses
  the actual `recentVideos` or `videos` count, respectively, divided by 12 and
  rounded up with a one-unit minimum. Individual post/video tools retain one
  unit per successful result. HTTP errors and failed target results settle at
  zero.
- Reject invalid page counters and any computed profile unit count above the
  requested pages. A request can finish with fewer pages than requested;
  twenty-five pages does not guarantee a complete profile history.
- Require fetched-page evidence for multi-page TikTok when recent media was
  requested or returned. Metadata-only success with `includeRecentPosts`
  omitted or false may omit the counter and costs one unit, even when its
  requested-page estimate is higher.
- Preserve the normalized response envelope, nullable metrics, availability
  markers, pagination details and media links. No output transformation
  substitutes guessed values for unavailable data.
- Add fixture-replay coverage and opt-in live tests gated on credentials and
  explicit target inputs. Four scrubbed recordings cover representative
  authenticated successes; constructed boundary/error fixtures remain labelled
  synthetic. A separate HTTP 401 fixture records an unauthenticated request;
  no key was sent and no paid scrape ran for that fixture.
- Retain the historical qualification of all eleven tools through the compiled
  engine on 2026-09-22: every
  tool completed one HTTP 200 request with a successful target result and
  $0.0009 USD usage. This smoke test covers the selected targets at that time,
  not an SLA or every possible target. Profiles used one page in that run; it
  does not qualify the later pagination update.

## Capabilities

- `refetcher-connector`.

## Non-goals

- Batch targets, more than twenty-five social-profile or YouTube pages,
  YouTube counts above 300, YouTube cursor inputs, connector-managed
  cursor-following and people search. Cross-source YouTube cursors are
  deferred; the upstream handles multiple requested pages within one call.
- Exposing the provider account's balance, account administration or payment
  methods to tool callers.
- Provisioning a Monid supplier account or defining negotiated commercial,
  commission, settlement or payout terms. The public API rate in the connector
  is not an agreement about those matters.
- Copying Refetcher's server or billing implementation, changing its production
  service, or changing Monid's engine/schema contract.

## Sources

Public [API documentation](https://www.refetcher.com/docs) and
[pricing](https://www.refetcher.com/pricing), reviewed 2026-09-22.

## Impact

New connector files and this OpenSpec change. The existing engine's request,
authentication and usage hooks cover the integration; no engine version bump
is required.

## Pagination update status (2026-10-01)

The YouTube backend supports `pages: 1..25` and `recentVideosLimit: 1..300`
for all Refetcher accounts. An explicit count still takes precedence and the
omitted-input default remains twelve videos. Seven production checks passed,
including 300 unique, dated uploads through both API origins and a second
account, plus default, precedence, metadata-only and existing 50-video cases.
The deep checks completed in 3.14–3.90 seconds. The connector update is local
and has not been pushed or posted to Monid. Hosted credentials, activation and
commercial arrangements remain separate maintainer decisions.

Fresh compiled-connector calls to the public API passed both deep cases:
channel `pages: 25` and channel-video count 300 each returned 300 unique videos
in one HTTP 200 request, taking 6.79 and 6.59 seconds. Each estimated and
settled 25 units ($0.0225 USD) in the connector with no contract errors.

September 30 offline verification passed 34 focused tests with zero failures
and one skipped live test; full repository verification passed 1,175 tests
with zero failures and 201 ignored or credential-gated tests. Type checks,
scoped formatting/lint, secret scanning and manual review passed. The fresh
October 1 focused suite repeated 34 passes with zero failures and one gated
live test skipped; repository-wide type checks also passed. Frozen
double-compilation was byte-identical, with catalog SHA-256
`d86031efb3992194bb011401bc76d0dc4df69140ecc573c37a5a4f1517f92105`.
Checks covered the eleven tools, optional page/count inputs without injected
defaults, default twelve-video behavior, count precedence, metadata-only
one-unit estimates and unchanged social-profile bounds.

October 1 public checks through the compiled connector returned all 25 pages
for Instagram (300 posts), X (125 posts) and TikTok (300 posts), using the
supplied account. Both reported Instagram image/carousel URLs passed.
Facebook returned 55 posts/19 pages in 49.54 seconds with an execution-deadline
limitation and a continuation cursor. A separate check fetched 24 pages, then
used the existing `after` input for one more page: 25 pages and 73 unique posts
without overlap across two calls in 63.63 seconds, with 24 plus one units of
connector usage. This qualifies continuation, not full 25-page completion in
one call. Social-profile checks do not establish other accounts' limits.

The backup YouTube scraper remains unqualified for 300 videos because of its
unchanged 25-second timeout and exact-subscriber validation; successful
primary-path checks do not qualify that fallback. YouTube cursor inputs and
cross-source continuation remain deferred. No control result promises complete
history for every target, and connector usage checks do not independently
audit customer-ledger deductions.

Historical checks remain evidence for their original scope: the September 22
compiled-engine smoke run passed all eleven tools at one-page/twelve-upload
limits; the social-page update later passed 1,165 repository tests, and the
count-only YouTube update passed 29 focused tests. Those earlier results do
not replace the current qualification above.
