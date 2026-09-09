import { type EndpointDoc, type UsageModel } from "@shared/core";
import type { DriftCtx, DriftFinding, DriftSuite } from "./contract.ts";

/**
 * The apify drift suite (design D28) — merges the two pre-D28 guards
 * (scripts/apify-pricing-survey.ts + connectors/apify/schema-drift.test.ts)
 * into one polling pass per actor:
 *
 *   1. PRICING (designs D18/D19/D26/D28): regime must stay PAY_PER_EVENT;
 *      the model's shape (flat/metered) must match the published events;
 *      every pinned `consumes.amount` must equal the LIVE GOLD-tier price
 *      (our plan tier). The line↔event join is DERIVED (D28 — no vendor
 *      field): composite line ids were MINTED from event names by one
 *      transform (strip `apify-` prefix, kebab/camel → snake), so the
 *      suite applies the same transform to the LIVE names at check time.
 *      Leaf lines (id = the unit — no name relationship) fall back to
 *      amount-existence: the pinned amount must appear among the live
 *      prices. Accepted degradations: leaf renames report as "rate
 *      vanished", and a same-price collision can mask a single leaf
 *      repricing.
 *   2. INPUT SCHEMA (DECISION 2): every property the actor now REQUIRES
 *      must exist in the checked-in schema AND be required by it
 *      (`live.required ⊆ compiled.required` — an optional→required flip
 *      breaks callers at the vendor). One-directional and loose by
 *      design: schemas are non-strict passthrough, so drift cannot
 *      reject valid input.
 *
 * --fix: schema drift → re-runs the scaffold codegen for the drifted
 * actors (generated artifact; git diff reviews). Rate drift → written to
 * `.output/drift-repin.json` (doc → line → pinned vs live), never
 * auto-applied.
 */

const FLAT_EVENT = /(^|[-_])start($|[-_])|^request$/;

/** The id-minting transform, applied to LIVE event names at check time:
 *  strip the `apify-` prefix, then kebab/dot/camelCase → snake_case. */
export function normalizeEventName(event: string): string {
    return event
        .replace(/^apify-/, "")
        .replace(/([a-z0-9])([A-Z])/g, "$1_$2")
        .replaceAll("-", "_")
        .replaceAll(".", "_")
        .toLowerCase();
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

function declaredShape(
    model: UsageModel,
): { flat: boolean; metered: boolean } {
    switch (model.kind) {
        case "FREE":
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
            model satisfies never;
            throw new Error("unknown model kind");
    }
}

/** The doc's billable lines: (our id, pinned $, leaf?). Composite ids
 *  join by name-normalization; leaf ids (the unit / CALL) have no name
 *  relationship and join by amount-existence. */
function declaredLines(
    model: UsageModel,
): Array<{ id: string; amount: number; leaf: boolean }> {
    switch (model.kind) {
        case "FREE":
            return [];
        case "PER_CALL":
            return [{ id: "CALL", amount: model.consumes.amount, leaf: true }];
        case "PER_UNIT":
            return [{
                id: model.unit,
                amount: model.consumes.amount,
                leaf: true,
            }];
        case "COMPOSITE":
            return Object.entries(model.components).map(([id, component]) => ({
                id,
                amount: component.consumes.amount,
                leaf: false,
            }));
        default:
            model satisfies never;
            throw new Error("unknown model kind");
    }
}

function actorPathId(doc: EndpointDoc): string | undefined {
    return doc.request.url.match(/\/v2\/acts\/([^/]+)\/runs$/)?.[1];
}

async function apiGet(
    path: string,
    token: string,
): Promise<{ status: number; body: unknown }> {
    const response = await fetch(`https://api.apify.com${path}`, {
        headers: { authorization: `Bearer ${token}` },
    });
    if (!response.ok) {
        await response.body?.cancel();
        return { status: response.status, body: undefined };
    }
    return { status: response.status, body: await response.json() };
}

function checkPricing(
    doc: EndpointDoc,
    actorBody: unknown,
    repins: Array<
        { docId: string; line: string; pinned: number; live: number }
    >,
): { findings: DriftFinding[]; summary: string } {
    const findings: DriftFinding[] = [];
    const body = actorBody as {
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
        findings.push({
            docId: doc.id,
            check: "regime",
            message: `pricing REGIME changed — actor publishes ${regime}`,
        });
        return { findings, summary: `regime=${regime}` };
    }
    const events = pricing?.pricingPerEvent?.actorChargeEvents ?? {};
    const eventNames = Object.keys(events);
    const published = {
        flat: eventNames.some((name) => FLAT_EVENT.test(name)),
        metered: eventNames.some((name) => !FLAT_EVENT.test(name)),
    };
    const declared = declaredShape(doc.usage.model);
    if (
        published.flat !== declared.flat ||
        published.metered !== declared.metered
    ) {
        findings.push({
            docId: doc.id,
            check: "shape",
            message: `model shape drift — published flat=${published.flat}/` +
                `metered=${published.metered}, declared ` +
                `${doc.usage.model.kind}`,
        });
    }
    const livePrices = Object.values(events)
        .map(livePrice)
        .filter((price): price is number => price !== undefined);
    for (const line of declaredLines(doc.usage.model)) {
        if (line.leaf) {
            // amount-existence (D28): a leaf id names no event; the
            // pinned amount must still be one the actor charges
            if (!livePrices.includes(line.amount)) {
                findings.push({
                    docId: doc.id,
                    check: "rate",
                    message: `leaf line ${line.id}: pinned ${line.amount} ` +
                        `matches NO live GOLD-tier price ` +
                        `[${livePrices.join(", ")}] — vendor repriced or ` +
                        `removed the event; re-pin consumes.amount`,
                });
                repins.push({
                    docId: doc.id,
                    line: line.id,
                    pinned: line.amount,
                    live: livePrices.length === 1 ? livePrices[0] : NaN,
                });
            }
            continue;
        }
        const eventName = eventNames
            .find((name) => normalizeEventName(name) === line.id);
        if (eventName === undefined) {
            findings.push({
                docId: doc.id,
                check: "join",
                message: `line ${line.id}: no published charge event ` +
                    `normalizes onto it [${eventNames.join(", ")}] — ` +
                    `vendor renamed/removed the event, or the id is stale`,
            });
            continue;
        }
        const live = livePrice(events[eventName]);
        if (live !== line.amount) {
            findings.push({
                docId: doc.id,
                check: "rate",
                message: `line ${line.id} ("${eventName}"): pinned ` +
                    `${line.amount}, live GOLD ${live ?? "(none)"} — ` +
                    `re-pin consumes.amount`,
            });
            repins.push({
                docId: doc.id,
                line: line.id,
                pinned: line.amount,
                live: live ?? NaN,
            });
        }
    }
    return {
        findings,
        summary: `events=[${eventNames.join(",")}]`,
    };
}

function checkSchema(
    doc: EndpointDoc,
    buildBody: unknown,
): DriftFinding[] {
    const findings: DriftFinding[] = [];
    const body = buildBody as {
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
        findings.push({
            docId: doc.id,
            check: "schema",
            message: "actor publishes no input schema",
        });
        return findings;
    }
    const compiled = doc.input.schema.body?.properties as
        | Record<string, unknown>
        | undefined;
    const compiledRequired = new Set(
        (doc.input.schema.body?.required ?? []) as string[],
    );
    for (const required of live.required ?? []) {
        if (!compiled || !(required in compiled)) {
            findings.push({
                docId: doc.id,
                check: "schema",
                message: `actor now REQUIRES "${required}" — missing from ` +
                    `the checked-in schema`,
            });
        } else if (!compiledRequired.has(required)) {
            // optional→required flip: callers omitting the field would
            // pass our validation and then 400 at the vendor
            findings.push({
                docId: doc.id,
                check: "schema",
                message: `"${required}" flipped optional→required upstream`,
            });
        }
    }
    return findings;
}

/** --fix, schema half: re-run the scaffold codegen for a drifted actor
 *  (generated artifact — git diff is the review gate). */
async function rescaffold(
    doc: EndpointDoc,
    log: (line: string) => void,
): Promise<void> {
    const actorId = actorPathId(doc)!.replace("~", "/");
    const folder = doc.endpoint.split("/").pop()!;
    log(`  fix: re-scaffolding ${actorId} → ${folder}/schema/inputs.ts`);
    const command = new Deno.Command("deno", {
        args: [
            "run",
            "--allow-read",
            "--allow-write",
            "--allow-env",
            "--allow-net=api.apify.com",
            "scripts/apify-scaffold.ts",
            actorId,
            "--name",
            folder,
        ],
    });
    const { code, stderr } = await command.output();
    if (code !== 0) {
        log(`  fix FAILED: ${new TextDecoder().decode(stderr).trim()}`);
    }
}

export const apifySuite: DriftSuite = {
    provider: "apify",
    requiresEnv: "APIFY_API_KEY",
    async run(ctx: DriftCtx): Promise<DriftFinding[]> {
        const token = Deno.env.get(this.requiresEnv)!;
        const findings: DriftFinding[] = [];
        const repins: Array<
            { docId: string; line: string; pinned: number; live: number }
        > = [];
        const docs = [...ctx.docs]
            .sort((a, b) => a.id.localeCompare(b.id));
        for (const doc of docs) {
            const pathId = actorPathId(doc);
            if (!pathId) {
                findings.push({
                    docId: doc.id,
                    check: "url",
                    message: "start url is not an actor-runs url",
                });
                continue;
            }
            const [actor, build] = await Promise.all([
                apiGet(`/v2/acts/${pathId}`, token),
                apiGet(`/v2/acts/${pathId}/builds/default`, token),
            ]);
            const docFindings: DriftFinding[] = [];
            let summary = "";
            if (actor.body === undefined) {
                docFindings.push({
                    docId: doc.id,
                    check: "fetch",
                    message: `actor fetch → ${actor.status}`,
                });
            } else {
                const priced = checkPricing(doc, actor.body, repins);
                docFindings.push(...priced.findings);
                summary = priced.summary;
            }
            if (build.body === undefined) {
                docFindings.push({
                    docId: doc.id,
                    check: "fetch",
                    message: `builds/default → ${build.status}`,
                });
            } else {
                docFindings.push(...checkSchema(doc, build.body));
            }
            ctx.log(
                `${docFindings.length === 0 ? "ok  " : "DRIFT"} ` +
                    `${doc.id.padEnd(50)} ${summary}` +
                    (docFindings.length > 0
                        ? ` [${docFindings.map((f) => f.check).join(",")}]`
                        : ""),
            );
            if (
                ctx.fix &&
                docFindings.some((finding) => finding.check === "schema")
            ) {
                await rescaffold(doc, ctx.log);
            }
            findings.push(...docFindings);
        }
        if (ctx.fix && repins.length > 0) {
            // hand-pinned assertions are never auto-rewritten (D28 fix
            // policy) — emit the machine-readable re-pin report instead
            await Deno.writeTextFile(
                ".output/drift-repin.json",
                JSON.stringify(repins, null, 2) + "\n",
            );
            ctx.log(
                `  fix: ${repins.length} rate re-pin(s) written to ` +
                    `.output/drift-repin.json (apply deliberately)`,
            );
        }
        return findings;
    },
};
