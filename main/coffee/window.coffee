{ BrowserWindow } = require "electron"

Take ["State"], (State)->

  defaultWindow =
    backgroundColor: "#FFF"
    title: "Hyperzine"
    titleBarStyle: "hiddenInset"
    webPreferences:
      contextIsolation: false
      nodeIntegration: true
      scrollBounce: true

  # winRes = w: 2560, h: 1440, db: [2/12, 1/12, 8/12, 1/12], browser: [2/12, 2/12, 8/12, 8/12], asset: [1/5, 1/5, 3/5, 3/5] # Cinema Display
  winRes = w: 1440, h: 900, db: [1/6, 1/6, 4/6, 1/6], browser: [0, 0, 1, 1], asset: [1/6, 1/6, 4/6, 4/6] # MacBook Air

  makePosition = (x, y, w, h)->
    if app.isPackaged then center:true, width:1200, height:800 else x: Math.ceil(x*winRes.w), y: y*winRes.h|0, width: w*winRes.w|0, height: h*winRes.h|0


  Make "Window", Window =
    asset: (assetId)->
      Window.new "asset", true, title: assetId

    browser: ()->
      unless BrowserWindow.getAllWindows().length > 1
        Window.new "browser", true, title: "Hyperzine Browser"

    db: ()->
      Window.new "db", true, title: "DB", backgroundThrottling: false, show: false

    new: (filename, openDevTools = false, props = {})->
      position = if winRes[filename] then makePosition ...winRes[filename] else {}
      unless props.show is false
        deferPaint = true
        props.show = false
      win = new BrowserWindow Object.assign {}, defaultWindow, position, props
      win.loadFile "out/#{filename}.html"
      win.webContents.openDevTools() if openDevTools and State.isDev
      win.once "ready-to-show", win.show if deferPaint
      win
