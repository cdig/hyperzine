{ ipcRenderer, webFrame } = require "electron"

Take [], ()->
  bind = new Promise (resolve)->
    ipcRenderer.on "port", ({ports}, data)->
      resolve [ports[0], data.id]

  ipcRenderer.send "bind-db"

  [db, id] = await bind

  Make "IPC", IPC =

    getConfig: (cb)->
      ipcRenderer.invoke("init").then (configData)->
        dbID = configData.dbID
        cb configData

    init: ({loadInfo, loadAssets, assetChanged, assetDeleted, find})->
      ipcRenderer.once "info", (event, info)-> loadInfo info
      ipcRenderer.once "assets", (event, assets)-> loadAssets assets
      ipcRenderer.on "asset-changed", (event, asset)-> assetChanged asset
      ipcRenderer.on "asset-deleted", (event, assetId)-> assetDeleted assetId
      ipcRenderer.on "find", (event)-> find()
      ipcRenderer.send "browser-init"

    log: (...args)->
      db.postMessage ["log", ...args]

    openAsset: (assetId)->
      ipcRenderer.send "browser-open-asset", assetId
