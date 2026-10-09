## ADDED Requirements

### Requirement: Public operation coverage
Every operation in Magic Hour public OpenAPI retrieved on October 9, 2026 SHALL have a discoverable endpoint. Existing GIF identity SHALL remain stable. DELETE operations SHALL use a separate /delete catalog identity while issuing DELETE to the native project path.

### Requirement: Async generation and utility isolation
Generation SHALL submit once and poll the matching image/video/audio project. Face detection SHALL poll its task and accept a completed empty face list. Account, saved-item, upload, project reads and deletes SHALL return directly and SHALL NOT rebill historical credits_charged. Failed jobs SHALL retain zero usage.

### Requirement: Deterministic admission pricing
Fixed costs SHALL use canonical Magic Hour credit constants. Variable costs SHALL use input-based estimates and settle from terminal credits_charged. Explicit model/resolution bindings SHALL match their estimates; unsupported model choices SHALL fail input validation. This expansion SHALL NOT claim every model variant is supported or that hosted publication has occurred.
