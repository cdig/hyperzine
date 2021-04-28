{ app } = require "electron"
childProcess = require "child_process"
os = require "os"

Take [], ()->
  Make "Env", Env =
    isDev: not app.isPackaged
    isMac: isMac = process.platform is "darwin"
    userData: app.getPath "userData"
    home: app.getPath "home"
    version: app.getVersion()
    computerName: if isMac then childProcess.execSync("scutil --get ComputerName").toString().replace("\n","") else os.hostname()
