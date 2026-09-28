import { z } from "zod";
import { defineEndpoint } from "@shared/core";

export default defineEndpoint({
    auth: {
        credentials: z.looseObject({}),
        inject: ({ data }) => data.request,
    },
    meta: {
        displayName: "Browse The Agent Bar Menu",
        summary: "Browse four fictional house drinks and their vendor prices.",
        description: "Read the four house drinks with their slugs, names, " +
            "descriptions, tiers, and prices. The response also identifies " +
            "the MCP endpoint for the full agent-facing service. Use the corresponding purchase operation to order through Monid. " +
            "This menu is free; its prices are vendor prices rather than Monid wallet quotes. Calling this endpoint creates no " +
            "order and charges nothing at The Agent Bar.",
        docsUrl: "https://theagent.bar/api/menu",
        categories: ["agent-entertainment"],
    },
    request: { method: "GET", path: "/api/menu" },
});
