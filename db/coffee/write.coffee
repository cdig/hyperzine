fs = require "fs"
path = require "path"

Take [], ()->


  Write = ()->
    null

  Write.sync = {}

  Write.sync.file = (path, data)->
    fs.writeFileSync path, data

  Write.sync.json = (path, data)->
    Write.sync.file path, JSON.stringify data

  Write.sync.mkdir = (path)->
    fs.mkdirSync path, recursive: true

  Write.sync.copyFile = (src, dest)->
    fs.copyFileSync src, dest

  Make "Write", Write
