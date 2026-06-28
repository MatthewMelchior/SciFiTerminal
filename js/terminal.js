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

        this.#input.disabled = true;
        this.#input.addEventListener("keydown", e => {
            if (e.key === "Enter") this.#handleInput();
        });
    }

    async start() {
        await this.boot();
        this.#prompt.textContent = "PASSWORD > ";
        this.#input.type = "password";
        this.#input.disabled = false;
        this.#input.focus();
    }

    register(name, fn) {
        this.#commands[name.toLowerCase()] = fn;
    }

    print(text, charDelayMs = 15) {
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

    printRaw(text) {
        const line = document.createElement("div");
        line.textContent = text;
        this.#output.appendChild(line);
        this.#output.scrollTop = this.#output.scrollHeight;
    }

    async printLines(lines, charDelayMs = 15) {
        for (const line of lines) {
            await this.print(line, charDelayMs);
        }
    }

    async printLinesDelayed(lines, delayMs = 2000, charDelayMs = 15) {
        for (let i = 0; i < lines.length; i++) {
            await this.print(lines[i], charDelayMs);
            if (i < lines.length - 1) {
                await new Promise(resolve => setTimeout(resolve, delayMs));
            }
        }
    }

    wait(ms) {
        return new Promise(resolve => setTimeout(resolve, ms));
    }

    async #showLogoScreen(text, { small = false, withBar = false, duration = 1800 } = {}) {
        const screen = document.getElementById("boot-screen");
        const logo = document.getElementById("boot-logo");
        const bar = document.getElementById("boot-bar");
        const barWrap = document.getElementById("boot-bar-wrap");
        const sub = document.getElementById("boot-sub");
        const copyright = document.getElementById("boot-copyright");

        logo.textContent = text;
        logo.classList.toggle("small", small);
        barWrap.style.visibility = withBar ? "visible" : "hidden";
        sub.style.visibility = withBar ? "visible" : "hidden";
        copyright.style.visibility = withBar ? "visible" : "hidden";
        bar.style.width = "0%";

        screen.classList.add("active");

        if (withBar) {
            await this.wait(50);
            bar.style.transition = `width ${duration - 100}ms linear`;
            bar.style.width = "100%";
        }

        await this.wait(duration);
        screen.classList.remove("active");
    }

    playBootSound() {
        const audio = document.getElementById("boot-sound");
        if (!audio) return;
        audio.currentTime = 0;
        audio.play().catch(() => {
            // Autoplay may be blocked until the user interacts with the page.
            const unlock = () => {
                audio.currentTime = 0;
                audio.play().catch(() => {});
                document.removeEventListener("keydown", unlock);
                document.removeEventListener("click", unlock);
            };
            document.addEventListener("keydown", unlock, { once: true });
            document.addEventListener("click", unlock, { once: true });
        });
    }

    async boot() {
        this.playBootSound();

        await this.#showLogoScreen("JCORP", { small: false, withBar: false, duration: 1600 });
        await this.#showLogoScreen("MOTHER", { small: false, withBar: true, duration: 2200 });

        await this.printLines([
            "INITIALIZING MOTHER CORE...",
            "LOADING SHIP DIAGNOSTICS...",
            "ESTABLISHING UPLINK...",
            "MOTHER ONLINE.",
        ], 10);

        await this.wait(300);
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
