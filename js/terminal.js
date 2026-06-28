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

    print(text, charDelayMs = 40) {
        const line = document.createElement("div");
        this.#output.appendChild(line);

        return new Promise(resolve => {
            let i = 0;
            const typeNext = () => {
                line.textContent += text[i];
                i++;
                this.#output.scrollTop = this.#output.scrollHeight;

                if (i < text.length) {
                    setTimeout(typeNext, charDelayMs);
                } else {
                    resolve();
                }
            };

            if (text.length === 0) {
                resolve();
            } else {
                typeNext();
            }
        });
    }

    async printLines(lines, charDelayMs = 40) {
        for (const line of lines) {
            await this.print(line, charDelayMs);
        }
    }

    async printLinesDelayed(lines, delayMs = 2000, charDelayMs = 40) {
        for (let i = 0; i < lines.length; i++) {
            await this.print(lines[i], charDelayMs);
            if (i < lines.length - 1) {
                await new Promise(resolve => setTimeout(resolve, delayMs));
            }
        }
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

    async #attemptLogin(password) {
        const user = Object.values(this.fs.users).find(u => u.code === password);
        if (!user) {
            await this.print("ACCESS DENIED.");
            return;
        }

        this.currentUser = user;
        this.#loggedIn = true;
        this.#input.type = "text";

        await this.print(`MOTHER: NAUTILUS`);
        await this.print(`Welcome, ${user.name}.`);
        await this.print("How can MOTHER help?");

        this.updatePrompt();
    }

    async #handleInput() {
        const raw = this.#input.value.trim();
        this.#input.value = "";
        if (!raw) return;

        this.#input.disabled = true;

        if (!this.#loggedIn) {
            await this.#attemptLogin(raw);
            this.#input.disabled = false;
            this.#input.focus();
            return;
        }

        await this.print(`> ${raw}`);

        const [cmd, ...args] = raw.match(/(?:[^\s"]+|"[^"]*")+/g).map(t => t.replace(/"/g, ""));
        const handler = this.#commands[cmd.toLowerCase()];
        if (handler) {
            await handler(args);
        } else {
            await this.print(`${cmd}: command not found. Type 'help' for available commands.`);
        }

        this.#input.disabled = false;
        this.#input.focus();
    }
}
