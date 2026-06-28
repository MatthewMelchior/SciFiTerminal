import { VirtualFilesystem } from "./VirtualFilesystem.js";
import { Terminal } from "./terminal.js";
import { registerCommands } from "./commands.js";

const response = await fetch("data/filesystem.json");
const data = await response.json();

const fs = new VirtualFilesystem(data);
const terminal = new Terminal(fs);

registerCommands(terminal);

terminal.print("MOTHER SYSTEM ONLINE");
terminal.print(`Welcome to ${data.systemName}. Type 'help' for available commands.`);
