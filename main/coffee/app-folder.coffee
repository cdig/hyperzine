{ app, dialog } = require "electron"
path = require "path"
fs = require "fs"

Take ["Read"], (Read)->

  Make "AppFolder", AppFolder =

    export: ()->
      sourceApp = app.getAppPath()
      sourceOut = path.join sourceApp, "out"
      destApp = path.join app.getPath("home"), "Desktop", "app"
      destOut = path.join destApp, "out"
      fs.mkdirSync destOut, recursive: true
      fs.copyFileSync path.join(sourceApp, "package.json"), path.join(destApp, "package.json")
      if files = Read sourceOut
        for file in files
          fs.copyFileSync path.join(sourceOut, file), path.join(destOut, file)
      null

    import: ()->
      dialog.showMessageBoxSync message: "To update Hyperzine, please select an (unzipped) app folder."
      dialog.showOpenDialog
        defaultPath: path.join app.getPath("home"), "Downloads"
        properties: ["openDirectory"]
      .then ({canceled, filePaths})->
        return if canceled
        return unless sourceApp = filePaths[0]
        return dialog.showErrorBox("Invalid Folder Selected", "Please select the \"app\" folder directly.") unless Array.last(sourceApp.split(path.sep)) is "app"
        sourceOut = path.join sourceApp, "out"
        destApp = path.join app.getAppPath()
        destOut = path.join destApp, "out"
        fs.mkdirSync destOut, recursive: true
        fs.copyFileSync path.join(sourceApp, "package.json"), path.join(destApp, "package.json")
        if files = Read sourceOut
          for file in files
            fs.copyFileSync path.join(sourceOut, file), path.join(destOut, file)
        else
          dialog.showErrorBox("Invalid Folder Selected", "It seems the folder you selected is empty.")
        dialog.showMessageBoxSync message: "Hyperzine was successfully updated."
        app.relaunch()
        app.quit()
