{ app, BrowserWindow, dialog, ipcMain, MessageChannelMain } = require "electron"
{ performance } = require "perf_hooks"

Take ["Env", "Window"], (Env, Window)->

  ipcMain.handle "env", ()-> Env

  ipcMain.on "close-window", ({sender})-> BrowserWindow.fromWebContents(sender)?.close()

  ipcMain.on "quit", ({sender}, msg)-> app.quit()

  ipcMain.on "log", (e, msg)->
    time = (time or performance.now()).toFixed(0).padStart(5)
    console.log time + "  " + msg

  ipcMain.handle "showOpenDialog", ({sender}, opts)-> dialog.showOpenDialog BrowserWindow.fromWebContents(sender), opts

  ipcMain.handle "whats-my-asset", ({sender})-> BrowserWindow.fromWebContents(sender).title

  ipcMain.on "fatal", ({sender}, msg)->
    dialog.showErrorBox "Fatal Error", msg
    app.quit()

  ipcMain.on "bind-db", ({processId, sender})->
    db = Window.getDB()
    { port1, port2 } = new MessageChannelMain()
    sender.postMessage "port", {id:processId}, [port1]
    db.webContents.postMessage "port", {id:processId}, [port2]


  Make "IPC", IPC =

    on:     (channel, cb)-> ipcMain.on     channel, cb
    once:   (channel, cb)-> ipcMain.once   channel, cb
    handle: (channel, cb)-> ipcMain.handle channel, cb
    promise:
      once: (channel)-> new Promise (resolve)-> ipcMain.once channel, (e, arg)-> resolve arg
      handle: (channel)-> new Promise (resolve)-> ipcMain.handle channel, (e, arg)-> resolve arg

    # Send a message to the frontmost window
    toFocusedWindow: (msg)->
      win = BrowserWindow.getFocusedWindow()
      win ?= BrowserWindow.getAllWindows()[0] # No window was focussed, so get any window
      win ?= Window.open.browser() # No windows, so open a new window
      win.webContents.send msg

    db:
      invoke: (fn, ...args)->
        returnID = Math.random().toString()
        response = IPC.promise.once "main-db-invoke-#{returnID}"
        Window.getDB().webContents.send "main-db-invoke", returnID, fn, ...args
        response
