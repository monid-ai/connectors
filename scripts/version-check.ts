/**
 * deno task version:check [--base <ref>]
 *
 * Contract guard: changes to the fn ABI or the structural doc format require at
 * least a MINOR bump of engine/deno.json. Connector-only changes must NOT need
 * an engine bump. Skips (with notice) when the base ref is unavailable.
 */
const CONTRACT_PATHS = [
    "engine/fn-utils.ts", // JsonUtil + MoneyUtil impls (hook ABI surface)
    "engine/link.ts", // linking + slot-contract wrapping semantics
    "engine/request.ts", // PreparedRequest shape
    "engine/auth.ts", // injection procedure
    "shared/core/schema/hooks/to-request.ts", // fn slot schemas (the ABI)
    "shared/core/schema/hooks/from-response.ts",
    "shared/core/schema/hooks/auth-inject.ts",
    "shared/core/schema/hooks/usage-consolidate.ts",
    "shared/core/schema/hooks/lifecycle.ts", // the async hook family (utils.http/log, outcomes)
    "shared/core/schema/hooks/ctx.ts", // ctx shapes + carriers (the ABI)
    "shared/core/schema/sections/lifecycle.ts", // lifecycle def section
    "shared/core/schema/sections/timeouts.ts", // timeouts shape (pollMs)
    "shared/core/schema/endpoint/doc.ts", // structural doc format
    "shared/core/schema/provider/doc.ts", // provider doc format
    "shared/core/schema/bundle/sealed-unit.ts", // sealed unit shape
    "shared/core/schema/usage/unit.ts", // Unit enum
    "shared/core/schema/usage/usage.ts", // Usage shape
    "shared/core/schema/usage/monetary.ts", // MonetaryValue + MoneyUtil (the ABI)
    "shared/core/schema/run/input.ts", // RunInput (caller-facing shape)
    "shared/core/schema/run/result.ts", // RunResult/RunCompleted (result contract)
    "shared/core/schema/json/util.ts", // JsonUtil interface (the ABI)
    "config.yml", // contract constants
];

const baseIndex = Deno.args.indexOf("--base");
const base = baseIndex !== -1 ? Deno.args[baseIndex + 1] : "origin/main";

async function git(...args: string[]): Promise<{ code: number; out: string }> {
    const output = await new Deno.Command("git", {
        args,
        stdout: "piped",
        stderr: "null",
    }).output();
    return {
        code: output.code,
        out: new TextDecoder().decode(output.stdout).trim(),
    };
}

const mergeBase = await git("merge-base", base, "HEAD");
if (mergeBase.code !== 0) {
    console.log(
        `[version:check] base ref ${base} unavailable — skipping (fresh repo/CI shallow clone)`,
    );
    Deno.exit(0);
}

const diff = await git("diff", "--name-only", `${mergeBase.out}...HEAD`);
const changed = diff.out.split("\n").filter(Boolean);
const contractChanged = changed.filter((file) => CONTRACT_PATHS.includes(file));

if (contractChanged.length === 0) {
    console.log(
        "[version:check] no contract-surface changes — engine bump not required",
    );
    Deno.exit(0);
}

const currentVersion = JSON.parse(await Deno.readTextFile("engine/deno.json"))
    .version as string;
const baseFile = await git("show", `${mergeBase.out}:engine/deno.json`);
const baseVersion = baseFile.code === 0
    ? JSON.parse(baseFile.out).version as string
    : null;

if (baseVersion === null) {
    console.log("[version:check] engine/deno.json is new — ok");
    Deno.exit(0);
}

const [curMajor, curMinor] = currentVersion.split(".").map(Number);
const [baseMajor, baseMinor] = baseVersion.split(".").map(Number);
const bumped = curMajor > baseMajor ||
    (curMajor === baseMajor && curMinor > baseMinor);

if (!bumped) {
    console.error(
        `[version:check] FAIL — contract surface changed without a minor engine bump:\n` +
            contractChanged.map((file) => `  - ${file}`).join("\n") +
            `\n  engine version: ${baseVersion} → ${currentVersion} (need at least a MINOR bump)`,
    );
    Deno.exit(1);
}
console.log(
    `[version:check] contract changed, engine bumped ${baseVersion} → ${currentVersion} — ok`,
);
