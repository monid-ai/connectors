# refetcher-connector (delta)

## ADDED Requirements

### Requirement: Eleven logical tools share the upstream API

The provider SHALL declare `refetcher` and API-key header authentication.
The catalog SHALL contain exactly these endpoint identities:

- `refetcher#instagram/post`
- `refetcher#instagram/profile`
- `refetcher#tiktok/video`
- `refetcher#tiktok/profile`
- `refetcher#facebook/post`
- `refetcher#facebook/profile`
- `refetcher#x/post`
- `refetcher#x/profile`
- `refetcher#youtube/video`
- `refetcher#youtube/channel`
- `refetcher#youtube/channel-videos`

The logical paths SHALL be declared explicitly; each compiled request SHALL
target `POST https://api.refetcher.com/`. Credentials SHALL be obtained through
the standard `REFETCHER_CREDENTIALS_API_KEY` environment convention, with the
existing `REFETCHER_API_KEY` compatibility alias, and injected as `X-API-Key`.

#### Scenario: Tool identity is separate from transport routing

- **WHEN** the eleven endpoint documents are compiled
- **THEN** their ids are distinct and all eleven use the same upstream POST URL
- **AND** no API-key value appears in a document or committed fixture

### Requirement: Every run has one target and bounded profile pages

Post/video tools SHALL accept one `url`, social profile tools one `username`,
and YouTube channel tools one `channelUrl`. Their bindings SHALL supply the
correct platform/resource discriminators and reject alternate target arrays.
Instagram, TikTok, Facebook and X profile bindings SHALL accept an integer
`pages` from 1 through 25 and default it to 1. Both YouTube channel tools SHALL
accept optional integer `pages` from 1 through 25 and optional integer
`recentVideosLimit` from 1 through 300. Each YouTube page SHALL request up to
twelve videos. An explicit count SHALL take precedence over pages. The
connector SHALL NOT inject either limit when absent; omitting both SHALL
retain the upstream twelve-video default. The maximum SHALL represent 25
billing pages of twelve videos.

The connector SHALL send one request per run; the upstream API SHALL handle
the requested social-profile or YouTube pagination. The connector SHALL NOT
follow returned cursors with additional requests. YouTube cursor inputs and
cross-source continuation are deferred and SHALL NOT be exposed by this
update; they are not required for multiple pages within one request.

YouTube rollout note (2026-10-01): the expanded backend is deployed for all
accounts, while the connector update remains local and has not been pushed or
posted to Monid. Seven production checks passed, including 300 unique videos
through both API origins and a second account, plus the twelve-video default,
explicit-count precedence, metadata-only requests and an existing 50-video
request. The deep checks completed in 3.14–3.90 seconds. Fresh compiled
connector calls to the public API also passed both channel tools at 300
unique videos each, in one HTTP 200 request per tool with no contract errors.
Estimates and connector usage were 25 units ($0.0225 USD) each. These checks
qualify the tested primary path; they SHALL NOT be represented as successful
300-video failover. The backup scraper remains unqualified at its unchanged
25-second timeout and exact-subscriber gate.

Current qualification note (2026-10-01): public calls through the compiled
connector returned all 25 pages for Instagram (300 posts), X (125 posts) and
TikTok (300 posts). Both originally reported Instagram image/carousel URLs
passed. Facebook returned 55 posts/19 pages in 49.54 seconds, incomplete at its
execution deadline with a continuation cursor. A separate two-call check
completed 24 plus one pages through the existing `after` input: 73 unique posts
without overlap, 63.63 seconds and 25 units. This qualifies continuation to 25
pages, not completion in one call. Accepted page limits SHALL NOT imply
guaranteed complete history.
Connector usage validation SHALL NOT be described as a customer-ledger audit.

The expanded YouTube page/count limits SHALL be available to all Refetcher
accounts without a Monid-specific entitlement. Social-profile qualification
used the supplied account; these controls SHALL NOT be represented as proof
of every account's social-profile limits. Hosted credentials, activation and
commercial arrangements SHALL remain separate from connector correctness.

#### Scenario: A profile request remains bounded

- **WHEN** a caller requests recent posts from a social profile with `pages: 25`
- **THEN** the upstream body identifies one platform and username and 25 pages
- **AND** page values of 0, 26 or a fraction fail validation before transport

#### Scenario: Omitted profile pages keep the existing default

- **WHEN** a caller omits `pages` from a social profile request
- **THEN** the validated input and upstream request use one page

#### Scenario: YouTube uploads retain their default without injecting a count

- **WHEN** a caller omits both `recentVideosLimit` and `pages` from either
  YouTube channel tool
- **THEN** both inputs remain absent from the upstream request, the upstream
  default is twelve videos and the estimate is one unit

#### Scenario: YouTube accepts bounded pages or video counts

- **WHEN** a caller supplies `pages: 25` or `recentVideosLimit: 300` to either
  YouTube channel tool and requests uploads
- **THEN** the selected input is forwarded unchanged, the request represents up
  to 300 videos and the estimate is 25 units
- **AND** page values of 0, 26 or a fraction and counts of 0, 301 or a fraction
  fail validation before transport

#### Scenario: Explicit YouTube video counts take precedence over pages

- **WHEN** a caller supplies `pages: 25` and `recentVideosLimit: 24` to either
  YouTube channel tool and requests uploads
- **THEN** both inputs are forwarded unchanged, the upstream uses the explicit
  24-video count and the estimate is two units

#### Scenario: Deferred YouTube cursor inputs are not exposed

- **WHEN** a caller supplies `cursor` or `includePagination` to either YouTube
  channel tool
- **THEN** strict input validation rejects the unsupported field before
  transport

#### Scenario: A batch cannot bypass the estimate

- **WHEN** a caller supplies `urls`, `usernames`, `profileUrls` or `channelUrls`
- **THEN** the input is rejected before transport

### Requirement: Estimate requested profile pages and settle actual units

The provider SHALL declare a USD credit pool and a `PER_UNIT` result model
consuming 0.0009 USD per successful unit. Social profile pre-run estimates SHALL
use the validated `pages` value, including when recent posts are not requested.
Individual post/video tools SHALL retain a one-unit estimate and a one-unit
charge for a successful result. YouTube channel and channel-video estimates
SHALL use `ceil(recentVideosLimit / 12)` when an explicit count is present,
otherwise the requested `pages`, or one unit when neither input is supplied.
A channel request with `includeRecentVideos: false` SHALL estimate one unit
regardless of either limit. Successful YouTube channel
settlement SHALL use the actual `recentVideos` array length; channel-video
settlement SHALL use the actual `videos` array length without also counting
the duplicate `results` array. The count SHALL be divided by 12 and rounded up,
with a minimum of one successful unit, including empty arrays or metadata-only
responses. Missing arrays SHALL contribute zero delivered videos. Failed
YouTube target results SHALL settle zero units. Settlement SHALL inspect the
raw response before
presentation and SHALL NOT use an unconditional `PER_CALL` charge.

For a successful profile, let the delivered count be the largest length among
its `recentPosts`, `recentVideos` and `postLinks` arrays; absent arrays
contribute zero. Instagram units SHALL be this count divided by 12 and rounded
up. X units SHALL use the same calculation with a divisor of 5. Facebook SHALL
use positive `pageInfo.recentPosts.pagesFetched` when present; when that counter
is absent, null or zero, it SHALL use the delivered count divided by 12 and
rounded up. TikTok SHALL use `pageInfo.recentPosts.pagesFetched` and SHALL
require a numeric counter for multi-page requests when `includeRecentPosts`
is true or the delivered count is positive. A missing or null TikTok counter
MAY use a one-unit fallback for a valid one-page request or for metadata-only
success when `includeRecentPosts` is omitted or false. That metadata-only
exception SHALL apply even when `pages` is greater than one. A zero TikTok
counter SHALL be accepted only when no recent media was delivered, for one
unit. Every successful profile SHALL have a minimum
charge of one unit, including metadata-only results and empty recent-media
arrays. Positive Facebook/TikTok counters SHALL remain billable even when
recent-post arrays are empty. A successful result marked `incomplete: true`
SHALL still bill its actual units. A non-null Facebook/TikTok fetched-page
counter SHALL be a non-negative integer;
invalid counters and computed units above requested pages SHALL produce a
contract error with no settled usage.

Well-formed failed result objects and non-2xx responses SHALL contribute no
billable units. A missing or non-singleton `results` array, or
non-boolean result `success`, SHALL produce a contract error with no settled
usage; it SHALL NOT be silently treated as a valid zero-cost result.

#### Scenario: Successful individual post or video

- **WHEN** an individual post/video tool returns an HTTP 200 envelope containing its one
  successful target result
- **THEN** the run settles 0.0009 USD

#### Scenario: YouTube charges actual delivered videos

- **WHEN** either YouTube channel tool requests `pages: 25` or
  `recentVideosLimit: 300` and returns 13 videos in its metered array
- **THEN** the estimate is 25 units and successful settlement is two units
- **AND** an empty successful array settles one unit, while a failed target
  settles zero

#### Scenario: YouTube metadata-only channel costs one unit

- **WHEN** a channel request specifies `pages: 25` or `recentVideosLimit: 300`,
  sets `includeRecentVideos: false` and succeeds without recent videos
- **THEN** its estimate and settlement are one unit

#### Scenario: Requested pages are the estimate, not an automatic charge

- **WHEN** an Instagram profile requests 25 pages and returns 13 posts with
  no longer `recentVideos` or `postLinks` array
- **THEN** the estimate is 25 units and settlement is two units
- **AND** its charge is 0.0018 USD

#### Scenario: Alternative arrays do not double-count delivered media

- **WHEN** an X profile requested three pages and returns six recent posts and
  five recent videos
- **THEN** the delivered count is six and settlement is two units

#### Scenario: Facebook and TikTok use positive fetched-page counters

- **WHEN** a Facebook or TikTok profile requests three pages and reports
  `pageInfo.recentPosts.pagesFetched: 2`
- **THEN** settlement is two units even if a returned page has few posts

#### Scenario: Facebook's compatibility fallback handles absent or zero counters

- **WHEN** a Facebook profile requests three pages, has a missing, null or zero
  fetched-page counter, and its largest delivered array has 13 entries
- **THEN** settlement is two units

#### Scenario: Multi-page TikTok recent-media requests require page evidence

- **WHEN** a TikTok request asks for more than one page, recent media is
  requested or returned, and the fetched-page counter is missing or null
- **THEN** usage evidence fails with a contract error and no usage is settled
- **AND** the connector does not guess a charge from delivered-array lengths

#### Scenario: Metadata-only TikTok can omit page evidence

- **WHEN** a TikTok request asks for 25 pages with `includeRecentPosts` omitted
  or false and succeeds with no delivered recent media and a missing or null
  fetched-page counter
- **THEN** the estimate is 25 units and settlement is one unit

#### Scenario: A zero TikTok counter must agree with empty recent media

- **WHEN** a successful TikTok profile reports zero fetched pages and no recent
  media
- **THEN** settlement is the one-unit minimum
- **AND** the same zero counter with delivered recent media is a contract error

#### Scenario: A legacy single-page TikTok result can omit the counter

- **WHEN** a successful one-page TikTok profile has no fetched-page counter
- **THEN** settlement is one unit

#### Scenario: Successful incomplete results retain their charge

- **WHEN** a successful Facebook or TikTok profile requested three pages and
  reports two fetched pages, empty recent posts and `incomplete: true`
- **THEN** settlement is two units

#### Scenario: Successful metadata and empty recent-media results are charged

- **WHEN** a valid profile result succeeds with no returned recent media and no
  positive fetched-page counter, whether or not `includeRecentPosts` was
  requested
- **THEN** settlement is one unit, not zero
- **AND** the TikTok counter requirements still apply

#### Scenario: Invalid counters and excessive units fail closed

- **WHEN** a fetched-page counter is negative, fractional or non-numeric, or
  the computed units exceed the requested pages
- **THEN** usage evidence fails with a contract error and no usage is settled

#### Scenario: In-body target failure

- **WHEN** the API answers HTTP 200 with a target result whose `success` is false
- **THEN** the run settles zero USD

#### Scenario: HTTP provider error

- **WHEN** the upstream response status is 401, 402, 429 or 500
- **THEN** the engine reports a provider error with zero usage

#### Scenario: Malformed success envelope

- **WHEN** an HTTP 200 body lacks exactly one result with a boolean `success`
- **THEN** usage evidence fails with a contract error and no usage is settled

### Requirement: Output preserves the vendor's normalized data

The connector SHALL retain the response envelope and result metadata. It SHALL
preserve null metrics, availability states and returned pagination information
without treating missing public fields as zero. Documentation SHALL disclose
that returned CDN media URLs may expire. Requested profile history MAY end
early, and even 25 requested pages SHALL NOT be described as a guarantee of
complete history or a response-time SLA.

#### Scenario: Unavailable metrics and expiring media

- **WHEN** a successful result includes null metrics, availability markers and
  CDN links
- **THEN** these values remain unchanged in the caller's output

### Requirement: Test provenance and credential gating are explicit

Constructed fixtures SHALL have `synthetic-` names and descriptions disclosing
their provenance. Authenticated recordings SHALL be scrubbed before inclusion
and identified as recorded responses; four representative
`recorded-*-success.json` fixtures cover post, profile, channel and channel-video
response shapes. The separately recorded `unauthorized.json` fixture SHALL
identify the real unauthenticated HTTP 401 request. Fixtures SHALL contain no
API keys or private provider-account information.
Offline tests SHALL execute sealed compiled endpoints without network access.
Live tests SHALL require both a credential through the standard environment
convention and `REFETCHER_LIVE_INPUTS`, a JSON map of logical endpoint paths to
native request bodies; they SHALL skip if either is absent. Neither synthetic
fixtures nor the recorded authentication error SHALL be represented as proof
of successful live scraping.

#### Scenario: No API credential in CI

- **WHEN** the suite runs without a Refetcher API key or `REFETCHER_LIVE_INPUTS`
- **THEN** fixture-replay tests can run and live tests are skipped

#### Scenario: Recorded success coverage has a bounded validation claim

- **WHEN** the eleven tools are qualified through the compiled engine with
  one explicit public target per tool
- **THEN** validation reports each response status, result success and settled
  usage without retaining credentials
- **AND** the successful 2026-09-22 smoke run establishes those eleven cases
  at that time with the earlier one-page connector, not validation of the later
  pagination update, an SLA or universal target availability

### Requirement: Supplier operations remain outside the public tool catalog

The connector SHALL NOT expose account balance, billing administration,
payments, account provisioning or people search. It SHALL NOT embed
Refetcher's server implementation. The declared public rate SHALL NOT be
represented as a negotiated Monid supplier settlement or payout agreement.

#### Scenario: Catalog coverage is limited to public social-data tools

- **WHEN** the Refetcher catalog is inspected
- **THEN** it contains the eleven social tools and no supplier-account tool
