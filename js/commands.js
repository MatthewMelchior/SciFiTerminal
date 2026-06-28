export function registerCommands(terminal) {
    const fs = terminal.fs;
    const print = (t) => terminal.print(t);
    const printLines = (l) => terminal.printLines(l);

    const UNAUTHORIZED = [
        "ERROR: UNAUTHORIZED ACCESS.",
        "CLEARANCE LEVEL INSUFFICIENT.",
        "REQUEST TERMINATED.",
    ];

    // Top-level directories require a directory id (from filesystem.json) to
    // check against the logged-in user's access list. A path's first segment
    // is matched against root entries by title to find that id.
    const topLevelId = (path) => {
        const [first] = fs.split(path);
        if (!first) return null;
        const entry = fs.root.entries.find(e => e.title === first);
        return entry ? entry.id : null;
    };

    const checkAccess = (path) => {
        const id = topLevelId(path);
        if (!id) return true; // root or non-restricted path
        if (terminal.hasAccess(id)) return true;
        printLines(UNAUTHORIZED);
        return false;
    };

    terminal.register("ls", (args) => {
        const path = fs.resolve(terminal.cwd, args[0] ?? ".");
        if (!checkAccess(path)) return;

        const node = fs.getNode(path);

        if (!node) return print(`ls: ${args[0]}: No such file or directory`);
        if (!node.entries) return print(`ls: ${args[0]}: Not a directory`);

        const entries = fs.list(path);
        if (entries.length === 0) return print("(empty)");
        printLines(entries.map(e => e.type === "text" ? e.title : `[${e.title}]`));
    });

    terminal.register("cd", (args) => {
        const target = args[0] ?? "/";
        const path = fs.resolve(terminal.cwd, target);
        if (!checkAccess(path)) return;

        if (!fs.exists(path)) return print(`cd: ${target}: No such file or directory`);
        if (!fs.isDirectory(path)) return print(`cd: ${target}: Not a directory`);

        terminal.cwd = path;
        terminal.updatePrompt();
    });

    terminal.register("cat", (args) => {
        if (!args[0]) return print("Usage: cat <file>");
        const path = fs.resolve(terminal.cwd, args[0]);
        if (!checkAccess(path)) return;

        const node = fs.getNode(path);

        if (!node) return print(`cat: ${args[0]}: No such file or directory`);
        if (node.entries) return print(`cat: ${args[0]}: Is a directory`);

        print(`\u2500\u2500 ${node.title} \u2500\u2500`);
        printLines(node.lines);
    });

    terminal.register("pwd", () => {
        print(fs.pwd(terminal.cwd));
    });

    terminal.register("help", () => {
        printLines([
            "Available commands:",
            "  ls [dir]   - list directory contents",
            "  cd <dir>   - change directory",
            "  cat <file> - display file contents",
            "  pwd        - print working directory",
            "  help       - show this help",
        ]);
    });

    const protocolCodes = {
        "4902": {
            allowedRoles: ["ANDROID"],
            lines: [
                "EMERGENCY PROTOCOL ACTIVATED...",
                "UPLOADING FILES TO ARK...",
                "SEALING ARK ENTRY...",
                "DETACHING ARK FROM NAUTILUS...",
                "DETACHMENT COMPLETE.",
                "EMERGENCY PROTOCOL EXECUTED SUCCESSFULLY.",
            ],
        },
        "7845": {
            allowedRoles: ["ANDROID", "CAPTAIN"],
            lines: [
                "DECEASED CREWMEMBER PROTOCOL ACTIVATED...",
                "BODY IDENTIFIED...",
                "CARGO BAY AIRLOCK READY FOR DEPRESSURIZATION...",
                "AWAITING RESPONSE FROM MOTHER...",
            ],
        },
        "3418": {
            allowedRoles: ["ANDROID", "CAPTAIN"],
            lines: [
                "CONTAINMENT PROTOCOL ACTIVATED...",
                "TSS-193 IN LOCKDOWN MODE...",
                "PLEASE MAKE YOUR WAY TO THE MAIN GALLEY...",
                "QUARANTINE CONDITIONS ACTIVATING IN T-3 MINUTES...",
            ],
        },
    };

    for (const [code, { allowedRoles, lines }] of Object.entries(protocolCodes)) {
        terminal.register(code, () => {
            if (!terminal.hasCodeAccess(allowedRoles)) {
                return printLines(UNAUTHORIZED);
            }
            terminal.printLinesDelayed(lines, 2000);
        });
    }
}
