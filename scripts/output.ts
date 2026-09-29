import { Table } from "@cliffy/table";
import { bold, dim, green, red, yellow } from "@std/fmt/colors";

/**
 * The scripts' PRESENTATION layer (design D49) — one place deciding how
 * a command speaks, so every CLI in the repo speaks the same way.
 *
 * The problem it fixes: `engine:run` printed the whole result envelope
 * as pretty JSON. Sixty lines of correct, unreadable output in which the
 * one thing a person needs next — the id of the resource they just
 * bought — is indistinguishable from the forty fields they do not.
 *
 * TWO AUDIENCES, ONE COMMAND. A human wants the three facts that matter;
 * an agent wants the envelope, byte for byte. Rather than pick, the mode
 * is DETECTED: a terminal gets the formatted view, a pipe gets JSON
 * (`Deno.stdout.isTerminal()` — the classic isatty(1) check, the same
 * mechanism as `ls --color=auto`; an agent capturing stdout IS a pipe,
 * so agents get JSON with no flag). That makes `deno task engine:run …`
 * readable and `deno task engine:run … | jq` keep working, with no flag
 * and no broken script. `--json` / `--pretty` force it when the guess is
 * wrong (a terminal-attached agent, a human paging through `| less`) —
 * the flags name the FORMAT, never the audience.
 *
 * Colour comes from @std/fmt, which already honours NO_COLOR, so piped
 * and CI output is plain without a branch here.
 *
 * Both modules are ALREADY in deno.lock as transitive deps of
 * @cliffy/command — this layer adds presentation, not dependencies.
 */

export interface OutputModeOptions {
    json?: boolean;
    pretty?: boolean;
}

/**
 * JSON or pretty? Explicit flags win (json before pretty if somebody
 * passes both — the machine-readable answer is the safe one to
 * over-produce). Otherwise: a TTY means a person is reading.
 */
export function wantsJson(options: OutputModeOptions = {}): boolean {
    if (options.json) return true;
    if (options.pretty) return false;
    return !Deno.stdout.isTerminal();
}

/** Print `value` as JSON, or run `render` — the ONE branch every command
 *  makes. Keeps the two shapes beside each other at the call site
 *  instead of duplicated down two code paths. */
export function emit(
    value: unknown,
    render: () => void,
    options: OutputModeOptions = {},
): void {
    if (wantsJson(options)) {
        console.log(JSON.stringify(value, null, 2));
        return;
    }
    render();
}

/** A bordered-free aligned table — the list shape (`catalog providers`,
 *  `resources list`). Empty rows print nothing: the caller says what
 *  "none" means in its own words. */
export function table(headers: string[], rows: string[][]): string {
    if (rows.length === 0) return "";
    return new Table()
        .header(headers.map((header) => bold(header)))
        .body(rows)
        .padding(2)
        .toString();
}

/** An aligned `label  value` block — the detail shape (one run, one
 *  resource). Labels are dimmed so values carry the eye. */
export function fields(
    pairs: [string, string][],
    indent = "  ",
): string {
    if (pairs.length === 0) return "";
    const width = Math.max(...pairs.map(([label]) => label.length));
    return pairs
        .map(([label, value]) =>
            `${indent}${dim(label.padEnd(width))}  ${value}`
        )
        .join("\n");
}

/** Status marks, used identically by every command. */
export const mark = {
    ok: (text: string) => `${green("✓")} ${text}`,
    fail: (text: string) => `${red("✗")} ${text}`,
    warn: (text: string) => `${yellow("⚠")} ${text}`,
    muted: (text: string) => dim(text),
};

/** "3 resources" / "1 resource" — the count line that closes a list. */
export function countLine(
    n: number,
    noun: string,
    plural = `${noun}s`,
): string {
    return dim(`${n} ${n === 1 ? noun : plural}`);
}
