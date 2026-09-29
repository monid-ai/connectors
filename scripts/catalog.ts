/**
 * deno task catalog providers | endpoints | categories | inspect <id>
 *
 * Thin cliffy CLI over the `.output/` compile cache + @shared/core's pure
 * catalog readers (list/inspect are bundle-shape functions — no engine, no
 * compiler).
 *
 * Output follows the shared rule (design D49): a terminal gets aligned
 * columns, a pipe gets JSON, `-j` / `--pretty` force it. `inspect` is the
 * exception — a doc IS the contract, so it stays JSON in both modes.
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
import { countLine, emit, mark, table } from "./output.ts";

await new Command()
    .name("catalog")
    .description("Browse compiled connector bundles.")
    .action(function () {
        this.showHelp();
    })
    .command("providers", "List providers.")
    .option("-j, --json", "Emit raw rows as JSON.")
    .option("--pretty", "Force the formatted table even when piped.")
    .action(async (options) => {
        const { bundle } = await compileToOutput();
        const rows = listProviders(bundle);
        emit(rows, () => {
            console.log(table(
                ["PROVIDER", "NAME", "ENDPOINTS", "SUMMARY"],
                rows.map((provider) => [
                    provider.name,
                    provider.displayName,
                    String(provider.endpointCount),
                    provider.summary,
                ]),
            ));
            console.log(`\n${countLine(rows.length, "provider")}`);
        }, options);
    })
    .command("endpoints", "List endpoints, optionally filtered.")
    .option("--provider <name:string>", "Only endpoints of this provider.")
    .option("--category <id:string>", "Only endpoints in this category.")
    .option("-j, --json", "Emit raw rows as JSON.")
    .option("--pretty", "Force the formatted table even when piped.")
    .action(async (options) => {
        const { bundle } = await compileToOutput();
        const rows = listEndpoints(bundle, {
            provider: options.provider,
            category: options.category,
        });
        emit(rows, () => {
            if (rows.length === 0) {
                console.log(mark.muted("no endpoints match those filters"));
                return;
            }
            console.log(table(
                ["ENDPOINT", "CATEGORIES", "SUMMARY"],
                rows.map((endpoint) => [
                    endpoint.id,
                    endpoint.categories.join(", "),
                    endpoint.summary,
                ]),
            ));
            console.log(`\n${countLine(rows.length, "endpoint")}`);
        }, options);
    })
    .command(
        "categories",
        "List the closed category vocabulary + endpoint counts.",
    )
    .option("-j, --json", "Emit raw rows as JSON.")
    .option("--pretty", "Force the formatted table even when piped.")
    .action(async (options) => {
        const { bundle } = await compileToOutput();
        const rows = listCategories(bundle);
        emit(rows, () => {
            console.log(table(
                ["CATEGORY", "NAME", "ENDPOINTS", "DESCRIPTION"],
                rows.map((category) => [
                    category.id,
                    category.displayName,
                    String(category.endpointCount),
                    category.description ?? "",
                ]),
            ));
            console.log(`\n${countLine(rows.length, "category")}`);
        }, options);
    })
    .command(
        "inspect <endpoint:string>",
        "Print one endpoint's full contract (its doc).",
    )
    .action(async (_options, endpoint) => {
        const { bundle } = await compileToOutput();
        console.log(JSON.stringify(inspectEndpoint(bundle, endpoint), null, 2));
    })
    .command("resources", "List resource DEFS, optionally filtered.")
    .option("--provider <name:string>", "Only resources of this provider.")
    .option(
        "--type <type:string>",
        "Only this generic kind (e.g. phone_number) — spans providers.",
    )
    .option("-j, --json", "Emit raw rows as JSON.")
    .option("--pretty", "Force the formatted table even when piped.")
    .action(async (options) => {
        const { bundle } = await compileToOutput();
        const rows = listResources(bundle, {
            provider: options.provider,
            type: options.type,
        });
        emit(rows, () => {
            if (rows.length === 0) {
                console.log(mark.muted("no resource defs match those filters"));
                return;
            }
            console.log(table(
                ["RESOURCE", "TYPE", "BILLED", "SUMMARY"],
                rows.map((resource) => [
                    resource.id,
                    resource.type,
                    resource.billed ? "yes" : "no",
                    resource.summary,
                ]),
            ));
            console.log(
                `\n${countLine(rows.length, "resource def")}  ` +
                    mark.muted("(`resources list` shows what you OWN)"),
            );
        }, options);
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
