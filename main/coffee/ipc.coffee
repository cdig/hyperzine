{ BrowserWindow, ipcMain } = require "electron"

Take ["Window"], (Window)->

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
