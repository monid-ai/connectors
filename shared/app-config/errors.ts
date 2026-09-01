/** Raised for missing/invalid configuration values. */
export class ConfigError extends Error {
    constructor(message: string) {
        super(`[AppConfig] ${message}`);
        this.name = "ConfigError";
    }
}
