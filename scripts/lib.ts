import { join } from "@std/path";
import { ensureDir, walk } from "@std/fs";
import {
    type Bundle,
    loadCategoryRegistry,
    loadConnectorDefs,
    sha256Hex,
} from "@shared/core";
import { compileBundle } from "@shared/compiler";

export const REPO_ROOT = new URL("../", import.meta.url).pathname;
export const OUTPUT_DIR = join(REPO_ROOT, ".output");

/** Versions read as DATA (scripts do not need the packages' code). */
async function versionOf(pkgDir: string): Promise<string> {
    const denoJson = JSON.parse(
        await Deno.readTextFile(join(REPO_ROOT, pkgDir, "deno.json")),
    );
    return denoJson.version as string;
}
export const engineVersion = (): Promise<string> => versionOf("engine");
export const compilerVersion = (): Promise<string> =>
    versionOf("shared/compiler");

/** Cache key: sha256 over every compile input + versions. */
export async function inputsKey(versions: string[]): Promise<string> {
    const parts: string[] = [`versions:${versions.join(",")}`];
    const roots = ["connectors", "shared/core", "shared/compiler"];
    const files: string[] = [join(REPO_ROOT, "config.yml")];
    for (const root of roots) {
        for await (
            const entry of walk(join(REPO_ROOT, root), {
                includeDirs: false,
                exts: [".ts", ".json"],
            })
        ) {
            files.push(entry.path);
        }
    }
    files.sort();
    for (const file of files) {
        parts.push(`${file}:${await sha256Hex(await Deno.readTextFile(file))}`);
    }
    return await sha256Hex(parts.join("\n"));
}

/**
 * The ONE place the user-facing endpoint id form ("exa#search") is split —
 * needed only where the two halves matter separately (record's fixture
 * path). Bundle lookups take the id directly (sealUnit, inspectEndpoint).
 */
export function parseEndpointId(
    id: string,
): { provider: string; endpoint: string } {
    const [provider, endpoint, ...rest] = id.split("#");
    if (!provider || !endpoint || rest.length > 0) {
        throw new Error(`expected <provider>#<endpoint>, got: ${id}`);
    }
    return { provider, endpoint };
}

async function gitSha(): Promise<string> {
    try {
        const output = await new Deno.Command("git", {
            args: ["rev-parse", "--short", "HEAD"],
            cwd: REPO_ROOT,
            stdout: "piped",
            stderr: "null",
        }).output();
        if (output.code === 0) {
            return new TextDecoder().decode(output.stdout).trim();
        }
    } catch { /* git unavailable */ }
    return "dev";
}

export interface CompileResult {
    bundle: Bundle;
    outputPath: string;
    cacheHit: boolean;
}

/**
 * Compile through the .output/ cache (gitignored). Key = inputs hash +
 * engine/compiler versions; catalogVersion/generatedAt metadata never
 * participate in the key. `frozenMeta` pins metadata for determinism
 * comparisons (CI double-compile).
 */
export async function compileToOutput(
    opts: { force?: boolean; frozenMeta?: boolean } = {},
): Promise<CompileResult> {
    const [engine, compiler] = await Promise.all([
        engineVersion(),
        compilerVersion(),
    ]);
    const key = await inputsKey([engine, compiler]);
    // ALWAYS the whole repo → ONE artifact. Lookups (provider/endpoint) read
    // the compiled bundle — never re-load defs (design D28).
    const outputPath = join(OUTPUT_DIR, "catalog.json");
    const keyPath = `${outputPath}.key`;

    if (!opts.force) {
        try {
            const cachedKey = await Deno.readTextFile(keyPath);
            if (cachedKey === key) {
                const bundle = JSON.parse(
                    await Deno.readTextFile(outputPath),
                ) as Bundle;
                return { bundle, outputPath, cacheHit: true };
            }
        } catch { /* miss */ }
    }

    const connectorsDir = join(REPO_ROOT, "connectors");
    const [connectors, leafCategories] = await Promise.all([
        loadConnectorDefs(connectorsDir),
        loadCategoryRegistry(connectorsDir),
    ]);
    const bundle = await compileBundle(connectors, {
        compilerVersion: compiler,
        builtWithEngineVersion: engine,
        catalogVersion: opts.frozenMeta
            ? "0.0.0-frozen"
            : `0.0.0-git.${await gitSha()}`,
        generatedAt: opts.frozenMeta
            ? "1970-01-01T00:00:00.000Z"
            : new Date().toISOString(),
        leafCategories,
    });
    await ensureDir(OUTPUT_DIR);
    await Deno.writeTextFile(
        outputPath,
        JSON.stringify(bundle, null, 2) + "\n",
    );
    await Deno.writeTextFile(keyPath, key);
    return { bundle, outputPath, cacheHit: false };
}
