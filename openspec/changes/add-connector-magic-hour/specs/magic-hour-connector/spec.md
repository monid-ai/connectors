# magic-hour-connector (delta)

## ADDED Requirements

### Requirement: Magic Hour provider definition
The provider SHALL declare name `magic-hour`, Bearer authentication,
`https://api.magichour.ai` as its base URL, asynchronous image-project polling,
and one credit pool named `default` for Magic Hour credits. Successful terminal
responses SHALL settle from the provider's `credits_charged` field.

#### Scenario: A completed project returns output and billed credits
- **WHEN** the create request returns a project id and polling reaches `complete`
- **THEN** the run completes with the project response and download URL
- **AND** usage settles from `credits_charged`

#### Scenario: A failed project is not billed
- **WHEN** polling reaches `error` or `canceled`
- **THEN** the run completes as a provider error with zero usage

### Requirement: AI GIF Generator endpoint
The connector SHALL provide `/v1/image/magic-hour-ai-gif` as a POST to
`/v1/ai-gif-generator`. Input SHALL require `style.prompt` of 1 to 500
characters, accept optional `name`, and accept `output_format` as `gif`, `mp4`,
or `webm`, defaulting to `gif`. The usage model SHALL be 50 Magic Hour credits
per completed call.

#### Scenario: Generate a GIF from a prompt
- **WHEN** a caller submits `{style: {prompt: "Cute dancing cat, pixel art"}}`
- **THEN** the wire request defaults `output_format` to `gif`
- **AND** the estimated usage is 50 Magic Hour credits
