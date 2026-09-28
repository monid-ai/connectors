import { z } from "zod";
import { defineEndpoint } from "@shared/core";
import { signupInput } from "../../../schema/signup.ts";

export default defineEndpoint({
    meta: {
        displayName: "Create Ambiguous workspace",
        summary:
            "Create a workspace and agent, and email the accountable human a claim link.",
        description:
            "Ambiguous retains the delegated key and returns an owned connection ID. Supply a new request_id UUID for this intent and reuse it on retries. A reused ID with different inputs fails. Check human.claim_token_sent for claim-email delivery.",
    },
    endpoint: "/connections/create",
    request: { method: "POST", path: "/api/provider-connections/create" },
    input: {
        schema: {
            body: signupInput.omit({ browser_session: true }).extend({
                request_id: z.string().uuid(),
            }),
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
