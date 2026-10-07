# BetterOff read connector requirements

- The connector SHALL expose only get_setup_status, get_cash_flow, and list_recurring.
- Every endpoint SHALL call the existing /mcp endpoint with a fixed tools/call name and fixed JSON-RPC request identifier.
- The connector SHALL receive accessToken through the transport credential resolver; it SHALL NOT accept credentials, household selectors, or arbitrary tool names as model input.
- The connector SHALL preserve the structured v4 result, including dates, evidence, quality, warnings, and pagination.
- HTTP failures, JSON-RPC errors, MCP tool errors, and malformed envelopes SHALL remain provider errors with zero usage. Raw error envelopes SHALL remain available.
- Invalid inputs and missing credentials SHALL fail before a network call.
- Synthetic fixtures SHALL contain no real financial records or credentials.
- Hosted release SHALL require verified user-scoped authorization, acquisition and refresh, revocation and scope behavior, data handling, and pricing.
