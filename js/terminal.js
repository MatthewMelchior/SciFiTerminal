export class Terminal {
    cwd = "/";
    #commands = {};
    #output;
    #prompt;
    #input;
    #loggedIn = false;
    currentUser = null;

    constructor(fs) {
        this.fs = fs;
        this.#output = document.getElementById("output");
        this.#prompt = document.getElementById("prompt");
        this.#input = document.getElementById("command-input");

        this.#prompt.textContent = "PASSWORD > ";
        this.#input.type = "password";
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

    hasAccess(directoryId) {
        if (!this.currentUser) return false;
        if (this.currentUser.access === "all") return true;
        return this.currentUser.access.includes(directoryId);
    }

    hasCodeAccess(allowedRoles) {
        if (!this.currentUser) return false;
        return allowedRoles.includes(this.currentUser.role);
    }

    #attemptLogin(password) {
        const user = Object.values(this.fs.users).find(u => u.code === password);
        if (!user) {
            this.print("ACCESS DENIED.");
            return;
        }

        this.currentUser = user;
        this.#loggedIn = true;
        this.#input.type = "text";

        this.print(`MOTHER: NAUTILUS`);
        this.print(`Welcome, ${user.name}.`);
        this.print("How can MOTHER help?");

        this.updatePrompt();
    }

    #handleInput() {
        const raw = this.#input.value.trim();
        this.#input.value = "";
        if (!raw) return;

        if (!this.#loggedIn) {
            this.#attemptLogin(raw);
            return;
        }

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
