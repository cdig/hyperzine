{ ipcRenderer } = require "electron"

Take [], ()->

  ipcRenderer.on "focus", ()-> document.documentElement.classList.remove "blur"
  ipcRenderer.on "blur", ()-> document.documentElement.classList.add "blur"

  Make "IPC", IPC =

    getConfig: (cb)->
      ipcRenderer.invoke("config-data").then cb

    assets: (assets)->
      ipcRenderer.send "db-assets", assets

    assetChanged: (asset)->
      ipcRenderer.send "db-asset-changed", asset

    assetDeleted: (assetId)->
      ipcRenderer.send "db-asset-deleted", assetId
