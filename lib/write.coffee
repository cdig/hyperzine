Take ["Env", "Log", "Read"], (Env, Log, Read)->
  fs = require "fs"

  validPath = (v)->
    valid = true
    valid = false if -1 isnt v.search /[<>:;,?"*|]/ # Exclude names we won't be able to roundtrip
    if not valid then Log.err "#{v} is not a valid file path"
    return valid


  Make.async "Write", Write = ()->
    throw "Not Implemented"

  Write.sync = {}
  Write.async = {}

  Memory = null

  logWrite = (fn, p)->
    if Memory ?= Take "Memory"
      p = p.replace Memory("assetsFolder"), "" unless p is Memory("assetsFolder")
      p = p.replace Memory("dataFolder"), "" unless p is Memory("dataFolder")
    p = p.replace Env.home, "" unless p is Env.home
    Log "WRITE #{fn} #{p}"

  Write.sync.file = (path, data)->
    if valid = validPath path
      logWrite "file", path
      fs.writeFileSync path, data
    return valid

  Write.sync.mkdir = (path)->
    return true if fs.existsSync path
    if valid = validPath path
      logWrite "mkdir", path
      fs.mkdirSync path, recursive: true
    return valid

  Write.sync.rename = (path, newName)->
    newPath = "/" + Read.path Read.parentPath(path), newName
    if valid = validPath(path) and validPath(newPath)
      logWrite "rename", "#{path} -> #{newPath}"
      fs.renameSync path, newPath
    return valid

  Write.sync.rm = (path)->
    if valid = validPath path
      logWrite "rm", path
      fs.rmSync path, recursive: true
    return valid

  Write.sync.copyFile = (src, dest)->
    if valid = validPath(src) and validPath(dest)
      logWrite "copyFile", "#{src} -> #{dest}"
      fs.copyFileSync src, dest
    return valid

  Write.sync.json = (path, data)->
    Write.sync.file path, JSON.stringify data

  Write.sync.array = (path, arr)->
    current = Read path
    current ?= []
    return if Array.equal arr, current
    # Remove anything that's in the folder but not in our new array
    Write.sync.rm Read.path path, v for v in current when v not in arr
    # Save anything that's in our new array but not in the folder
    Write.sync.mkdir Read.path path, v for v in arr when v not in current
    null


  Write.async.copyInto = (src, destFolder)->
    srcName = Read.last src
    if await Read.isFolder src
      childDestFolder = Read.path destFolder, srcName
      Write.sync.mkdir childDestFolder
      valid = true
      for item in Read.sync src
        _valid = Write.async.copyInto Read.path(src, item), childDestFolder
        valid &&= _valid
      return valid
    else
      Write.sync.copyFile src, Read.path destFolder, srcName
