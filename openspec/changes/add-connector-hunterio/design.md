# Design: add-connector-hunterio

Decision record for the Hunter port. v1 source:
`monid-services/services/shared/providers/adaptors/hunterio/` (+
`openspec/changes/add-hunterio-provider/proposal.md`; v1 wrote no
design.md). Precedents: akta (sync GET + queryParams, `every: N` block
rate), exa (sync POST + body), surf D3 (an endpoint-level lifecycle on a
sync provider), clay D13 (unions), contextdev D3 (a vendor-meter claim
plucked and stripped), apollo (empty = 0 on PER_UNIT·RESULT), pdl (a
404 miss as error-as-data on a flat PER_CALL).

## D1 — Ids are v1's; `discover-ai` pins its id

Twelve ids derive from the wire path. `discover-ai` shares the
`/discover` wire path with the structured search (ONE upstream
operation, TWO endpoints — v1 split them because only the
natural-language leg burns the account-wide AI quota), so it pins the
published id (the bytedance posture). Folders are the id with `/` → `-`.

## D2 — The verifier owns a lifecycle (owner, 2026-09-17)

Hunter verifies for up to ~20 s synchronously and then answers with two
NON-STANDARD 2xx codes: 202 (still verifying — re-poll the same URL,
counted once upstream) and 222 (the remote SMTP server misbehaved — the
verification failed outside anyone's control). The declarative sync
path settles any 2xx as billable success, so `email-verifier` declares
`lifecycle.start` / `poll` at the endpoint (surf D3: a sync provider, one
endpoint with its own lifecycle): 202 → `RUNNING`; 222 → `COMPLETED`
with OURS 502 / THEIRS 222 and Hunter's body as the output (zero usage,
engine-forced on non-2xx); anything else relays verbatim. A poll-side
5xx keeps polling (`runMs` bounds it — v1 posture). Hunter issues no job
id and the poll is the same GET: the per-tick `utils.request()` carries
the caller's email, so no state is written (v1 stashed the query in
metadata and minted a synthetic `providerRunId` for the same reason).
Timeouts 30 s / 180 s / 10 s (v1 email-verifier).

## D3 — The pool is Hunter credits; four bases (owner, 2026-09-17)

Hunter meters one credit balance (the plan allowance; the pricing page's
"search" and "verification" packs top up the same balance — v1
`GET /account` `requests.credits` with `searches` / `verifications` as
mirror views). Every paid line states v1's drill-verified consumption
(2026-08-20 three-way ledger reconciliation) in credits:

| endpoint | model | basis |
|---|---|---|
| `domain-search` | PER_UNIT·RESULT `every: 10`, 1 | `data.emails[]` — Hunter bills per STARTED block of ten (10→1, 25→3, 85→9, 100→10; both official documents state this wrong) |
| `email-finder` | PER_UNIT·RESULT, 1 | 1 iff `data.email` is a non-empty string (a miss is a 200 with `email: null`, never a 404) |
| `email-verifier` | PER_UNIT·RESULT, 0.5 | 1 iff `data.status` ∈ {valid, invalid, accept_all} (unknown / disposable / webmail are free upstream) |
| `multi-domain-search/reveal` | PER_UNIT·RESULT, 1 | `outcome: "revealed"` rows; CLAIM = `meta.credits_charged` |
| `people/find`, `companies/find`, `combined/find` | PER_UNIT·RESULT, 0.2 | 1 iff every core data point is returned — person: email, full name, position; company: name, category / description / tags, location / country code, size; combined: either set (help.hunter.io/en/articles/1970956-hunter-api, 2026-09-17; PR #43 review). A partial 200 is free; the 404 miss is error-as-data |
| `discover-ai` | PER_CALL, 8.36 | the quota gate (D6) |
| the other five | FREE | 0 credits measured |

The bases differ (`data.emails[]`, `data.email`, `data.status`,
`data[].outcome`), so each metered doc states its own `evidence` (v1's
def-level `getActualCost` hooks) and the provider's generic evidence
counts nothing — it serves the FREE docs and the flat `discover-ai` gate only. Only
the reveal carries a meter, so only the reveal has a `consolidate`: it
plucks `meta.credits_charged` (authoritative — "reconcile against those"
in the live docs; it matched v1's balance diff exactly), claims it, and
strips it; per-handle outcomes stay. The cross-check counts what Hunter
says it bills — one per revealed personal row plus one per domain of
revealed generic rows (v1's drill: 3 revealed rows metered 2) — so claim
and fold agree and a `mismatch` note means Hunter's billing drifted
(PR #43 review). An absent meter omits the claim and the derived fold
settles on the same rule (never `?? 0`).

v1's dollar rate ($0.01196 per Scale-plan credit) and its 2× markup are
the broker's concern; the doc states the vendor's card in the vendor's
unit.

## D4 — Errors are data

Hunter's non-2xx is `{errors: [{id, code, details}]}` — including the
enrichment trio's 404 miss and the inverted pair (403 = per-second rate
limit, 429 = monthly quota). The provider `fromError` digests it to
`{message: details, error_code: id, raw}`; the engine zero-bills it.

## D5 — Three POSTs keep v1's drill-verified wire form

`domain-search` and `discover/people` are documented as GETs, but the
documented bracket encoding SILENTLY IGNORES the nested filters
(`location`, the Discover object filters) — v1 drill-verified identical
result sets — while both endpoints accept an undocumented JSON body
where every filter is honored (and echoes in `meta.params`). So both are
POSTs with a JSON body here, as in v1. `multi-domain-search` is the
documented POST whose filters ride the QUERY STRING with no body; the
engine sends no body when the input has none, so nothing is trimmed.
Fallback if upstream ever drops the body forms: revert to GET and drop
the nested filters.

## D6 — `discover-ai` at the quota gate's price (owner, 2026-09-17)

The natural-language leg is free upstream but spends one of the
account's 50 AI translations a month, shared by every caller. v1
charged $0.10 per call as a gate, not a cost passthrough. The owner kept
the leg and asked for the gate in credits: $0.10 ÷ $0.01196 = 8.36
credits, a `PER_CALL` line (the only line whose amount is not a vendor
charge; `meta.notes` says so). Rebase it with the plan (tasks 7.4).

## D7 — v1's `.refine`s compile as unions

Seven rules, all the vendor's: domain | company (`domain-search`,
`email-count`, 2 arms); the email-finder's "a company identifier AND a
person name unless linkedin_handle" (5 arms: linkedin_handle; domain +
first + last; domain + full_name; company + first + last; company +
full_name); at least one Discover filter (`discover`, `discover/people`,
10 arms each — one per filter key); at least one SELECTING multi-domain
filter (14 arms; the paging knobs alone select nothing); email |
linkedin_handle (`people/find`). No `.default()` inside a union
(contactout D7); `domain-search`'s `limit` is required in both arms.

## D8 — Timeouts from v1

Provider 30 s / 60 s (config.yml `hunterio`: email-finder blocks up to
20 s upstream); `email-verifier` 30 s / 180 s / 10 s (D2).

## D9 — v1 ↔ live reference (2026-09-17)

| item | v1 (2026-08) | live |
|---|---|---|
| `discover/people` method | POST JSON (drill) | documented GET; POST body kept (D5) |
| `multi-domain-search` `min_confidence` | 0–100 | "an integer from 2 to 100" → `.min(2)` |
| `multi-domain-search` `founded_year` | free string | "four-digit year 1000..next year" (server-validated; a comma list here, unchanged) |
| pricing page | one credit pool | plan credits + separate "search" / "verification" bulk packs — same balance (D3) |
| new endpoints | — | `domains-suggestion`, `domain-count`, `email-finder/found`, `email-insight`, saved searches, `lookalikes` (tasks 7.2) |

Everything else matched.

## D10 — Synthetic fixtures

No Hunter key was available. Every fixture follows the live reference's
own response example for that endpoint (2026-09-17) and v1's drills for
the billing edges: the 12-address page, the `email: null` miss, the 202
→ 200 chain, the 222 body (shape assumed — Hunter documents the code,
not the body), the bundled reveal (3 rows / 2 credits), the no-meter
reveal, the 404 miss. Replay matched the engine's URLs on the first
run; not live-verified (tasks 7.1).
