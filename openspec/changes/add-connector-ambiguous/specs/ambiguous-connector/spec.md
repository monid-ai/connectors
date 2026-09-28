# Ambiguous connector requirements

- Every MCP-exposed operation in the pinned OpenAPI has one native operationId
  registration. Coverage accounts for every other published HTTP operation.
- Use the existing 0.5.0 provider-auth, JSON transport, lifecycle and resource
  contracts. Make no shared engine/compiler/schema or Relay changes.
- New-workspace signup and existing-workspace setup-code redemption provision
  owned connections. Ambiguous retains the customer key; only connection IDs and
  identity metadata enter Monid resources or setup output.
- Setup takes a stable request UUID for retry deduplication. Failed connection
  never creates a workspace. Retries preserve intent and do not duplicate signup.
- Every ordinary operation passes the Monid ownership gate before egress. The
  Ambiguous adapter independently binds connections to the configured provider key
  and dispatches the delegated credential through the ordinary API middleware.
- List only owned connections. Resource release removes the delegation without
  deleting the customer workspace or revoking a key used by another client.
- Preserve published inputs, null clearing, file bytes, response status and useful
  headers. Where a mutation body schema is absent, accept an optional JSON object
  and defer validation to the destination instead of inventing a schema.
- Native permissions, scopes, quota, approval, expiry and revocation apply. Claim
  and merge changes appear through live resource identity refresh.
- The Monid fee is zero; Ambiguous customer-plan and paid-action charges remain
  upstream. Tests must not equate synthetic adapter responses with deployment.
