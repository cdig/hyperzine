{ app, BrowserWindow, dialog, MessageChannelMain } = require "electron"
{ performance } = require "perf_hooks"

Take ["Env", "IPC", "Window"], (Env, IPC, Window)->

  Make "Handlers", Handlers = setup: ()->

    # SYSTEM

    IPC.handle "env", ()->
      Env

    IPC.on "quit", ({sender}, msg)->
      app.quit()

    IPC.on "fatal", ({sender}, msg)->
      dialog.showErrorBox "Fatal Error", msg
      app.quit()

    IPC.on "log", (e, msg)->
      time = (time or performance.now()).toFixed(0).padStart(5)
      console.log time + "  " + msg

    IPC.on "bind-db", ({processId, sender})->
      db = Window.getDB()
      { port1, port2 } = new MessageChannelMain()
      sender.postMessage "port", {id:processId}, [port1]
      db.webContents.postMessage "port", {id:processId}, [port2]

    # WINDOWING

    IPC.on "close-window", ({sender})->
      BrowserWindow.fromWebContents(sender)?.close()

    IPC.handle "showOpenDialog", ({sender}, opts)->
      dialog.showOpenDialog BrowserWindow.fromWebContents(sender), opts

    IPC.on "open-asset", (e, assetId)->
      Window.open.asset assetId

    IPC.handle "whats-my-asset", ({sender})->
      win = BrowserWindow.fromWebContents sender
      Window.data[win.webContents.id].assetId

    IPC.on "set-asset-name", ({sender}, name)->
      BrowserWindow.fromWebContents(sender).setTitle name

    # FEATURES

    IPC.on "new-asset", ()->
      db = Window.getDB()
      db.webContents.send "log", "Test"
