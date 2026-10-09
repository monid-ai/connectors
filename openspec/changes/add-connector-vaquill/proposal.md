# Proposal: add-connector-vaquill

## Why

Agents get US law wrong in a specific, expensive way: they recall a statute
from training data, cite it confidently, and have no way to check whether
the section still says that, or ever did. The fix is not a better model, it
is a lookup against primary law with a citation attached.

Vaquill is that lookup. It serves US primary law from official government
publishers only: the United States Code, the Code of Federal Regulations,
all 50 state statutory codes plus DC and Puerto Rico, state administrative
codes, court rules, constitutions, the Federal Register, agency guidance and
executive actions. Beyond search, it resolves a Bluebook citation to the
section it names, reconstructs a section's text as it stood on a past date,
and answers the questions that make a section usable rather than merely
findable: what cites it, what terms govern it, what sits either side of it,
what has changed on it, and what the equivalent provision says in other
states.

There is no legal leaf in the catalog today, and nothing under any existing
leaf answers "what does 42 U.S.C. 1983 say today, and did it say that in
2019".

Mechanically it is an easy fit: one base URL, bearer auth, thirteen
synchronous endpoints, and a `creditsConsumed` receipt on every billable
response. Nothing here needs a new engine capability.

## What Changes

- **connectors/vaquill**: 13 sync endpoints against
  `https://api.vaquill.ai/api/v1`, bearer auth, all inheriting the
  provider's credit pool and its vendor-meter `usage.consolidate`.
  - 4 POST: `/us/statutes/search`, `/us/statutes/sections`,
    `/us/statutes/resolve`, `/us/statutes/count`.
  - 9 GET: `/us/statutes/coverage`, `/us/statutes/divisions`, and the seven
    `section/{act_id}` reads (`body`, `related`, `changes`, `cited-by`,
    `definitions`, `cross-state`, and the bare metadata lookup).
- **Identities are the vendor's own paths**, `{act_id}` placeholder
  included, so what an agent calls is what Vaquill documents. Folder names
  are organisational only.
- **Faithful mirrors, no wire layer.** Each `schema/inputs.ts` mirrors its
  published OpenAPI schema with optionality only, including the 21-value
  `corpusType` vocabulary, the 79 publisher `source` slugs and the 140
  response `fields`. No endpoint declares `input.toRequest` and none
  declares `output.fromResponse`: the validated input IS the wire request,
  and the vendor's body IS the output.
- **Five endpoints are metered rather than flat, and that is a billing
  decision, not a modelling flourish.** Vaquill REFUNDS a lookup that comes
  back empty. Measured live: a cross-state comparison finding no equivalents
  returns HTTP 200 with `creditsConsumed: 0`, and so do an empty count, an
  empty browse level, a section nothing cites, and a chapter that defines
  nothing. A flat `PER_CALL` cannot express that. A zero claim prunes to an
  empty claim, an empty claim falls back to the derived fold, and the fold
  would bill the list price for a call the vendor did not charge for. So
  those five count an "answered lookup", 1 or 0, which is a COUNTING rule
  owned by the fns (design D19).
- **Four answers the vendor charges for are free to the caller, and the
  broker absorbs them.** Measured live 2026-09-18: a search that matches
  nothing bills 4, a section text `asOf` a date outside the held editions
  answers `available: false` and bills 6, an empty change page bills 1, and
  a citation that does not resolve bills 2. The caller pays nothing for any
  of them. `#search`'s `call` line, `#section/{act_id}/body` and
  `#section/{act_id}/changes` are therefore metered like the refunded five
  (an answer delivered, 1 or 0), and each of the four endpoints overrides
  `usage.consolidate` to DECLINE the vendor's claim in that case: the claim
  would win at settle, so declining it is the only way the derived fold
  (which counts 0) can be the bill. No `mismatch` rides out, because a
  declined claim is not a disputed one. The vendor's charge is not
  recorded anywhere in the run; it is the broker's cost.
- **The two batch endpoints bill on different bases, and both were measured
  rather than assumed.** `#sections` bills per section RETURNED (one good id
  and one junk id billed 2, not 4). The vendor bills `#resolve` per citation
  SUBMITTED, miss included (one resolvable and one nonsense citation billed
  4 with `resolvedCount: 1`), because the work is the lookup and not the
  hit.
- **`#search` is a composite**: a flat 4 for the ranked search plus the
  ordinary 6-credit body line for each hit that returns text under
  `includeBody`. Its estimate promises against `limit`, which is the only
  body count a pre-run hook can read; the settle counts rows whose text
  actually arrived.
- Real recorded fixtures, 32 provider-level chains, including the five
  refund recordings and a real 401 per request shape.

## Capabilities

- `vaquill-connector`.

## Non-goals

- **The Law Change Alerts surface is not ported** (`/boards`, `/watches`
  and the watch reads). Those routes are per-key STATE, and a broker
  authenticates every caller with one credential: `GET /watches` would show
  each agent every other agent's watches, and `DELETE` would let them remove
  each other's. That is a tenancy problem to solve on Vaquill's side, not
  something a connector can paper over. It should arrive as its own change
  once the routes are scoped per caller.
- **The single-citation `GET /us/statutes/resolve` is not ported.** It
  shares a path with the batch `POST`, two endpoints cannot share one
  identity, and the batch form takes one citation at the same per-citation
  price.
- **Three deprecated discovery endpoints are not ported** (`/states`,
  `/laws`, `/codes`). Vaquill hides them from its own OpenAPI document and
  supersedes them with `/coverage` and `/divisions`, both of which are here.
- No dollar conversion in the doc. The pool is Vaquill credits, published at
  $0.01 each; the conversion stays the broker card's job.

## Impact

New connector tree plus one `connectors/categories.ts` leaf,
`legal-research`. The catalog has no legal leaf today. No new `Unit`, no
new preset, no new hook, no compiler or engine change, and
`deno task version:check` is clean.
