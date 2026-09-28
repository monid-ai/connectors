import { defineEndpoint } from "@shared/core";

export default defineEndpoint({
    meta: {
        displayName: "List Ambiguous connections",
        summary: "List connections owned by your Monid workspace.",
    },
    endpoint: "/connections/list",
    request: { method: "GET", path: "/api/users/me" },
    resources: { reads: [{ id: "ambiguous/connection" }] },
    lifecycle: {
        start: async ({ utils }) => ({
            kind: "COMPLETED",
            httpStatus: 200,
            output: (await utils.resources.owned({
                resource: "ambiguous/connection",
            })).map((row) => ({
                connectionId: row.externalId,
                ...row.data && typeof row.data === "object" &&
                        !Array.isArray(row.data)
                    ? row.data
                    : {},
            })),
        }),
    },
});
