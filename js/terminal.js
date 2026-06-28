export class Terminal {
    cwd = "/";
    #commands = {};
    #output;
    #prompt;
    #input;

    constructor(fs) {
        this.fs = fs;
        this.#output = document.getElementById("output");
        this.#prompt = document.getElementById("prompt");
        this.#input = document.getElementById("command-input");

        this.updatePrompt();
        this.#input.addEventListener("keydown", e => {
            if (e.key === "Enter") this.#handleInput();
        });
    }

    register(name, fn) {
        this.#commands[name.toLowerCase()] = fn;
    }

    print(text) {
        const line = document.createElement("div");
        line.textContent = text;
        this.#output.appendChild(line);
        this.#output.scrollTop = this.#output.scrollHeight;
    }

    printLines(lines) {
        lines.forEach(l => this.print(l));
    }

    printLinesDelayed(lines, delayMs = 2000) {
        lines.forEach((line, i) => {
            setTimeout(() => this.print(line), i * delayMs);
        });
    }

    updatePrompt() {
        this.#prompt.textContent = `MOTHER:${this.fs.pwd(this.cwd)} > `;
    }

    #handleInput() {
        const raw = this.#input.value.trim();
        this.#input.value = "";
        if (!raw) return;

        this.print(`> ${raw}`);

        const [cmd, ...args] = raw.match(/(?:[^\s"]+|"[^"]*")+/g).map(t => t.replace(/"/g, ""));
        const handler = this.#commands[cmd.toLowerCase()];
        if (handler) {
            handler(args);
        } else {
            this.print(`${cmd}: command not found. Type 'help' for available commands.`);
        }
    }
}
