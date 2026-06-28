export function registerCommands(terminal) {
    const fs = terminal.fs;
    const print = (t) => terminal.print(t);
    const printLines = (l) => terminal.printLines(l);

    const UNAUTHORIZED = [
        "ERROR: UNAUTHORIZED ACCESS.",
        "CLEARANCE LEVEL INSUFFICIENT.",
        "REQUEST TERMINATED.",
    ];

    // Lets users type multi-word names without quotes, e.g.
    // "open TSS-193 Logs" instead of "cd \"TSS-193 Logs\"".
    const joinArgs = (args) => args.join(" ");

    // Top-level directories require a directory id (from filesystem.json) to
    // check against the logged-in user's access list. A path's first segment
    // is matched against root entries by title to find that id.
    const topLevelId = (path) => {
        const [first] = fs.split(path);
        if (!first) return null;
        const entry = fs.root.entries.find(e => e.title === first);
        return entry ? entry.id : null;
    };

    const checkAccess = async (path) => {
        const id = topLevelId(path);
        if (!id) return true; // root or non-restricted path
        if (terminal.hasAccess(id)) return true;
        await printLines(UNAUTHORIZED);
        return false;
    };

    terminal.register("ls", async (args) => {
        const target = joinArgs(args);
        const path = fs.resolve(terminal.cwd, target || ".");
        if (!(await checkAccess(path))) return;

        const node = fs.getNode(path);

        if (!node) return print(`ls: ${target}: No such file or directory`);
        if (!node.entries) return print(`ls: ${target}: Not a directory`);

        const entries = fs.list(path);
        if (entries.length === 0) return print("(empty)");
        return printLines(entries.map(e => e.type === "text" ? e.title : `[${e.title}]`));
    });

    const cdHandler = async (args) => {
        const target = joinArgs(args) || "/";
        const path = fs.resolve(terminal.cwd, target);
        if (!(await checkAccess(path))) return;

        if (!fs.exists(path)) return print(`${target}: No such file or directory`);
        if (!fs.isDirectory(path)) return print(`${target}: Not a directory`);

        terminal.cwd = path;
        terminal.updatePrompt();
    };

    terminal.register("cd", cdHandler);
    terminal.register("open", cdHandler);

    terminal.register("cat", async (args) => {
        const target = joinArgs(args);
        if (!target) return print("Usage: cat <file>");
        const path = fs.resolve(terminal.cwd, target);
        if (!(await checkAccess(path))) return;

        const node = fs.getNode(path);

        if (!node) return print(`cat: ${target}: No such file or directory`);
        if (node.entries) return print(`cat: ${target}: Is a directory`);

        await print(`\u2500\u2500 ${node.title} \u2500\u2500`);
        return printLines(node.lines);
    });

    terminal.register("pwd", () => {
        return print(fs.pwd(terminal.cwd));
    });

    terminal.register("help", () => {
        return printLines([
            "Available commands:",
            "  ls [dir]    - list directory contents",
            "  cd <dir>    - change directory",
            "  open <dir>  - same as cd",
            "  cat <file>  - display file contents",
            "  pwd         - print working directory",
            "  help        - show this help",
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
        terminal.register(code, (args) => {
            if (!terminal.hasCodeAccess(allowedRoles)) {
                return printLines(UNAUTHORIZED);
            }
            return terminal.printLinesDelayed(lines, 2000);
        });
    }
}
