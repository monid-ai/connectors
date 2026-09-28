# Add the complete Ambiguous agent catalog

Generate one native connector definition for each MCP-exposed operation in the
pinned public OpenAPI snapshot. Support both new-workspace creation and existing
workspace connection using ordinary owned resources.

The connector uses engine 0.5.0 unchanged. One normal provider credential calls
Ambiguous's provider-connection API; Ambiguous retains customer credentials and
adapts multipart, binary and finite-stream traffic to JSON. Monid's existing
resource gate supplies customer isolation. No shared schema, compiler, engine or
Relay extension is required.

The customer owns the delegated identity and its Ambiguous subscription/quota.
The Monid connector fee is zero; upstream AI consumption is not free. Activation
requires deploying the Ambiguous adapter, configuring the normal provider key,
merging/publishing the catalog and validating both setup paths live.
