Take ["Env", "IPC", "Log", "Printer", "Window"], (Env, IPC, Log, Printer, Window)->
  { app, BrowserWindow, dialog, MessageChannelMain } = require "electron"

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

    IPC.on "minimize-window", ({sender})->
      BrowserWindow.fromWebContents(sender)?.minimize()

    IPC.on "maximize-window", ({sender})->
      BrowserWindow.fromWebContents(sender)?.maximize()

    IPC.on "unmaximize-window", ({sender})->
      BrowserWindow.fromWebContents(sender)?.unmaximize()

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

    IPC.on "preview-file", ({sender}, path)->
      win = BrowserWindow.fromWebContents sender
      win.previewFile path
