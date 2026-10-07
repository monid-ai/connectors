# Tasks: add-connector-scam-ai

## 1. Connector

- [x] 1.1 Add provider metadata, `x-api-key` auth, credit settlement from `credits_used`, and the error digest
- [x] 1.2 Add the detect-media endpoint and its strict public-URL input schema
- [x] 1.3 Register the `ai-detection` leaf category

## 2. Specification and verification

- [x] 2.1 Add the OpenSpec proposal and connector requirements
- [x] 2.2 Add synthetic fixtures and replay tests (happy image, happy video, missing-meter, 402, input gate)
- [x] 2.3 Run formatting, type checks, tests, and the id-lock update
- [x] 2.4 Record real image/video responses with a detection-scoped key and add replay coverage for the recorded payloads and credit settlement
