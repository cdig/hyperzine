{ app } = require "electron"

Take [], ()->
  Make "Env", Env =
    isDev: not app.isPackaged
    isMac: process.platform is "darwin"
    userData: app.getPath("userData")
    version: app.getVersion()
