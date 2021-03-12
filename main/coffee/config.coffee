{ app, dialog } = require "electron"
fs = require "fs"
path = require "path"

Take [], ()->

  configPath = path.join app.getPath("userData"), "config.json"
  configData = null

  Make "Config", Config =
    path: ()-> configPath
    get: ()-> configData

    setup: ()->
      try
        configFile = fs.readFileSync configPath
        configData = JSON.parse configFile

        return true if configData?

        # Loading config data failed, so prompt the user to generate it

        response = dialog.showMessageBoxSync
          message: "Hyperzine uses a config file to store some local data. At the moment, this config file either doesn't exist, couldn't be loaded, or contains erroneous data.\n\nWould you like to generate a new config file? This will overwrite any existing config file."
          buttons: ["Generate", "Quit"]
          defaultId: 0

        return if response is 1

        dialog.showMessageBoxSync
          message: "On the next screen, please select your Dropbox folder and click Open."
          buttons: ["Will Do"]

        filePaths = dialog.showOpenDialogSync
          title: "Select your Dropbox folder"
          defaultPath: path.join app.getPath("home")
          properties: ["openDirectory"]

        return unless filePaths
        return dialog.showErrorBox("Failed to Generate Config File", "Nothing was selected.") and false unless folder = filePaths[0]
        return dialog.showErrorBox("Failed to Generate Config File", "You didn't select a Dropbox folder.") and false unless Array.last(folder.split(path.sep)).toLowerCase().indexOf("dropbox") is 0

        configData = pathToAssetsFolder: path.join folder, "System", "Hyperzine", "Assets"

        fs.writeFileSync configPath, JSON.stringify configData

        return true
