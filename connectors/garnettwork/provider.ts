import { defineProvider, presets, UsageModelKind } from "@shared/core";

export default defineProvider({
    name: "garnettwork",
    meta: {
        displayName: "GarnettWork (private integration draft)",
        summary: "Evidence-backed secondhand PS5 BUY listing checks.",
        description:
            "Private connector for GarnettWork's eBay US Buy It Now PS5 Disc " +
            "BUY flow. Preserves the native decision, evidence, Max Safe Buy " +
            "when supported, receipt status and limitations. Does not buy " +
            "items, contact sellers or move money.",
        homepageUrl: "https://www.garnettwork.com",
        notes: [
            "Private access and credential delivery are operational configuration outside this source proposal.",
            "FREE is a private-pilot modeling assumption pending founder and Monid confirmation; it is not an agreed price.",
            "Current connector scope is eBay US Buy It Now PS5 Disc with explicit BUY intent. Switch OLED and other research configurations are not supported by this draft.",
            "Private visibility is controlled by Monid's host; this definition does not authorize public catalog publication.",
        ],
    },
    request: { baseUrl: "https://mcp.garnettwork.com" },
    auth: { inject: presets.auth.bearer() },
    timeouts: { requestMs: 30_000, runMs: 30_000 },
    usage: { model: { kind: UsageModelKind.FREE } },
});
