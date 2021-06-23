Take [], ()->
  { app } = require "electron"
  childProcess = require "child_process"
  os = require "os"
  path = require "path"

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

  # Persisted user preferences and other per-install app state that will be managed by the DB window
  Env.configPath = path.join Env.userData, "Config.json"

  # Persisted per-install app state that will be managed by the Main process
  Env.mainStatePath = path.join Env.userData, "Main State.json"

  # Where the assets and other globally-shared data managed by Hyperzine will live
  Env.defaultDataFolder = path.join Env.home, "Dropbox", "System", "Hyperzine"

  Make "Env", Env
