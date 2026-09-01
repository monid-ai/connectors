import { z } from "zod";
import { format, greaterThan, parse as parseSemver } from "@std/semver";
import {
    assertPureJson,
    type Bundle,
    type ConnectorSource,
    contractConfig,
    docHash,
    type EndpointDoc,
    type FnRef,
    type Json,
    type LeafCategory,
    parseSchema,
    type ProviderDoc,
    pruneUndefined,
    stableStringify,
    zBundle,
    zDefaultCredentials,
    zEndpointDef,
    zEndpointDoc,
    zEndpointName,
    zProviderDef,
    zProviderDoc,
} from "@shared/core";
import type { Logger } from "@shared/logging";
import { FnInterner } from "./fns.ts";

/** Contract constants — config.yml `schema:`/`compiler:` sections (override-free). */
const SC = contractConfig.schema;
const CC = contractConfig.compiler;

export interface CompileOptions {
    /** Toolchain provenance — never gates (engine gates on minEngineVersion + specVersion). */
    compilerVersion: string;
    builtWithEngineVersion: string;
    catalogVersion: string;
    generatedAt: string;
    /** The closed category vocabulary (connectors/categories.ts). */
    leafCategories: readonly LeafCategory[];
    logger?: Logger;
}

function semverMax(versions: string[]): string {
    let max = parseSemver(SC.docFormatSince);
    for (const version of versions) {
        const parsed = parseSemver(version);
        if (greaterThan(parsed, max)) max = parsed;
    }
    return format(max);
}

function toJsonSchema(schema: z.ZodType, label: string): Record<string, Json> {
    try {
        const jsonSchema = z.toJSONSchema(schema, {
            target: `draft-${SC.jsonSchemaDialect}` as "draft-2020-12",
            io: "input",
        });
        return pruneUndefined(jsonSchema) as Record<string, Json>;
    } catch (error) {
        throw new Error(
            `${label}: zod schema is not JSON-Schema representable: ${error}`,
        );
    }
}

/** A resolvable leaf: the value + WHERE it came from.
 *  The label exists solely to keep FnEntry.provenance truthful — a
 *  provider-authored fn must be blamed on provider.ts, not on whichever
 *  endpoint happened to resolve it first. */
interface Resolved<T> {
    value: T;
    label: string;
}

/** Leaf-wise fallback: endpoint value wins, else provider's — with its origin label. */
function resolve<T>(
    endpointValue: T | undefined,
    endpointLabel: string,
    providerValue: T | undefined,
    providerLabel: string,
): Resolved<T> | undefined {
    if (endpointValue !== undefined) {
        return { value: endpointValue, label: endpointLabel };
    }
    if (providerValue !== undefined) {
        return { value: providerValue, label: providerLabel };
    }
    return undefined;
}

/**
 * compileBundle — the compiler's SOLE job: the pure mapping
 * (defs, options) → bundle. Folder identity is a LOADER concern
 * (loadConnectorDefs asserts folder == provider.name); here everything keys
 * off `provider.name`. Loading lives in @shared/core (load/); list/inspect
 * over bundles lives in core's catalog.
 *
 * ONE composition rule (design D20): everything resolves LEAF-WISE, closest
 * wins — endpoint ?? provider ?? config default. That includes hooks
 * (endpoint toRequest/fromResponse/consolidate REPLACES the provider's) and
 * meta leaves (docsUrl/categories). Headers merge key-wise (each key is a
 * leaf).
 */
export async function compileBundle(
    connectors: ConnectorSource[],
    opts: CompileOptions,
): Promise<Bundle> {
    const logger = opts.logger;
    // categories ∈ registry, zod-delegated: an enum built from the vocabulary
    const zCategories = z.array(
        z.enum(
            opts.leafCategories.map((leaf) => leaf.id) as [string, ...string[]],
        ),
    ).optional();
    const interner = new FnInterner();
    const providers: Record<string, ProviderDoc> = {};
    const endpoints: Record<string, EndpointDoc> = {};
    const allDocs: EndpointDoc[] = [];

    // intake validation — zod-first end to end even for hand-built sources
    const intake = connectors.map((connector) =>
        parseSchema(zProviderDef, connector.provider, "provider def")
    );
    // DETERMINISM: input order (filesystem enumeration) is platform-dependent,
    // and iteration order decides fnTable insertion (first occurrence wins
    // provenance) — sorting by provider/endpoint name makes the bundle a pure
    // function of repo content (byte-identical double compile).
    const sorted = connectors
        .map((connector, index) => ({ connector, provider: intake[index] }))
        .sort((a, b) => a.provider.name.localeCompare(b.provider.name));

    for (const { connector, provider } of sorted) {
        const providerName = provider.name;
        const providerFile = `connectors/${providerName}/provider.ts`;
        parseCategories(zCategories, provider.meta.categories, providerFile);

        const providerEndpointDocs: EndpointDoc[] = [];
        const sortedEndpoints = [...connector.endpoints]
            .sort((a, b) => a.name.localeCompare(b.name)); // determinism (see above)
        for (const { name: endpointName, def: rawDef } of sortedEndpoints) {
            parseSchema(
                zEndpointName,
                endpointName,
                `connectors/${providerName}/endpoints/${endpointName} (folder name)`,
            );
            const where =
                `connectors/${providerName}/endpoints/${endpointName}`;
            const endpointFile = `${where}/endpoint.ts`;
            const def = parseSchema(zEndpointDef, rawDef, endpointFile);
            const id = `${providerName}#${endpointName}`;

            // ---- meta: leaf-wise fallback (docsUrl/categories) ------------
            const categories = def.meta.categories ?? provider.meta.categories;
            parseCategories(zCategories, categories, where);
            const meta = pruneUndefined({
                ...def.meta,
                docsUrl: def.meta.docsUrl ?? provider.meta.docsUrl,
                categories,
            } as unknown as Json);

            // ---- request: baseUrl fallback, key-wise header merge ---------
            const baseUrl = def.request.baseUrl ?? provider.request?.baseUrl;
            if (baseUrl === undefined) {
                throw new Error(
                    `${where}: no baseUrl — set request.baseUrl on the endpoint ` +
                        `or request.baseUrl on the provider`,
                );
            }
            const url = new URL(def.request.path, baseUrl).toString();
            const headers = {
                ...provider.request?.headers,
                ...def.request.headers,
            };
            const timeouts = {
                requestMs: def.timeouts?.requestMs ??
                    provider.timeouts?.requestMs ??
                    CC.defaultTimeouts.requestMs,
                runMs: def.timeouts?.runMs ?? provider.timeouts?.runMs ??
                    CC.defaultTimeouts.runMs,
            };

            // ---- auth: inject REQUIRED; credentials ?? default ------------
            const inject = resolve(
                def.auth?.inject,
                `${endpointFile}#auth.inject`,
                provider.auth?.inject,
                `${providerFile}#auth.inject`,
            );
            if (!inject) {
                throw new Error(
                    `${where}: auth.inject must resolve — declare it on the endpoint ` +
                        `or the provider (e.g. presets.auth.header("x-api-key"))`,
                );
            }
            const injectRef = await interner.intern(
                inject.value,
                inject.label,
                SC.fnAbiSince,
            );
            const credentialsSchema = toJsonSchema(
                def.auth?.credentials ?? provider.auth?.credentials ??
                    zDefaultCredentials,
                `${where}: auth.credentials`,
            );

            // ---- hooks: FALLBACK (endpoint hook replaces provider's) ------
            const toRequest = resolve(
                def.input?.toRequest,
                `${endpointFile}#input.toRequest`,
                provider.input?.toRequest,
                `${providerFile}#input.toRequest`,
            );
            const toRequestRef = toRequest
                ? await interner.intern(
                    toRequest.value,
                    toRequest.label,
                    SC.fnAbiSince,
                )
                : undefined;
            const fromResponse = resolve(
                def.output?.fromResponse,
                `${endpointFile}#output.fromResponse`,
                provider.output?.fromResponse,
                `${providerFile}#output.fromResponse`,
            );
            const fromResponseRef = fromResponse
                ? await interner.intern(
                    fromResponse.value,
                    fromResponse.label,
                    SC.fnAbiSince,
                )
                : undefined;

            // ---- usage.consolidate: THE settle fn, REQUIRED ---------------
            const consolidate = resolve(
                def.usage?.consolidate,
                `${endpointFile}#usage.consolidate`,
                provider.usage?.consolidate,
                `${providerFile}#usage.consolidate`,
            );
            if (!consolidate) {
                throw new Error(
                    `${where}: usage.consolidate must resolve — declare it on the endpoint ` +
                        `or the provider; every endpoint must be able to settle. ` +
                        `Use presets.usage.perCall() for flat billing.`,
                );
            }
            const consolidateRef = await interner.intern(
                consolidate.value,
                consolidate.label,
                SC.fnAbiSince,
            );

            // ---- input/output schemas: leaf-wise fallback -----------------
            const schemaLeaf = (
                endpointSchema: z.ZodType | undefined,
                providerSchema: z.ZodType | undefined,
                label: string,
            ) => {
                const resolved = endpointSchema ?? providerSchema;
                return resolved ? toJsonSchema(resolved, label) : undefined;
            };

            // ---- minEngineVersion: AUTO-ONLY ------------------------------
            const refs = [
                injectRef,
                toRequestRef,
                fromResponseRef,
                consolidateRef,
            ]
                .filter((ref): ref is FnRef => ref !== undefined);
            const minEngineVersion = semverMax(
                refs.map((ref) => interner.table[ref.$fn.key].api),
            );

            // ---- assemble + validate --------------------------------------
            const docWithoutHash = pruneUndefined({
                specVersion: SC.specVersion,
                id,
                provider: providerName,
                minEngineVersion,
                meta,
                auth: {
                    inject: injectRef as unknown as Json,
                    credentials: credentialsSchema,
                },
                request: {
                    method: def.request.method,
                    url,
                    headers: Object.keys(headers).length > 0
                        ? headers
                        : undefined,
                },
                input: {
                    schema: {
                        body: schemaLeaf(
                            def.input?.schema?.body,
                            provider.input?.schema?.body,
                            `${where}: input.schema.body`,
                        ),
                        queryParams: schemaLeaf(
                            def.input?.schema?.queryParams,
                            provider.input?.schema?.queryParams,
                            `${where}: input.schema.queryParams`,
                        ),
                        pathParams: schemaLeaf(
                            def.input?.schema?.pathParams,
                            provider.input?.schema?.pathParams,
                            `${where}: input.schema.pathParams`,
                        ),
                    },
                    toRequest: toRequestRef as unknown as Json,
                },
                output: {
                    fromResponse: fromResponseRef as unknown as Json,
                    schema: schemaLeaf(
                        def.output?.schema,
                        provider.output?.schema,
                        `${where}: output.schema`,
                    ),
                },
                usage: {
                    consolidate: consolidateRef as unknown as Json,
                },
                timeouts,
            }) as Record<string, Json>;

            const hash = await docHash(docWithoutHash);
            const doc = parseSchema(
                zEndpointDoc,
                { ...docWithoutHash, hash },
                where,
            );

            const size = stableStringify(docWithoutHash).length;
            if (size > CC.docSizeFailBytes) {
                throw new Error(
                    `${where}: doc size ${size} > ${CC.docSizeFailBytes}`,
                );
            }
            if (size > CC.docSizeWarnBytes) {
                logger?.warn(`doc size over warn threshold`, { where, size });
            }

            assertPureJson(doc, `${where} compiled doc`);
            providerEndpointDocs.push(doc);
            endpoints[doc.id] = doc; // sorted insertion (see determinism note)
            allDocs.push(doc);
        }

        // ---- ProviderDoc: identity + display only (nothing derivable) -----
        const providerWithoutHash = pruneUndefined({
            specVersion: SC.specVersion,
            name: providerName,
            minEngineVersion: semverMax(
                providerEndpointDocs.map((doc) => doc.minEngineVersion),
            ),
            meta: provider.meta as unknown as Json,
        }) as Record<string, Json>;
        providers[providerName] = parseSchema(zProviderDoc, {
            ...providerWithoutHash,
            hash: await docHash(providerWithoutHash),
        }, providerFile);
    }

    // ---- taxonomy: closed vocabulary + endpoint membership ----------------
    const membership: Record<string, string[]> = {};
    for (const doc of [...allDocs].sort((a, b) => a.id.localeCompare(b.id))) {
        for (const categoryId of doc.meta.categories ?? []) {
            (membership[categoryId] ??= []).push(doc.id);
        }
    }

    // ---- bundle assembly — cross-doc invariants live in zBundle.superRefine
    const bundle = parseSchema(zBundle, {
        catalogVersion: opts.catalogVersion,
        generatedAt: opts.generatedAt,
        minEngineVersion: semverMax(allDocs.map((doc) => doc.minEngineVersion)),
        toolchain: {
            compilerVersion: opts.compilerVersion,
            builtWithEngineVersion: opts.builtWithEngineVersion,
        },
        providers,
        endpoints,
        taxonomy: {
            leaves: [...opts.leafCategories],
            membership: Object.fromEntries(
                Object.keys(membership).sort().map((
                    key,
                ) => [key, membership[key]]),
            ),
        },
        fnTable: interner.sorted(),
    }, "compiled bundle");
    assertPureJson(bundle, "bundle");
    return bundle;
}

function parseCategories(
    zCategories: z.ZodType,
    categories: readonly string[] | undefined,
    where: string,
): void {
    const result = zCategories.safeParse(categories);
    if (!result.success) {
        throw new Error(
            `${where}: unknown category — add it to connectors/categories.ts (closed ` +
                `vocabulary): ${result.error.issues[0]?.message}`,
        );
    }
}
