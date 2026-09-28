import { join } from "@std/path";
import { REPO_ROOT } from "./lib.ts";

const root = join(REPO_ROOT, "connectors/ambiguous");
if (Deno.args.includes("--refresh")) {
    const response = await fetch("https://app.ambiguous.ai/api/openapi.json");
    if (!response.ok) {
        throw new Error(`OpenAPI fetch failed: ${response.status}`);
    }
    const source = await response.text();
    const parsed = JSON.parse(source);
    if (
        parsed.openapi !== "3.1.0" || !parsed.paths ||
        !parsed.components?.schemas
    ) throw new Error("Unexpected API contract");
    await Deno.writeTextFile(join(root, "openapi.json"), source);
}
const { catalog, coverage } = await import(
    "../connectors/ambiguous/catalog.ts"
);
const check = Deno.args.includes("--check");
const expected = new Set<string>();
for (const operation of catalog.operations) {
    const folder = operation.operationId.replaceAll("_", "-");
    if (!/^[a-z0-9-]+$/.test(folder) || expected.has(folder)) {
        throw new Error(`Invalid or duplicate folder: ${folder}`);
    }
    expected.add(folder);
    const directory = join(root, "endpoints/api", folder);
    const file = join(directory, "endpoint.ts");
    const source =
        `import { apiEndpoint } from "../../../catalog.ts";\n\nexport default apiEndpoint(${
            JSON.stringify(operation.operationId)
        });\n`;
    if (check) {
        if (await Deno.readTextFile(file) !== source) {
            throw new Error(`Stale registration: ${operation.operationId}`);
        }
    } else {
        await Deno.mkdir(directory, { recursive: true });
        await Deno.writeTextFile(file, source);
    }
}
for await (const entry of Deno.readDir(join(root, "endpoints/api"))) {
    if (entry.isDirectory && !expected.has(entry.name)) {
        throw new Error(
            `Retired operation needs explicit review/removal: ${entry.name}`,
        );
    }
}
const report = JSON.stringify(
    {
        totalOperations: coverage.length,
        includedOperations: catalog.operations.length,
        notExposedToMcp: coverage.filter((item) => !item.exposed).sort((a, b) =>
            a.operationId.localeCompare(b.operationId)
        )
            .map(({ exposed: _exposed, ...item }) => ({
                ...item,
                reason: "Not exposed to MCP by the public API contract",
            })),
    },
    null,
    2,
) + "\n";
const reportPath = join(root, "coverage.json");
if (check) {
    if (await Deno.readTextFile(reportPath) !== report) {
        throw new Error("Coverage report is stale");
    }
} else await Deno.writeTextFile(reportPath, report);
console.log(
    `${catalog.operations.length} agent operations; ${
        coverage.length - catalog.operations.length
    } other HTTP operations accounted for`,
);
