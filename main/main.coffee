{ app, BrowserWindow, dialog, ipcMain, Menu, nativeTheme, shell, webContents } = require "electron"
# electronReload = require "electron-reload"
path = require "path"
fs = require "fs"


# electronReload "out"#, electron: path.join process.cwd(), "node_modules", ".bin", "electron"

isDev = not app.isPackaged
isMac = process.platform is "darwin"
configData = null

defaultWindow =
  backgroundColor: "#FFF"
  title: "Hyperzine"
  titleBarStyle: "hiddenInset"
  webPreferences:
    contextIsolation: false
    nodeIntegration: true
    scrollBounce: true

configPath = path.join app.getPath("userData"), "config.json"

log = (msg)-> dialog.showMessageBox message: msg

template = []
if isMac then template.push
  label: app.name
  submenu: [
    { role: "about" }
    { type: "separator" }
    { role: "services" }
    { type: "separator" }
    { role: "hide" }
    { role: "hideothers" }
    { role: "unhide" }
    { type: "separator" }
    { role: "quit" }
  ]

template.push
  label: "File"
  submenu: [
    { label: "New Asset", enabled: false, accelerator: "CmdOrCtrl+N" }
    { label: "New Browser Window", accelerator: "CmdOrCtrl+Shift+N", click: ()-> newWindow "browser"}
    { type: "separator" }
    ...(if isDev
      [{ label: "Export App Folder", click: ()-> exportAppFolder() }]
    else
      [{ label: "Open App Update", click: ()-> openAppUpdate() }]
    )
    { label: "Show Config File", click: ()-> shell.showItemInFolder configPath }
    { type: "separator" }
    { role: if isMac then "close" else "quit" }
  ]

template.push
  label: "Edit"
  submenu: [
    { role: "undo" }
    { role: "redo" }
    { type: "separator" }
    { role: "cut" }
    { role: "copy" }
    { role: "paste" }
    { role: "delete" }
    { role: "selectAll" }
    { type: "separator" }
  ]

template.push
  label: "View"
  submenu: [
    ...(if isDev then [
      { role: "reload" }
      { role: "forceReload" }
      { role: "toggleDevTools" }
      { type: "separator" }
    ] else [])
    { role: "togglefullscreen" }
  ]

template.push { role: "windowMenu" }
  # label: "Window"
  # submenu: [
  #   { role: "minimize" }
  #   { role: "zoom" }
  #   ...(if isMac then [
  #     { type: "separator" }
  #     { role: "front" }
  #     { type: "separator" }
  #     { role: "window" }
  #   ] else [
  #     { role: "close" }
  #   ])
  # ]

template.push
  role: "help"
  submenu: [
    { label: "Report a Problem or Feature Request…", click: ()-> shell.openExternal "https://github.com/cdig/hyperzine/issues/new" }
    { label: "All Open Issues", click: ()-> shell.openExternal "https://github.com/cdig/hyperzine/issues" }
    { label: "Beep to Relieve Stress", click: ()-> shell.beep() }
  ]

# winRes = w: 2560, h: 1440, db: [2/12, 1/12, 8/12, 1/12], browser: [2/12, 2/12, 8/12, 8/12] # Cinema Display
winRes = w: 1440, h: 900, db: [1/6, 1/6, 4/6, 4/6], browser: [0, 0, 1, 1] # MacBook Air

position = (x, y, w, h)->
  if app.isPackaged then center:true, width:1200, height:800 else x: Math.ceil(x*winRes.w), y: y*winRes.h|0, width: w*winRes.w|0, height: h*winRes.h|0


validFileName = (v)->
  return false if v.indexOf(".") is 0 # Exclude dotfiles
  return true # Everything else is good

Read =
  folder: (folderPath)->
    try
      fileNames = fs.readdirSync folderPath
      fileNames.filter validFileName
    catch
      null

newWindow = (filename, openDevTools = false, position = {}, props = {})->
  unless props.show is false
    deferPaint = true
    props.show = false
  win = new BrowserWindow Object.assign {}, defaultWindow, position, props
  win.loadFile "out/#{filename}.html"
  win.webContents.openDevTools() if openDevTools and isDev
  win.once "ready-to-show", win.show if deferPaint

initBrowser = ()->
  unless BrowserWindow.getAllWindows().length > 1
    newWindow "browser", true, position(...winRes.browser), title: "Hyperzine"

launch = ()->
  newWindow "db", true, position(...winRes.db), title: "DB", backgroundThrottling: false, show: false
  initBrowser()
  Menu.setApplicationMenu Menu.buildFromTemplate template


promptForConfigData = (cb)->
  dialog.showMessageBox
    message: "Hyperzine uses a config file to store some local data. At the moment, this config file either doesn't exist, couldn't be loaded, or contains erroneous data.\n\nWould you like to generate a new config file? This will overwrite any existing config file."
    buttons: ["Generate", "Quit"]
    defaultId: 0
  .then ({response})->
    switch response
      when 0 then generateConfig cb
      when 1 then app.quit()


generateConfig = (cb)->
  dialog.showMessageBoxSync
    message: "On the next screen, please select your Dropbox folder and click Open."
    buttons: ["Will Do"]

  dialog.showOpenDialog
    title: "Select your Dropbox folder"
    defaultPath: path.join app.getPath("home")
    properties: ["openDirectory"]
  .then ({canceled, filePaths})->
    return app.quit() if canceled
    return dialog.showErrorBox("Failed to Generate Config File", "Nothing was selected.") unless folder = filePaths[0]
    return dialog.showErrorBox("Failed to Generate Config File", "You didn't select a Dropbox folder.") unless Array.last(folder.split(path.sep)).toLowerCase().indexOf("dropbox") is 0
    configData = pathToAssetsFolder: path.join folder, "System", "Hyperzine", "Assets"
    fs.writeFileSync configPath, JSON.stringify configData
    cb()


openAppUpdate = ()->
  dialog.showMessageBoxSync message: "To update Hyperzine, please select an (unzipped) app folder."
  dialog.showOpenDialog
    defaultPath: path.join app.getPath("home"), "Downloads"
    properties: ["openDirectory"]
  .then ({canceled, filePaths})->
    return if canceled
    return unless sourceApp = filePaths[0]
    return dialog.showErrorBox("Invalid Folder Selected", "Please select the \"app\" folder directly.") unless Array.last(sourceApp.split(path.sep)) is "app"
    sourceOut = path.join sourceApp, "out"
    destApp = path.join app.getAppPath()
    destOut = path.join destApp, "out"
    fs.mkdirSync destOut, recursive: true
    fs.copyFileSync path.join(sourceApp, "package.json"), path.join(destApp, "package.json")
    if files = Read.folder sourceOut
      for file in files
        fs.copyFileSync path.join(sourceOut, file), path.join(destOut, file)
    dialog.showMessageBoxSync message: "Hyperzine was successfully updated."
    app.relaunch()
    app.quit()


exportAppFolder = ()->
  sourceApp = app.getAppPath()
  sourceOut = path.join sourceApp, "out"
  destApp = path.join app.getPath("home"), "Desktop", "app"
  destOut = path.join destApp, "out"
  fs.mkdirSync destOut, recursive: true
  fs.copyFileSync path.join(sourceApp, "package.json"), path.join(destApp, "package.json")
  if files = Read.folder sourceOut
    for file in files
      fs.copyFileSync path.join(sourceOut, file), path.join(destOut, file)
  null

info =
  version: app.getVersion()
  roestta: app.runningUnderRosettaTranslation
assets = {}

ipcMain.on "db-assets", (e, a)->
  assets = a
  # When the DB first finishes loading assets, update any existing windows
  for wc in webContents.getAllWebContents()
    wc.send "assets", assets

ipcMain.on "db-asset-changed", (e, asset)->
  assets[asset.id] = asset
  for wc in webContents.getAllWebContents()
    wc.send "asset-changed", asset

ipcMain.on "db-asset-deleted", (e, assetId)->
  delete assets[assetId]
  for wc in webContents.getAllWebContents()
    wc.send "asset-deleted", assetId

ipcMain.on "browser-init", ({sender})->
  # a new window was just opened, so feed it the list of assets (if that exists yet)
  sender.send "info", info
  sender.send "assets", assets if Object.keys(assets).length > 0

ipcMain.handle "config-data", ()-> configData



app.on "ready", ()->
  try
    configData = JSON.parse fs.readFileSync configPath

  if configData
    launch()
  else
    promptForConfigData launch

app.on "browser-window-focus", (event, win)-> win.webContents.send "focus"
app.on "browser-window-blur", (event, win)-> win.webContents.send "blur"
app.on "activate", initBrowser
app.on "window-all-closed", ()-> # We need to subscribe to this event to stop the default auto-close behaviour

# app.setAboutPanelOptions
#   # applicationName: "Hyperzine"
#   # applicationVersion: 0.0.1
#   # copyright: CD Industrial Group Inc.
