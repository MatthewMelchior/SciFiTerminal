export function registerCommands(terminal) {
    const fs = terminal.fs;
    const print = (t) => terminal.print(t);
    const printLines = (l) => terminal.printLines(l);

    terminal.register("ls", (args) => {
        const path = fs.resolve(terminal.cwd, args[0] ?? ".");
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

        if (!fs.exists(path)) return print(`cd: ${target}: No such file or directory`);
        if (!fs.isDirectory(path)) return print(`cd: ${target}: Not a directory`);

        terminal.cwd = path;
        terminal.updatePrompt();
    });

    terminal.register("cat", (args) => {
        if (!args[0]) return print("Usage: cat <file>");
        const path = fs.resolve(terminal.cwd, args[0]);
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
}
