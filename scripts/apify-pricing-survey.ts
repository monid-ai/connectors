/**
 * deno task apify:pricing   (requires APIFY_API_KEY)
 *
 * The PRICING drift guard, v3 (designs D18/D19/D26), repeatable: for
 * every apify doc, fetch the actor's CURRENT published pricing
 * (`GET /v2/acts/{id}` → pricingInfos[latest]) and check the declared
 * `usage.model` — WHICH IS the rate card (design D26) — on THREE levels:
 *
 *   1. SHAPE (all docs): published FLAT events (names matching /start/ or
 *      `request` — the run-scoped charges) → the model must carry a flat
 *      line; published METERED events (per item/page/profile…) → the
 *      model must carry a metered line.
 *   2. JOIN (all billable lines): every declared line's vendor event name
 *      (`vendor ?? id` — ids are OUR snake_case, `vendor` carries the
 *      actor's native spelling when it differs) MUST appear among the
 *      published `actorChargeEvents` keys, so a vendor rename/removal
 *      fails NAMING the line instead of silently breaking the join. The
 *      reverse direction stays shape-level only: published add-on events
 *      we deliberately don't bill (filter-applied, video-download…) must
 *      not fail the guard.
 *   3. RATES (design D26 — REVERSES D18's "no rates in docs"): every
 *      pinned `consumes.amount` must equal the LIVE GOLD-tier event price
 *      (`eventTieredPricingUsd.GOLD.tieredEventPriceUsd ?? eventPriceUsd`
 *      — our plan tier). The def is the rate card the broker prices from,
 *      so a vendor repricing must fail HERE, not on an invoice.
 *
 * Exit 1 on any mismatch or pricing REGIME change (pricingModel ≠
 * PAY_PER_EVENT) — the pricing counterpart of the schema drift guard.
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
    model: UsageModel,
): { flat: boolean; metered: boolean } {
    switch (model.kind) {
        case "FREE":
            // defensive — no apify actor is free-modeled (design D25)
            return { flat: false, metered: false };
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
        default:
            // EXHAUSTIVENESS: a new model kind fails `deno task check` here
            model satisfies never;
            throw new Error("unknown model kind");
    }
}

/** The doc's billable lines as (our id, vendor join name, pinned $). */
function declaredLines(
    model: UsageModel,
): Array<{ id: string; join: string; amount: number }> {
    switch (model.kind) {
        case "FREE":
            return [];
        case "PER_CALL":
            return [{
                id: "CALL",
                join: model.vendor ?? "CALL",
                amount: model.consumes.amount,
            }];
        case "PER_UNIT":
            return [{
                id: model.unit,
                join: model.vendor ?? model.unit,
                amount: model.consumes.amount,
            }];
        case "COMPOSITE":
            return Object.entries(model.components).map(([id, component]) => ({
                id,
                join: component.vendor ?? id,
                amount: component.consumes.amount,
            }));
        default:
            model satisfies never;
            throw new Error("unknown model kind");
    }
}

type ChargeEvent = {
    eventPriceUsd?: number;
    eventTieredPricingUsd?: Record<
        string,
        { tieredEventPriceUsd?: number } | undefined
    >;
};

/** Our plan tier's live price for one published event (GOLD = BUSINESS). */
function livePrice(event: ChargeEvent): number | undefined {
    return event.eventTieredPricingUsd?.["GOLD"]?.tieredEventPriceUsd ??
        event.eventPriceUsd;
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
                    actorChargeEvents?: Record<string, ChargeEvent>;
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
    const events = pricing?.pricingPerEvent?.actorChargeEvents ?? {};
    const eventNames = Object.keys(events);
    const published = {
        flat: eventNames.some((name) => FLAT_EVENT.test(name)),
        metered: eventNames.some((name) => !FLAT_EVENT.test(name)),
    };
    const declared = declaredShape(doc.usage.model);
    const shapeOk = published.flat === declared.flat &&
        published.metered === declared.metered;
    // JOIN + RATE checks (design D26): every declared line resolves to a
    // published event by `vendor ?? id`, at exactly the pinned amount —
    // the reverse stays shape-level (unmodeled add-ons ok).
    const missing: string[] = [];
    const repriced: string[] = [];
    for (const line of declaredLines(doc.usage.model)) {
        const event = events[line.join];
        if (event === undefined) {
            missing.push(`${line.id}→"${line.join}"`);
            continue;
        }
        const live = livePrice(event);
        if (live !== line.amount) {
            repriced.push(
                `${line.id}→"${line.join}" pinned ${line.amount} live ${
                    live ?? "(none)"
                }`,
            );
        }
    }
    const ok = shapeOk && missing.length === 0 && repriced.length === 0;
    console.log(
        `${ok ? "ok  " : "DRIFT"} ${doc.id.padEnd(50)} events=[${
            eventNames.join(",")
        }] published(flat=${published.flat},metered=${published.metered}) ` +
            `declared(${doc.usage.model.kind}: flat=${declared.flat},metered=${declared.metered})` +
            (missing.length > 0 ? ` MISSING=[${missing.join(",")}]` : "") +
            (repriced.length > 0 ? ` REPRICED=[${repriced.join(",")}]` : ""),
    );
    if (!shapeOk) {
        failures.push(
            `${doc.id}: model shape drift — published flat=${published.flat}/` +
                `metered=${published.metered}, declared ${doc.usage.model.kind}`,
        );
    }
    if (missing.length > 0) {
        failures.push(
            `${doc.id}: line(s) [${missing.join(", ")}] join no published ` +
                `charge event [${eventNames.join(", ")}] — vendor renamed/` +
                `removed the event, or the vendor/id spelling is stale`,
        );
    }
    if (repriced.length > 0) {
        failures.push(
            `${doc.id}: RATE drift — [${repriced.join(", ")}] (GOLD tier); ` +
                `re-pin consumes.amount to the live price`,
        );
    }
}

if (failures.length > 0) {
    console.error(`\npricing drift (${failures.length}):`);
    for (const failure of failures) console.error(`  ${failure}`);
    Deno.exit(1);
}
console.log(`\nall ${docs.length} apify models match published pricing`);
