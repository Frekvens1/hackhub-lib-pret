# lib-pret

A terminal version of `pret.py` for [HackHub](https://store.steampowered.com/app/2980270/HackHub__Ultimate_Hacker_Simulator/).\
It connects to a printer and prints a `.txt` file on it without the PRET window, so you can use it from your own scripts.

```
$ pret 121.160.143.252 ascii.txt
      ________________
    _/_______________/|
   /___________/___//||   PRET | Printer Exploitation Toolkit v0.25
   ...
Connection to Sharp MX-3071 established
Printing ascii.txt...
Printed ascii.txt on Sharp MX-3071
```

## Features

- Same checks and messages as `pret.py`: the printer must have port 9100 forwarded and not blocked by a firewall.
- Plays fair: it needs `python3`, takes as long as `pret.py` and the PRET window, and counts for the same quest objectives.
- Documented in the in-game Handbook, under **FrekLib**.

## Usage

```
apt-get install python3
apt-get install pret

pret <ip>                   # connect only
pret <ip> <file.txt>        # connect and print
pret <ip> <file.txt> -json  # JSON
```

### In scripts

```typescript
interface PretResult {
    ip: string;
    lanIp: string | null;
    model: string | null; // printer model
    file: string | null;  // printed file, null when only connecting
}

const output = await Shell.Process.exec("pret 121.160.143.252 ~/ascii.txt -json", { silent: true });
const result: PretResult = JSON.parse(output);
```

## Building

Requires [Bun](https://bun.sh).

```sh
bun install
bun run build
```

Copy `mod.js`, `manifest.json` and `cover.png` from `dist/` into `<HackHub>/mods/lib-pret/`, then restart the game.

## License

[MIT](LICENSE). Fork it, change it, and build on it!
