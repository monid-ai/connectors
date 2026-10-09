# Design: add-connector-apollo

Decision record for the Apollo port. v1 source:
`monid-services/services/shared/providers/adaptors/apollo/` (+
`openspec/changes/fix-apollo-pricing-lifecycle/`). Precedent: akta (sync
GET + queryParams, provider-level auth / baseUrl / timeouts / credits);
clay D7a and surf D1 for the no-consolidate literal rate table; clay D13
for the identifier union; fundable for the pinned `{id}` identities.

## D1 — Ids derive from the wire path; three placeholder paths are pinned to Apollo's scope names

Five paths have no placeholder and derive as usual
(`apollo#mixed_people/api_search`, `apollo#mixed_companies/search`,
`apollo#news_articles/search`, `apollo#people/match`,
`apollo#organizations/enrich`). Three carry a `{param}`, which an identity
cannot (fundable's `/deals/{id}` → `/deal`). Rather than invent a singular,
they are pinned to the name Apollo itself gives each endpoint — the API-key
scope in the "Endpoint essentials" table of every reference page:

| wire path | v1 id | pinned id |
| --- | --- | --- |
| `GET /people/{id}` | `/people/{id}` | `/people/show` |
| `GET /organizations/{id}` | `/organizations/{id}` | `/organizations/show` |
| `GET /organizations/{organization_id}/job_postings` | `/organizations/{organization_id}/job_postings` | `/organizations/job_postings` |

Folders are the wire path with slashes and underscores turned into hyphens
(`mixed-people-api-search`, `people-show`), no group directories for eight.

## D2 — No phone reveal: the engine cannot carry Apollo's 64-bit request_id (owner, 2026-09-16)

v1's `/people/match` was `executionMode: "async"` for one reason: with
`reveal_phone_number`, Apollo answers the demographics synchronously and
delivers the phone numbers minutes later, and the run reads them back from
`GET /webhook_result/{request_id}`. That `request_id` is a bare signed
64-bit integer (reference example: `718432950164203900`; v1 measured
`1039995589705121901` → `…900` after `JSON.parse`). v1 repaired it with a
parse reviver (`exactRequestIdReviver`, `context.source`); the engine
decodes bodies with plain `JSON.parse` in `engine/transport.ts` and a hook
fn never sees the raw text, so a v2 poll would ask for a rounded id and get
`request_id_unknown`. Fixing that is an engine change (preserve
out-of-range integers), which the owner chose NOT to bundle with this port.

Consequence: `people/match` is a plain synchronous relay. The mirror still
lists every vendor parameter (it mirrors Apollo, D25), and the binding
`.omit()`s the five asynchronous ones — `reveal_phone_number`,
`webhook_url`, `poll_only`, `run_waterfall_email`, `run_waterfall_phone` —
so `.strict()` rejects them as INVALID_INPUT instead of forwarding a paid
request whose second half is unreachable (suzanne D7's `images_inline`
posture). The v1-only `PHONE_WEBHOOK_URL` sink, the `phone_units` stamp and
the `graftPhoneNumbers` merge have no v2 counterpart. Live docs now offer
`poll_only=true` (no webhook needed), so the follow-up (tasks 7.2) is
engine-only.

## D3 — The pool is Apollo credits at Apollo's current rate card; no consolidate (owner, 2026-09-16)

Apollo publishes credits per endpoint
(https://docs.apollo.io/docs/api-pricing, 2026-09-16) and meters one pool
per workspace, so `credits.default = {label: "Apollo credits"}` and every
`consumes.amount` is the published credit count. v1's `USD_PER_CREDIT =
0.025` (Basic plan) is the broker's conversion — v1 itself marked it
EMPIRICAL / MAY BE WRONG — and is not carried (the owner rule: the pool
follows what the vendor meters).

The card, and where it diverges from v1:

| endpoint | v1 | live card | v2 |
| --- | --- | --- | --- |
| people search | 0 | 0 credits | FREE |
| organization search | 1 / page | 1 credit per page | PER_UNIT·PAGE, 1 |
| job postings | 1 / page | 1 credit per page | PER_UNIT·PAGE, 1 |
| news search | 1 / page | 1 credit per page | PER_UNIT·PAGE, 1 |
| people enrichment | 1 + 1 (personal emails) + 8 (phone returned) | 1 for demographics/email; +8 if mobile returned | PER_UNIT·RESULT, 1 |
| organization enrichment | 1 / match | 1 credit per organization | PER_UNIT·RESULT, 1 |
| complete person / org info | 1 / record | 1 credit per person / company | PER_UNIT·RESULT, 1 |

The `reveal_personal_emails` +1 of v1's TIERED card is not on the current
card (its 1–9 range is exactly 1 + 8); the owner chose the vendor's table.
The +8 phone line is unreachable without the phone channel (D2).

A synchronous Apollo response carries no meter — `credits_consumed` appears
only on the phone webhook payload — so there is nothing to claim and no
`usage.consolidate`. The derived fold is the bill, and `provider.test.ts`
pins every endpoint's draw as a literal table whose key set must equal the
compiled ids (clay D7a, surf D1).

## D4 — Empty results draw nothing: a 0|1 count on a leaf PER_UNIT (owner, 2026-09-16)

Apollo's card is per page or per matched record, "charged only if
credit-consuming data is found"; v1 zero-billed any 200 whose
`extractResultCount` was 0. A PER_CALL line would bill every 2xx. So every
metered endpoint is a leaf PER_UNIT whose evidence reports 1 or 0:

- paged endpoints (`PAGE`): 1 when the delivered collection is non-empty —
  `organizations`, `organization_job_postings`, `news_articles` — else 0;
- record endpoints (`RESULT`): 1 when the record object is present
  (`organization`, `person`), else 0; `people/match` uses D8's rule.

Whether Apollo really bills an EMPTY search page is not confirmed by the
card ("1 credit per page") — v1's "when results are returned" is carried;
tasks 7.1 checks it against a live ledger.

## D5 — Evidence is per endpoint; the identifier unions bind at the endpoint

Apollo names the delivered collection per family and has no uniform
envelope, so a provider-level generic counter (akta's `$.data`) has nothing
to read, and fundable's "first array value" would pick `breadcrumbs` on
organization search. Each endpoint states its own evidence with a literal
path; the two `organization` lookups state the same text and intern to one
fnTable entry (six evidence texts for seven metered docs; the FREE search
is synthesized). The two estimate texts (`{PAGE: 1}` / `{RESULT: 1}`)
intern to two entries.

"At least one identifier" is bound as `z.union` of `.required()` arms
(clay D13): nine arms on `people/match` (Apollo lists nine identifiers),
three on `organizations/enrich` — the live reference (2026-08-31) says
"use domain, linkedin_url, or website … name alone is not supported", so
`name` is a modifier on every arm, not an arm (v1 had it as a fourth
arm). Both compile to `anyOf` with `additionalProperties: false` per arm;
the union carries no `.default()`.

## D6 — Query encoding is the engine's; no toRequest, no body

Apollo's filters ride the query string even on the POST searches, arrays
as repeated keys whose NAME carries the `[]`
(`person_titles[]=a&person_titles[]=b`). The engine sends an array query
value as a repeated key (PR #17), and `URLSearchParams` percent-encodes the
brackets exactly as v1's `buildQueryUrl` did (`person_titles%5B%5D=`), so
the schema keys are the wire keys verbatim and there is no `toRequest`. No
endpoint declares a body, so none is sent — v1 needed an "empty-object
trim" because its relay posted the run input as the body.

## D7 — No fromError; errors relay verbatim

Apollo's error bodies differ per endpoint: `{error}` (422), `{error,
error_code}` (403 `API_INACCESSIBLE`), `{message}` (403 paid-plan gating,
429), and a plain-text 401 (v1's `readBody` quirk — the engine's sniffing
decode returns it as a string). Each reads as a message already; digesting
four shapes into one would hide which one came back (clay D7 posture).

## D8 — people/match bills by Apollo's stated rule, not v1's heuristic

The live reference (2026-09-15) states the rule: "Demographic credit usage
depends on `match_confidence`. Apollo doesn't charge a demographic credit
when `match_confidence` is `none`. Email … credit usage isn't determined by
`match_confidence`." So `RESULT` is 1 when `person.match_confidence` is a
string other than `"none"`, OR `person.email` is a non-empty string. v1's
`isBillablePerson` (email_status / title / name + employment_history,
measured against the credit balance on 2026-09-03) predates
`match_confidence` and is not carried; tasks 7.1 re-checks the rule
against a live ledger.

## D9 — Timeouts from v1's config.yml

`requestMs: 60_000`, `runMs: 60_000` (services/workflows/endpointExecution/
config.yml, apollo). v1's `/people/match` had `runTimeoutMs: 900_000` /
`pollIntervalMs: 15_000` for the phone wait — gone with D2.

## D10 — v1 ↔ live mirror differences

| field | v1 | live (2026-09-16) | v2 |
| --- | --- | --- | --- |
| people search `q_person_name` | absent | present | added |
| people search `person_seniorities[]`, `contact_email_status[]` | free strings | enumerated values | enums |
| `organization_num_employees_ranges[]` | free strings | "lower,upper" | `pattern ^\d+,\d+$` |
| date-range bounds | free strings | YYYY-MM-DD | `z.iso.date()` |
| `page` / `per_page` (people, org search) | max 500 / 100 | "100 per page, up to 500 pages" | max 500 / 100 |
| news `per_page` | max 100 | "up to 25 results per page" | max 25 |
| job postings `page` / `per_page` | max 500 / 100 | no bound stated (10,000-record display limit) | unbounded |
| org enrich identifiers | domain, linkedin_url, name, website (any) | name alone not supported | 3-arm union, name a modifier |
| people/match `poll_only`, waterfall flags | absent / hidden | present | mirrored, omitted at the binding (D2) |
| people/match `hashed_email` | min 1 | MD5 or SHA-256 | `pattern` 32 or 64 hex |
| `linkedin_url`, `website`, `webhook_url` | min 1 | URLs | `pattern ^https?://` (`https://` for webhook) |
| complete person info `email` placeholder | not documented | `email_not_unlocked@domain.com` | `meta.notes` |

## D11 — Synthetic fixtures

No Apollo key was available. Every fixture is built from the reference
page's own example (the doc's fictional people, Apollo.io's own company
record), trimmed to two items per array, with placeholder ids; the
`synthetic-no-match` shapes are assumed from the reference prose and v1's
drills (each description says so). Replay matched the engine's URLs on
the first run for all eight endpoints (bracket encoding, `@` → `%40`,
path substitution), so the wire form is at least self-consistent; it is
not live-verified (tasks 7.1).

## D12 — reconcile ledger drills (addendum, 2026-09-16)

Three of this change's open questions were settled against the live credit
ledger (`num_credits_remaining` deltas, tasks 7.1):

1. **Every card row is exact**: companies-search, organizations-enrich,
   organizations-show, job-postings, news-search, people-show each moved the
   ledger exactly 1 credit; people-search moved it 0 (FREE confirmed).
2. **Empty pages do NOT bill** (D4's open question): an empty
   companies-search page moved the ledger 0 — v1's "when results are
   returned" reading and this change's evidence rule are both correct.
3. **`reveal_personal_emails` alone does NOT surcharge** (D3 confirmed
   against v1's +1-on-flag card): a matched person with the flag set and
   `personal_emails: []` delivered moved the ledger exactly 1. The cost of a
   DELIVERED personal email remains unmeasured (no test subject with one on
   file); the flag stays sendable and the card stays surcharge-free per the
   published table.
