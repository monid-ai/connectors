/**
 * deno task webhook — the LOCAL webhook loop (design D47): what the
 * hosted ingress does (verify raw bytes → route → execute the verdict),
 * runnable on a laptop.
 *
 *   simulate <provider> <slug> --body '<json>' [--headers '<json>']
 *       [--secret <s>] [--execute]
 *     Sign a synthetic delivery per the COMPILED verify descriptor (the
 *     same HMAC the vendor would compute), verify it back through the
 *     same descriptor (the loop proves its own crypto), run the hook's
 *     `route` fn, print the {who, what} verdict — and with --execute,
 *     act on it (run → engine:run against the local store; refresh →
 *     the resource doc's lifecycle.refresh, patch persisted).
 *
 *   listen <provider> [--port <n>] [--tunnel cloudflared|tailscale|none]
 *       [--secret <s>] [--execute]
 *     Serve the v1 ingress route (POST /v1/providers/<provider>/account/
 *     <slug>) locally, verifying + routing REAL vendor deliveries.
 *     `--tunnel` exposes it publicly through a TunnelAdaptor —
 *     cloudflared (default), tailscale, or none. Tunnels live in
 *     scripts ONLY: the engine never listens.
 *
 * The signing secret: --secret ?? <PROVIDER>_WEBHOOK_SECRET ??
 * "local-webhook-secret" (simulate only — listen demands a real one).
 *
 * PROVIDER-SCOPE hooks only, for now: no resource-scope hook exists
 * in-tree (saperly defers `subscribe` to its upcoming webhooks API), so
 * the resource route (`/v1/providers/:provider/resource/{resourceId}/
 * {slug}`) is not served here yet — add it alongside the first real
 * resource-scope hook, resolved via sealResourceUnit.
 */
import { Command } from "@cliffy/command";
import {
    type Json,
    type ProviderWebhookDoc,
    sealProviderUnit,
    sealResourceUnit,
    sealUnit,
    type WebhookRoute,
} from "@shared/core";
import {
    directTransport,
    Engine,
    fnUtils,
    instantiate,
} from "@monid/connector-engine";
import { compileToOutput } from "./lib.ts";
import { admitInto, KvResourceStore, persistEffects } from "./store/kv.ts";

// ---------------------------------------------------------------------------
// verify — the descriptor, executed (host-side crypto, raw bytes)
// ---------------------------------------------------------------------------

async function hmacHex(secret: string, payload: string): Promise<string> {
    const key = await crypto.subtle.importKey(
        "raw",
        new TextEncoder().encode(secret),
        { name: "HMAC", hash: "SHA-256" },
        false,
        ["sign"],
    );
    const sig = await crypto.subtle.sign(
        "HMAC",
        key,
        new TextEncoder().encode(payload),
    );
    return [...new Uint8Array(sig)]
        .map((byte) => byte.toString(16).padStart(2, "0")).join("");
}

/** Constant-time string equality (v1's timingSafeEqual): the fold
 *  visits EVERY char of the expected value regardless of where a
 *  mismatch occurs, so response timing does not leak a digest prefix. */
function timingSafeEqual(expected: string, provided: string): boolean {
    const width = Math.max(expected.length, provided.length);
    let diff = expected.length ^ provided.length;
    for (let i = 0; i < width; i++) {
        diff |= (expected.charCodeAt(i) || 0) ^ (provided.charCodeAt(i) || 0);
    }
    return diff === 0;
}

function renderPayload(
    template: string,
    timestamp: string,
    rawBody: string,
): string {
    return template
        .replaceAll("${timestamp}", timestamp)
        .replaceAll("${rawBody}", rawBody);
}

/** Sign a synthetic delivery exactly as the vendor would. Exported for
 *  the unit pins in webhook.test.ts. */
export async function sign(
    verify: ProviderWebhookDoc["verify"],
    secret: string,
    rawBody: string,
    at = new Date(),
): Promise<Record<string, string>> {
    const timestamp = String(Math.floor(at.getTime() / 1000));
    return {
        [verify.timestampHeader]: timestamp,
        [verify.signatureHeader]: (verify.signaturePrefix ?? "") +
            await hmacHex(
                secret,
                renderPayload(verify.payload, timestamp, rawBody),
            ),
    };
}

/** The ingress check: recompute over the EXACT raw bytes + replay
 *  window. Signature FIRST (constant-time), THEN the tolerance window —
 *  v1's documented ordering, so timing cannot distinguish a
 *  stale-but-valid signature from a fresh-but-invalid one. Exported for
 *  the unit pins in webhook.test.ts. */
export async function checkDelivery(
    verify: ProviderWebhookDoc["verify"],
    secret: string,
    headers: Record<string, string>,
    rawBody: string,
    now = new Date(),
): Promise<{ ok: true } | { ok: false; reason: string }> {
    const timestamp = headers[verify.timestampHeader];
    const signature = headers[verify.signatureHeader];
    if (timestamp === undefined) {
        return { ok: false, reason: `missing ${verify.timestampHeader}` };
    }
    if (signature === undefined) {
        return { ok: false, reason: `missing ${verify.signatureHeader}` };
    }
    const expected = (verify.signaturePrefix ?? "") + await hmacHex(
        secret,
        renderPayload(verify.payload, timestamp, rawBody),
    );
    if (!timingSafeEqual(expected, signature)) {
        return { ok: false, reason: "signature mismatch" };
    }
    const age = Math.abs(now.getTime() - Number(timestamp) * 1000);
    if (!Number.isFinite(age) || age > verify.toleranceMs) {
        return {
            ok: false,
            reason: `timestamp outside ±${verify.toleranceMs}ms window`,
        };
    }
    return { ok: true };
}

// ---------------------------------------------------------------------------
// route + execute
// ---------------------------------------------------------------------------

const HOOK_LOGGER = {
    debug: (msg: string) => console.error(`[webhook:fn] ${msg}`),
    info: (msg: string) => console.error(`[webhook:fn] ${msg}`),
    warn: (msg: string) => console.error(`[webhook:fn] ${msg}`),
    error: (msg: string) => console.error(`[webhook:fn] ${msg}`),
};

function loadHook(
    bundle: Awaited<ReturnType<typeof compileToOutput>>["bundle"],
    provider: string,
    slug: string,
) {
    const unit = sealProviderUnit(bundle, provider);
    const hook = unit.doc.webhooks?.[slug];
    if (!hook) {
        const declared = Object.keys(unit.doc.webhooks ?? {}).join(", ");
        throw new Error(
            `${provider} declares no webhook "${slug}"` +
                (declared ? ` (declared: ${declared})` : " (none declared)"),
        );
    }
    const entry = unit.fns[hook.route.$fn.key];
    const route = instantiate(
        entry,
        hook.route,
        `${provider}#webhooks.${slug}.route`,
    ) as (
        ctx: { data: { delivery: Json }; utils: unknown; logger: unknown },
    ) => WebhookRoute;
    return { hook, route };
}

async function executeVerdict(
    bundle: Awaited<ReturnType<typeof compileToOutput>>["bundle"],
    verdict: WebhookRoute,
): Promise<void> {
    const what = verdict.what;
    const store = await KvResourceStore.open();
    const log = (line: string) => console.error(`[webhook] ${line}`);
    try {
        switch (what.action) {
            case "run": {
                console.error(`[webhook] executing run ${what.endpoint}`);
                const engine = new Engine({
                    transport: directTransport(),
                    resources: store,
                    // same host ordering as engine:run — ensure seeds
                    // persist BEFORE start, settle effects after
                    admit: admitInto(store, log),
                    scopeKey: "local",
                });
                const loaded = await engine.load(
                    sealUnit(bundle, what.endpoint),
                );
                const result = await loaded.run(what.input);
                await persistEffects(store, result.resources, log);
                console.log(JSON.stringify(result, null, 2));
                break;
            }
            case "refresh": {
                const row = await store.get(
                    what.target.resource,
                    what.target.externalId,
                );
                if (row === undefined) {
                    console.error(
                        `[webhook] refresh target ${what.target.resource} ` +
                            `"${what.target.externalId}" not owned locally` +
                            ` — nothing to refresh`,
                    );
                    break;
                }
                const engine = new Engine({ transport: directTransport() });
                const resource = await engine.loadResource(
                    sealResourceUnit(bundle, what.target.resource),
                );
                const outcome = await resource.refresh(row);
                if (outcome.active && outcome.patch !== undefined) {
                    await store.refresh(
                        what.target.resource,
                        what.target.externalId,
                        outcome.patch,
                    );
                    console.error(
                        `[webhook] refreshed ${what.target.resource} ` +
                            `"${what.target.externalId}" — patch persisted`,
                    );
                } else if (!outcome.active) {
                    console.error(
                        `[webhook] refresh found ${what.target.resource} ` +
                            `"${what.target.externalId}" INACTIVE upstream`,
                    );
                }
                break;
            }
            case "signal-run":
                console.error(
                    `[webhook] signal-run "${what.runKey}" — no in-flight ` +
                        `runs in the local loop (a hosted workflow would ` +
                        `wake here)`,
                );
                break;
            case "ignore":
                console.error("[webhook] verdict: ignore — stated policy");
                break;
        }
    } finally {
        store.close();
    }
}

function secretFor(provider: string, flag?: string, demand = false): string {
    const env = Deno.env.get(
        `${provider.toUpperCase().replaceAll(/[^A-Z0-9]/g, "_")}` +
            `_WEBHOOK_SECRET`,
    );
    const secret = flag ?? env;
    if (secret !== undefined) return secret;
    if (demand) {
        throw new Error(
            "listen needs the REAL signing secret — pass --secret or set " +
                `${provider.toUpperCase()}_WEBHOOK_SECRET`,
        );
    }
    return "local-webhook-secret";
}

// ---------------------------------------------------------------------------
// tunnels — scripts-only (the engine never listens)
// ---------------------------------------------------------------------------

interface TunnelAdaptor {
    start(port: number): Promise<{ url: string }>;
    stop(): Promise<void>;
}

/** cloudflared quick tunnel — no account needed; the URL is minted per
 *  session and scraped from stderr. */
function cloudflaredTunnel(): TunnelAdaptor {
    let child: Deno.ChildProcess | undefined;
    return {
        async start(port) {
            const cmd = new Deno.Command("cloudflared", {
                args: ["tunnel", "--url", `http://localhost:${port}`],
                stdout: "null",
                stderr: "piped",
            });
            child = cmd.spawn();
            const reader = child.stderr.getReader();
            const decoder = new TextDecoder();
            let buffer = "";
            const deadline = Date.now() + 30_000;
            while (Date.now() < deadline) {
                const { value, done } = await reader.read();
                if (done) break;
                buffer += decoder.decode(value);
                const match = buffer.match(
                    /https:\/\/[a-z0-9-]+\.trycloudflare\.com/,
                );
                if (match) {
                    // keep draining in the background so the child never
                    // blocks on a full stderr pipe
                    (async () => {
                        try {
                            while (!(await reader.read()).done) { /* drain */ }
                        } catch { /* closed */ }
                    })();
                    return { url: match[0] };
                }
            }
            throw new Error(
                "cloudflared started but printed no trycloudflare.com URL " +
                    "within 30s",
            );
        },
        // deno-lint-ignore require-await
        async stop() {
            child?.kill("SIGTERM");
        },
    };
}

/** tailscale funnel — a stable URL on your tailnet's public hostname. */
function tailscaleTunnel(): TunnelAdaptor {
    let port = 0;
    return {
        async start(localPort) {
            port = localPort;
            const run = new Deno.Command("tailscale", {
                args: ["funnel", "--bg", String(localPort)],
                stdout: "piped",
                stderr: "piped",
            });
            const out = await run.output();
            if (!out.success) {
                throw new Error(
                    `tailscale funnel failed: ${
                        new TextDecoder().decode(out.stderr)
                    }`,
                );
            }
            const status = await new Deno.Command("tailscale", {
                args: ["status", "--json"],
                stdout: "piped",
            }).output();
            const dnsName = (JSON.parse(
                new TextDecoder().decode(status.stdout),
            ) as { Self?: { DNSName?: string } }).Self?.DNSName;
            if (!dnsName) {
                throw new Error(
                    "tailscale status carries no Self.DNSName — is this " +
                        "machine on a tailnet?",
                );
            }
            return { url: `https://${dnsName.replace(/\.$/, "")}` };
        },
        async stop() {
            await new Deno.Command("tailscale", {
                args: ["funnel", "--bg", "off", String(port)],
                stdout: "null",
                stderr: "null",
            }).output().catch(() => undefined);
        },
    };
}

function noneTunnel(): TunnelAdaptor {
    return {
        // deno-lint-ignore require-await
        async start(port) {
            return { url: `http://localhost:${port}` };
        },
        // deno-lint-ignore require-await
        async stop() {},
    };
}

const TUNNELS: Record<string, () => TunnelAdaptor> = {
    cloudflared: cloudflaredTunnel,
    tailscale: tailscaleTunnel,
    none: noneTunnel,
};

// ---------------------------------------------------------------------------
// commands
// ---------------------------------------------------------------------------

const simulate = new Command()
    .description(
        "Sign a synthetic delivery, verify it back, route it, print the " +
            "verdict (and --execute it).",
    )
    .arguments("<provider:string> <slug:string>")
    .option("--body <json:string>", "The delivery body (JSON).", {
        required: true,
    })
    .option(
        "--headers <json:string>",
        "Extra delivery headers (JSON object; lower-cased).",
    )
    .option("--secret <secret:string>", "Signing secret override.")
    .option("--execute", "Act on the verdict (run/refresh) locally.")
    .action(async (options, provider: string, slug: string) => {
        const { bundle } = await compileToOutput();
        const { hook, route } = loadHook(bundle, provider, slug);
        const secret = secretFor(provider, options.secret);
        const rawBody = options.body;
        const body = JSON.parse(rawBody) as Json;
        const extra = options.headers !== undefined
            ? Object.fromEntries(
                Object.entries(
                    JSON.parse(options.headers) as Record<string, string>,
                ).map(([key, value]) => [key.toLowerCase(), value]),
            )
            : {};
        const headers = {
            ...extra,
            ...await sign(hook.verify, secret, rawBody),
        };
        console.error(
            `[webhook] signed delivery headers: ${JSON.stringify(headers)}`,
        );
        // the loop proves its own crypto: verify what we just signed
        const check = await checkDelivery(
            hook.verify,
            secret,
            headers,
            rawBody,
        );
        if (!check.ok) throw new Error(`self-verify failed: ${check.reason}`);
        console.error("[webhook] verify: OK (descriptor round-trip)");
        const verdict = route({
            data: { delivery: { headers, body } },
            utils: fnUtils,
            logger: HOOK_LOGGER,
        });
        console.log(JSON.stringify(verdict, null, 2));
        if (options.execute) await executeVerdict(bundle, verdict);
    });

const listen = new Command()
    .description(
        "Serve the ingress route locally; verify + route real deliveries.",
    )
    .arguments("<provider:string>")
    .option("--port <port:number>", "Local port.", { default: 8787 })
    .option(
        "--tunnel <adaptor:string>",
        "Public exposure: cloudflared (default) | tailscale | none.",
        { default: "cloudflared" },
    )
    .option("--secret <secret:string>", "Signing secret override.")
    .option("--execute", "Act on verdicts (run/refresh) locally.")
    .action(async (options, provider: string) => {
        const { bundle } = await compileToOutput();
        const unit = sealProviderUnit(bundle, provider);
        const slugs = Object.keys(unit.doc.webhooks ?? {});
        if (slugs.length === 0) {
            throw new Error(`${provider} declares no webhooks`);
        }
        const secret = secretFor(provider, options.secret, true);
        const make = TUNNELS[options.tunnel];
        if (!make) {
            throw new Error(
                `unknown tunnel "${options.tunnel}" ` +
                    `(cloudflared | tailscale | none)`,
            );
        }
        const tunnel = make();
        const { url } = await tunnel.start(options.port);
        for (const slug of slugs) {
            console.error(
                `[webhook] callback URL for "${slug}": ` +
                    `${url}/v1/providers/${provider}/account/${slug}`,
            );
        }
        const prefix = `/v1/providers/${provider}/account/`;
        const server = Deno.serve(
            { port: options.port },
            async (request) => {
                const path = new URL(request.url).pathname;
                if (request.method !== "POST" || !path.startsWith(prefix)) {
                    return new Response("not found", { status: 404 });
                }
                const slug = path.slice(prefix.length);
                const hookDoc = unit.doc.webhooks?.[slug];
                if (!hookDoc) {
                    return new Response("not found", { status: 404 });
                }
                const rawBody = await request.text();
                const headers: Record<string, string> = {};
                for (const [key, value] of request.headers) {
                    headers[key.toLowerCase()] = value;
                }
                const check = await checkDelivery(
                    hookDoc.verify,
                    secret,
                    headers,
                    rawBody,
                );
                if (!check.ok) {
                    console.error(`[webhook] REJECTED: ${check.reason}`);
                    return new Response("unauthorized", { status: 401 });
                }
                let body: Json;
                try {
                    body = JSON.parse(rawBody) as Json;
                } catch {
                    body = rawBody;
                }
                const { route } = loadHook(bundle, provider, slug);
                const verdict = route({
                    data: { delivery: { headers, body } },
                    utils: fnUtils,
                    logger: HOOK_LOGGER,
                });
                console.log(JSON.stringify(verdict, null, 2));
                if (options.execute) {
                    // fire-and-forget: the vendor's timeout must never
                    // wait on our execution
                    executeVerdict(bundle, verdict).catch((error) =>
                        console.error(`[webhook] execute failed: ${error}`)
                    );
                }
                return new Response("ok", { status: 200 });
            },
        );
        const shutdown = async () => {
            console.error("\n[webhook] shutting down");
            await tunnel.stop();
            await server.shutdown();
            Deno.exit(0);
        };
        Deno.addSignalListener("SIGINT", shutdown);
        await server.finished;
    });

// import.meta.main guard: webhook.test.ts imports sign/checkDelivery —
// the CLI must not parse the TEST runner's args on import
if (import.meta.main) {
    await new Command()
        .name("webhook")
        .description(
            "Local webhook loop: simulate deliveries or listen for real ones.",
        )
        .command("simulate", simulate)
        .command("listen", listen)
        .parse(Deno.args);
}
