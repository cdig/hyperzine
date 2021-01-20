"use strict";

const { app, BrowserWindow } = require("electron");
require("electron-reload")(__dirname);

app.on("ready", () => {
  const win = new BrowserWindow({
    width: 1707,
    height: 960,
    x: 427,
    y: 240,
    titleBarStyle: "hidden",
    backgroundColor: "#FFF",
    webPreferences: {
      contextIsolation: false,
      nodeIntegration: true
    }
  });
  win.loadFile("build/index.html");
  win.webContents.openDevTools();
});
