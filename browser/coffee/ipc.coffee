{ ipcRenderer } = require "electron"

Take [], ()->

  ipcRenderer.on "focus", ()-> document.documentElement.classList.remove "blur"
  ipcRenderer.on "blur", ()-> document.documentElement.classList.add "blur"


  Make "IPC", IPC =

    getConfig: (cb)->
      ipcRenderer.invoke("config-data").then cb

    init: ({loadInfo, loadAssets, assetChanged, assetDeleted})->
      ipcRenderer.once "info", (event, info)-> loadInfo info
      ipcRenderer.once "assets", (event, assets)-> loadAssets assets
      ipcRenderer.on "asset-changed", (event, asset)-> assetChanged asset
      ipcRenderer.on "asset-deleted", (event, assetId)-> assetDeleted assetId
      ipcRenderer.send("browser-init")
