fs = require "fs"

Take [], ()->

  validFileName = (v)->
    return false if v.indexOf(".") is 0 # Exclude dotfiles
    return true # Everything else is good


  Make "Read", Read =
    folder: (folderPath)->
      try
        fileNames = fs.readdirSync folderPath
        fileNames.filter validFileName
      catch
        null
