# AppConfig

A configuration management library for Veristic service that supports YAML-based
configuration with environment-specific overrides.

[TOC]

## Configuration Files

Place your YAML configuration files in your project's config directory and name
it `config.yml`.

### Configuration Precedence

The configuration values are resolved in the following order (highest to lowest
priority):

1. Environment Variables
2. Stage-specific config in `config.yml` file
3. General config in `config.yml` file

#### Environment Variables

Environment variables take precedence over YAML configurations. The library
automatically checks for environment variables matching your config paths in
uppercase with underscores:

```txt
// Config path to environment variable mapping
server.port => SERVER_PORT
api.timeout => API_TIMEOUT
database.credentials.username => DATABASE_CREDENTIALS_USERNAME
```

#### Stage and General Specific Config

The library supports both stage-specific and general configurations in
`config.yml`. When stage-specific config is found, it will take precendence.

The following is an exmaple of a `config.yml` with both stage-specific and
general config:

```yaml
service:
    name: "api-service"
    port: 8080
aws:
    region: "us-west-2"
logging:
    level: "info"

local:
    logging:
        level: "debug"

prod:
    port: 8000
```

### Error Hanlding

#### Missing `config.yml` file

When `config.yml` is not found in the specified directory, an empty AppConfig
instance is initialized, and The application continues to run with no
configuration values.

All config getter methods will throw ConfigError unless overridden by
environment variables

#### Runtime Updates

AppConfig is initialized once at startup and remains static. Any changes to
`config.yml` during runtime are not detected or loaded.

To apply configuration changes, the application must be restarted

#### Missing Configuration Values

If a requested configuration value is not found in either environment variables
or config file (including stage-specific section), a `ConfigError` will be
thrown.

To avoid throwing errors, using `getOptional[Type]` getters instead.

## Example Usage in Code

```typescript
import { AppConfig, AppStage } from "@lib/app-config";

// Initialize config with a base path and stage
const config = await AppConfig.init(
    "./path-to-dir", // path to service
    AppStage.DEV, // Environment stage
    pinoLogger, // Optional logger instance
);

// Access config values
const port = config.getNumber("server.port");
const apiKey = config.getString("api.key");
const features = config.getBoolean("features.enabled");
```
