{ ipcRenderer } = require "electron"

Take [], ()->

  ipcRenderer.on "focus", ()-> document.documentElement.classList.remove "blur"
  ipcRenderer.on "blur", ()-> document.documentElement.classList.add "blur"

  dbID = null

  Make "IPC", IPC =

    getConfig: (cb)->
      ipcRenderer.invoke("config-data").then (configData)->
        dbID = configData.dbID
        cb configData

    init: ({load, assetChanged, assetDeleted, find})->
      ipcRenderer.once "info", (event, asset, info)-> load asset, info
      ipcRenderer.on "asset-changed", (event, asset)-> assetChanged asset
      ipcRenderer.on "asset-deleted", (event, assetId)-> assetDeleted assetId
      ipcRenderer.on "find", (event)-> find()
      ipcRenderer.send "asset-init"

    log: (msg, attrs)->
      if dbID?
        sender = "Asset #{webFrame.routingId}"
        ipcRenderer.sendTo dbID, "log", "#{sender}  #{msg}", attrs

    closeWindow: ()->
      ipcRenderer.send "close-window"
