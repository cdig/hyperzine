do ()->
  { app, BrowserWindow, dialog, MessageChannelMain } = require "electron"

  # In additon to the IPC handlers below, we also set up some app event handlers for our windows
  app.on "browser-window-focus", (event, win)-> win.webContents.send "focus"
  app.on "browser-window-blur", (event, win)-> win.webContents.send "blur"
  app.on "window-all-closed", ()-> # We need to subscribe to this event to stop the default auto-close behaviour

  { Env, IPC, Log, Printer, Window } = await Take.async ["Env", "IPC", "Log", "Printer", "Window"]

  Make "Handlers", Handlers = setup: ()->

    # SYSTEM

    IPC.handle "env", ()->
      Env

    IPC.on "quit", ({sender}, msg)->
      app.quit()

    IPC.on "fatal", ({sender}, msg)->
      dialog.showErrorBox "Fatal Error", msg
      app.quit()

    IPC.on "alert", ({sender}, opts)-> # See: https://www.electronjs.org/docs/latest/api/dialog/#dialogshowmessageboxbrowserwindow-options
      dialog.showMessageBox opts

    IPC.on "printer", (e, ...args)-> Printer ...args

    IPC.on "bind-db", ({processId, sender})->
      db = Window.getDB()
      { port1, port2 } = new MessageChannelMain()
      sender.postMessage "port", {id:processId}, [port1]
      db.webContents.postMessage "port", {id:processId}, [port2]

    # WINDOWING

    IPC.on "close-window", ({sender})->
      BrowserWindow.fromWebContents(sender)?.close()

    IPC.on "set-window-title", ({sender}, name)->
      BrowserWindow.fromWebContents(sender).setTitle name

    IPC.handle "showOpenDialog", ({sender}, opts)->
      dialog.showOpenDialog BrowserWindow.fromWebContents(sender), opts

    IPC.on "open-asset", (e, assetId)->
      Window.open.asset assetId

    IPC.handle "whats-my-asset", ({sender})->
      win = BrowserWindow.fromWebContents sender
      Window.data[win.webContents.id].assetId

    # FEATURES

    IPC.on "drag-file", ({sender}, path)->
      sender.startDrag
        file: path
        icon: await app.getFileIcon path

    IPC.handle "get-file-icon", ({sender}, path)->
      img = await app.getFileIcon path
      img.toDataURL()
