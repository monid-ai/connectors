import { join, toFileUrl } from "@std/path";
import type { EndpointDef } from "../schema/endpoint/def.ts";
import type { ProviderDef } from "../schema/provider/def.ts";

/**
 * load/ is @shared/core's IO corner: dynamic imports of AUTHORING modules
 * from disk. `loadConnectorDefs` walks the connectors/ directory tree
 * importing provider.ts / endpoint.ts default exports to feed the compiler.
 * It lives in core with the defs it loads:
 *   - not in the compiler (its sole job is the pure defs → bundle mapping);
 *   - never in the engine (the engine executes only COMPILED artifacts —
 *     importing authoring code would end its generic, standalone nature).
 */
/**
 * One loaded connector folder. NO separate folder identity: the loader
 * asserts folder == provider.name right here (the one place that can see
 * both the filesystem and the def), so the compiler — a pure mapping — keys
 * everything off `provider.name` and never touches folder names.
 */
export interface ConnectorSource {
    provider: ProviderDef;
    endpoints: { name: string; def: EndpointDef }[];
}

/**
 * NO FILTER by design: compilation is always WHOLE-REPO → one cached bundle;
 * "load part of the tree" was a premature optimization (the compile cache
 * key hashes every source anyway, so partial loads never saved a recompile —
 * they only produced second-class partial bundles). Provider/endpoint
 * lookups happen in the COMPILED bundle (identity-keyed maps: sealUnit,
 * catalog readers), never by re-loading defs.
 */
export async function loadConnectorDefs(
    connectorsDir: string,
): Promise<ConnectorSource[]> {
    const sources: ConnectorSource[] = [];
    for await (const entry of Deno.readDir(connectorsDir)) {
        if (!entry.isDirectory || entry.name.startsWith(".")) continue;
        const folder = entry.name;

        const providerModule = await import(
            toFileUrl(join(connectorsDir, folder, "provider.ts")).href
        );
        const provider = providerModule.default as ProviderDef;
        if (!provider) {
            throw new Error(
                `connectors/${folder}/provider.ts has no default export`,
            );
        }
        if (provider.name !== folder) {
            throw new Error(
                `connectors/${folder}: provider.name "${provider.name}" must equal the folder name`,
            );
        }

        const endpoints: { name: string; def: EndpointDef }[] = [];
        const endpointsDir = join(connectorsDir, folder, "endpoints");
        for await (const endpointEntry of Deno.readDir(endpointsDir)) {
            if (
                !endpointEntry.isDirectory || endpointEntry.name.startsWith(".")
            ) continue;
            const name = endpointEntry.name;
            const endpointModule = await import(
                toFileUrl(join(endpointsDir, name, "endpoint.ts")).href
            );
            const def = endpointModule.default as EndpointDef;
            if (!def) {
                throw new Error(
                    `connectors/${folder}/endpoints/${name}/endpoint.ts has no default export`,
                );
            }
            endpoints.push({ name, def });
        }
        sources.push({ provider, endpoints });
    }
    return sources;
}
