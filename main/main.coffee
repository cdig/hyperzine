"use strict"

{ app, BrowserWindow, dialog, ipcMain, nativeTheme, webContents } = require "electron"
# electronReload = require "electron-reload"
path = require "path"
fs = require "fs"

# electronReload "out"#, electron: path.join process.cwd(), "node_modules", ".bin", "electron"

defaultWindow =
  backgroundColor: "#FFF"
  title: "Hyperzine"
  titleBarStyle: "hiddenInset"
  webPreferences:
    contextIsolation: false
    nodeIntegration: true
    scrollBounce: true

try
  configData = JSON.parse fs.readFileSync path.join app.getPath("userData"), "config.json"
catch
  dialog.showErrorBox("Reading Config Data Failed", "The config file either doesn't exist, couldn't be loaded, or contains erroneous data.\n\nPlease ensure there's a file at\n~/Library/Application Support/Hyperzine/config.json and that it contains valid JSON. Hyperzine will now quit.")
  app.exit()
  return

winRes = w: 2560, h: 1440, db: [2/12, 1/12, 8/12, 1/12], browser: [2/12, 2/12, 8/12, 8/12] # Cinema Display
# winRes = w: 1440, h: 900, db: [0, 0, 1, 1/6], browser: [0, 1/6, 1, 5/6] # MacBook Air

position = (x, y, w, h)->
  if app.isPackaged then center:true, width:1200, height:800 else x: Math.ceil(x*winRes.w), y: y*winRes.h|0, width: w*winRes.w|0, height: h*winRes.h|0

newWindow = (filename, openDevTools, position, props)->
  win = new BrowserWindow Object.assign {}, defaultWindow, position, props
  win.loadFile "out/#{filename}.html"
  win.webContents.openDevTools() if openDevTools and not app.isPackaged

initBrowser = ()->
  unless BrowserWindow.getAllWindows().length > 1
    newWindow "browser", true, position(...winRes.browser), title: "Hyperzine"

assets = {}
ipcMain.on "db-assets", (e, a)->
  assets = a
  for wc in webContents.getAllWebContents()
    wc.send "assets", assets

ipcMain.handle "browser-assets", ()-> assets
ipcMain.handle "config-data", ()-> configData

app.on "ready", ()->
  newWindow "db", true, position(...winRes.db), title: "DB", show: false
  initBrowser()

app.on "browser-window-focus", (event, win)-> win.webContents.send "focus"
app.on "browser-window-blur", (event, win)-> win.webContents.send "blur"
app.on "activate", initBrowser
app.on "window-all-closed", ()-> # We need to subscribe to this event to stop the default auto-close behaviour
