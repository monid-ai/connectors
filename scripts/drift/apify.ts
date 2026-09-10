import { type EndpointDoc, type UsageModel } from "@shared/core";
import type { DriftCtx, DriftFinding, DriftSuite } from "./contract.ts";

/**
 * The apify drift suite (designs D28/D29) — one polling pass per actor:
 *
 *   1. PRICING (D18/D19/D26/D28/D29): checked against the pricingInfo
 *      that bills TODAY (the latest `startedAt <= now` — the API
 *      returns a HISTORY whose last entry can be a FUTURE scheduled
 *      pricing; D29 caught eu-amazon pinned to one). Regime must stay
 *      PAY_PER_EVENT; the model's shape (flat/metered) must match the
 *      published events; every pinned `consumes.amount` must equal the
 *      LIVE Business-tier price (API tier code GOLD) — OR a SCHEDULED
 *      upcoming price (reconciled: passes with an UPCOMING notice, so
 *      a known future change never breaks CI or forces a flip-flop
 *      commit; the pin is simply ahead of schedule). The line↔event
 *      join is DERIVED (D28): composite ids were MINTED from event
 *      names by one transform (strip `apify-` prefix, kebab/camel →
 *      snake); leaf lines fall back to amount-existence.
 *   2. COVERAGE (D29 — the completeness guarantee): every published
 *      billable event must be either MODELED or in the suite's
 *      documented EXCLUDED map — "we don't bill that" is a reviewed
 *      claim, never an accident. (This check is what the 13 D29
 *      remodels needed all along: an input-gated line the model omits
 *      makes estimates silently wrong the moment that input is used.)
 *   3. INPUT SCHEMA (DECISION 2): every property the actor now REQUIRES
 *      must exist in the checked-in schema AND be required by it
 *      (`live.required ⊆ compiled.required`). One-directional and loose
 *      by design: schemas are non-strict passthrough.
 *   4. OUTPUT SCHEMA (D29, report-only): where the actor publishes
 *      `storages.dataset.fields` and the doc carries an output.schema,
 *      field additions/removals are LOGGED (informational — output
 *      schemas are passthrough documentation, never run-failing).
 *
 * --fix: schema drift → re-runs the scaffold codegen for the drifted
 * actors (generated artifact; git diff reviews). Rate drift + upcoming
 * changes → written to `.output/drift-repin.json` (doc → line → pinned
 * vs live, with effectiveAt for scheduled ones), never auto-applied.
 */

const FLAT_EVENT = /(^|[-_])start($|[-_])|^request$/;

/** COVERAGE exclusions (D29): published events we deliberately do NOT
 *  model, each with its reviewed reason. Anything published, unmodeled
 *  and not listed here is a `coverage` finding. */
const EXCLUDED: Record<string, Record<string, string>> = {
    "apify#apify/facebook-pages-scraper": {
        "page": 'the "Page (Standby API)" event — a same-price twin ' +
            "charged only on the Standby API surface, unreachable via " +
            "the actor-runs path this doc executes",
    },
};

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

type PricingInfo = {
    startedAt?: string;
    pricingModel?: string;
    pricingPerEvent?: {
        actorChargeEvents?: Record<string, ChargeEvent>;
    };
};

export type Repin = {
    docId: string;
    line: string;
    pinned: number;
    live: number;
    /** Present when `live` is a SCHEDULED price the pin anticipates. */
    effectiveAt?: string;
};

/** The pricingInfo that bills TODAY: pricingInfos is a HISTORY and the
 *  last entry can be a FUTURE scheduled pricing (D29) — never
 *  `infos[last]`. */
export function selectPricing(
    infos: PricingInfo[],
    now: string,
): { effective?: PricingInfo; upcoming: PricingInfo[] } {
    const effective = infos.filter((info) => (info.startedAt ?? "") <= now);
    return {
        effective: effective[effective.length - 1],
        upcoming: infos.filter((info) => (info.startedAt ?? "") > now),
    };
}

function eventsOf(info: PricingInfo | undefined): Record<string, ChargeEvent> {
    return info?.pricingPerEvent?.actorChargeEvents ?? {};
}

export function checkPricing(
    doc: EndpointDoc,
    actorBody: unknown,
    now: string,
    repins: Repin[],
    log: (line: string) => void,
): { findings: DriftFinding[]; summary: string } {
    const findings: DriftFinding[] = [];
    const body = actorBody as { data?: { pricingInfos?: PricingInfo[] } };
    const infos = body.data?.pricingInfos ?? [];
    const { effective, upcoming } = selectPricing(infos, now);
    const regime = effective?.pricingModel ?? "(none)";
    if (regime !== "PAY_PER_EVENT") {
        findings.push({
            docId: doc.id,
            check: "regime",
            message: `pricing REGIME changed — actor publishes ${regime}`,
        });
        return { findings, summary: `regime=${regime}` };
    }
    const events = eventsOf(effective);
    const eventNames = Object.keys(events);
    // SCHEDULED prices per event name (D29 reconciliation): a pin that
    // matches an upcoming price is ahead of schedule, not drifted
    const scheduled = new Map<string, Array<{ price: number; at: string }>>();
    const scheduledPrices: Array<{ price: number; at: string }> = [];
    for (const change of upcoming) {
        for (const [name, event] of Object.entries(eventsOf(change))) {
            const price = livePrice(event);
            if (price === undefined) continue;
            const entry = { price, at: change.startedAt ?? "(unknown)" };
            scheduled.set(name, [...(scheduled.get(name) ?? []), entry]);
            scheduledPrices.push(entry);
        }
    }
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
    const lines = declaredLines(doc.usage.model);
    for (const line of lines) {
        if (line.leaf) {
            // amount-existence (D28): a leaf id names no event; the
            // pinned amount must be a price the actor charges — today,
            // or on a scheduled date (D29 reconciliation)
            if (livePrices.includes(line.amount)) continue;
            const ahead = scheduledPrices
                .find((entry) => entry.price === line.amount);
            if (ahead !== undefined) {
                log(
                    `  UPCOMING ${doc.id}: leaf ${line.id} pinned ahead ` +
                        `of schedule (${line.amount} effective ` +
                        `${ahead.at}; billing ${livePrices.join("/")} ` +
                        `until then)`,
                );
                repins.push({
                    docId: doc.id,
                    line: line.id,
                    pinned: line.amount,
                    live: line.amount,
                    effectiveAt: ahead.at,
                });
                continue;
            }
            findings.push({
                docId: doc.id,
                check: "rate",
                message: `leaf line ${line.id}: pinned ${line.amount} ` +
                    `matches NO live Business-tier price ` +
                    `[${livePrices.join(", ")}] (nor any scheduled one) ` +
                    `— vendor repriced or removed the event; re-pin ` +
                    `consumes.amount`,
            });
            repins.push({
                docId: doc.id,
                line: line.id,
                pinned: line.amount,
                live: livePrices.length === 1 ? livePrices[0] : NaN,
            });
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
        if (live === line.amount) continue;
        const ahead = (scheduled.get(eventName) ?? [])
            .find((entry) => entry.price === line.amount);
        if (ahead !== undefined) {
            log(
                `  UPCOMING ${doc.id}: ${line.id} ("${eventName}") pinned ` +
                    `ahead of schedule (${line.amount} effective ` +
                    `${ahead.at}; billing ${live} until then)`,
            );
            repins.push({
                docId: doc.id,
                line: line.id,
                pinned: line.amount,
                live: line.amount,
                effectiveAt: ahead.at,
            });
            continue;
        }
        findings.push({
            docId: doc.id,
            check: "rate",
            message: `line ${line.id} ("${eventName}"): pinned ` +
                `${line.amount}, live Business ${live ?? "(none)"} — ` +
                `re-pin consumes.amount`,
        });
        repins.push({
            docId: doc.id,
            line: line.id,
            pinned: line.amount,
            live: live ?? NaN,
        });
    }
    // COVERAGE (D29): every published event is modeled or excluded —
    // an unmodeled input-gated line makes estimates silently wrong the
    // moment that input is used, so "we don't bill that" must be a
    // reviewed EXCLUDED entry, never an accident.
    const excluded = EXCLUDED[doc.id] ?? {};
    const lineIds = new Set(lines.map((line) => line.id));
    const leafAmounts = new Set(
        lines.filter((line) => line.leaf).map((line) => line.amount),
    );
    for (const name of eventNames) {
        if (name in excluded) continue;
        if (lineIds.has(normalizeEventName(name))) continue;
        // a leaf doc covers its single event by the amount join —
        // against the effective price OR a scheduled one (a pin ahead
        // of schedule still covers the event, D29)
        if (leafAmounts.has(livePrice(events[name]) as number)) continue;
        if (
            (scheduled.get(name) ?? [])
                .some((entry) => leafAmounts.has(entry.price))
        ) continue;
        findings.push({
            docId: doc.id,
            check: "coverage",
            message:
                `published event "${name}" (${
                    livePrice(events[name])
                }) is neither modeled nor in the suite's EXCLUDED map — an ` +
                `input can be switching this charge on with no line to ` +
                `estimate or evidence it`,
        });
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

/** OUTPUT schema comparison (D29, REPORT-ONLY): output schemas are
 *  passthrough documentation (non-strict, no required — never
 *  run-failing), so live field additions/removals are logged for the
 *  next scaffold refresh, not raised as findings. */
function reportOutputDrift(
    doc: EndpointDoc,
    buildBody: unknown,
    log: (line: string) => void,
): void {
    const body = buildBody as {
        data?: {
            actorDefinition?: {
                storages?: {
                    dataset?: {
                        fields?: { properties?: Record<string, unknown> };
                    };
                };
            };
        };
    };
    const live = body.data?.actorDefinition?.storages?.dataset?.fields
        ?.properties;
    const compiledItems = (doc.output.schema as
        | { items?: { properties?: Record<string, unknown> } }
        | undefined)?.items?.properties;
    if (!live || !compiledItems) return;
    const added = Object.keys(live)
        .filter((key) => !(key in compiledItems));
    const removed = Object.keys(compiledItems)
        .filter((key) => !(key in live));
    if (added.length > 0 || removed.length > 0) {
        log(
            `  output-schema note ${doc.id}: live fields ` +
                (added.length > 0 ? `+[${added.join(",")}] ` : "") +
                (removed.length > 0 ? `-[${removed.join(",")}] ` : "") +
                `— refresh via apify:scaffold when convenient`,
        );
    }
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
        const now = new Date().toISOString();
        const findings: DriftFinding[] = [];
        const repins: Repin[] = [];
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
                const priced = checkPricing(
                    doc,
                    actor.body,
                    now,
                    repins,
                    ctx.log,
                );
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
                reportOutputDrift(doc, build.body, ctx.log);
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
