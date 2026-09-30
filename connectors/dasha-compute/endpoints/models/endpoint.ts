import { defineEndpoint, UsageModelKind } from "@shared/core";

/**
 * Dasha Compute models — GET /compute/api/v1/models. The LIVE catalog:
 * advertised community ids only while Macs serve them (the hosted floor
 * appears only while it is serving). Free — listing bills nothing on the
 * vendor side, so the endpoint overrides the provider's flat model with
 * FREE. Call this before routing a chat completion.
 */
export default defineEndpoint({
    meta: {
        displayName: "Dasha Compute Models",
        summary:
            "List live model ids — which community Macs are online right now.",
        description: "List the models currently served, with the number of " +
            "providers online per id, measured tokens/sec when known, " +
            "and the flat per-completion price. The list is live state: " +
            "an empty list means no Mac is online, not an error. Use an " +
            "id from here as 'model' in chat completions.",
        docsUrl: "https://lobby.getdasha.com/compute/api",
        categories: ["llm-inference"],
    },
    endpoint: "/models",
    request: { method: "GET", path: "/api/v1/models" },
    timeouts: { requestMs: 15_000, runMs: 20_000 },
    usage: { model: { kind: UsageModelKind.FREE } },
});
