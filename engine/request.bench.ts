import { validateInput } from "./request.ts";
import type { EndpointDoc } from "@shared/core";

// Run on each revision with `deno bench --allow-read --allow-env engine/request.bench.ts`.
// Synthetic inputs isolate parsing/default validation, not internet latency.
const doc = {
    id: "bench#input",
    input: {
        schema: {
            body: {
                type: "object",
                properties: {
                    rows: { type: "array", items: { type: "object" } },
                    limit: { type: "integer", default: 10 },
                },
                required: ["rows"],
            },
        },
    },
} as unknown as EndpointDoc;
for (const count of [10, 1000, 10000]) {
    const input = {
        body: {
            rows: Array.from({ length: count }, (_, id) => ({
                id,
                text: "x".repeat(100),
                nested: { score: id % 10 },
            })),
        },
    };
    const bytes = new TextEncoder().encode(JSON.stringify(input)).length;
    Deno.bench(`validateInput: ${count} nested rows / ${bytes} bytes`, () => {
        validateInput(doc, input);
    });
}
