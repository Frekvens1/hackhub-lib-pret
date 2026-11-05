import { Handbook } from "@hotbunny/hackhub-content-sdk";

/** Shared Handbook category for Frek mods. Other mods add articles to it by using the same name. */
const CATEGORY = "FrekLib";
const ENTRY_ID = "freklib-pret";

const CONTENT = `### Lib - pret

Connects to a printer on port 9100, like \`pret.py\`, and prints a .txt file
on it without opening the PRET window.

### Install

Needs python3, like \`pret.py\`:

\`\`\`
apt-get install python3
apt-get install pret
\`\`\`

### Terminal

\`\`\`
pret <ip>                   # connect only
pret <ip> <file.txt>        # connect and print
pret <ip> <file.txt> -json  # JSON result
\`\`\`

The printer must be reachable: port 9100 forwarded on its router and not
blocked by a firewall. Printing takes as long as in the PRET window and
counts for the same quest objectives.

### In scripts

Run the command with \`-json\` and parse the output:

\`\`\`typescript
interface PretResult {
    ip: string;
    lanIp: string | null;
    model: string | null; // printer model
    file: string | null;  // printed file, null when only connecting
}

const output = await Shell.Process.exec("pret 121.160.143.252 ~/ascii.txt -json", { silent: true });
const result: PretResult = JSON.parse(output);
\`\`\`
`;

export function registerHandbook(): void {
    Handbook.registerEntry({ id: ENTRY_ID, category: CATEGORY, title: "pret", content: CONTENT, order: 20 });
}

export function unregisterHandbook(): void {
    Handbook.unregisterEntry(ENTRY_ID);
}
