# Tasks: add-connector-philidor

## 1. Provider and scope

- [x] 1.1 Verify the public OpenAPI, docs URLs, auth convention, access model,
      rate limits, and absence of a per-call vendor meter.
- [x] 1.2 Define the provider with bearer auth, FREE usage, timeouts, categories,
      notes, and the uniform error digest.
- [x] 1.3 Keep the first connector read-only: exclude dashboard/admin routes,
      webhooks, SSE, and limited-release Decisioning routes.

## 2. Endpoints

- [x] 2.1 Vault discovery and vault detail.
- [x] 2.2 DeFi events, security incidents, and news-risk signals.
- [x] 2.3 RWA discovery and institutional asset detail.
- [x] 2.4 Lending-market discovery and reserve-level detail.
- [x] 2.5 Mirror query/path names, enums, and bounds from OpenAPI with no wire
      transform.

## 3. Fixtures and tests

- [x] 3.1 Record real, trimmed happy fixtures for all nine endpoints.
- [x] 3.2 Record a real 404 and verify the error digest and zero usage.
- [x] 3.3 Verify endpoint inventory, shared auth/error hooks, FREE settlement,
      raw-response fidelity, URL construction, and representative input gates.
- [x] 3.4 Run a credential-gated live endpoint test.

## 4. Verification

- [x] 4.1 Run format, lint, check, offline tests, live tests, double-compile
      determinism, version check, and catalog inspection.
