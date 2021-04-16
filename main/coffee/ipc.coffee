{ app, BrowserWindow, dialog, ipcMain, MessageChannelMain } = require "electron"

Take ["Env", "Window"], (Env, Window)->

  ipcMain.handle "env", ()-> Env

  ipcMain.on "close-window", ({sender})-> BrowserWindow.fromWebContents(sender)?.close()

  ipcMain.on "quit", ({sender}, msg)-> app.quit()

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
    once:   (channel, cb)-> ipcMain.on     channel, cb
    handle: (channel, cb)-> ipcMain.handle channel, cb

    # Promise-based handlers, optimized for use with await
    promise:
      once: (channel)-> new Promise (resolve)-> ipcMain.once channel, resolve
      handle: (channel)-> new Promise (resolve)-> ipcMain.handle channel, (e, ...args)-> resolve ...args

    # Send a message to the frontmost window
    toFocusedWindow: (msg)->
      win = BrowserWindow.getFocusedWindow()
      win ?= BrowserWindow.getAllWindows()[0] # No window was focussed, so get any window
      win ?= Window.open.browser() # No windows, so open a new window
      win.webContents.send msg
