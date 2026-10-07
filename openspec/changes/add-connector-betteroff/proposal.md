# Add a BetterOff read connector candidate

Agents need authorized household financial context to answer cash-flow and recurring-charge questions. This local candidate adapts three existing BetterOff MCP tools to Monid endpoints without adding a BetterOff API route or changing Monid's engine.

Add a provider, setup-status and cash-flow and recurring-stream endpoint definitions, a household-finance category, endpoint identities, synthetic fixtures, and replay tests. The connector accepts a caller-authorized OAuth access token through the transport credential resolver and models BetterOff read calls as FREE.

Hosted release remains blocked pending proof of user-scoped credential resolution, OAuth acquisition and refresh, data handling, and hosted pricing. A shared provider key cannot authorize private household records for unrelated callers. This contribution does not implement OAuth or claim hosted compatibility.
