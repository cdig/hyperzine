"use strict"

{ app, BrowserWindow, ipcMain, webContents } = require "electron"
# electronReload = require "electron-reload"
path = require "path"

# electronReload "out"#, electron: path.join process.cwd(), "node_modules", ".bin", "electron"

defaultWindow =
  backgroundColor: "#FFF"
  title: "Hyperzine"
  titleBarStyle: "hiddenInset"
  webPreferences:
    contextIsolation: false
    nodeIntegration: true
    scrollBounce: true

winRes = w: 2560, h: 1440, db: [2/12, 1/12, 8/12, 1/12], browser: [2/12, 2/12, 8/12, 8/12] # Cinema Display
# winRes = w: 1440, h: 900, db: [0, 0, 1, 1/6], browser: [0, 1/6, 1, 5/6] # MacBook Air

position = (x, y, w, h)->
  x: Math.ceil(x*winRes.w), y: y*winRes.h|0, width: w*winRes.w|0, height: h*winRes.h|0

newWindow = (filename, openDevTools, position, props)->
  win = new BrowserWindow Object.assign {}, defaultWindow, position, props
  win.loadFile "out/#{filename}.html"
  win.webContents.openDevTools() if openDevTools

initWindows = ()->
  unless BrowserWindow.getAllWindows().length
    newWindow "db", true, position(...winRes.db), title: "DB", show: false
    newWindow "browser", true, position(...winRes.browser), title: "Hyperzine"

assets = {}
ipcMain.on "db-assets", (e, a)->
  assets = a
  for wc in webContents.getAllWebContents()
    wc.send "assets", assets

ipcMain.handle "browser-assets", ()-> assets

app.on "ready", initWindows
app.on "activate", initWindows
app.on "window-all-closed", ()-> # We need to subscribe to this event to stop the default auto-close behaviour
