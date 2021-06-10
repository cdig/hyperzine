Take ["Env"], (Env)->
  { app, BrowserWindow } = require "electron"

  defaultWindow =
    backgroundColor: "#FFF"
    title: "Hyperzine"
    titleBarStyle: "hiddenInset"
    minWidth: 340
    minHeight: 340
    webPreferences:
      contextIsolation: false
      nodeIntegration: true
      scrollBounce: true

  windowIndexes = {}
  windowBounds =
    asset: []
    browser: []
    db: []
    "setup-assistant": []

  windowData = {}

  # Single instance windows
  db = null
  setupAssistant = null

  aboutToQuit = false
  app.on "before-quit", ()-> aboutToQuit = true

  # We want to track whether this window is the 1st, 2nd, 3rd (etc) instance of its type.
  # That way, whenever we open a new window, we can assign it to the most recently used
  # position for that instance of that type of window. Closing a window will leave a null
  # in the list of windows, which will be filled next time that type of window is opened.
  # Here, "index" means the 1st, 2nd, 3rd (etc) instance
  getNextIndex = (type)->
    indexes = windowIndexes[type] ?= []
    index = indexes.indexOf null # Find the position of the first null, if any
    index = indexes.length if index < 0 # No nulls, so add to the end of the list
    windowIndexes[type][index] = true # Save that this index is now being used
    return index

  clearIndex = (type, index)->
    windowIndexes[type][index] = null

  # LAPTOP — 1440 x 900
  devToolsWidth = 300
  defaultBounds =
    asset: width: 740, height: 600
    browser: x: 0, y: 0, width: 1440, height:900
    db: x: 0, y: 0, width: 500, height: 400
    "setup-assistant": width: 480, height: 540

  # 27" MONITOR — 2560 x 1440
  # devToolsWidth = 700
  # defaultBounds =
  #   asset: x: 430, y: 720, width: 1000, height: 720
  #   browser: x: 1260, y: 0, width: 600, height:720
  #   db: x: 0, y: 0, width: 560, height: 720
  #   "setup-assistant": width: 480, height: 540

  getBounds = (type, index)->
    bounds = windowBounds[type][index] or defaultBounds[type]

  checkBounds = (win)->
    bounds = win.getBounds()
    for otherWindow in BrowserWindow.getAllWindows() when otherWindow isnt win
      otherBounds = otherWindow.getBounds()
      if bounds.x is otherBounds.x and bounds.y is otherBounds.y
        bounds.x += 22
        bounds.y += 22
    win.setBounds bounds

  updateBounds = (type, index, win)->
    windowBounds[type][index] = win.getBounds()

  saveBounds = ()->
    # Disabled until we figure out app initialization
    # Config "windowBounds", windowBounds
    null

  newWindow = (type, openDevTools = false, props = {})->
    unless props.show is false
      deferPaint = true
      props.show = false
    openDevTools = openDevTools and Env.isDev# or true
    index = getNextIndex type
    bounds = getBounds type, index
    bounds.width += devToolsWidth
    win = new BrowserWindow Object.assign {}, defaultWindow, bounds, props
    checkBounds win
    win.loadFile "out/#{type}.html"
    win.webContents.openDevTools() if openDevTools
    win.once "ready-to-show", win.show if deferPaint
    win.on "move", (e)-> updateBounds type, index, win
    win.on "resize", (e)-> updateBounds type, index, win
    win.on "closed", (e)->
      saveBounds()
      clearIndex type, index
    win

  openAsset = (assetId)->
    win = newWindow "asset", false, title: "Asset"
    windowData[win.webContents.id] = assetId: assetId
    return win

  openDb = ()->
    if db?
      db.show()
    else
      db = newWindow "db", false, title: "Debug Log", backgroundThrottling: false, show: false#Env.isDev
      db.on "close", (e)->
        unless aboutToQuit
          e.preventDefault()
          db.hide()
      Make "DBWindowReady"
    return db

  openSetupAssistant = ()->
    if setupAssistant?
      setupAssistant.show()
    else
      setupAssistant = newWindow "setup-assistant", false, title: "Setup Assistant", resizable: false, fullscreenable: false, frame: false, titleBarStyle: "default"
      setupAssistant.on "close", (e)-> setupAssistant = null
    return setupAssistant



  Make "Window", Window =
    data: windowData

    getDB: ()->
      throw Error "DB window doesn't exist" unless db?
      db

    open:
      asset: openAsset
      browser: ()-> newWindow "browser", false, title: "Browser"
      db: openDb
      setupAssistant: openSetupAssistant

    activate: ()->
      unless BrowserWindow.getAllWindows().length > 1
        Window.open.browser()
