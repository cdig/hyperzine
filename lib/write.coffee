Take ["Env", "Log", "Memory"], (Env, Log, Memory)->
  fs = require "fs"

  Make.async "Write", Write = ()->
    throw "Not Implemented"

  Write.sync = {}

  logWrite = (fn, p)->
    p = p.replace Memory("assetsFolder"), "" unless p is Memory("assetsFolder")
    p = p.replace Memory("dataFolder"), "" unless p is Memory("dataFolder")
    p = p.replace Env.home, "" unless p is Env.home
    Log "WRITE #{fn} #{p}"

  Write.sync.file = (path, data)->
    logWrite "file", path
    fs.writeFileSync path, data

  Write.sync.mkdir = (path)->
    logWrite "mkdir", path
    fs.mkdirSync path, recursive: true

  Write.sync.rm = (path)->
    logWrite "rm", path
    fs.rmSync path, recursive: true

  Write.sync.copyFile = (src, dest)->
    logWrite "copyFile", "#{src} -> #{dest}"
    fs.copyFileSync src, dest

  Write.sync.json = (path, data)->
    Write.sync.file path, JSON.stringify data
