// Input schema transcribed from Magic Hour public OpenAPI (2026-10-09).
import { defineEndpoint, UsageModelKind } from "@shared/core";
import { z } from "zod";

export default defineEndpoint({
    meta: {
        displayName: "Magic Hour Get face detection details",
        summary: "Get face detection details",
        description:
            "Get the details of a face detection task. \n\nUse this API to get the list of faces detected in the image or video to use in the [face swap photo](https://docs.magichour.ai/api-reference/image-projects/face-swap-photo) or [face swap video](https://docs.magichour.ai/api-reference/video-projects/face-swap-video) API calls for multi-face swaps.",
        docsUrl: "https://docs.magichour.ai/api-reference",
        categories: ["image-generation"],
    },
    endpoint: "/v1/face-detection/{id}",
    request: { method: "GET", path: "/v1/face-detection/{id}" },
    input: { schema: { pathParams: z.object({ id: z.string() }).strict() } },
    usage: {
        model: { kind: UsageModelKind.FREE },
        consolidate: ({ data }) => ({ credits: {}, output: data.output }),
    },
});
