import { assertEquals } from "@std/assert";
import { testBundle } from "@shared/testing";

const ENDPOINTS = [
    "pieterpost#create-credit-topup",
    "pieterpost#create-compose-link",
    "pieterpost#create-checkout-link",
    "pieterpost#create-direct-order",
    "pieterpost#get-order",
    "pieterpost#get-wallet",
] as const;

const CREATE_ENDPOINTS = [
    "pieterpost#create-credit-topup",
    "pieterpost#create-compose-link",
    "pieterpost#create-checkout-link",
    "pieterpost#create-direct-order",
] as const;

Deno.test("pieterpost docs: shared bearer auth, lifecycle relay, and free usage", async () => {
    const bundle = await testBundle();
    const first = bundle.endpoints[ENDPOINTS[0]];
    for (const id of ENDPOINTS) {
        const doc = bundle.endpoints[id];
        assertEquals(doc.auth.inject.$fn.key, first.auth.inject.$fn.key, id);
        assertEquals(doc.input.toRequest, undefined, id);
        assertEquals(doc.usage.model, { kind: "FREE" }, id);
        assertEquals(
            doc.request.url.startsWith("https://pieterpost.com/v1/"),
            true,
            id,
        );
    }
    for (const id of CREATE_ENDPOINTS) {
        assertEquals(
            bundle.endpoints[id].lifecycle?.start.$fn.key,
            first.lifecycle?.start.$fn.key,
            id,
        );
    }
    assertEquals(bundle.endpoints["pieterpost#get-order"].lifecycle, undefined);
    assertEquals(
        bundle.endpoints["pieterpost#get-wallet"].lifecycle,
        undefined,
    );
});
