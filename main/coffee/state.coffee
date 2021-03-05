{ app } = require "electron"

Take [], ()->
  Make "State", MainState =
    isDev: not app.isPackaged
    isMac: process.platform is "darwin"
    version: app.getVersion()
