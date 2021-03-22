{ BrowserWindow } = require "electron"

Take ["Config", "State"], (Config, State)->

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
  windowBounds = null

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


  # Any properties that aren't specified will just be defaulted by electron
  defaultBounds =
    asset: width: 800, height: 600
    browser: width:1440, height:900
    db: y: 0, width: 800, height: 200

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
    Config "windowBounds", windowBounds


  Make "Window", Window =
    setup: ()->
      windowBounds = Config "windowBounds"
      windowBounds ?=
        asset: []
        browser: []
        db: []

    asset: (assetId)->
      Window.new "asset", false, title: assetId

    browser: ()->
      unless BrowserWindow.getAllWindows().length > 1
        Window.new "browser", false, title: "Hyperzine Browser"

    db: ()->
      Window.new "db", false, title: "DB", backgroundThrottling: false, show: false

    new: (type, openDevTools = false, props = {})->
      unless props.show is false
        deferPaint = true
        props.show = false
      index = getNextIndex type
      bounds = getBounds type, index
      win = new BrowserWindow Object.assign {}, defaultWindow, bounds, props
      checkBounds win
      win.loadFile "out/#{type}.html"
      win.webContents.openDevTools() if openDevTools and State.isDev
      win.once "ready-to-show", win.show if deferPaint
      win.on "move", (e)-> updateBounds type, index, win
      win.on "resize", (e)-> updateBounds type, index, win
      win.on "closed", (e)->
        saveBounds()
        clearIndex type, index
      win
