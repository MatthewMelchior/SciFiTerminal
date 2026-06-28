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