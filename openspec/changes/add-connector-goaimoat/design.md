# Design: add-connector-goaimoat

Only the choices the connector was forced to make. Everything else follows
the precedents in `.claude/commands/provider-port.md` (sync POST → exa).

## D1 — FREE usage classification

The audit is free today (0 credits on every plan), matching the live
goaimoat free tier (one full audit per email). `usage.model.kind` is
`FREE`, so the connector never bills; the paywall is enforced upstream by
goaimoat (valid email required), not by the connector.

## D2 — X-API-Key header auth

`auth: { inject: presets.auth.header("X-API-Key") }` — the provider injects
the caller's key on every request. The connector itself holds no secret;
the key is resolved by the broker at run time.

## D3 — Single POST endpoint, strict schema

One endpoint `POST /api/audit`. The input schema is `.strict()`:
`brand_name` is a required non-empty string; `category` is optional;
`score` is an optional int bounded 0–30. A missing `brand_name` or an
out-of-range `score` is rejected before the wire (INVALID_INPUT), covered
by schema-gate tests.

## D4 — Recorded fixtures, no live key

No goaimoat API key is held in the repo. `happy.json` and
`provider-error.json` are recorded responses (`{ core_thesis, access, ... }`
on 200; `{ error }` on 500). URLs and bodies were produced by the engine
with a stub fetch, so they match what the compiled doc actually issues.
