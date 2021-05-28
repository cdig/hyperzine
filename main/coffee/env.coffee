{ app } = require "electron"
childProcess = require "child_process"
os = require "os"
path = require "path"

Take [], ()->
  Env =
    isDev: not app.isPackaged
    isMac: process.platform is "darwin"
    isMain: true
    isRender: false
    userData: app.getPath "userData"
    home: app.getPath "home"
    version: app.getVersion()
    versions: process.versions

  Env.computerName = if Env.isMac then childProcess.execSync("scutil --get ComputerName").toString().replace("\n","") else os.hostname()

  Env.configPath = path.join Env.userData, "config.json"

  Env.defaultDataFolder = path.join Env.home, "Dropbox", "System", "Hyperzine"

  Make "Env", Env
