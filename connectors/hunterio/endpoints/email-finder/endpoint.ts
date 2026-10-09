import { defineEndpoint, Unit, UsageModelKind } from "@shared/core";
import { z } from "zod";
import { zEmailFinderQueryParams } from "./schema/inputs.ts";

/** GET /email-finder — the most likely email address for one person. */
export default defineEndpoint({
    meta: {
        displayName: "Find Person's Email",
        summary:
            "Find the most likely email address from a person's name and their company.",
        description: "Resolve a person (first/last or full name, or a " +
            "LinkedIn handle) at a company (domain or name) into their " +
            "most likely email address. Returns the address with a 0-100 " +
            "confidence score, job title, company, LinkedIn/Twitter " +
            "handles, phone number when known, public source URLs (up to " +
            "20), and an automatic deliverability verification (valid / " +
            "accept_all / unknown). Supports a max_duration knob (3-20s) " +
            "to trade latency for accuracy. A no-find returns email: null " +
            "and costs nothing. Suited for contact discovery, outreach " +
            "list building, and completing a known person into a " +
            "reachable address. To list every address on the company's " +
            "domain, pass the domain to /domain-search.",
        docsUrl: "https://hunter.io/api-documentation/v2#email-finder",
        categories: ["people-enrichment"],
        notes: ["Charged only when an address is found."],
    },
    request: { method: "GET", path: "/email-finder" },
    input: {
        schema: {
            // the vendor's two rules — a company identifier AND a person
            // name unless linkedin_handle carries both — as one union
            // (clay D13; v1 two `.refine`s)
            queryParams: z.union([
                zEmailFinderQueryParams.required({ linkedin_handle: true }),
                zEmailFinderQueryParams.required({
                    domain: true,
                    first_name: true,
                    last_name: true,
                }),
                zEmailFinderQueryParams.required({
                    domain: true,
                    full_name: true,
                }),
                zEmailFinderQueryParams.required({
                    company: true,
                    first_name: true,
                    last_name: true,
                }),
                zEmailFinderQueryParams.required({
                    company: true,
                    full_name: true,
                }),
            ]).describe(
                "Identify the company (domain, company, or linkedin_handle) " +
                    "and the person (first_name + last_name, or full_name — " +
                    "optional with linkedin_handle).",
            ),
        },
    },
    usage: {
        /** 1 credit when an address is found; a miss is a 200 with
         *  `data.email: null` and is free — v1's drill (design D3). */
        model: {
            kind: UsageModelKind.PER_UNIT,
            unit: Unit.RESULT,
            label: "addresses found",
            description: "email addresses found (a miss counts zero)",
            consumes: { credit: "default", amount: 1 },
        },
        estimate: () => ({ counts: { RESULT: 1 } }),
        /** Found = `data.email` is a non-empty string (v1 emailFound). */
        evidence: ({ data, utils }) => {
            const email = utils.json.optionalGet(data.output, "$.data.email");
            return {
                counts: {
                    RESULT: typeof email === "string" && email !== "" ? 1 : 0,
                },
            };
        },
    },
});
