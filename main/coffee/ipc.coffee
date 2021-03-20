{ ipcMain, webContents } = require "electron"

Take ["Config", "State", "Window"], (Config, State, Window)->

  info =
    isDev: State.isDev
    isMac: State.isMac
    version: State.version

  Make "IPC", IPC =
    setup: ()->

      ipcMain.handle "config-data", ()->
        Config.get()

      ipcMain.on "close-window", ({sender})->
        BrowserWindow.fromWebContents(sender)?.close()

      ipcMain.on "db-assets", (e, assets)->
        State.assets = assets
        # When the DB first finishes loading assets, update any existing windows
        for wc in webContents.getAllWebContents()
          wc.send "assets", assets

      ipcMain.on "db-asset-changed", (e, asset)->
        State.assets[asset.id] = asset
        for wc in webContents.getAllWebContents()
          wc.send "asset-changed", asset

      ipcMain.on "db-asset-deleted", (e, assetId)->
        delete State.assets[assetId]
        for wc in webContents.getAllWebContents()
          wc.send "asset-deleted", assetId

      ipcMain.on "browser-init", ({reply})->
        # a new browser window was just opened, so feed it the list of assets (if that exists yet)
        reply "info", info
        if Object.keys(State.assets).length > 0
          reply "assets", State.assets

      ipcMain.on "browser-open-asset", (e, assetId)->
        Window.asset assetId

      ipcMain.on "asset-init", ({reply, sender}, assetId)->
        # We're assuming that the assets have already been loaded
        # This might not be true if we eventually save and restore window state on launch
        assetId = BrowserWindow.fromWebContents(sender).title
        reply "info", State.assets[assetId], info


    find: ()->
      win = BrowserWindow.getFocusedWindow()
      win ?= BrowserWindow.getAllWindows()[0] # No window was focussed, so get any window
      win ?= Window.browser() # No windows, so open a new window
      win.webContents.send "find"
