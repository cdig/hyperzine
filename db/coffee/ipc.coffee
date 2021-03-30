{ ipcRenderer } = require "electron"

Take ["Printer"], (Printer)->

  ipcRenderer.on "focus", ()-> document.documentElement.classList.remove "blur"
  ipcRenderer.on "blur", ()-> document.documentElement.classList.add "blur"

  ipcRenderer.on "log", (e, msg, attrs)-> Printer msg, attrs

  Make "IPC", IPC =
    log: (msg, attrs)-> Printer msg, attrs

    getConfig: (cb)->
      ipcRenderer.invoke("config-data").then cb

    assets: (assets)->
      ipcRenderer.send "db-assets", assets

    assetChanged: (asset)->
      ipcRenderer.send "db-asset-changed", asset

    assetDeleted: (assetId)->
      ipcRenderer.send "db-asset-deleted", assetId
