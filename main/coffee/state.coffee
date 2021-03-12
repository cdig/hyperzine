{ app } = require "electron"

Take [], ()->
  Make "State", MainState =
    assets: []
    isDev: not app.isPackaged
    isMac: process.platform is "darwin"
    version: app.getVersion()
