{ ipcRenderer } = require "electron"

Take [], ()->

  db = null
  id = null

  Make "IPC", IPC =

    getConfig: (cb)->
      ipcRenderer.invoke("init").then (configData)->
        db = configData.db
        id = configData.id
        cb configData

    init: ({load, assetChanged, assetDeleted, find})->
      ipcRenderer.once "info", (event, asset)-> load asset
      ipcRenderer.on "asset-changed", (event, asset)-> assetChanged asset
      ipcRenderer.on "asset-deleted", (event, assetId)-> assetDeleted assetId
      ipcRenderer.on "find", (event)-> find()
      ipcRenderer.send "asset-init"

    log: (...args)->
      db.postMessage ["log", ...args]

    closeWindow: ()->
      ipcRenderer.send "close-window"
