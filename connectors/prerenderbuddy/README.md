# Prerender Buddy

Standalone AI answer checks through PB's own production API. One question
returns the answer, returned citations and supporting sources, plus optional
brand/competitor evidence. Mentions and citations have no separate charge. These
are provider API samples, not consumer-app conversations or a historical
mentions index. Brand and competitor fields inspect the collected answer; they
are never appended to the question sent to the provider.

## Endpoints and rates

Rates verified against the public rate card dated 2026-10-02. The credit pool is
**USD**, not tokens or PB subscription allowances.

| Endpoint ID                         | Purpose                                     | USD per successful answer |
| ----------------------------------- | ------------------------------------------- | ------------------------: |
| `prerenderbuddy#answers/chatgpt`    | ChatGPT answer and visibility evidence      |                     0.025 |
| `prerenderbuddy#answers/claude`     | Claude answer and visibility evidence       |                     0.024 |
| `prerenderbuddy#answers/gemini`     | Gemini answer and visibility evidence       |                     0.035 |
| `prerenderbuddy#answers/perplexity` | Perplexity answer and visibility evidence   |                    0.0058 |
| `prerenderbuddy#jobs/{id}`          | Read status and the original result/receipt |                      Free |
| `prerenderbuddy#account`            | Read prepaid balance and reservations       |                      Free |

The answer's `billing.chargedUsd` is the vendor's authoritative debit. The
compiled fixed rate cross-checks that claim. A status read preserves the same
receipt as provenance but always settles zero usage. HTTP errors, failed jobs,
missing/empty answers and invalid billing receipts also settle zero.

## Credentials and local verification

1. Create a PB account at <https://app.prerenderbuddy.com/sign-up>.
2. Open the user menu → Developer API keys. Create a key scoped to **Standalone
   AI checks** (`marketplace`). A paid PB subscription is not required.
3. Fund the separate API credit balance before running billable checks.
4. Supply `PRERENDERBUDDY_CREDENTIALS_API_KEY` (the usual
   `PRERENDERBUDDY_API_KEY` alias also works) through the local environment or
   the host's private credential configuration. Never commit it.

Example input for any answer endpoint:

```json
{
    "body": {
        "prompt": "Which garden planner is easiest for beginners?",
        "brand": {
            "name": "Garden Journal",
            "domain": "gardenjournal.example"
        },
        "competitors": [{ "name": "GrowVeg", "domain": "growveg.com" }]
    }
}
```

Garden Journal is illustrative input, not a customer result. The prompt is
5–1,000 characters; brands allow five aliases, and ten competitors can be
inspected. Hostnames have no scheme or path. Provider/model overrides are not
accepted. Saved workspace evidence, articles, publishing, rendering and
subscription management are not exposed by this connector.

## Jobs, retries and latency

Each answer endpoint submits a job and polls the same-origin PB status API until
it completes. The host's stable run ID is sent as `Idempotency-Key`; retrying
the same start activity reuses the same PB job. The caller receives one
completed answer, not a billable queue acknowledgement.

- ChatGPT, Gemini and Perplexity use queued realtime collection.
- **Claude uses native batch processing and can take hours.** Unanswered jobs
  expire after 23 hours without charging. All answer endpoints allow a 24-hour
  run budget; each HTTP request has a 30-second timeout.
- Polling follows PB's suggested cadence, bounded to 5–60 seconds; transient
  408/429/5xx lookups keep the existing job and back off to 60 seconds.
- PB provides no cancellation endpoint. Stopping Monid polling does not cancel
  PB processing or promise a refund for an answer that later completes. Hosts
  must reconcile interrupted runs by their job ID before treating them as
  financially settled. Hosted support for the long Claude deadline needs
  maintainer confirmation before activation.
- A job is owned by the **API key** that created it. Completed results are
  retained for seven days. Another key, even in the same workspace, cannot
  retrieve them.
- The pilot permits three pending jobs and ten new jobs/minute per account.
  Insufficient prepaid credit returns HTTP 402; unavailable platforms or the
  pilot spending cap return 503. Neither charges an answer.

## Fixtures and checks

Provider-level fixtures contain trimmed, PII-scrubbed real exchanges recorded
through the compiled connector. Repeated identical pending polls are omitted.
Tests exercise the sealed artifact and inject explicitly synthetic faults for
failed/empty jobs, malformed receipts, retryable lookups and input validation.

```sh
deno test --allow-read --allow-env --allow-write connectors/prerenderbuddy
deno task check
deno task test
deno task ids:check
```

The optional credential-gated live test checks the public rate card for drift
without purchasing an answer. Actual recording runs purchase one completed
answer per selected platform using the funded test key.

## Hosted activation

This connector contributes definitions and verification fixtures. Hosted
activation still requires a private, funded provider credential, agreement on
Monid's customer pricing and provider settlement, and catalog publication by the
maintainers. Monid can supply a platform credential so its users can run these
checks without individual PB accounts. No such commercial arrangement is implied
by this PR, and no live credential is included.

Contact: **support@prerenderbuddy.com**

- [API documentation](https://api.prerenderbuddy.com/v1/developer/marketplace/docs)
- [OpenAPI](https://api.prerenderbuddy.com/v1/developer/marketplace/openapi.json)
- [Public rate card](https://api.prerenderbuddy.com/v1/developer/marketplace/rate-card)
- [Privacy policy](https://prerenderbuddy.com/privacy)
- [Terms](https://prerenderbuddy.com/terms)
