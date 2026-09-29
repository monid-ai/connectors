# Tasks: add-resource-identity-and-cli

## 1. Schema — the identity axes

- [x] 1.1 `shared/core/schema/resource/type.ts`: `ResourceType` const
      object + `zResourceType`, closed at `phone_number`.
- [x] 1.2 `shared/core/schema/resource/keys.ts`: `zLookupKeyName`
      (snake_case), `zResourceLookupKeys` (name → restricted JSONPath),
      `zResolvedLookupKeys` (name → value).
- [x] 1.3 `zResourceDef` gains required `type` + optional `keys`;
      `zResourceDoc` carries both as inline data.
- [x] 1.4 `zOwnedResource` gains optional `type`, `identifier`, `keys`
      (optional so a hand-written fixture window need not restate what
      the def knows); `zResourceQuery.externalId` documented as "primary
      id OR any indexed key".
- [x] 1.5 Export both new modules from the resource barrel.

## 2. Compiler

- [x] 2.1 Carry `type` + `keys` through `compileResource` into the doc.
- [x] 2.2 DEAD-lookup guard: walk each declared path against the
      compiled data schema; a segment naming no property fails
      `DOC_MALFORMED`. Permissive where the schema stops describing
      properties.
- [x] 2.3 `listResources` surfaces `type` and accepts a `type` filter.

## 3. The local store (the index)

- [x] 3.1 `["index", <resourceId>, <keyName>, <value>] → {externalId}`
      rows, written/deleted in the same atomic commits as the row.
- [x] 3.2 `KvResourceStore.open({path, defs})` — a `ResourceDefLookup`
      supplies type + key paths; `defsFromBundle(bundle)` builds it.
- [x] 3.3 `stamp()`: type from the def, `identifier ?? externalId`,
      keys resolved from `data`.
- [x] 3.4 `resolveExternalId()` behind `get`/`owned`/`release`/
      `refresh`/`forget`; unknown handles stay unknown.
- [x] 3.5 `refresh` re-derives the index (stale pointers deleted).
- [x] 3.6 `reindex()`, `released()`, `forget()`.
- [x] 3.6b Conflict guard: a provision that would repoint an indexed key
      value at a DIFFERENT externalId is refused (a resurrect of the
      same id reclaims its own keys).
- [x] 3.7 `persistEffects`/`admitInto` carry `identifier` via
      `rowFromSeed`; the provision log names the externalId too.

## 4. Webhooks

- [x] 4.1 `executeVerdict` takes the provider and resolves `who` —
      `resource` targets directly, `alias` across the provider's
      resource docs (the previously dead arm).
- [x] 4.2 Owner (or an explicit "resolves to no owned resource") is
      logged before the action runs.

## 5. CLIs

- [x] 5.1 `scripts/output.ts`: `wantsJson` (TTY detection + `-j` /
      `--pretty`), `emit`, `table`, `fields`, `mark`, `countLine`.
- [x] 5.2 `scripts/resources.ts`: `list` / `inspect` / `released` /
      `reindex` / `forget`, composable `--provider` `--type`
      `--resource`, `-j`/`--pretty` throughout.
- [x] 5.3 `deno.json`: `resources` task; `@cliffy/table` + `@std/fmt`
      import entries (already in the lock); `--unstable-kv` on the test
      tasks.
- [x] 5.4 `engine:run` human summary — status, usage (+ mismatch),
      error reason, and provisions with the externalId on its own line.
- [x] 5.5 `catalog` migrated to aligned tables + the shared mode rule.

## 6. Saperly

- [x] 6.1 Declares `type: ResourceType.PHONE_NUMBER` and
      `keys: { e164: "$.phoneNumber" }`.

## 7. Tests

- [x] 7.1 `scripts/store/kv.test.ts` (18): key resolution, stamping,
      dual-handle reads, `owned()` through the index and unfiltered,
      release/refresh index upkeep, the conflict guard (and resurrect),
      reindex repair AND key retirement, forget, no-defs posture,
      `persistEffects` identifier round-trip.
- [x] 7.2 Gate integration: engine + real store — a lookup key passes,
      the primary id passes, an unknown handle 404s with zero usage and
      zero upstream calls.
- [x] 7.3 `engine/resources.test.ts`: type + keys reach the doc; a dead
      lookup path fails compilation.
- [x] 7.4 Full suite green: `check`, `lint`, `fmt`, `version:check`, and
      `test` (1145 passed / 0 failed / 199 ignored).
      NOTE: `ids:check` reports drift for bytedance / fundable /
      hunterio / suzanne / vaquill endpoints. Verified PRE-EXISTING on
      `main` and untouched by this change (which adds no ids —
      `saperly/phone-number` is already locked), so the lock is left for
      the change that owns it.

## 8. Docs

- [x] 8.1 DEVELOPMENT.md: resource identity (two axes, three handles),
      the index layout + reindex rationale, `resources` in the CLI
      reference, the detected-output-mode rule.
- [x] 8.2 README: `resources` beside `catalog` in the quickstart; the
      resource paragraph names `type` and `keys`.
