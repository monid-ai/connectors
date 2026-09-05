import { assert } from "@std/assert";
import { liveSkip, testBundle } from "@shared/testing";

/**
 * DRIFT GUARD (DECISION 2 of add-async-run-protocol): the checked-in static
 * input schemas are scaffolded from each actor's PUBLISHED schema; this
 * live-gated test re-fetches them and flags divergence — a `test:live`
 * signal, never a deterministic-build break. Refresh = re-run
 * `deno task apify:scaffold <actorId> --name <endpoint>`.
 *
 * The check is deliberately one-directional and loose (schemas are
 * non-strict passthrough, so drift cannot reject valid input): every
 * property the actor now REQUIRES must exist in the checked-in schema —
 * a missing required field is the drift that breaks callers.
 */
Deno.test({
    name: "apify schema drift guard (gated on APIFY_API_KEY)",
    ignore: liveSkip("apify"),
    fn: async () => {
        const token = Deno.env.get("APIFY_API_KEY")!;
        const bundle = await testBundle();
        const apifyDocs = Object.values(bundle.endpoints)
            .filter((doc) => doc.provider === "apify");
        const failures: string[] = [];
        for (const doc of apifyDocs) {
            // actor path id rides in the start request url:
            // https://api.apify.com/v2/acts/{owner~name}/runs
            const match = doc.request.url.match(/\/v2\/acts\/([^/]+)\/runs$/);
            assert(match, `${doc.id}: start url is not an actor-runs url`);
            const response = await fetch(
                `https://api.apify.com/v2/acts/${match[1]}/builds/default`,
                { headers: { authorization: `Bearer ${token}` } },
            );
            if (!response.ok) {
                failures.push(`${doc.id}: builds/default → ${response.status}`);
                await response.body?.cancel();
                continue;
            }
            const body = await response.json() as {
                data?: {
                    actorDefinition?: {
                        input?: {
                            properties?: Record<string, unknown>;
                            required?: string[];
                        };
                    };
                };
            };
            const live = body.data?.actorDefinition?.input;
            if (!live) {
                failures.push(`${doc.id}: actor publishes no input schema`);
                continue;
            }
            const compiled = doc.input.schema.body?.properties as
                | Record<string, unknown>
                | undefined;
            for (const required of live.required ?? []) {
                if (!compiled || !(required in compiled)) {
                    failures.push(
                        `${doc.id}: actor now REQUIRES "${required}" — ` +
                            `re-run deno task apify:scaffold`,
                    );
                }
            }
        }
        assert(failures.length === 0, `schema drift:\n${failures.join("\n")}`);
    },
});
