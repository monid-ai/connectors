/**
 * AppConfig — YAML-based configuration with stage overrides and env-var
 * precedence. Adapted from monid-services `shared/app-config` (pino, AWS/Modal
 * client helpers, and Secrets Manager support stripped — none apply here).
 *
 * Precedence (highest first):
 *   1. Environment variables (`server.port` → SERVER_PORT)
 *   2. Stage-specific section in config.yml (e.g. `local:`/`prod:`)
 *   3. General config in config.yml
 *
 * NOTE (this repo's determinism rule): the `contract:` section of config.yml
 * is NOT read through this class — it is loaded override-free by
 * `@shared/schema` (bundle bytes must be a pure function of repo content).
 * AppConfig serves the `tooling:` section only.
 */
import * as path from "@std/path";
import * as yaml from "@std/yaml";
import { ConfigError } from "./errors.ts";
import type { AppStage } from "./appStage.ts";

type Primitive = string | number | boolean;
export type AppConfigRecord = {
    [key: string]: AppConfigRecord | Primitive;
};

function isRecord(value: unknown): value is AppConfigRecord {
    return typeof value === "object" && value !== null && !Array.isArray(value);
}

export class AppConfig {
    public static readonly DEFAULT_APP_CONFIG_NAME = "config.yml";

    private constructor(
        private readonly config: AppConfigRecord,
        public readonly stage: AppStage,
    ) {}

    /**
     * Initialize from `<dirPath>/config.yml`. A missing file yields an empty
     * config (env vars still resolve); an unreadable/invalid file throws.
     */
    public static async init(
        dirPath: string,
        stage: AppStage,
    ): Promise<AppConfig> {
        const filePath = path.join(dirPath, AppConfig.DEFAULT_APP_CONFIG_NAME);
        let text: string;
        try {
            text = await Deno.readTextFile(filePath);
        } catch (error) {
            if (error instanceof Deno.errors.NotFound) {
                return new AppConfig({}, stage);
            }
            throw new ConfigError(`cannot read ${filePath}: ${error}`);
        }
        const parsed = yaml.parse(text);
        if (parsed !== null && !isRecord(parsed)) {
            throw new ConfigError(`${filePath} must be a YAML mapping`);
        }
        return new AppConfig((parsed ?? {}) as AppConfigRecord, stage);
    }

    /** `server.port` → SERVER_PORT */
    private static envVarFor(configPath: string): string {
        return configPath.replaceAll(".", "_").toUpperCase();
    }

    private lookup(configPath: string): Primitive | undefined {
        const env = Deno.env.get(AppConfig.envVarFor(configPath));
        if (env !== undefined) return env;
        const walk = (
            root: AppConfigRecord | undefined,
        ): Primitive | undefined => {
            let current: AppConfigRecord | Primitive | undefined = root;
            for (const segment of configPath.split(".")) {
                if (!isRecord(current)) return undefined;
                current = current[segment];
            }
            return isRecord(current) ? undefined : current;
        };
        // stage section wins over general
        const stageSection = this.config[this.stage];
        const fromStage = walk(
            isRecord(stageSection) ? stageSection : undefined,
        );
        if (fromStage !== undefined) return fromStage;
        return walk(this.config);
    }

    public getOptionalString(configPath: string): string | undefined {
        const value = this.lookup(configPath);
        return value === undefined ? undefined : String(value);
    }

    public getString(configPath: string): string {
        const value = this.getOptionalString(configPath);
        if (value === undefined) {
            throw new ConfigError(`missing config value: ${configPath}`);
        }
        return value;
    }

    public getOptionalNumber(configPath: string): number | undefined {
        const value = this.lookup(configPath);
        if (value === undefined) return undefined;
        const parsed = Number(value);
        if (!Number.isFinite(parsed)) {
            throw new ConfigError(
                `config value ${configPath} is not a number: ${value}`,
            );
        }
        return parsed;
    }

    public getNumber(configPath: string): number {
        const value = this.getOptionalNumber(configPath);
        if (value === undefined) {
            throw new ConfigError(`missing config value: ${configPath}`);
        }
        return value;
    }

    public getOptionalBoolean(configPath: string): boolean | undefined {
        const value = this.lookup(configPath);
        if (value === undefined) return undefined;
        if (typeof value === "boolean") return value;
        if (value === "true") return true;
        if (value === "false") return false;
        throw new ConfigError(
            `config value ${configPath} is not a boolean: ${value}`,
        );
    }

    public getBoolean(configPath: string): boolean {
        const value = this.getOptionalBoolean(configPath);
        if (value === undefined) {
            throw new ConfigError(`missing config value: ${configPath}`);
        }
        return value;
    }
}
