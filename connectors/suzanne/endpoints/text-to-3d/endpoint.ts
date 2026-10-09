import { defineEndpoint, UsageModelKind } from "@shared/core";
import { zTextTo3dBody } from "./schema/inputs.ts";

/**
 * POST /v1/generations/text-to-3d — a text prompt into a 3D mesh.
 *
 * Pure data: the whole async machinery (submit → poll `GET /v1/jobs/{job_id}`
 * → settle) is inherited leaf-wise from the suzanne provider.
 */
export default defineEndpoint({
    meta: {
        displayName: "Suzanne Text-to-3D",
        summary:
            "Generate a production 3D mesh from a text prompt (async; polled to completion).",
        description:
            "Generate a production 3D mesh from a text prompt. Choose a " +
            "model: 'sculptor' (default) for game-ready meshes and fast " +
            "iteration, or 'atelier' for premium fidelity with PBR " +
            "materials and detailed textures. Tune polygon count via " +
            "params.faces (200000 / 500000 / 1000000 / 2000000, default " +
            "500000), PBR textures via params.pbr, quad topology via " +
            "params.quad (capped at 150000 faces and delivered as FBX), and " +
            "texture fidelity via params.texture_quality. Request formats " +
            "via outputs — GLB by default, plus optional OBJ / STL / FBX. " +
            "This is an async run: the job is polled internally and the run " +
            "completes with the finished job (status plus outputs[] with " +
            "per-format download URLs); typical latency is 30 s–2 min. " +
            "Fetch the mesh bytes with the Suzanne model-download endpoint, " +
            "passing the job_id and the format you want.",
        docsUrl: "https://console.suzanne3d.com/documentation/text-to-3d",
        categories: ["3d-generation"],
    },
    request: { method: "POST", path: "/v1/generations/text-to-3d" },
    input: {
        schema: { body: zTextTo3dBody },
        /** Vendor drift 2026-09-16: TextCreateJobRequest now REQUIRES
         *  `model` (live 400 on omission — pydantic "Field required"),
         *  but the caller contract keeps it optional with the sculptor
         *  default (owner decision 2026-09-17): the wire always carries
         *  a model because an omitted one is materialized HERE. Fn-side
         *  injection, not a schema `.default()` — JSON-Schema defaults
         *  never materialize (the pdl `dataset: "all"` pattern). An
         *  explicit caller value wins the merge. */
        toRequest: ({ data, utils }) => {
            const body = data.input.body ?? {};
            const model = utils.json.optionalGet(body, "$.model");
            return {
                ...data.input,
                body: model === undefined
                    ? utils.json.merge(body, { model: "sculptor" })
                    : body,
            };
        },
    },
    // ASYNC generation: a durable poll loop needs a large WHOLE-RUN budget
    // while the submit itself stays a quick kickoff. The vendor documents
    // 30 s–2 min single-image, 1–4 min multi-view and a 20-min practical
    // ceiling; 10 min keeps real margin without risking a timeout on a job
    // we have already paid for (design D9).
    timeouts: { runMs: 600_000 },
    usage: {
        /** Flat per generation — the contract rate Suzanne bills us
         *  (v1 `unitPrice`, $0.65). Output count never moves the bill, so
         *  the compiler synthesizes estimate + evidence. */
        model: {
            kind: UsageModelKind.PER_CALL,
            label: "generation",
            consumes: { credit: "default", amount: 0.65 },
        },
    },
});
