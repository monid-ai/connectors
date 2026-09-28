# Proposal: add-connector-getxapi

## Why

The catalog has a `twitter` leaf but no provider that answers X (Twitter)
questions directly. Today an agent that needs a tweet, a profile, a follower
list or a trend reaches for a general scraper actor, which is slower, bills
per result on top of a run, and returns a different shape per actor.

GetXAPI is a REST API for public X data. One Bearer key, one host, a flat
price per call from $0.001, and no X developer account. Its reads cover the
questions agents actually ask about X: search tweets with X's full
advanced-search syntax, read a tweet with its replies, reposters or whole
self-thread, look up a profile by username or id, tell a suspended account
from a missing one, read an account's About page with username history,
page through followers and following, read a user's tweets, replies, media
and mentions, and read list members, community details, Space metadata and
live trends.

Mechanically it is the easiest possible fit: every endpoint is a
synchronous GET, the validated input is the wire request, the vendor body
is the output, and billing is one flat line per call.

## What Changes

- **connectors/getxapi**: 25 synchronous GET endpoints against
  `https://api.getxapi.com/twitter`, Bearer auth, the litescrape shape.
  - Tweets (5): `tweet/advanced_search`, `tweet/detail`, `tweet/thread`,
    `tweet/replies`, `tweet/retweeters`.
  - Users (15): `user/search`, `user/info`, `user/info_by_id`,
    `user/status`, `user/user_about`, `user/followers`,
    `user/followers_v2`, `user/following_v2`, `user/verified_followers`,
    `user/media`, `user/tweets`, `user/tweets_and_replies`,
    `user/tweets/complete`, `user/mentions`, `user/affiliates`.
  - Other (5): `list/members`, `community/info`, `spaces/info`, `trends`,
    `trends/locations`.
- **Identities are the vendor's own paths** under the `/twitter` prefix,
  which rides the base URL, so `getxapi#tweet/advanced_search` is what
  GetXAPI documents at `/twitter/tweet/advanced_search`.
- **Faithful, strict mirrors.** Each `schema/inputs.ts` mirrors the
  operation in the public OpenAPI 3.1 document
  (`https://docs.getxapi.com/openapi.json`) with optionality only. Three
  fragments shared by two or more endpoints live in `schema/common.ts`:
  `zUserName`, `zNumericId`, `zCursor`. `user/tweets` takes `userName` OR
  `userId`, so it is a union of two strict arms, which also refuses a
  request carrying both.
- **Billing is flat and in dollars.** GetXAPI prices every endpoint in US
  dollars per call and no response carries a meter, so the pool is
  `US dollars`, each endpoint is a `PER_CALL` line, and there is no
  `consolidate`. Rates: $0.001 per call, except `tweet/thread` at $0.005 and
  `user/tweets/complete` at $0.003, from the public pricing page and each
  operation's description in the OpenAPI document. Every HTTP 200 bills,
  including an empty page; every non-2xx settles at zero.
- **One error digest.** GetXAPI's error body is `{ error, hint? }`; the
  provider `output.fromError` lifts `error` to `message` and keeps the raw
  body beside it.
- **Real recorded fixtures.** 29 recordings from the live API on
  2026-09-23: a happy run for every endpoint, two real 404s
  (`user/info`, `tweet/detail`), a real 401 from an invalid key, and the
  billed `not_found` 200 from `user/status`.

## Capabilities

- `getxapi-connector`.

## Non-goals

- **No write or account-session endpoints.** GetXAPI also sells actions
  that operate a real X account (post, reply, like, repost, follow, DMs,
  bookmarks, articles, notifications, the home timeline, likes). Every one
  of them takes that X account's session token in the request. A broker
  that authenticates every caller with one vendor key should not carry end
  users' X sessions, so they are out of scope.
- **No account, feedback, monitoring or login endpoints.** They manage the
  GetXAPI account itself or a monitoring subscription, not data an agent
  retrieves.
- **`spaces/download` is not ported.** It is priced per job plus per
  transcript minute and belongs in its own change with a metered model.
- **`user/following` (v1) is not ported.** `user/following_v2` covers the
  same graph and is the route GetXAPI serves today.
- No output reshaping. The body, `next_cursor` included, reaches the caller
  as the vendor sends it.

## Impact

New connector tree and 25 new ids in `connectors/ids.lock.json`. It uses
the existing `twitter` leaf, so `connectors/categories.ts` is unchanged. No
new `Unit`, preset, hook, compiler or engine change, and
`deno task version:check` is clean.
