import { z } from "zod";
import {
    zLifecyclePollFn,
    zLifecycleStartFn,
    zLifecycleStopFn,
} from "../hooks/lifecycle.ts";

/**
 * Lifecycle section — SHARED by EndpointDef and ProviderDef (one shape, both
 * scopes; leaf-wise fallback resolves each phase endpoint ?? provider). The
 * v2 form of monid-services' `runLifecycle`:
 *
 *   - `start`: replaces the engine's declarative execution of `request`
 *     (which stays REQUIRED — it becomes DATA into the fns via
 *     ctx.data.request). Returns running{state} | completed{raw envelope}.
 *   - `poll`: one status tick — absent ⇒ not pollable (a start that returns
 *     `running` without a resolved poll fails the run, CONTRACT_VIOLATION).
 *   - `stop`: best-effort vendor abort — absent ⇒ stop is a no-op.
 *
 * All fields `.optional()` per D20 (a `.default()` would shadow the other
 * scope); the compiler enforces that `start` resolves whenever ANY lifecycle
 * leaf does. A provider-level lifecycle is the `actorRunLifecycle`-attached-
 * to-every-def equivalent: Apify declares start/poll/stop once, endpoints
 * are pure data.
 */
export const zLifecycleSection = z.strictObject({
    start: zLifecycleStartFn.optional(),
    poll: zLifecyclePollFn.optional(),
    stop: zLifecycleStopFn.optional(),
});
export type LifecycleSection = z.infer<typeof zLifecycleSection>;
