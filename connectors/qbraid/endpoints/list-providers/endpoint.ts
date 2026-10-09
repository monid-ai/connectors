import { defineEndpoint } from "@shared/core";

/** GET /providers — list providers */
export default defineEndpoint({
    meta: {
        displayName: "List Quantum Providers",
        summary: "The public quantum hardware providers on qBraid.",
        description: "List the global, publicly visible quantum computing " +
            "providers on qBraid — name, qrn, description, logo and " +
            "documentation links. Providers owned by an organization, and " +
            "private or unapproved ones, are not included. Use the " +
            "returned _id as providerId to narrow qbraid#list-devices to " +
            "one provider's hardware. Needs no key; free.",
        docsUrl: "https://docs.qbraid.com/v2/api-reference",
        categories: ["quantum-computing"],
    },
    endpoint: "/list-providers",
    request: { method: "GET", path: "/providers" },
    input: { schema: {} },
});
