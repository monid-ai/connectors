import { z } from "zod";
import { defineResource, resourceUsage } from "@shared/core";

export default defineResource({
    slug: "connection",
    meta: {
        displayName: "Ambiguous workspace connection",
        summary: "An owned connection acting as one Ambiguous identity.",
        description:
            "Ambiguous retains the delegated credential. This resource contains an opaque connection ID and identity metadata. Release removes the delegation without deleting the workspace or revoking a key used by another client.",
    },
    data: z.object({
        workspaceId: z.string(),
        principalId: z.string(),
        displayName: z.string(),
    }).strict(),
    usage: resourceUsage.free(),
    lifecycle: {
        verify: async ({ data, utils }) => {
            const response = await utils.http({
                method: "GET",
                path: "/api/provider-connections/" + data.resource.externalId,
            });
            if (response.status === 404) {
                return {
                    active: false,
                    inactiveReason: "Connection unavailable",
                };
            }
            if (response.status !== 200) {
                throw new Error("Ambiguous connection verification failed");
            }
            return { active: true };
        },
        release: async ({ data, utils }) => {
            const response = await utils.http({
                method: "DELETE",
                path: "/api/provider-connections/" + data.resource.externalId,
            });
            if (response.status !== 204 && response.status !== 404) {
                throw new Error("Ambiguous connection release failed");
            }
            return { released: true };
        },
        refresh: async ({ data, utils }) => {
            const response = await utils.http({
                method: "GET",
                path: "/api/provider-connections/" + data.resource.externalId,
            });
            if (response.status === 404) return { active: false };
            if (response.status !== 200) {
                throw new Error("Ambiguous connection refresh failed");
            }
            return {
                active: true,
                patch: {
                    workspaceId: utils.json.str(
                        response.body,
                        "$.workspace_id",
                    ),
                    principalId: utils.json.str(
                        response.body,
                        "$.principal_id",
                    ),
                    displayName: utils.json.str(
                        response.body,
                        "$.display_name",
                    ),
                },
            };
        },
    },
    views: {
        identity: {
            label: "Current identity and workspace",
            read: async ({ data, utils }) => {
                const response = await utils.http({
                    method: "GET",
                    path: "/api/provider-connections/" +
                        data.resource.externalId,
                });
                if (response.status !== 200) {
                    throw new Error("Ambiguous connection read failed");
                }
                return response.body;
            },
        },
    },
});
