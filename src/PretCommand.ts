import { Command, Events, RegisterCommand, Shell, type CommandTools, type FileInfo, type SubnetInfo } from "@hotbunny/hackhub-content-sdk";
import { connectToPrinter, isIp, readTextFile, type RawFile } from "./printer";

/** How long pret.py waits before it reports the connection. */
const CONNECT_DELAY_MS = 1000;
/** How long the PRET window takes to print a page. */
const PRINT_DELAY_MS = 3200;

/** The file `python3 pret.py` runs, as the game reports it in `Python3.ExecFile`. */
const PRET_FILE = {
    name: "pret",
    extension: "py",
    data: { cmd: "Pret" },
} as unknown as FileInfo;

/** The banner pret.py prints, copied from the game. */
const BANNER = `      ________________
    _/_______________/|
   /___________/___//||   PRET | Printer Exploitation Toolkit v0.25
  |===        |----| ||    by Jens Mueller <jens.a.mueller@rub.de>
  |           |   ô| ||
  |___________|   ô| ||
  | ||/.´---.||    | ||        「 cause your device can be
  |-||/_____\\||-.  | |´           more fun than paper jams 」
  |_||=L==H==||_|__|/`;

const USAGE = "Usage: pret [ip address] [file.txt] [-json]";

const isJsonFlag = (arg: string) => /^--?json$/i.test(arg);

interface Options {
    json: boolean;
}

/**
 * pret [ip address] [file.txt] [-json]
 *
 * The game's `python3 pret.py`, with the PRET window replaced by text. With
 * only an IP it connects to the printer, like pret.py. With a .txt file it
 * also prints that file, like dragging the page onto the printer in PRET.
 */
@RegisterCommand
export class PretCommand extends Command {
    CommandName = "pret";
    // Hidden until the player runs `apt-get install pret`.
    PackageName = "pret";
    Description = "Connect to a printer on port 9100 and print a .txt file on it";
    Autocomplete = [
        { label: "pret", type: "STRING" as const },
        { label: "<ip>", type: "IP" as const },
    ];

    async Run(tools: CommandTools) {
        if (!Shell.isPackageInstalled("python3")) {
            tools.printError("pret requires python3. Install it with: apt-get install python3");
            return;
        }

        const args = tools.getArgs();
        const opts = { json: args.some(isJsonFlag) };
        const [ip, path, ...extra] = args.filter(a => !isJsonFlag(a));

        const printer = await this.connect(tools, extra.length > 0 ? undefined : ip, opts);

        // python3 fires this after every run of a tool file, whatever the result.
        // The file argument belongs to the PRET window, not to pret.py.
        Events.emit("Python3.ExecFile", { file: PRET_FILE, args: ip === undefined ? [] : [ip] });

        if (!printer) return;
        if (path !== undefined) await this.print(tools, printer, path, opts);
        else if (opts.json) tools.println(JSON.stringify(toResult(printer, null)));
    }

    /** The body of the game's pret.py, minus opening the PRET window. `ip` is undefined on a usage error. */
    private async connect(tools: CommandTools, ip: string | undefined, opts: Options) {
        if (ip === undefined) {
            tools.printError(USAGE);
            return null;
        }
        if (!isIp(ip)) {
            tools.printError("Invalid ip address.");
            return null;
        }
        if (!opts.json) {
            tools.println(BANNER);
            tools.newLine();
        }
        await tools.sleep(CONNECT_DELAY_MS);

        const printer = connectToPrinter(ip);
        if (typeof printer === "string") {
            tools.printError(printer);
            return null;
        }
        if (!opts.json) tools.println(`Connection to ${printer.hostname ?? printer.ip} established`);
        return printer;
    }

    /** What the PRET window does when a page is dragged onto the printer. */
    private async print(tools: CommandTools, printer: SubnetInfo, path: string, opts: Options) {
        // The PRET file picker only accepts .txt files.
        if (!path.toLowerCase().endsWith(".txt")) {
            tools.printError("Only .txt files can be printed.");
            return;
        }
        const read = await readTextFile(c => tools.capture(c), path);
        if (typeof read === "string") {
            tools.printError(read);
            return;
        }

        if (!opts.json) tools.println(`Printing ${read.file.name}.txt...`);
        await tools.sleep(PRINT_DELAY_MS);

        // Quests listen for this to complete their "print this file" objectives.
        Events.emit("Pret.Printed", { subnet: { ...printer, name: printer.hostname }, file: read.file });

        if (opts.json) {
            tools.println(JSON.stringify(toResult(printer, read.file)));
        } else {
            tools.printSuccess(`Printed ${read.file.name}.txt on ${printer.hostname ?? printer.ip}`);
        }
    }
}

/** What `pret -json` prints after a successful print. */
export interface PretResult {
    ip: string;
    lanIp: string | null;
    model: string | null;
    /** The printed file, or null when only connecting. */
    file: string | null;
}

const toResult = (printer: SubnetInfo, file: RawFile | null): PretResult => ({
    ip: printer.ip,
    lanIp: printer.lanIp ?? null,
    model: printer.hostname ?? null,
    file: file ? `${file.name}.txt` : null,
});
