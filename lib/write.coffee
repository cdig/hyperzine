Take [], ()->
  fs = require "fs"

  Make.async "Write", Write = ()->
    null

  Write.sync = {}

  Write.sync.file = (path, data)->
    fs.writeFileSync path, data

  Write.sync.json = (path, data)->
    Write.sync.file path, JSON.stringify data

  Write.sync.mkdir = (path)->
    fs.mkdirSync path, recursive: true

  Write.sync.rm = (path)->
    fs.rmSync path, recursive: true

  Write.sync.copyFile = (src, dest)->
    fs.copyFileSync src, dest
