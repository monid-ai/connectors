# Tasks: refine-resource-model

## 1. Enums + estimate merge (W1)

- [x] 1.1 `z.enum(ConstObject)` for `PeriodAnchor` (→ CREATION_TIME |
      CALENDAR), `ResourceInteraction`, `StopKind`.
- [x] 1.2 `zEstimateData.elapsedMs?` + typed layer; doc/def
      `usage.updateEstimateEveryMs`; DELETE `usage.accrue` (schema,
      compiler, engine, docs); `accrued()` delegates to estimate;
      coherence: updateEstimateEveryMs ⇒ poll + metered.
- [x] 1.3 Saperly place-calls/inbound-calls: merged estimate (60 s
      floor), `updateEstimateEveryMs: 30_000`; tests updated.

## 2. Resource shapes (W2)

- [x] 2.1 `usage` rate card (`period` + `lines` fixed/estimated) +
      `reconcileUsage` sibling (`everyMs` floor 1 h, `get`); REQUIRED;
      `resourceUsage.free()` helper; leads/buffer/holdCadence deleted.
- [x] 2.2 `ops` → `lifecycle` (`verify`/`release`/`refresh`);
      `ResourceRow` → `OwnedResource`; op ctx `{resource}` (target
      removed); reader/testing surfaces renamed.
- [x] 2.3 `externals` → `views` (`{label?, read}`); `display` +
      `utils.external` deleted.
- [x] 2.4 Compiler + engine (`RunnableResource.verify/reconcileUsage/
      view`) + saperly resource + tests updated.

## 3. Bindings (W3)

- [x] 3.1 `resources:` purpose-keyed arrays (provisions/uses/updates/
      releases/reads) with per-purpose schemas, `as` aliases, ≤1
      provisions; compiled doc + fnKeysOf.
- [x] 3.2 Engine: canonical gate order, `data.resources[alias]`
      injection into lifecycle fns, settle-mark union.
- [x] 3.3 Compiler coherence (dead-key per entry, alias uniqueness,
      input ⊇ slot per purpose); saperly endpoints rewritten; tests.

## 4. Webhooks (W4)

- [x] 4.1 Flatten (`account` wrapper dies); `correlate`+`dispatch` →
      `route` → `{who, what}`; verify.payload template (must contain
      ${rawBody}); resource-scope same shape (subscribe required there).
- [x] 4.2 Compiler/doc shapes + saperly provider route fn + tests.

## 5. Slugs + identity lock (W5)

- [x] 5.1 ResourceDef required `slug` (loader folder===slug); endpoint
      `endpoint:` stays optional (`?? request.path` default kept —
      amended post-review; the ids.lock is the rename guard).
- [x] 5.2 `connectors/ids.lock.json` + `scripts/ids-check.ts`
      (`deno task ids:check [--update]`).

## 6. Local host loop (W6)

- [x] 6.1 `IResourceStore` port (provision/refresh/release/get/list +
      owned) + Deno KV adaptor (`scripts/store/kv.ts`; --unstable-kv in
      tasks).
- [x] 6.2 `engine:run` wired to the store (seeds + effects persist;
      `--resources` overrides).
- [x] 6.3 `scripts/webhook.ts simulate` (sign + verify + route +
      `--execute`) and `listen` behind `TunnelAdaptor`
      (cloudflared/tailscale/none).

## 7. Docs + verification (W7)

- [x] 7.1 DEVELOPMENT.md Resources chapter rewrite; README/AGENT.md
      touch-ups; CLI reference rows.
- [x] 7.2 Full gates: check/lint/test; byte-identical recompile of all
      pre-existing connectors; version:check; ids:check; openspec
      validate.
