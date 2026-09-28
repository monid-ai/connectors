import { defineEndpoint, UsageModelKind } from "@shared/core";
import { zSpacesInfoQueryParams } from "./schema/inputs.ts";

/** GET /spaces/info: Get X (Twitter) Space. $0.001 per call (getxapi.com/pricing). */
export default defineEndpoint({
    meta: {
        displayName: "Get X (Twitter) Space",
        summary: "Space metadata: title, host, state, listener counts.",
        description:
            "Read an X Space by URL or id: title, host, live or ended " +
            "state, start and end times, live listener and replay counts, " +
            "and whether a replay is available. Accepts the full " +
            "`x.com/i/spaces/<id>` URL or the bare id.",
        docsUrl: "https://docs.getxapi.com/docs/spaces/spaces-info",
        categories: ["twitter"],
    },
    request: { method: "GET", path: "/spaces/info" },
    input: { schema: { queryParams: zSpacesInfoQueryParams } },
    usage: {
        model: {
            kind: UsageModelKind.PER_CALL,
            label: "space",
            consumes: { credit: "default", amount: 0.001 },
        },
    },
});
