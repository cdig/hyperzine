{ ipcRenderer } = require "electron"

Take [], ()->

  ipcRenderer.on "focus", ()-> document.documentElement.classList.remove "blur"
  ipcRenderer.on "blur", ()-> document.documentElement.classList.add "blur"


  Make "IPC", IPC =

    getConfig: (cb)->
      ipcRenderer.invoke("config-data").then cb

    init: ({init, assetChanged, assetDeleted})->
      ipcRenderer.once "assets", (event, assets)-> init assets
      ipcRenderer.on "asset-changed", (event, asset)-> assetChanged asset
      ipcRenderer.on "asset-deleted", (event, assetId)-> assetDeleted assetId
      ipcRenderer.send("browser-init")
