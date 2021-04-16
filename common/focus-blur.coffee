{ ipcRenderer } = require "electron"

ipcRenderer.on "focus", ()-> document.documentElement.classList.remove "blur"
ipcRenderer.on "blur", ()-> document.documentElement.classList.add "blur"
