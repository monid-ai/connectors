// Input schema transcribed from Magic Hour public OpenAPI (2026-10-09).
import { defineEndpoint, UsageModelKind } from "@shared/core";
import { z } from "zod";

export default defineEndpoint({
    meta: {
        displayName: "Magic Hour Get audio details",
        summary: "Get audio details",
        description:
            "Check the progress of a audio project. The `downloads` field is populated after a successful render.\n  \n**Statuses**\n- `queued` — waiting to start\n- `rendering` — in progress\n- `complete` — ready; see `downloads`\n- `error` — a failure occurred (see `error`)\n- `canceled` — user canceled\n- `draft` — not used",
        docsUrl: "https://docs.magichour.ai/api-reference",
        categories: ["speech"],
    },
    endpoint: "/v1/audio-projects/{id}",
    request: { method: "GET", path: "/v1/audio-projects/{id}" },
    input: { schema: { pathParams: z.object({ id: z.string() }).strict() } },
    usage: {
        model: { kind: UsageModelKind.FREE },
        consolidate: ({ data }) => ({ credits: {}, output: data.output }),
    },
});
