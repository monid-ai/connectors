import { z } from "zod";
import { defineEndpoint } from "@shared/core";

export default defineEndpoint({
    meta: {
        displayName: "Connect existing Ambiguous workspace",
        summary:
            "Redeem a one-time setup code from Ambiguous Settings → Connect your AI.",
        description:
            "Ambiguous retains the delegated key and returns an owned connection ID. Supply a new request_id UUID for this intent and reuse it on retries. A reused ID with different inputs fails. An expired or consumed code fails without creating a workspace.",
    },
    endpoint: "/connections/connect",
    request: { method: "POST", path: "/api/provider-connections/connect" },
    input: {
        schema: {
            body: z.object({
                setup_code: z.string().regex(/^ahc_[A-Za-z0-9_-]{43}$/),
                request_id: z.string().uuid(),
            }).strict(),
        },
    },
    resources: {
        provisions: [{
            id: "ambiguous/connection",
            seed: ({ data, utils }) => ({
                resource: "ambiguous/connection",
                externalId: utils.json.str(data.output, "$.id"),
                data: {
                    workspaceId: utils.json.str(data.output, "$.workspace_id"),
                    principalId: utils.json.str(data.output, "$.principal_id"),
                    displayName: utils.json.str(data.output, "$.display_name"),
                },
            }),
        }],
    },
});
