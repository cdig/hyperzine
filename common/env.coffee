{ ipcRenderer } = require "electron"

Take [], ()->
  Make "Env", await ipcRenderer.invoke "env"
