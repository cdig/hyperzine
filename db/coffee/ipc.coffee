{ ipcRenderer } = require "electron"

Take [], ()->

  Make "IPC", IPC =
    assets: (assets)->
      ipcRenderer.send "db-assets", assets
