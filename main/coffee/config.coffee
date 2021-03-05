{ app, dialog } = require "electron"
path = require "path"

Take [], ()->

  configPath = path.join app.getPath("userData"), "config.json"
  configData = null

  Make "Config", Config =
    path: ()-> configPath
    get: ()-> configData

    load: ()->
      try
        configFile = fs.readFileSync configPath
        configData = JSON.parse configFile
      configData

    generate: (cb)->
      dialog.showMessageBoxSync
        message: "On the next screen, please select your Dropbox folder and click Open."
        buttons: ["Will Do"]

      dialog.showOpenDialog
        title: "Select your Dropbox folder"
        defaultPath: path.join app.getPath("home")
        properties: ["openDirectory"]
      .then ({canceled, filePaths})->
        return app.quit() if canceled
        return dialog.showErrorBox("Failed to Generate Config File", "Nothing was selected.") unless folder = filePaths[0]
        return dialog.showErrorBox("Failed to Generate Config File", "You didn't select a Dropbox folder.") unless Array.last(folder.split(path.sep)).toLowerCase().indexOf("dropbox") is 0
        configData = pathToAssetsFolder: path.join folder, "System", "Hyperzine", "Assets"
        fs.writeFileSync configPath, JSON.stringify State.configData
        cb()
