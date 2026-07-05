export class VirtualFilesystem {

    constructor(data) {
        this.systemName = data.systemName;
        this.users = data.users;
        this.root = {
            title: "",
            type: "directory",
            entries: data.root ?? data.directory
        };
    }

    normalize(path) {
        return path
            .replace(/\/+/g, "/")
            .replace(/\/$/, "") || "/";
    }

    split(path) {
        return this.normalize(path)
            .split("/")
            .filter(Boolean);
    }

    resolve(currentPath, inputPath) {
        if (!inputPath || inputPath === ".")
            return currentPath;

        let parts;
        if (inputPath.startsWith("/")) {
            parts = [];
        } else {
            parts = this.split(currentPath);
        }

        for (const part of this.split(inputPath)) {
            if (part === "..") {
                parts.pop();
            } else if (part !== ".") {
                parts.push(part);
            }
        }

        return "/" + parts.join("/");
    }

    // Strips whitespace, lowercases, and removes non-alphanumeric characters
    // so user input like "tss193logs" matches "TSS-193 Logs".
    #normalizeKey(str) {
        return str.toLowerCase().replace(/[^a-z0-9]/g, "");
    }

    // Looks up a single entry by its literal name/title relative to
    // currentPath, without treating "/" inside the name as a path
    // separator. This matters because titles like "20/03/3056 - TEST"
    // contain "/" themselves. Still honors ".", "..", and a leading "/"
    // as navigation shortcuts. Returns { path, node } or null.
    getChild(currentPath, name) {
        if (!name || name === ".") {
            const node = this.getNode(currentPath);
            return node ? { path: this.normalize(currentPath), node } : null;
        }
        if (name === "..") {
            const parts = this.split(currentPath);
            parts.pop();
            const path = "/" + parts.join("/");
            const node = this.getNode(path);
            return node ? { path, node } : null;
        }
        if (name.startsWith("/")) {
            const path = this.normalize(name);
            const node = this.getNode(path);
            return node ? { path, node } : null;
        }

        const parent = this.getNode(currentPath);
        if (!parent || !parent.entries) return null;

        const key = this.#normalizeKey(name);
        const node = parent.entries.find(e => this.#normalizeKey(e.title) === key);
        if (!node) return null;

        const parts = this.split(currentPath);
        parts.push(node.title);
        return { path: "/" + parts.join("/"), node };
    }

    getNode(path = "/") {
        if (path === "/")
            return this.root;

        let current = this.root;
        for (const part of this.split(path)) {
            if (!current.entries)
                return null;
            current = current.entries.find(e => e.title === part);
            if (!current)
                return null;
        }
        return current;
    }

    exists(path) {
        return this.getNode(path) !== null;
    }

    isDirectory(path) {
        const node = this.getNode(path);
        return node && node.entries;
    }

    list(path = "/", showHidden = false) {
        const node = this.getNode(path);
        if (!node || !node.entries)
            return [];
        return node.entries.filter(e => showHidden || !e.hidden);
    }

    read(path) {
        const node = this.getNode(path);
        if (!node)
            return null;
        if (node.type !== "text")
            return null;
        return node.lines;
    }

    pwd(path) {
        return this.normalize(path);
    }
}