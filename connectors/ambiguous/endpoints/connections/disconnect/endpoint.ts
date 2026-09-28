import { z } from "zod";
import { defineEndpoint } from "@shared/core";

export default defineEndpoint({
    meta: {
        displayName: "Disconnect Ambiguous workspace",
        summary:
            "Release your owned connection without deleting the Ambiguous workspace.",
    },
    endpoint: "/connections/disconnect",
    request: { method: "GET", path: "/api/users/me" },
    input: {
        schema: {
            pathParams: z.object({ monid_connection: z.string().uuid() })
                .strict(),
        },
    },
    resources: {
        releases: [{
            id: "ambiguous/connection",
            key: "$.pathParams.monid_connection",
            as: "connection",
        }],
    },
    lifecycle: {
        start: async () => ({
            kind: "COMPLETED",
            httpStatus: 200,
            output: { disconnected: true },
        }),
    },
});
