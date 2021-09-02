# TODO: Clear up the naming so that everything is explicitly Read.sync.foo or Read.async.foo

Take [], ()->
  fs = require "fs"
  path = require "path"

  validFileName = (v)->
    return false if 0 is v.indexOf "." # Exclude dotfiles
    return false if -1 isnt v.search /[<>:;,?"*|/\\]/ # Exclude names we won't be able to roundtrip
    return true # Everything else is good

  validDirentName = (v)->
    validFileName v.name

  filterValidDirentName = (vs)->
    vs.filter validDirentName

  Read = (folderPath)->
    try
      fileNames = fs.readdirSync folderPath
      fileNames.filter validFileName
    catch
      null

  # Temporary hack until we fully switch Read over to split sync and async.
  # Note that we can't just say Read.sync = Read, or that breaks Read.sync.exists!
  Read.sync = (p)-> Read p

  Read.sync.exists = (path)->
    fs.existsSync path

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

  Read.stat = (path)->
    new Promise (resolve)->
      fs.stat path, (err, stat)->
        resolve stat

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

  Read.path = (...segs)-> segs.join path.sep
  Read.split = (p)-> Array.pull p.split(path.sep), ""
  Read.last = (p)-> Array.last Read.split p
  Read.parentPath = (p)-> Read.path ...Array.butLast Read.split p

  Make "Read", Read
