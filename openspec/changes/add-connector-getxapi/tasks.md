# Tasks: add-connector-getxapi

## 1. Drill the vendor surface

- [x] 1.1 Capture the public OpenAPI (`https://docs.getxapi.com/openapi.json`,
      3.1.0): base URL, Bearer auth, every query parameter of the 25 reads
- [x] 1.2 Pin the rate card against `https://www.getxapi.com/pricing` and
      each operation's description: $0.001 per call, `tweet/thread` $0.005,
      `user/tweets/complete` $0.003
- [x] 1.3 Verify live that no response carries a meter (no `consolidate`)
      and that non-2xx answers are real status codes (404, 401, 400)
- [x] 1.4 Verify live that `user/status` answers a missing account with a
      200 `not_found`, which is therefore billed
- [x] 1.5 Verify every field an endpoint description names against a live
      response (profile fields, tweet counts, `canDm` on both follower
      routes, `usernameChanges`, trend `query` and `search_url`)

## 2. Provider

- [x] 2.1 `provider.ts`: Bearer auth, `/twitter` base URL, 30 s timeouts,
      `US dollars` pool, `output.fromError` digest, four provider notes
- [x] 2.2 `schema/common.ts`: `zUserName`, `zNumericId`, `zCursor`

## 3. Endpoints

- [x] 3.1 25 `endpoint.ts` + `schema/inputs.ts`, each a `PER_CALL` line
- [x] 3.2 `user/tweets` as a union of two strict arms

## 4. Tests and fixtures

- [x] 4.1 Record a live happy fixture per endpoint (`deno task record`)
- [x] 4.2 Record the error chains: two 404s, one 401, the billed
      `not_found`
- [x] 4.3 `provider.test.ts`: rate table, uniform doc shape, happy replay for
      every endpoint, error digests, strict gates, one gated live test
- [x] 4.4 Add the 25 ids to `connectors/ids.lock.json`
- [x] 4.5 `deno task check`, `deno task test`, `deno lint`, `deno fmt`,
      `deno task version:check` clean
