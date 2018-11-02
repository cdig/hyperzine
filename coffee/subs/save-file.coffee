remote = require("electron").remote
dialog = remote.dialog
fs = require "fs"

Take ["Paths"], (Paths)->

  Sub "Save File", (asset, filename)->
    win = remote.getCurrentWindow()
    console.log destination = dialog.showSaveDialog win, defaultPath: filename
    if destination?
      fs.copyFile Paths.file(asset, filename), destination, ()->
        # Ignore
