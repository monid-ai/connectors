# Ambiguous

Native Monid connector for the complete MCP-exposed Ambiguous API. The pinned
OpenAPI snapshot supplies 928 operation definitions; four connection tools
create, connect, list and disconnect workspaces. `coverage.json` accounts for
all 1,335 published HTTP operations, including 407 that Ambiguous does not
expose to MCP.

This connector uses the existing engine 0.5.0 provider auth, JSON transport and
owned resources. Ambiguous stores delegated customer credentials and adapts file
uploads and exports through its provider-connection API. No engine, compiler,
shared schema, credential-store port or Relay changes are required.

## Provider setup

Deploy Ambiguous's provider-connection API before activating the connector.
Monid configures one ordinary Ambiguous administrator API key as
`AMBIGUOUS_CREDENTIALS_API_KEY` (the usual `AMBIGUOUS_API_KEY` alias also
works). Allow `provider_connections.read` and `provider_connections.write`, or
`*`. Normal provider credential provisioning, catalog publication and
owned-resource lifecycle support are the same requirements as other
resource-backed connectors.

The Ambiguous deployment must configure `COWORKER_TOKEN_ENCRYPTION_KEY` and
apply its provider-connection migrations. This is an Ambiguous-side deployment
prerequisite, not a Monid core dependency. Synthetic connector tests do not
prove production activation; validate both setup paths against the deployed
adapter.

## Connection lifecycle

- `ambiguous#connections/create`: supply `request_id` (a new UUID),
  `agent_display_name`, `human_email`, and optional workspace name/slug.
  Ambiguous creates a provisional workspace and sends the human a claim email.
  Read `human.claim_token_sent` for delivery status.
- `ambiguous#connections/connect`: supply a new `request_id` UUID and a one-time
  `setup_code` from Ambiguous Settings → Connect your AI. An invalid or consumed
  code fails; this flow never falls back to signup.
- Reuse the same request UUID and identical input on retries. Ambiguous
  deduplicates setup and returns the existing connection. Changed inputs fail. A
  released or revoked connection cannot be recreated by replaying its setup
  request.
- Both paths return `id` and identity metadata, and provision an owned
  `ambiguous/connection` resource with that ID. Customer API keys never leave
  Ambiguous in these responses. The setup code is a one-time credential input;
  treat it as sensitive until redemption.
- `ambiguous#connections/list` reads only the current Monid ownership window.
- `ambiguous#connections/disconnect` emits the normal resource release intent;
  the resource lifecycle deletes the delegated credential on Ambiguous. It does
  not delete the workspace or revoke a customer's key used elsewhere.

Every ordinary operation requires `pathParams.monid_connection`. Monid's
existing resource gate checks ownership before egress. Ambiguous independently
checks that this connection belongs to the configured provider key, then
re-enters its full API under the delegated customer identity. Permissions,
scopes, resource access, module availability, approval, quota, expiry and
revocation remain authoritative. Key rotation requires reconnecting after the
old key's grace period ends. Live identity refresh follows workspace
claim/merge.

## Operation inputs and outputs

The endpoint ID is `ambiguous#<operationId>`. Its Monid `body` holds the native
`body`, `pathParams`, `queryParams` and `headers` groups; the outer path
selector is reserved for `monid_connection`. For example:

```json
{
    "pathParams": {
        "monid_connection": "aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa"
    },
    "body": {
        "body": { "title": "Plan", "type": "doc" }
    }
}
```

Declared upstream schemas retain their field types, required fields, nested
content and explicit nulls. Where the published API omits a mutation body
schema, there is an optional JSON object input; the destination API validates
it. This keeps legacy operations callable without inventing undocumented field
schemas. File fields become `{filename, contentType?, dataBase64}`. The provider
adapter constructs multipart requests. Declared header inputs, including
required idempotency keys, are nested under `body.headers`.

Results preserve the adapter envelope `{http_status, output, headers}`; the
engine outcome also uses `http_status` so destination errors stay errors and
carry zero Monid usage. Binary output is
`{encoding:"base64", contentType, dataBase64}`. Finite SSE output is
`{encoding:"utf8", contentType, text}`. Selected response headers include file
names, ETags, retry hints and quota headers. JSON envelope size and destination
upload limits apply. This is the finite agent API, not WebSocket or unbounded
stream transport. Long AI operations use the existing async run protocol.

Monid's connector fee is zero. Ambiguous subscriptions, AI actions and paid
operations are billed to the customer's connected workspace under its plan and
quota. These are not free AI calls.

## Verification and refresh

```sh
deno task ambiguous:check
deno test --allow-read --allow-env --allow-write connectors/ambiguous/connector.test.ts
deno run --allow-read --allow-write --allow-env --allow-net=app.ambiguous.ai scripts/ambiguous-catalog.ts --refresh
```

Review source-contract changes, generated registrations and the coverage report
before committing. The tests execute compiled artifacts on the unchanged engine
with synthetic external API responses. Ambiguous's companion API tests exercise
real PostgreSQL, both setup paths, credential lifecycle and dispatch through the
ordinary API.
