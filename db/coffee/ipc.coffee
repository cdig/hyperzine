{ ipcRenderer } = require "electron"

Take [], ()->

  Make "IPC", IPC =
    getConfig: (cb)->
      ipcRenderer.invoke("config-data").then cb
    assets: (assets)->
      ipcRenderer.send "db-assets", assets
