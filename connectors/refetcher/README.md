# Refetcher

Eleven tools call Refetcher's existing social-data API. Their catalog paths are
logical tool identities; every request goes to
`POST https://api.refetcher.com/`.

| Endpoint id                        | Target       | Resource                    |
| ---------------------------------- | ------------ | --------------------------- |
| `refetcher#instagram/post`         | `url`        | Post or Reel                |
| `refetcher#instagram/profile`      | `username`   | Profile                     |
| `refetcher#tiktok/video`           | `url`        | Video                       |
| `refetcher#tiktok/profile`         | `username`   | Profile                     |
| `refetcher#facebook/post`          | `url`        | Post or Reel                |
| `refetcher#facebook/profile`       | `username`   | Profile                     |
| `refetcher#x/post`                 | `url`        | Post                        |
| `refetcher#x/profile`              | `username`   | Profile                     |
| `refetcher#youtube/video`          | `url`        | Video or Short              |
| `refetcher#youtube/channel`        | `channelUrl` | Channel metadata            |
| `refetcher#youtube/channel-videos` | `channelUrl` | Recent uploads with metrics |

## Credentials and execution

Provide an existing Refetcher API key through `REFETCHER_CREDENTIALS_API_KEY`.
The engine injects it as `X-API-Key`. `REFETCHER_API_KEY` is the standard legacy
alias; the canonical variable takes precedence. Keep keys out of source,
fixtures and pull requests.

From the repository root, after setting the environment variable:

```bash
deno task catalog endpoints --provider refetcher
deno task catalog inspect 'refetcher#instagram/profile'
deno task engine:run 'refetcher#instagram/profile' \
  --body '{"username":"nasa","includeRecentPosts":true,"pages":3}'
deno task engine:run 'refetcher#youtube/channel-videos' \
  --body '{"channelUrl":"https://www.youtube.com/@NASA","pages":25}'
deno task engine:run 'refetcher#youtube/channel-videos' \
  --body '{"channelUrl":"https://www.youtube.com/@NASA","recentVideosLimit":300}'
deno task engine:run 'refetcher#youtube/channel' \
  --body '{"channelUrl":"https://www.youtube.com/@NASA","pages":25,"recentVideosLimit":24}'
```

## Scope and cost

Each run has one target. Instagram, TikTok, Facebook and X profile tools accept
`pages` from **1 to 25**, defaulting to 1. Use `includeRecentPosts: true` to
request recent media.

**YouTube backend: live for all accounts as of 2026-10-01. Connector update:
local, not pushed to Monid.** The channel and channel-video tools accept either
`pages` from **1 to 25** or `recentVideosLimit` from **1 to 300**. Each
requested YouTube page represents up to 12 videos, so `pages: 25` and
`recentVideosLimit: 300` each request up to 300 uploads. Both inputs are
optional. With neither input, the backend retains its 12-video default; the
connector does not inject a count that could override a page request. If both
are supplied, **`recentVideosLimit` takes precedence**: the final example above
requests up to 24 uploads despite `pages: 25`.

The matching YouTube backend expansion is deployed. No Monid-specific account
upgrade is required for these YouTube limits. Seven production checks passed,
including 300 unique uploads through both API origins and a second account, plus
the existing default, count precedence, metadata-only requests and a 50-video
request. The 300-video checks completed in approximately 3–4 seconds. These
controls establish the tested requests, not an availability or latency
guarantee. Social-profile checks below used the supplied account; they do not
establish every other account's limits.

The published rate is **$0.0009 USD per billable unit** ($0.90 per 1,000).
Profile estimates use the requested page count: three pages estimate $0.0027,
and twenty-five estimate $0.0225. Settlement uses the units represented by the
successful response, which may be fewer than requested:

| Profile platform | Successful-response unit count                                                                                                                             |
| ---------------- | ---------------------------------------------------------------------------------------------------------------------------------------------------------- |
| Instagram        | The largest delivered `recentPosts`, `recentVideos` or `postLinks` array, divided by 12 and rounded up.                                                    |
| X                | The same delivered-array calculation, divided by 5 and rounded up.                                                                                         |
| Facebook         | Positive `pageInfo.recentPosts.pagesFetched`, when present. If missing, null or zero, use the largest delivered-array length divided by 12 and rounded up. |
| TikTok           | Use reported `pageInfo.recentPosts.pagesFetched`, subject to the evidence requirements below.                                                              |

Every successful profile costs at least one unit, including metadata-only
profiles and profiles with no recent posts. Positive Facebook/TikTok page
counters remain billable even if the returned recent-post array is empty, and an
`incomplete: true` result still bills its actual units when successful.
Individual post/video tools retain their one-unit successful-result charge. HTTP
errors and failed target results cost zero, including a failure carried inside
an HTTP 200 response. Invalid counters or a computed profile unit count above
the requested pages cause a contract error instead of a settled charge.

For YouTube, channel and channel-video estimates use
`ceil(recentVideosLimit / 12)` units when a count is supplied; otherwise they
use `pages`, or one unit when both inputs are absent. Thus `pages: 25` estimates
25 units, while `pages: 25` with `recentVideosLimit: 24` estimates two. A
channel request with `includeRecentVideos: false` estimates one unit, regardless
of either limit. Successful settlement uses the actual `recentVideos` length for
a channel or the actual `videos` length for channel videos, divided by 12 and
rounded up, with a minimum of one unit. The duplicate channel-video `results`
array is not counted again. Thus a 300-video request estimates 25 units, while
13 delivered videos settle two; a successful empty or metadata-only response
settles one. Failed targets settle zero. The individual YouTube video tool
remains one unit per success.

TikTok requests for more than one page require a numeric fetched-page counter
when `includeRecentPosts: true` or any recent media is returned. A missing or
null counter in those cases causes a contract error; the charge is not guessed
from array lengths. Metadata-only success with `includeRecentPosts` omitted or
false can omit that counter and costs one unit, even with `pages: 25` and a
25-unit estimate. A zero counter is valid only when no recent media was
delivered and also costs one unit. Valid single-page legacy responses can omit
the counter and cost one unit.

The response keeps Refetcher's normalized envelope. Null values and availability
markers retain their meaning; CDN media links may expire. Pagination metadata
can indicate that more results exist or that collection ended early. The API
handles the requested social-profile or YouTube pages inside one call; the
connector does not follow returned cursors with extra calls. YouTube cursor
inputs and continuation between the official API and scraper are deferred. They
are not required to request multiple pages in a single call. Even twenty-five
requested pages do not promise complete history, and larger requests can take
longer.

Current public qualification through the compiled connector (2026-10-01): both
reported Instagram image/carousel URLs passed. Instagram returned 300 posts/25
pages in 16.13 seconds, X returned 125 posts/25 pages in 6.21 seconds, and
TikTok returned 300 posts/25 pages in 51.64 seconds, all without incomplete
coverage. Facebook returned 55 posts/19 pages in 49.54 seconds from a 25-page
request, marked incomplete with an execution-deadline limitation and
continuation cursor. The connector calculated 19 units. A separate bounded
Facebook check fetched 24 pages in 48.78 seconds, then used the existing `after`
input for one more page in 14.85 seconds. Across two calls it returned 25 pages
and 73 unique posts with no overlap in 63.63 seconds; usage was 24 plus one
unit. This qualifies continuation to 25 pages, not completion in one call or
complete history for other profiles.

Batch requests, more than twenty-five social-profile or YouTube pages, YouTube
counts above 300, YouTube cursor inputs, people search and account balance are
outside this connector. Account balance would reveal the hosted provider
account's funds, so it is not a public tool. This integration needs an API key,
request/response schemas and usage rules; it does not include Refetcher's
billing system or server source. Hosted credentials and any negotiated rates,
commission or payment arrangements are separate onboarding matters.

Public sources: [API documentation](https://www.refetcher.com/docs) and
[pricing](https://www.refetcher.com/pricing), reviewed 2026-09-22.

## Validation status

As of 2026-10-01, YouTube `pages: 1..25` and `recentVideosLimit: 1..300` are
deployed for all Refetcher accounts. Seven production checks passed: deep
requests through both API origins and a second account returned 300 unique,
dated videos; the twelve-video default, explicit-count precedence, metadata-only
requests and existing 50-video input also passed. The deep checks took 3.14–3.90
seconds. The connector update is prepared locally and has not been pushed or
posted to Monid.

Fresh compiled-connector calls to the public API also passed both deep cases on
October 1: `youtube/channel` with `pages: 25` returned 300 unique videos in 6.79
seconds, and `youtube/channel-videos` with `recentVideosLimit: 300` returned 300
unique videos in 6.59 seconds. Each used exactly one HTTP 200 request with no
contract errors and estimated and settled 25 units ($0.0225 USD) in the
connector. Their request ids were `419f8182-73b9-49d7-a5e9-cb341a93f244` and
`02e004be-e233-4ef9-91e9-98d6dc0b19d8`, respectively. These are connector usage
checks, not an independent audit of customer-ledger deductions.

The fresh October 1 focused suite passed 34 tests with zero failures and one
skipped live test; repository-wide type checks also passed. The same focused
suite passed on September 30. Repository-wide type checks and scoped
formatting/lint passed. Two frozen compilations were byte-identical, with
catalog SHA-256
`d86031efb3992194bb011401bc76d0dc4df69140ecc573c37a5a4f1517f92105`. The catalog
contains eleven tools, optional YouTube page/count inputs without injected
defaults, the twelve-video fallback, explicit-count precedence, metadata-only
one-unit estimates and unchanged social-profile bounds. The September 30 full
repository suite passed 1,175 tests with zero failures and 201 ignored or
credential-gated tests. Fresh double-compilation produced the same catalog as
that fully tested snapshot. Secret-pattern scanning and manual review found no
actionable issue.

The 300-video backup scraper remains unqualified: its earlier 87.10-second
retrieval exceeded the unchanged 25-second dispatcher timeout, and the tested
compact subscriber count failed exact-subscriber validation. The production
checks establish the deployed primary path, not successful failover for 300
videos. YouTube cursors remain deferred. Facebook's two-call continuation check
is described above; full 25-page completion in one call is not promised.
Connector usage calculations do not independently audit customer-ledger
deductions. Hosted credentials, activation and commercial terms still need
maintainer confirmation.

Historical qualification: all eleven tools passed a compiled-engine live smoke
test on 2026-09-22 using one-page/twelve-upload bounds, one HTTP 200 request per
tool and $0.0009 USD usage per successful run. The run took approximately 47
seconds. Subsequent historical offline checks passed 1,165 repository tests for
the social-page update and 29 focused tests for the count-only YouTube update;
both predate the current page/count inputs. Those results do not replace the
current production and compiled-connector checks.

Four scrubbed `recorded-*-success.json` fixtures cover a YouTube video, an
Instagram profile, a YouTube channel and its uploads. The `synthetic-*` fixtures
retain constructed boundary and error cases. `fixtures/unauthorized.json` is a
real HTTP 401 response from an unauthenticated request; no key was sent and no
paid scrape ran for that fixture. These fixtures retain their original
provenance; the current validation results above cover the expanded inputs.

Live tests require both the credential environment variable and
`REFETCHER_LIVE_INPUTS`, a JSON object mapping logical endpoint paths to native
request bodies. They skip when either is absent. With a dedicated key already
set, supply a current public target and run:

```bash
export REFETCHER_LIVE_INPUTS='{"youtube/video":{"url":"https://www.youtube.com/watch?v=VALID_ID"}}'
deno task test:live --filter 'refetcher live'
```

Replace `VALID_ID` with a real current video id before running. Successful live
tests incur the published API charge. Hosted activation and the commercial
arrangement still require maintainer confirmation.
