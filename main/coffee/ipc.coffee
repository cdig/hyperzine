{ ipcMain, webContents } = require "electron"

Take ["Config", "State"], (Config, State)->

  Make "IPC", IPC =
    setup: ()->

      ipcMain.handle "config-data", ()->
        Config.get()

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

      ipcMain.on "browser-init", ({sender})->
        # a new window was just opened, so feed it the list of assets (if that exists yet)
        sender.send "info",
          isDev: State.isDev
          isMac: State.isMac
          version: State.version
        if Object.keys(State.assets).length > 0
          sender.send "assets", State.assets
