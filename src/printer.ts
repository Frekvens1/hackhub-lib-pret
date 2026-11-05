import { Events, Network, type SubnetInfo } from "@hotbunny/hackhub-content-sdk";

/** The raw JetDirect port pret.py connects to. */
export const PRINTER_PORT = 9100;

/** The game's IPv4 check (`Network.IsIp`). */
const IPV4 = /^(?:25[0-5]|2[0-4][0-9]|1[0-9][0-9]|[1-9]?[0-9])(?:\.(?:25[0-5]|2[0-4][0-9]|1[0-9][0-9]|[1-9]?[0-9])){3}$/;

export const isIp = (ip: string): boolean => IPV4.test(ip);

/**
 * The game's `GetSubnetRouter`: the subnet itself if it is a router, otherwise
 * the nearest router above it, or null if there is none.
 *
 * The SDK hides each subnet's parent, so this rebuilds the parent links by
 * asking every subnet for its children, then climbs them.
 */
function findRouter(start: SubnetInfo): SubnetInfo | null {
    if (start.type === "ROUTER") return start;

    const parentOf = new Map<string, SubnetInfo>();
    for (const subnet of Network.getAllSubnets()) {
        for (const child of Network.getChildSubnets(subnet.ip)) parentOf.set(child.ip, subnet);
    }

    const seen = new Set([start.ip]);
    for (let up = parentOf.get(start.ip); up && !seen.has(up.ip); up = parentOf.get(up.ip)) {
        if (up.type === "ROUTER") return up;
        seen.add(up.ip);
    }
    return null;
}

const hasActivePort = (s: SubnetInfo) => s.ports.some(p => p.port === PRINTER_PORT && p.active);

/**
 * Whether the printer's router forwards port 9100 to it.
 *
 * The game checks for a router port with external and internal 9100 that is
 * active and applies to the printer's LAN IP. The SDK only shows the external
 * port, so this checks for an active external 9100 among the ports the router
 * forwards to the printer, or among the router's own ports.
 */
function isPortForwarded(printer: SubnetInfo): boolean {
    const router = findRouter(printer);
    if (!router) return false;
    return hasActivePort(printer) || hasActivePort(router);
}

/**
 * The connection check of the game's pret.py. Returns the printer, or the
 * error message pret.py prints when it can't connect.
 */
export function connectToPrinter(ip: string): SubnetInfo | string {
    const subnet = Network.getSubnet(ip);
    if (!subnet || subnet.type !== "PRINTER" || Network.isRequestBlocked(ip, PRINTER_PORT)) {
        return "Connection failed.";
    }
    // No trailing dot, as in the original.
    if (!isPortForwarded(subnet)) return "Connection failed";
    return subnet;
}

/** A file as the game stores it, including fields the SDK leaves out. */
export interface RawFile {
    id: string;
    name: string;
    extension?: string;
    /** Key id that quests match printed files on. */
    kId?: string;
    data?: unknown;
}

/**
 * Reads a .txt file through the game's `cat`, which hands the stored file
 * (with its kId) to `Terminal_Cat` listeners. The SDK's Files API strips kId,
 * and quests need it to recognise the printed file.
 *
 * Returns the file and the text cat printed, or the error cat printed.
 */
export async function readTextFile(
    capture: (command: string) => Promise<{ code: number; output: string }>,
    path: string,
): Promise<{ file: RawFile; text: string } | string> {
    // The path becomes part of a command line, so shell syntax (pipes,
    // redirects, chaining, quotes) would run as more than one `cat`.
    if (/[\s|&;<>$`"'(){}\\]/.test(path)) return "Invalid file path.";

    // Other terminals or scripts may cat files at the same time, so only take
    // the file whose name matches the path.
    const fileName = path.slice(path.lastIndexOf("/") + 1).toLowerCase();
    let file: RawFile | null = null;
    const off = Events.on("Terminal_Cat", (f: RawFile) => {
        if (!file && `${f.name}.${f.extension}`.toLowerCase() === fileName) file = f;
    });
    try {
        const { code, output } = await capture(`cat ${path}`);
        if (code !== 0) return output.trim() || "Unable to read file.";
        if (!file) return "Unable to read file.";
        return { file, text: output };
    } finally {
        off();
    }
}
