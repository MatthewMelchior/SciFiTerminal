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

    const listDirectory = async (path) => {
        const node = fs.getNode(path);
        const entries = fs.list(path);

        const lines = [];
        if (node.hint) lines.push(node.hint);
        if (entries.length === 0) lines.push("(empty)");
        else lines.push(...entries.map(e => e.type === "text" ? e.title : `[${e.title}]`));

        return printLines(lines);
    };

    const readFile = async (node) => {
        if (node.allowedRoles && !terminal.hasCodeAccess(node.allowedRoles)) {
            return printLines(node.unauthorizedMessage ?? UNAUTHORIZED);
        }
        return printLines([`\u2500\u2500 ${node.title} \u2500\u2500`, ...node.lines]);
    };

    terminal.register("ls", async (args) => {
        const target = joinArgs(args);
        const found = fs.getChild(terminal.cwd, target);

        if (!found) return print(`ls: ${target}: No such file or directory`);
        if (!(await checkAccess(found.path))) return;
        if (!found.node.entries) return print(`ls: ${target}: Not a directory`);

        return listDirectory(found.path);
    });

    terminal.register("cd", async (args) => {
        const target = joinArgs(args) || "/";
        const found = fs.getChild(terminal.cwd, target);

        if (!found) return print(`${target}: No such file or directory`);
        if (!(await checkAccess(found.path))) return;
        if (!found.node.entries) return print(`${target}: Not a directory`);

        terminal.cwd = found.path;
        terminal.updatePrompt();

        return listDirectory(found.path);
    });

    // "open" is the friendlier, do-what-I-mean version of cd/cat: it enters
    // directories (showing their hint + contents) and reads files, both
    // without requiring quotes around multi-word names.
    terminal.register("open", async (args) => {
        const target = joinArgs(args) || "/";
        const found = fs.getChild(terminal.cwd, target);

        if (!found) return print(`open: ${target}: No such file or directory`);
        if (!(await checkAccess(found.path))) return;

        if (found.node.entries) {
            terminal.cwd = found.path;
            terminal.updatePrompt();
            return listDirectory(found.path);
        }

        return readFile(found.node);
    });

    terminal.register("cat", async (args) => {
        const target = joinArgs(args);
        if (!target) return print("Usage: cat <file>");
        const found = fs.getChild(terminal.cwd, target);

        if (!found) return print(`cat: ${target}: No such file or directory`);
        if (!(await checkAccess(found.path))) return;
        if (found.node.entries) return print(`cat: ${target}: Is a directory`);

        return readFile(found.node);
    });

    terminal.register("pwd", () => {
        return print(fs.pwd(terminal.cwd));
    });

    terminal.register("help", () => {
        return printLines([
            "Available commands:",
            "  ls [dir]    - list directory contents",
            "  cd <dir>    - change directory",
            "  open <name> - enter a directory or read a file",
            "  cat <file>  - display file contents",
            "  pwd         - print working directory",
            "  help        - show this help",
        ]);
    });

    const protocolCodes = {
        "4902": {
            allowedRoles: ["ANDROID"],
            unauthorizedMessage: [
                "RESTRICTED ACCESS: UNAUTHORIZED CLEARANCE",
                "EMERGENCY PROTOCOL CAN ONLY BE READ AND AUTHORIZED BY SHIP'S ANDROID.",
                "TO RUN EMERGENCY PROTOCOL, ACTIVATE FROM ANDROID'S USER.",
                "IF UNAVAILABLE OR DECEASED, MOTHER WILL EXECUTE EMERGENCY PROTOCOL BY CAPTAIN'S COMMAND.",
            ],
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

    for (const [code, { allowedRoles, unauthorizedMessage, lines }] of Object.entries(protocolCodes)) {
        terminal.register(code, (args) => {
            if (!terminal.hasCodeAccess(allowedRoles)) {
                return printLines(unauthorizedMessage ?? UNAUTHORIZED);
            }
            return terminal.printLinesDelayed(lines, 2000);
        });
    }
}
