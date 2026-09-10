/**
 * deno task apify:scaffold <actorId> [--name <endpoint-folder>]
 *
 * AUTHORING-TIME schema scaffolding (DECISION 2 of add-async-run-protocol):
 * fetch the actor's CURRENT published input schema from the live Apify API
 * (`GET /v2/acts/{owner~name}` + `/builds/default` → actorDefinition.input)
 * and generate the endpoint folder's `schema/inputs.ts` as STATIC zod —
 * reviewed, curated, committed; deterministic thereafter (the v2 bundle is a
 * pure function of repo content — v1's runtime schema fetch cannot exist
 * here). Refresh = re-run this script (or `deno task drift --fix`, which
 * targets it at the drifted set); drift surfaces in the drift suite,
 * never in the deterministic build.
 *
 * Requires APIFY_API_KEY. Generated zod is NON-STRICT (plain z.object):
 * actors accept supersets; unknown fields pass through.
 */
import { Command } from "@cliffy/command";
import { ensureDir } from "@std/fs";
import { join } from "@std/path";
import { findEndpointDir } from "./lib.ts";

const BASE = "https://api.apify.com";

interface JsonSchemaNode {
    type?: string;
    title?: string;
    description?: string;
    enum?: unknown[];
    items?: JsonSchemaNode;
    properties?: Record<string, JsonSchemaNode>;
    required?: string[];
    minimum?: number;
    maximum?: number;
    minLength?: number;
    maxLength?: number;
}

function quote(text: string): string {
    return JSON.stringify(text);
}

/** Trim actor field docs to a single describe()-sized line (they can carry
 *  whole HTML paragraphs). Tag stripping loops to a FIXPOINT — a single
 *  pass leaves reassembled tags behind (`<scr<b>ipt>` → `<script>`;
 *  CodeQL: incomplete multi-character sanitization). */
function describeOf(node: JsonSchemaNode): string {
    const raw = node.description ?? node.title ?? "";
    let stripped = raw;
    for (let prev = ""; prev !== stripped;) {
        prev = stripped;
        stripped = stripped.replace(/<[^>]*>?/g, "");
    }
    const clean = stripped.replace(/\s+/g, " ").trim();
    if (clean === "") return "";
    const short = clean.length > 300 ? `${clean.slice(0, 297)}...` : clean;
    return `.describe(${quote(short)})`;
}

/** Best-effort JSON-Schema → zod expression for the common keyword subset;
 *  anything richer degrades to z.any() for hand-curation. */
function toZod(node: JsonSchemaNode, depth: number): string {
    if (depth > 4) return "z.any()";
    if (Array.isArray(node.enum) && node.enum.length > 0) {
        if (node.enum.every((value) => typeof value === "string")) {
            return `z.enum([${
                node.enum.map((v) => quote(v as string)).join(", ")
            }])`;
        }
        return "z.any()";
    }
    switch (node.type) {
        case "string":
            return "z.string()";
        case "integer": {
            let expr = "z.number().int()";
            if (node.minimum !== undefined) expr += `.min(${node.minimum})`;
            if (node.maximum !== undefined) expr += `.max(${node.maximum})`;
            return expr;
        }
        case "number":
            return "z.number()";
        case "boolean":
            return "z.boolean()";
        case "array": {
            const items = node.items ? toZod(node.items, depth + 1) : "z.any()";
            return `z.array(${items})`;
        }
        case "object": {
            if (!node.properties) return "z.record(z.string(), z.any())";
            const required = new Set(node.required ?? []);
            const fields = Object.entries(node.properties).map(
                ([key, prop]) => {
                    let expr = toZod(prop, depth + 1) + describeOf(prop);
                    if (!required.has(key)) expr += ".optional()";
                    return `    ${quote(key)}: ${expr},`;
                },
            );
            return `z.object({\n${fields.join("\n")}\n})`;
        }
        default:
            return "z.any()";
    }
}

function pascalCase(name: string): string {
    return name.split(/[^A-Za-z0-9]+/).filter(Boolean)
        .map((part) => part[0].toUpperCase() + part.slice(1)).join("");
}

async function apiGet(path: string, token: string): Promise<unknown> {
    const response = await fetch(`${BASE}${path}`, {
        headers: { authorization: `Bearer ${token}` },
    });
    if (!response.ok) {
        throw new Error(`GET ${path} → ${response.status}`);
    }
    const body = await response.json() as { data?: unknown };
    return body.data;
}

/** Deep-strip `required` (design D29): output schemas are passthrough
 *  DOCUMENTATION — every field optional, so a vendor dropping one can
 *  never fail a paid run at output validation. */
function stripRequired(node: JsonSchemaNode): JsonSchemaNode {
    const out = { ...node };
    delete (out as Record<string, unknown>).required;
    if (out.properties) {
        out.properties = Object.fromEntries(
            Object.entries(out.properties)
                .map(([key, child]) => [key, stripRequired(child)]),
        );
    }
    if (out.items) out.items = stripRequired(out.items);
    return out;
}

await new Command()
    .name("apify-scaffold")
    .description(
        "Generate an apify endpoint's static input schema (and, where " +
            "published, output item schema) from the live actor schema.",
    )
    .arguments("<actorId:string>")
    .option(
        "--name <name:string>",
        "endpoint folder name (default: actor name)",
    )
    .option(
        "--group <group:string>",
        "platform group directory for a NEW endpoint (amazon, facebook, x, …); " +
            "existing endpoints are refreshed in place",
    )
    .option(
        "--output-only",
        "write only schema/output.ts (leave the curated inputs untouched)",
    )
    .action(async ({ name, group, outputOnly }, actorId) => {
        const token = Deno.env.get("APIFY_API_KEY");
        if (!token) throw new Error("APIFY_API_KEY is required");
        const pathId = actorId.replace("/", "~");

        const actor = await apiGet(`/v2/acts/${pathId}`, token) as {
            name?: string;
            title?: string;
        };
        const build = await apiGet(
            `/v2/acts/${pathId}/builds/default`,
            token,
        ) as {
            status?: string;
            actorDefinition?: {
                input?: JsonSchemaNode;
                storages?: { dataset?: { fields?: JsonSchemaNode } };
            };
        };
        if (build.status !== "SUCCEEDED") {
            throw new Error(`default build status is ${build.status}`);
        }
        const inputSchema = build.actorDefinition?.input;
        if (!inputSchema) throw new Error("actor publishes no input schema");

        const endpointName = name ?? actor.name ?? actorId.split("/")[1];
        const schemaName = `z${pascalCase(endpointName)}Body`;
        // existing endpoints refresh IN PLACE (found by walking the group
        // dirs); a NEW endpoint needs its platform group named
        const existing = await findEndpointDir("apify", endpointName);
        if (!existing && !group) {
            throw new Error(
                `new endpoint ${endpointName}: pass --group <platform> ` +
                    `(amazon, facebook, google, instagram, linkedin, ` +
                    `reddit, snapchat, tiktok, x, youtube, …)`,
            );
        }
        const dir = existing ? join(existing, "schema") : join(
            "connectors",
            "apify",
            "endpoints",
            group!,
            endpointName,
            "schema",
        );
        await ensureDir(dir);
        const today = new Date().toISOString().slice(0, 10);
        if (!outputOnly) {
            const file = join(dir, "inputs.ts");
            const body = toZod(inputSchema, 0);
            await Deno.writeTextFile(
                file,
                `import { z } from "zod";

/**
 * ${actorId} — actor input schema, scaffolded from the actor's PUBLISHED
 * input schema (GET /v2/acts/${pathId}/builds/default →
 * actorDefinition.input) on ${today} via scripts/apify-scaffold.ts; curated
 * by hand thereafter (re-run the script to refresh; the drift suite
 * flags divergence — deno task drift). Non-strict by policy: the actor
 * accepts supersets — unknown fields pass through.
 */
export const ${schemaName} = ${body};
`,
            );
            console.log(`wrote ${file} (${schemaName})`);
        }
        // ---- output item schema (design D29): only where PUBLISHED ----
        const fields = build.actorDefinition?.storages?.dataset?.fields;
        if (fields) {
            const itemName = `z${pascalCase(endpointName)}OutputItem`;
            const outName = `z${pascalCase(endpointName)}Output`;
            const outFile = join(dir, "output.ts");
            const itemBody = toZod(stripRequired(fields), 0);
            await Deno.writeTextFile(
                outFile,
                `import { z } from "zod";

/**
 * ${actorId} — dataset ITEM schema, scaffolded from the actor's
 * PUBLISHED storages.dataset.fields on ${today} via
 * scripts/apify-scaffold.ts. Passthrough DOCUMENTATION (design D29):
 * non-strict, every field optional ("required" stripped) — output
 * validation can never fail a paid run over vendor drift; the drift
 * suite reports field additions/removals informationally.
 */
export const ${itemName} = ${itemBody};
/** Tolerant by construction: an item that drifts off the documented
 *  shape still passes as a plain object — validation can NEVER fail a
 *  paid run; the typed branch is the documentation. */
export const ${outName} = z.array(
    ${itemName}.or(z.record(z.string(), z.unknown())),
);
`,
            );
            console.log(`wrote ${outFile} (${outName})`);
        } else if (outputOnly) {
            console.log(`${actorId}: no published dataset fields — skipped`);
        }
    })
    .parse(Deno.args);
