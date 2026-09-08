/**
 * deno task apify:pricing   (requires APIFY_API_KEY)
 *
 * The PRICING drift guard — the survey behind designs D18/D19, repeatable:
 * for every apify doc, fetch the actor's CURRENT published pricing
 * (`GET /v2/acts/{id}` → pricingInfos[latest]) and check the declared
 * `usage.model` against the published charge events on TWO levels:
 *
 *   1. SHAPE (all docs): published FLAT events (names matching /start/ or
 *      `request` — the run-scoped charges) → the model must carry a flat
 *      component; published METERED events (per item/page/profile…) → the
 *      model must carry a metered component.
 *   2. EXACT ids (composite docs, design D19): every declared component id
 *      MUST appear among the actor's published `actorChargeEvents` keys —
 *      component ids are the vendor's event names VERBATIM, so a vendor
 *      rename/removal fails NAMING the id instead of silently breaking
 *      the broker's per-event join. The reverse direction stays
 *      shape-level only: published add-on events we deliberately don't
 *      bill (filter-applied, video-download…) must not fail the guard.
 *
 * RATES are deliberately NOT checked — apify event prices are tiered by
 * OUR subscription plan (verified: eventTieredPricingUsd FREE→DIAMOND),
 * so rates live in the hosted rate card; reconciling card vs reported
 * cost is a services-side alert. Exit 1 on any mismatch or pricing
 * REGIME change (pricingModel ≠ PAY_PER_EVENT) — the pricing counterpart
 * of the schema drift guard.
 */
import { type EndpointDoc, type UsageModel } from "@shared/core";
import { compileToOutput } from "./lib.ts";

const token = Deno.env.get("APIFY_API_KEY");
if (!token) {
    console.error("APIFY_API_KEY is required (live survey)");
    Deno.exit(2);
}

const FLAT_EVENT = /(^|[-_])start($|[-_])|^request$/;

function declaredShape(
    model: UsageModel | undefined,
): { flat: boolean; metered: boolean } {
    if (!model) return { flat: false, metered: false };
    switch (model.kind) {
        case "PER_CALL":
            return { flat: true, metered: false };
        case "PER_UNIT":
            return { flat: false, metered: true };
        case "COMPOSITE": {
            const components = Object.values(model.components);
            return {
                flat: components
                    .some((component) => component.kind === "PER_CALL"),
                metered: components
                    .some((component) => component.kind === "PER_UNIT"),
            };
        }
    }
}

const { bundle } = await compileToOutput();
const docs = Object.values(bundle.endpoints)
    .filter((doc): doc is EndpointDoc => doc.provider === "apify")
    .sort((a, b) => a.id.localeCompare(b.id));

const failures: string[] = [];
for (const doc of docs) {
    const match = doc.request.url.match(/\/v2\/acts\/([^/]+)\/runs$/);
    if (!match) {
        failures.push(`${doc.id}: start url is not an actor-runs url`);
        continue;
    }
    const response = await fetch(
        `https://api.apify.com/v2/acts/${match[1]}`,
        { headers: { authorization: `Bearer ${token}` } },
    );
    if (!response.ok) {
        failures.push(`${doc.id}: actor fetch → ${response.status}`);
        await response.body?.cancel();
        continue;
    }
    const body = await response.json() as {
        data?: {
            pricingInfos?: Array<{
                pricingModel?: string;
                pricingPerEvent?: {
                    actorChargeEvents?: Record<string, unknown>;
                };
            }>;
        };
    };
    const infos = body.data?.pricingInfos ?? [];
    const pricing = infos[infos.length - 1];
    const regime = pricing?.pricingModel ?? "(none)";
    if (regime !== "PAY_PER_EVENT") {
        failures.push(
            `${doc.id}: pricing REGIME changed — actor publishes ${regime}`,
        );
        continue;
    }
    const events = Object.keys(
        pricing?.pricingPerEvent?.actorChargeEvents ?? {},
    );
    const published = {
        flat: events.some((name) => FLAT_EVENT.test(name)),
        metered: events.some((name) => !FLAT_EVENT.test(name)),
    };
    const declared = declaredShape(doc.usage.model);
    const shapeOk = published.flat === declared.flat &&
        published.metered === declared.metered;
    // EXACT id check (design D19): declared component ids ⊆ published
    // event names — the reverse stays shape-level (unmodeled add-ons ok).
    const missingIds = doc.usage.model?.kind === "COMPOSITE"
        ? Object.keys(doc.usage.model.components)
            .filter((id) => !events.includes(id))
        : [];
    const ok = shapeOk && missingIds.length === 0;
    console.log(
        `${ok ? "ok  " : "DRIFT"} ${doc.id.padEnd(50)} events=[${
            events.join(",")
        }] published(flat=${published.flat},metered=${published.metered}) ` +
            `declared(${
                doc.usage.model?.kind ?? "none"
            }: flat=${declared.flat},metered=${declared.metered})` +
            (missingIds.length > 0
                ? ` MISSING ids=[${missingIds.join(",")}]`
                : ""),
    );
    if (!shapeOk) {
        failures.push(
            `${doc.id}: model shape drift — published flat=${published.flat}/` +
                `metered=${published.metered}, declared ${
                    doc.usage.model?.kind ?? "none"
                }`,
        );
    }
    if (missingIds.length > 0) {
        failures.push(
            `${doc.id}: component id(s) [${missingIds.join(", ")}] not in ` +
                `the actor's published charge events [${events.join(", ")}] ` +
                `— vendor renamed/removed the event, or the id is stale`,
        );
    }
}

if (failures.length > 0) {
    console.error(`\npricing drift (${failures.length}):`);
    for (const failure of failures) console.error(`  ${failure}`);
    Deno.exit(1);
}
console.log(`\nall ${docs.length} apify models match published pricing`);
