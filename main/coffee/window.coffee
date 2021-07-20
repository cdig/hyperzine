Take ["Env", "MainState"], (Env, MainState)->
  { app, BrowserWindow, nativeTheme } = require "electron"

  defaultWindow =
    title: "Hyperzine"
    titleBarStyle: "hiddenInset"
    minWidth: 340
    minHeight: 340
    webPreferences:
      contextIsolation: false
      nodeIntegration: true
      scrollBounce: true

  defaultBounds =
    asset: width: 960, height: 540
    browser: width: 1280, height: 720
    db: x: 0, y: 0, width: 500, height: 400
    "setup-assistant": width: 480, height: 540

  windowIndexes = {}
  windowBounds = null

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

  getBounds = (type, index)->
    bounds = windowBounds[type][index] or defaultBounds[type]

  checkBounds = (win)->
    bounds = win.getBounds()
    for otherWindow in BrowserWindow.getAllWindows() when otherWindow isnt win and otherWindow isnt db
      otherBounds = otherWindow.getBounds()
      if bounds.x is otherBounds.x and bounds.y is otherBounds.y
        bounds.x += 22
        bounds.y += 22
        # We've moved our window, so we need to start checking all over again
        # TODO: There's a small risk of an infine loop here if the behaviour of
        # setBounds followed by getBounds changes and starts clipping to the window.
        # Also, we aren't matching OSX behaviour, which is to wrap.
        win.setBounds bounds
        checkBounds win
        return

  updateBounds = (type, index, win)->
    windowBounds[type][index] = win.getBounds()
    MainState "windowBounds", windowBounds

  newWindow = (type, {tools}, props = {})->
    unless props.show is false
      deferPaint = true
      props.show = false
    openDevTools = tools and Env.isDev# or true
    index = getNextIndex type
    bounds = getBounds type, index
    background = backgroundColor: if nativeTheme.shouldUseDarkColors then "#1b1b1b" else "#f2f2f2"
    win = new BrowserWindow Object.assign {}, defaultWindow, bounds, background, props
    checkBounds win
    win.loadFile "out/#{type}.html"
    win.webContents.openDevTools() if tools
    win.once "ready-to-show", win.show if deferPaint
    win.on "move", (e)-> updateBounds type, index, win
    win.on "resize", (e)-> updateBounds type, index, win
    win.on "closed", (e)-> clearIndex type, index
    win

  openAsset = (assetId)->
    win = newWindow "asset", {tools: false}, title: "Asset"
    windowData[win.webContents.id] = assetId: assetId
    return win

  openDb = ()->
    if db?
      db.show()
    else
      db = newWindow "db", {tools: true}, title: "Debug Log", backgroundThrottling: false, show: Env.isDev
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
      setupAssistant = newWindow "setup-assistant", {tools: false}, title: "Setup Assistant", resizable: false, fullscreenable: false, frame: false, titleBarStyle: "default"
      setupAssistant.on "close", (e)-> setupAssistant = null
    return setupAssistant



  Make "Window", Window =
    init: ()->
      windowBounds = MainState "windowBounds"

    data: windowData

    getDB: ()->
      throw Error "DB window doesn't exist" unless db?
      db

    open:
      asset: openAsset
      browser: ()-> newWindow "browser", {tools: false}, title: "Browser", minWidth: 400
      db: openDb
      setupAssistant: openSetupAssistant

    activate: ()->
      unless BrowserWindow.getAllWindows().length > 1
        Window.open.browser()
