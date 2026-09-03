/**
 * deno task apify:scaffold <actorId> [--name <endpoint-folder>]
 *
 * AUTHORING-TIME schema scaffolding (DECISION 2 of add-async-run-protocol):
 * fetch the actor's CURRENT published input schema from the live Apify API
 * (`GET /v2/acts/{owner~name}` + `/builds/default` → actorDefinition.input)
 * and generate the endpoint folder's `schema/inputs.ts` as STATIC zod —
 * reviewed, curated, committed; deterministic thereafter (the v2 bundle is a
 * pure function of repo content — v1's runtime schema fetch cannot exist
 * here). Refresh = re-run this script; drift surfaces in the live-gated
 * schema-drift test, never in the deterministic build.
 *
 * Requires APIFY_API_KEY. Generated zod is NON-STRICT (plain z.object):
 * actors accept supersets; unknown fields pass through.
 */
import { Command } from "@cliffy/command";
import { ensureDir } from "@std/fs";
import { join } from "@std/path";

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
 *  whole HTML paragraphs). */
function describeOf(node: JsonSchemaNode): string {
    const raw = node.description ?? node.title ?? "";
    const clean = raw.replace(/<[^>]+>/g, "").replace(/\s+/g, " ").trim();
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

await new Command()
    .name("apify-scaffold")
    .description(
        "Generate an apify endpoint's static input schema from the live actor schema.",
    )
    .arguments("<actorId:string>")
    .option(
        "--name <name:string>",
        "endpoint folder name (default: actor name)",
    )
    .action(async ({ name }, actorId) => {
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
            actorDefinition?: { input?: JsonSchemaNode };
        };
        if (build.status !== "SUCCEEDED") {
            throw new Error(`default build status is ${build.status}`);
        }
        const inputSchema = build.actorDefinition?.input;
        if (!inputSchema) throw new Error("actor publishes no input schema");

        const endpointName = name ?? actor.name ?? actorId.split("/")[1];
        const schemaName = `z${pascalCase(endpointName)}Body`;
        const dir = join(
            "connectors",
            "apify",
            "endpoints",
            endpointName,
            "schema",
        );
        await ensureDir(dir);
        const file = join(dir, "inputs.ts");
        const today = new Date().toISOString().slice(0, 10);
        const body = toZod(inputSchema, 0);
        await Deno.writeTextFile(
            file,
            `import { z } from "zod";

/**
 * ${actorId} — actor input schema, scaffolded from the actor's PUBLISHED
 * input schema (GET /v2/acts/${pathId}/builds/default →
 * actorDefinition.input) on ${today} via scripts/apify-scaffold.ts; curated
 * by hand thereafter (re-run the script to refresh; the live-gated
 * schema-drift test flags divergence). Non-strict by policy: the actor
 * accepts supersets — unknown fields pass through.
 */
export const ${schemaName} = ${body};
`,
        );
        console.log(`wrote ${file} (${schemaName})`);
    })
    .parse(Deno.args);
