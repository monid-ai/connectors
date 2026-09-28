# Tasks: add-connector-theagentbar

- [x] Read upstream authoring, authentication, usage, lifecycle, identity, and CI contracts.
- [x] Verify existing public menu and receipt behavior against the vendor.
- [x] Define four native paid operations and three free read operations.
- [x] Mirror the partner API input contract; keep service credentials out of agent input.
- [x] Bind purchases to the host run ID and guard run, price, currency, drink, and fulfillment before billing.
- [x] Document idempotency, free recovery, public content trust, and wallet/vendor settlement boundaries.
- [x] Add seven endpoint identities and the agent-entertainment category.
- [x] Add minimal synthetic fixtures, seven endpoint-local suites, whole-usage assertions, schema near-twins, and provider hook-provenance coverage.
- [x] Gate every live test on liveSkip; require explicit spending opt-in for the four purchases.
- [x] Consolidate the vendor meter only for purchases; preserve historical billing on free recovery.
- [x] Verify malformed success types return uncharged 502 and preserve the recovery instruction.
- [x] Require a confirmed Backbar publication before billing; cover nine missing, unpublished, or malformed publication responses across all four purchases.
- [x] Run type checks, lint, changed-file formatting, the full offline suite, and frozen deterministic compilation.
- [x] Re-run the identity guard and compare its failures with the untouched upstream baseline.
- [x] Exercise all four compiled purchase operations against the isolated local vendor Worker/D1 implementation.
## After-review onboarding and launch (outside this connector contribution)

These are operational launch tasks, not additional pre-PR submission conditions.

- [ ] Deploy and verify partner routes and API documentation in the vendor staging/production environments.
- [ ] Complete Monid's standard provider onboarding and private service-credential delivery.
- [ ] Verify hosted Monid run persistence, exactly-once wallet settlement, and lost-response recovery.
- [ ] Complete a separately authorized live purchase and reconciliation before production activation.

## Observed validation

Deno 2.9.7: `deno task check`, `deno lint`, changed-file formatting, and
`deno task version:check` passed. `deno task test`: **1168 passed (36 steps), 0 failed,
207 ignored**. The Agent Bar contributes **27 passing offline tests and seven
gated live tests**, with endpoint-local coverage for all seven operations.
The menu has no input parameters, so schema rejection is not applicable to it;
every parameterized operation tests rejection and a passing near-twin.
The 36 publication regression cases failed before the guard was added and pass
with it; valid purchases still settle their exact vendor usage.

Two forced `compiler:compile --force --frozen-meta` builds were byte-identical.
The public menu and missing-receipt live tests separately passed through the
compiled engine (two tests, zero usage). No live purchase or authenticated
production recovery test ran.

A fresh loopback-only test connected the compiled connector to the separate
local vendor Worker/D1 implementation. All four prices returned HTTP 200;
exact same-run replay returned the same delivery, a different run with the same
nonce returned uncharged HTTP 409, and get-order recovered delivery and the
historical billing record for free. The isolated database held exactly four
orders, four receipts, four Backbar messages, and four charges totaling 3800
synthetic cents. No real funds or production writes were involved.

Prior validation of the unchanged vendor implementation passed 171 unit tests
and 46 D1 integration cases, followed by an additional OpenAPI price-contract
test and type checking. That implementation is outside this repository. Neither
these local checks nor the public GETs prove hosted Monid wallet settlement or
a provider payout. These are local results; hosted CI is tracked on the PR.

## Upstream baseline exceptions

At `30422c2b3f9ca1939a2c12e0a00949eee94c7812`, `deno task ids:check` already
reports 66 compiled endpoint IDs missing from the lock and 7 stale locked IDs.
The untouched upstream checkout reproduces the identical errors. This
contribution adds only its seven IDs; unrelated provider identities are unchanged.

Whole-repository `deno fmt --check` also fails on pre-existing differences in
`.github/workflows/ci.yml` and `.github/workflows/publish-catalog.yml`, reproduced
on that untouched checkout. Formatting of all changed connector/catalog files
passes. These checks are documented as failures, not passing checks.
