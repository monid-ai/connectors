# Design: add-connector-bowmark

## D1. Two endpoints, the library and the run

Bowmark's own agent loop is exactly two calls: look up the vocabulary, then
run a script against it. Both are exposed as-is. The run's `script` is the
whole interface; Bowmark validates arguments itself and returns
caller-fixable failures in `incomplete.failures[].fixable`, so no schema is
invented here beyond "a non-empty string".

## D2. Billing: a pinned dollar rate, no vendor claim

Bowmark prices each run in US dollars by the resources it used (proxy
traffic, browser minutes, captcha solves) at vendor cost x2, floored at
$0.001, and settles it into the account's monthly invoice. Its run envelope
deliberately does not disclose the price, so there is no receipt to pluck
and no `usage.consolidate`; the derived fold is the bill (the pdl /
keenable posture).

The pinned rate is $0.04 per run. Bowmark's measured average across paying
accounts in October 2026 was about $0.037 per run (about $0.014 per
function call; a run makes several). A single flat rate over-charges a
trivial run and under-charges a browser-heavy one; it is the honest
average until Bowmark exposes a per-run receipt, at which point a
`consolidate` replaces it and this rate becomes the cross-check.

Only runs that produced a result bill (`status` ok or partial). An `error`
run and a `needs_user` pause bill 0 here.

## D3. The library is free

`GET /library` reads Bowmark's catalog and touches no website, so the model
is FREE. It is the call an agent should make first and often.

## D4. Timeouts sit above Bowmark's own ceiling

`/run` is synchronous and Bowmark ends a run at 120 s, so `requestMs`
130 000 / `runMs` 135 000 on the run endpoint; the provider default (30 s)
covers the library read.
