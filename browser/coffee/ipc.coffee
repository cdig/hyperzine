{ ipcRenderer, webFrame } = require "electron"

Take [], ()->

  ipcRenderer.on "focus", ()-> document.documentElement.classList.remove "blur"
  ipcRenderer.on "blur", ()-> document.documentElement.classList.add "blur"

  dbID = null

  Make "IPC", IPC =

    getConfig: (cb)->
      ipcRenderer.invoke("config-data").then (configData)->
        dbID = configData.dbID
        cb configData

    init: ({loadInfo, loadAssets, assetChanged, assetDeleted, find})->
      ipcRenderer.once "info", (event, info)-> loadInfo info
      ipcRenderer.once "assets", (event, assets)-> loadAssets assets
      ipcRenderer.on "asset-changed", (event, asset)-> assetChanged asset
      ipcRenderer.on "asset-deleted", (event, assetId)-> assetDeleted assetId
      ipcRenderer.on "find", (event)-> find()
      ipcRenderer.send "browser-init"

    log: (msg, attrs)->
      if dbID?
        sender = "Browser #{webFrame.routingId}"
        ipcRenderer.sendTo dbID, "log", "#{sender}  #{msg}", attrs

    openAsset: (assetId)->
      ipcRenderer.send "browser-open-asset", assetId
