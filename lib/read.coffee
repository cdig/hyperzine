Take [], ()->
  fs = require "fs"
  path = require "path"

  validFileName = (v)->
    return false if v.indexOf(".") is 0 # Exclude dotfiles
    return true # Everything else is good

  validDirentName = (v)->
    return false if v.name.indexOf(".") is 0 # Exclude dotfiles
    return true # Everything else is good

  filterValidDirentName = (vs)->
    vs.filter validDirentName

  Read = (folderPath)->
    try
      fileNames = fs.readdirSync folderPath
      fileNames.filter validFileName
    catch
      null

  Read.async = (folderPath)->
    new Promise (resolve)->
      fs.readdir folderPath, (err, fileNames)->
        if err?
          resolve null
        else
          resolve fileNames.filter validFileName

  Read.withFileTypes = (folderPath)->
    fs.promises.readdir folderPath, {withFileTypes:true}
    .then filterValidDirentName

  Read.isFolder = (folderPath)->
    return false unless folderPath?.length
    new Promise (resolve)->
      fs.stat folderPath, (err, stat)->
        resolve stat?.isDirectory()

  Read.exists = (filePath)->
    return false unless filePath?.length
    new Promise (resolve)->
      fs.access filePath, (err)->
        resolve not err?

  Read.file = (filePath)->
    try
      file = fs.readFileSync filePath
    catch
      null

  Read.sep = path.sep
  Read.watch = fs.watch

  Read.path = (...segs)->
    segs.join path.sep

  Read.split = (p)->
    p.split path.sep

  Make "Read", Read
