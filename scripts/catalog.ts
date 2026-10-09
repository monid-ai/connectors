/**
 * deno task catalog providers | endpoints | categories | inspect <id>
 *
 * Thin cliffy CLI over the `.output/` compile cache + @shared/core's pure
 * catalog readers (list/inspect are bundle-shape functions — no engine, no
 * compiler).
 */
import { Command } from "@cliffy/command";
import {
    inspectEndpoint,
    inspectResource,
    listCategories,
    listEndpoints,
    listProviders,
    listResources,
} from "@shared/core";
import { compileToOutput } from "./lib.ts";

await new Command()
    .name("catalog")
    .description("Browse compiled connector bundles.")
    .action(function () {
        this.showHelp();
    })
    .command("providers", "List providers.")
    .action(async () => {
        const { bundle } = await compileToOutput();
        for (const provider of listProviders(bundle)) {
            console.log(
                `${provider.name} — ${provider.displayName}: ${provider.summary} ` +
                    `(${provider.endpointCount} endpoints)`,
            );
        }
    })
    .command("endpoints", "List endpoints, optionally filtered.")
    .option("--provider <name:string>", "Only endpoints of this provider.")
    .option("--category <id:string>", "Only endpoints in this category.")
    .action(async ({ provider, category }) => {
        const { bundle } = await compileToOutput();
        for (const endpoint of listEndpoints(bundle, { provider, category })) {
            console.log(
                `${endpoint.id} — ${endpoint.summary} [${
                    endpoint.categories.join(", ")
                }]`,
            );
        }
    })
    .command(
        "categories",
        "List the closed category vocabulary + endpoint counts.",
    )
    .action(async () => {
        const { bundle } = await compileToOutput();
        for (const category of listCategories(bundle)) {
            console.log(
                `${category.id} — ${category.displayName}` +
                    (category.description ? `: ${category.description}` : "") +
                    ` (${category.endpointCount} endpoints)`,
            );
        }
    })
    .command(
        "inspect <endpoint:string>",
        "Print one endpoint's full contract (its doc).",
    )
    .action(async (_options, endpoint) => {
        const { bundle } = await compileToOutput();
        console.log(JSON.stringify(inspectEndpoint(bundle, endpoint), null, 2));
    })
    .command("resources", "List resource docs, optionally filtered.")
    .option("--provider <name:string>", "Only resources of this provider.")
    .action(async ({ provider }) => {
        const { bundle } = await compileToOutput();
        for (const resource of listResources(bundle, { provider })) {
            console.log(
                `${resource.id} — ${resource.displayName}: ` +
                    `${resource.summary}` +
                    (resource.billed ? " [billed]" : " [free]"),
            );
        }
    })
    .command(
        "inspect-resource <resource:string>",
        "Print one resource's full contract (its doc).",
    )
    .action(async (_options, resource) => {
        const { bundle } = await compileToOutput();
        console.log(JSON.stringify(inspectResource(bundle, resource), null, 2));
    })
    .parse(Deno.args);
