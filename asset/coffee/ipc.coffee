{ ipcRenderer } = require "electron"

Take [], ()->

  ipcRenderer.on "focus", ()-> document.documentElement.classList.remove "blur"
  ipcRenderer.on "blur", ()-> document.documentElement.classList.add "blur"


  Make "IPC", IPC =

    getConfig: (cb)->
      ipcRenderer.invoke("config-data").then cb

    init: ({load, assetChanged, assetDeleted})->
      ipcRenderer.once "info", (event, asset, info)-> load asset, info
      ipcRenderer.on "asset-changed", (event, asset)-> assetChanged asset
      ipcRenderer.on "asset-deleted", (event, assetId)-> assetDeleted assetId
      ipcRenderer.send "asset-init"

    closeWindow: ()->
      ipcRenderer.send "close-window"
