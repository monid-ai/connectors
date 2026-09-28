import { assert, assertEquals } from "@std/assert";
import { testBundle } from "@shared/testing";

const ASYNC = [
    "stealthgpt#api/stealthify/runs",
    "stealthgpt#api/stealthify/agent/runs",
];
const SYNC = [
    "stealthgpt#api/stealthify",
    "stealthgpt#api/stealthify/detect",
];

Deno.test("stealthgpt async: the two run endpoints share one interned fn per lifecycle phase", async () => {
    const bundle = await testBundle();
    const keys = (id: string) => {
        const lifecycle = bundle.endpoints[id].lifecycle;
        assert(lifecycle, `${id} must carry a lifecycle`);
        return {
            start: lifecycle.start?.$fn.key,
            poll: lifecycle.poll?.$fn.key,
        };
    };
    const humanize = keys(ASYNC[0]);
    assert(humanize.start && humanize.poll);
    assertEquals(keys(ASYNC[1]), humanize);
});

Deno.test("stealthgpt async: the sync endpoints carry no lifecycle", async () => {
    const bundle = await testBundle();
    for (const id of SYNC) {
        assertEquals(bundle.endpoints[id].lifecycle, undefined, id);
    }
});

Deno.test("stealthgpt: every doc meters the one word pool at amount 1, and the consolidate strips the account fields", async () => {
    const bundle = await testBundle();
    for (const id of [...SYNC, ...ASYNC]) {
        const doc = bundle.endpoints[id];
        assertEquals(Object.keys(doc.usage.credits), ["default"], id);
        assertEquals(doc.usage.credits.default.label, "Stealth API words", id);
        assertEquals(doc.usage.model.kind, "PER_UNIT", id);
        const consolidate = doc.usage.consolidate?.$fn.key;
        assert(consolidate !== undefined, id);
        const src = bundle.fnTable[consolidate].src;
        for (
            const field of [
                "wordsSpent",
                "creditsSpent",
                "remainingCredits",
                "billingMode",
                "meteredChargedCredits",
            ]
        ) {
            assert(src.includes(field), `${id}: consolidate strips ${field}`);
        }
    }
});
