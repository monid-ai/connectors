# Design: add-connector-brightdata

Decision record. Everything here was settled against the published OpenAPI
plus live drills on a real key, 2026-09-23.

## D1 — The zone is credential material, not caller input

Every call to `POST /request` must name a `zone`: the account-side object
that says which product the request runs as, which geos it may egress from,
and what its output defaults are. The vendor marks it REQUIRED.

It cannot be a caller argument. A zone name resolves only inside the account
that holds the key, so a caller who is not the key-holder has no way to know
one, and a wrong name is a flat 400 (`zone "x" not found` — drilled). It is
also not a secret: it is a name, and it appears in the vendor's own docs.

So it travels WITH the key, as a second and third credential field, and never
reaches the caller-facing schema:

```
auth.credentials = { apiKey, serpZone, unlockerZone }
```

Alternatives rejected:

1. **Expose `zone` on the body.** Faithful to the mirror, unusable in
   practice — the caller would have to guess a name from someone else's
   account, and every wrong guess is a billable-looking 400.
2. **One `zone` credential field, caller picks the product.** Collapses the
   two products into one endpoint and makes the endpoint's own meaning
   depend on a credential value. `discover` ranks on `meta.description`; an
   endpoint whose description must say "search engine results, or any URL,
   depending on how your key is configured" ranks for nothing.
3. **Derive the zone from a `GET /zone/get_active_zones` probe at run time.**
   An extra round trip on every call, an IO-doing auth fn (which the closed-
   term contract forbids), and a silent behavior change the first time an
   account grows a second zone of the same type.

The cost of D1, stated plainly: this is the first credential object to carry
a non-secret, and hosted configuration now has three fields to set per
account rather than one. `BRIGHTDATA_CREDENTIALS_SERP_ZONE` and
`BRIGHTDATA_CREDENTIALS_UNLOCKER_ZONE` follow the standard derivation with no
special case, and the live-test gate reads the field list off the shape
(`BRIGHTDATA_KEYS`) so it cannot drift.

## D2 — Two products on one wire path, told apart by declared id

SERP API and Web Unlocker API are the same endpoint. Same host, same method,
same path, same body — the zone type is the whole difference, and sending a
SERP zone to an unblocker call (or the reverse) is a 400.

Ids are derived from `endpoint ?? request.path`, so both would land on
`brightdata#request` and collide. Both therefore DECLARE `endpoint` (`/serp`,
`/unlocker`) — the contactout work/personal precedent, for the same reason:
the request alone cannot tell the two apart.

The body mirror splits the same way. `connectors/brightdata/schema/
request-body.ts` carries what both products document (`url`, `format`,
`method`, `country`, `data_format`); the Web Unlocker mirror adds `render`
and `debug`, which Bright Data publishes for that product alone. The SERP
mirror overrides only the `url` DESCRIPTION — the field an agent is most
likely to get wrong, because it must be a search-engine url carrying the
query, and because `brd_json=1` is what turns the page from markup into
fields.

The two `auth.inject` sources differ (`serpZone` vs `unlockerZone`), so they
intern to two fnTable entries rather than one. That is the honest outcome:
the field they read is the product switch.

## D3 — No vendor meter, so no `usage.consolidate`

Drilled live against a real key, both products, both formats: a successful
response is the fetched payload and nothing else. No credits field, no cost
field, no usage envelope. The only usage-shaped surface Bright Data exposes
on a request is `x-brd-debug`, opt-in via `debug: true`.

`x-brd-debug` is not read as a claim. It is documented as a debugging aid
rather than a billing receipt, it is opt-in (so a claim would exist only when
the caller happened to ask for it), and it is a HEADER — `record` drops
headers outside a four-entry allowlist, so no fixture could ever pin it and
no replay test could guard it.

Consequence, eyes open: there is no `usage.mismatch.derived` cross-check for
Bright Data. The derived fold IS the bill, and the pinned rate is guarded by
`test:live` plus the literal assertions in the replay tests — the contactout
D2 / clay D7a posture. Bright Data publishes no machine-readable pricing
surface either, so no `scripts/drift/` suite is added.

## D4 — A failed unlock is a provider error, read off Bright Data's own headers

Bright Data bills per SUCCESSFUL request. A request it cannot accept answers a
real non-2xx and the engine zero-bills it. But once a request reaches the
unlocker, the outer status is 200 whatever happened, and the verdict rides in
headers: Bright Data's error-code reference
(`docs.brightdata.com/products/web-unlocker/error-codes`) states that EVERY
unlocker failure carries `x-brd-error`, most also a machine code —
`x-brd-error-code` for an unlocker-level failure, `x-brd-err-code` for a
proxy-level one passed through — and `x-brd-status-code` the result status.
Absent `x-brd-error`, the payload is the target's own, its error pages
included.

| case | outer | verdict | payload | billed | drilled |
| --- | --- | --- | --- | --- | --- |
| unlock performed, target 200 | 200 | none | the page | yes | `raw` and `json` |
| unlock performed, target 404 | 200 | none (`x-brd-status-code: 404`) | the 404 page | yes | both formats |
| unlock failed (`no_peers`, `proxy_error`, `req_timeout`) | 200 | `x-brd-error-code`, `x-brd-status-code: 502` | **empty** | **no** | live, 2026-10-04 |
| SERP zone, unsupported url (`wrong_api`) | 200 | `x-brd-error-code`, `x-brd-status-code: 400` | **plain-text reason** | **no** | live, 2026-10-04 |
| any of the above under `format: "json"` | 200 | **inside the body**: `status_code` + `headers.x-brd-error-code` | the envelope | per row | live, 2026-10-04 |
| zone not found | 400, body `zone "x" not found` | — | — | no | live |
| rejected key | 401, body `Invalid token` | — | — | no | live |

So the provider authors `lifecycle.start` — cloro's seam, provider-level
because both endpoints are synchronous — and reads the verdict in BOTH places:
the outer headers under `format: "raw"`, the body's `headers` under
`format: "json"`, where the outer envelope carries no `x-brd-*` header at all.
A verdict settles as a provider error, the hunterio 222 posture: OURS is
Bright Data's own result status (`x-brd-status-code`, or the body's
`status_code`; 502 when neither states a 4xx/5xx), THEIRS is the 200 that
carried it. The engine zero-bills it; no fn can bill an error.

Under `format: "raw"` the headers never reach the caller, so the lifecycle
lifts the codes into the shape `format: "json"` would have carried —
`{status_code, headers: {x-brd-*}, body}` — and a failure reads the same
whichever format was asked for. Under `format: "json"` the body already IS
that envelope and passes through.

The fixture allowlist (`RECORDED_RES_HEADERS`) grows by
`x-brd-status-code`, `x-brd-error-code` and `x-brd-err-code`, so the
recorded chains pin the rule. `x-brd-error`, the prose message, is left out
on purpose: its `premium` form embeds the zone's control-panel edit url,
which identifies the account. The rule still reads it live, so the 403
policy case the reference documents with a message and no code is caught.

Superseded: the first revision metered DELIVERY instead (`PER_UNIT`·`RESULT`
settled 0|1 on an empty payload), because headers were believed unreachable
from a fn. They are reachable from a lifecycle, and the drill shows the
empty-body proxy was wrong in both directions: `wrong_api` fails with a
NON-empty body (it would have billed), and a target that legitimately
answers an empty 200 is a delivered unlock Bright Data charges for (it would
have under-billed).

## D5 — Errors are bare strings, and pass through untouched

Bright Data rejects a request with a plain-text body — `Invalid token`,
`zone "x" not found` — not a JSON envelope. The engine's sniffing decode
renders a non-JSON body as the complete raw body, faithfully, and a string IS
Json; the HTTP status already flags it as a provider error and zero-bills it.

No `output.fromError`. Digesting a one-line string into `{message}` would add
a shape without adding information, and would then have to guess at a
structure for the several error strings not yet seen.

## D6 — Flat per-request billing, pinned from the published card

Both products are priced per REQUEST, not per result and not per byte:
$1.50 per 1,000 requests pay-as-you-go (`brightdata.com/pricing/serp` and
`/pricing/web-unlocker`, read 2026-09-23) — $0.0015 a call.

Per request, not per result, so the model is a flat `PER_CALL`. It is never
per ATTEMPT: a failed unlock settles as a provider error before the model is
consulted (D4), so no evidence fn has to second-guess delivery.

The pool is US DOLLARS. Bright Data publishes no credit unit — it prices in
dollars directly — so unlike Firecrawl there is no vendor-native unit to
carry, and the dollar rate is the vendor's own number rather than a
conversion (the exa posture).

Known tier concern, stated rather than modeled: the $499/month Scale plan
bills $1.30 per 1,000 above its included allowance, and an enterprise
contract prices separately. Volume pricing is an account fact, not a request
fact — nothing in the request says which tier settles it — so the doc pins
the published pay-as-you-go rate and re-audit on repricing is the guard, the
same trade apify makes with its Business-tier pins.

Free tier, for completeness: 5,000 free requests a month, SHARED across Web
Unlocker API, SERP API, Web Scraper API and Scraper Studio, no card. It is an account-level allowance with no request-level signal, so it is
not modeled either — a call under it settles at the pinned rate and the
allowance is the account's business.
