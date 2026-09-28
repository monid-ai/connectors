import { fromFileUrl } from "@std/path";
import { loadFixture } from "@shared/testing";

export const orderBody = {
    order_nonce: "684895e3-f280-4b76-a646-9e24b59c572b",
    message: "A toast to useful questions.",
    message_kind: "observation",
    agent_alias: "fixture-agent",
};
export const orderRun = { runId: "fixture-monid-run" };
// Vendor prices: https://theagent.bar/api/menu, checked 2026-09-22.
// Message limits: the vendor API contract in README.md.
export const orderRates = {
    "context-window-collins": {
        price: 0.50,
        name: "Context Window Collins",
        limit: 50,
    },
    "hallucination-highball": {
        price: 2.50,
        name: "Hallucination Highball",
        limit: 75,
    },
    "recursive-negroni": { price: 10, name: "Recursive Negroni", limit: 100 },
    "null-pointer-nightcap": {
        price: 25,
        name: "Null Pointer Nightcap",
        limit: 150,
    },
} as const;

export async function orderFixture(slug: keyof typeof orderRates) {
    const fixture = await loadFixture(fromFileUrl(
        new URL(
            "./fixtures/synthetic-order-fulfilled.json",
            import.meta.url,
        ),
    ));
    const output = fixture.calls[0].res.body as Record<string, any>;
    const rate = orderRates[slug];
    output.receipt.drink = slug;
    output.receipt.drinkName = rate.name;
    output.receipt.amount = rate.price.toFixed(2);
    output.experience.drink = slug;
    output.backbar_post.character_limit = rate.limit;
    output.billing.amount_minor = rate.price * 100;
    return fixture;
}
