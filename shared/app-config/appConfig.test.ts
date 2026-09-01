import { assert, assertEquals, assertThrows } from "@std/assert";
import { AppConfig, AppStage, ConfigError } from "@shared/app-config";

async function withTempConfig(
    yaml: string,
    fn: (dir: string) => Promise<void>,
) {
    const dir = await Deno.makeTempDir();
    try {
        await Deno.writeTextFile(`${dir}/config.yml`, yaml);
        await fn(dir);
    } finally {
        await Deno.remove(dir, { recursive: true });
    }
}

Deno.test("precedence: env > stage section > general", async () => {
    await withTempConfig(
        `server:\n    port: 8080\nlocal:\n    server:\n        port: 9090\n`,
        async (dir) => {
            const config = await AppConfig.init(dir, AppStage.LOCAL);
            assertEquals(config.getNumber("server.port"), 9090); // stage wins over general
            Deno.env.set("SERVER_PORT", "7070");
            try {
                assertEquals(config.getNumber("server.port"), 7070); // env wins over all
            } finally {
                Deno.env.delete("SERVER_PORT");
            }
            const prod = await AppConfig.init(dir, AppStage.PROD);
            assertEquals(prod.getNumber("server.port"), 8080); // no prod section -> general
        },
    );
});

Deno.test("missing file yields empty config; missing values throw ConfigError", async () => {
    const dir = await Deno.makeTempDir();
    try {
        const config = await AppConfig.init(dir, AppStage.LOCAL);
        assertEquals(config.getOptionalString("nope.nothing"), undefined);
        assertThrows(() => config.getString("nope.nothing"), ConfigError);
    } finally {
        await Deno.remove(dir, { recursive: true });
    }
});

Deno.test("type coercion errors are loud", async () => {
    await withTempConfig(`flag: "not-a-bool"\nnum: "abc"\n`, async (dir) => {
        const config = await AppConfig.init(dir, AppStage.LOCAL);
        assertThrows(() => config.getBoolean("flag"), ConfigError);
        assertThrows(() => config.getNumber("num"), ConfigError);
        assert(config.getString("flag").length > 0);
    });
});
