## Why
Magic Hour exposes 39 public OpenAPI operations, but Monid currently exposes only AI GIF generation. Agents cannot upload inputs, animate images, edit media or retrieve existing projects.

## Change
Add the other 38 operations with native request schemas, free utility operations and generation credit metering. Preserve the existing GIF endpoint identity. Bind variable-model routes to explicit priced models/resolutions rather than guessing the cost of account-dependent defaults.
