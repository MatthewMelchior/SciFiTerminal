import { VirtualFilesystem } from "./VirtualFilesystem.js";
import { Terminal } from "./terminal.js";
import { registerCommands } from "./commands.js";

const response = await fetch("data/filesystem.json");
const data = await response.json();

const fs = new VirtualFilesystem(data);
const terminal = new Terminal(fs);

registerCommands(terminal);

const bootSound = document.getElementById("boot-sound");
const typeSound = document.getElementById("type-sound");
const humSound = document.getElementById("hum-sound");
if (bootSound) bootSound.volume = 0.3; // 0.0 (silent) to 1.0 (full volume)
if (typeSound) typeSound.volume = 0.3; // 0.0 (silent) to 1.0 (full volume)
if (humSound) humSound.volume = 0.3;   // 0.0 (silent) to 1.0 (full volume)

terminal.start();
