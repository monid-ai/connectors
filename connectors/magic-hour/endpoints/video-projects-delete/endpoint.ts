// Input schema transcribed from Magic Hour public OpenAPI (2026-10-09).
import { defineEndpoint, UsageModelKind } from "@shared/core";
import { z } from "zod";

export default defineEndpoint({
    meta: {
        displayName: "Magic Hour Delete video",
        summary: "Delete video",
        description:
            "Permanently delete the rendered video. This action is not reversible, please be sure before deleting.",
        docsUrl: "https://docs.magichour.ai/api-reference",
        categories: ["video-generation"],
    },
    endpoint: "/v1/video-projects/{id}/delete",
    request: { method: "DELETE", path: "/v1/video-projects/{id}" },
    input: { schema: { pathParams: z.object({ id: z.string() }).strict() } },
    usage: {
        model: { kind: UsageModelKind.FREE },
        consolidate: ({ data }) => ({ credits: {}, output: data.output }),
    },
});
