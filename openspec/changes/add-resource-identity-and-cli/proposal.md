# Proposal: add-resource-identity-and-cli

## Why

Provisioning a Saperly number locally works, and then the experience
falls apart:

```
[engine:run] provisioned saperly/phone-number "+14158735259" — persisted
```

That quoted string is the ONLY handle the loop prints, and it is the one
handle nothing accepts. `identifier` rides in on the provision seed and
is dropped at persist (`zOwnedResource` has no such field), so the store
keeps the uuid; every endpoint keys off `externalId`; and passing the
E.164 anywhere answers a uniform 404. The number you were just sold is a
decoy.

The same gap is a functional hole, not only an ergonomic one: Saperly's
`call.received` webhook carries the called E.164 and NO numberId, which
is why the connector's `route` already emits `{kind: "alias", e164}`
verdicts — and why nothing can act on them. `executeVerdict` reads only
the `what` half; the `who` half has never been consumed.

Meanwhile the store itself is invisible (`KvResourceStore.list()` has no
caller anywhere in the repo — the only way to see what you own is to
open Deno KV by hand), and `engine:run` answers every question with the
same 60-line JSON dump, in which the id you need next is
indistinguishable from forty fields you do not.

monid-services solved the identity half years ago: rows carry
`externalId` + `identifier` + `aliasExternalIds[]`, with one ownership
pointer row per alias and "resolution treats aliases identically". It
also carries a two-axis identity — generic `resourceType`
(`phone_number`) beside the unique def `resourceSlug`
(`SaperlyPhoneNumber`). Connectors has the slug half (the resource id is
`<provider>/<slug>`) and neither of the others.

## What changes

- **Generic `type` on a resource def** (`ResourceType`, a CLOSED
  vocabulary holding exactly the one kind this repo ships,
  `phone_number`). The id stays the unique provider-scoped identity; the
  type is the cross-provider axis that `--provider` and the id
  structurally cannot express. Compiled into the doc as inline data.
- **DECLARED lookup keys** (`keys: { e164: "$.phoneNumber" }`) — named
  paths into the resource's own `data` snapshot. This is the deliberate
  improvement on services' flat `aliasExternalIds: string[]`, which is
  anonymous (nothing says what an entry means), unretirable, and filled
  by per-type factory code. Named keys are additive, retirable,
  debuggable, and compile-checked: a path naming no field in the data
  schema is a DEAD lookup and fails the build rather than silently
  never resolving.
- **Rows carry identity**: `zOwnedResource` gains `type`, `identifier`
  and resolved `keys`. `persistEffects` stops discarding the seed's
  `identifier`.
- **The local store indexes the keys**: a new
  `["index", <resourceId>, <keyName>, <value>] → { externalId }` row per
  resolved key, written and deleted in the SAME atomic commits as the
  row, re-derived on every refresh. Every read path (`get`, `owned`,
  `release`, `refresh`, `forget`) resolves a handle through it first, so
  the ownership gate accepts either handle with no engine change — the
  gate already delegates to the reader port.
- **`resources reindex`**: rebuild the index from stored data after a
  def gains a key. Re-provisioning a live resource to pick up an index
  would mean buying it twice.
- **The webhook loop reads `who`**: verdicts resolve to a concrete owned
  row (including the previously-dead `alias` arm) and name the owner
  before acting.
- **`deno task resources`** — list / inspect / released / reindex /
  forget over the local store, with composable `--provider`, `--type`,
  `--resource` filters, mirroring `catalog`'s shape so the two read
  alike. `catalog` browses DEFINITIONS; `resources` browses INSTANCES.
- **A shared presentation layer** (`scripts/output.ts`): aligned tables,
  field blocks and status marks via `@cliffy/table` + `@std/fmt/colors`
  — both ALREADY in `deno.lock` as transitive deps of `@cliffy/command`,
   so this adds presentation, not dependencies. Mode is detected: a
  terminal gets the summary, a pipe gets JSON, `-j` / `--pretty` force
  it. `engine:run` gains a summary that puts the provisioned id on its
  own line and names a declared-vs-settled usage gap.

## What does NOT change

The engine's gate logic (resolution is the reader's job, by design), the
run pipeline, usage settlement, `zResourceTarget` (still externalId-only
— a lookup key is an index INTO identity, never a second identity), the
fixture-window posture (`--resources` rows stay authoritative over
themselves), and every non-resource connector's compiled bytes.

No migration: the resource family is unreleased and `saperly/phone-number`
is the only resource def in tree. Rows already in a local store are
repaired by `resources reindex`.

## Impact

- specs: connector-schema, connector-compiler, local-host-loop,
  saperly-connector (amendments)
- code: `shared/core/schema/resource/{type,keys,def,doc,target,owned,query,mod}.ts`
  (the former `row.ts` split one-shape-one-file: `target.ts` the
  cross-doc address, `owned.ts` the owned instance, `query.ts` the
  reader-port query — "row" was the backend framing D41 rejected),
  `shared/core/catalog.ts`, `shared/compiler/compile.ts`,
  `scripts/{store/kv,run,catalog,webhook,output,resources}.ts`,
  `connectors/saperly/resources/phone-number/resource.ts`, `deno.json`
- tests: `scripts/store/kv.test.ts` (new, 14), `engine/resources.test.ts`
  (+2 compiler cases)
