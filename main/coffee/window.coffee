Take ["Env", "MainState"], (Env, MainState)->
  { app, BrowserWindow, nativeTheme, screen } = require "electron"

  defaultWindow =
    title: "Hyperzine"
    titleBarStyle: "hiddenInset"
    minWidth: 340
    minHeight: 340
    webPreferences:
      contextIsolation: false
      nodeIntegration: true
      scrollBounce: true
      backgroundThrottling: false

  defaultBounds =
    asset: width: 960, height: 540
    browser: width: 1280, height: 720
    db: width: 640, height: 480
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
    # We do some special logic to position windows based on the position of the
    # mouse cursor, to avoid frustration when working with multiple monitors.
    # We regard the mouse to be occupying the "current" monitor.
    cursor = screen.getCursorScreenPoint()
    display = screen.getDisplayNearestPoint(cursor).bounds

    # The Setup Assistant is handled specially.
    # It should always appear centered on the current monitor.
    if type is "setup-assistant"
      bounds = defaultBounds[type]
      bounds.x = display.x + display.width/2 - bounds.width/2
      bounds.y = display.y + display.height/2 - bounds.height/2
      return bounds

    # For other types of windows, we'll first try to load the
    # last-used position for this instance (by index) of this type of window
    bounds = windowBounds[type][index]
    return bounds if bounds?

    # We don't have a last-used position, so let's set up a new one.
    bounds = defaultBounds[type]

    if type is "db"
      # By default, the db should appear in the top left of the current monitor.
      bounds.x = display.x
      bounds.y = display.y

    else if type is "browser" and index is 0
      # The first instance of the browser window should appear centered on the current monitor.
      bounds.x = display.x + display.width/2 - bounds.width/2
      bounds.y = display.y + display.height/2 - bounds.height/2

    else
      # All other windows should appear near the mouse cursor.
      bounds.x = cursor.x - 74
      bounds.y = cursor.y - 16

    bounds

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
    updateBounds type, index, win
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

  openBrowser = ()->
    newWindow "browser", {tools: false}, title: "Browser", minWidth: 400

  openDb = ()->
    if db?
      db.show()
    else
      db = newWindow "db", {tools: false}, title: "Debug Log", show: Env.isDev# and false
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
      browser: openBrowser
      db: openDb
      setupAssistant: openSetupAssistant

    activate: ()->
      unless BrowserWindow.getAllWindows().length > 1
        # TODO: If we're not done setup, open the Setup Assistant instead
        Window.open.browser()
