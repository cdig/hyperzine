Take ["Env", "Log", "Read"], (Env, Log, Read)->
  fs = require "fs"

  validPath = (v)->
    valid = true
    v = v.replace /^[A-Z]:/, "" # Ignore the drive letter on Windows
    valid = false if -1 isnt v.search /[<>:;,?"*|]/ # Exclude names we won't be able to roundtrip
    valid = false if v.length <= 1
    if not valid then Log.err "#{v} is not a valid file path"
    return valid


  Make.async "Write", Write = ()->
    throw "Not Implemented"

  Write.logging = true

  Write.sync = {}
  Write.async = {}

  Memory = null

  logWrite = (fn, p, opts = {})->
    return if opts.quiet
    return unless Write.logging
    if Memory ?= Take "Memory"
      p = p.replace Memory("assetsFolder") + Read.sep, "" unless p is Memory("assetsFolder")
      p = p.replace Memory("dataFolder") + Read.sep, "" unless p is Memory("dataFolder")
    p = p.replace Env.home + Read.sep, "" unless p is Env.home
    Log "WRITE #{fn} #{p}"

  Write.sync.file = (path, data, opts)->
    if valid = validPath path
      logWrite "file", path, opts
      fs.writeFileSync path, data
    return valid

  Write.sync.mkdir = (path, opts)->
    return true if fs.existsSync path
    if valid = validPath path
      logWrite "mkdir", path, opts
      fs.mkdirSync path, recursive: true
    return valid

  Write.sync.rename = (path, newName, opts)->
    newPath = Read.sep + Read.path Read.parentPath(path), newName
    return true if path is newPath
    if valid = validPath(path) and validPath(newPath)
      logWrite "rename", "#{path} -> #{newPath}", opts
      fs.renameSync path, newPath
    return valid

  Write.sync.rm = (path, opts)->
    return true if not fs.existsSync path
    if valid = validPath path
      logWrite "rm", path, opts
      fs.rmSync path, recursive: true
    return valid

  Write.sync.copyFile = (src, dest, opts)->
    if valid = validPath(src) and validPath(dest)
      logWrite "copyFile", "#{src} -> #{dest}", opts
      fs.copyFileSync src, dest
    return valid

  Write.sync.json = (path, data, opts)->
    Write.sync.file path, JSON.stringify(data), opts

  Write.sync.array = (path, arr, opts)->
    current = Read path
    current ?= []
    return if Array.equal arr, current
    # Remove anything that's in the folder but not in our new array
    Write.sync.rm Read.path(path, v), opts for v in current when v not in arr
    # Save anything that's in our new array but not in the folder
    Write.sync.mkdir Read.path(path, v), opts for v in arr when v not in current
    null


  Write.async.copyInto = (src, destFolder, opts)->
    srcName = Read.last src
    if await Read.isFolder src
      childDestFolder = Read.path destFolder, srcName
      Write.sync.mkdir childDestFolder, opts
      valid = true
      for item in Read src
        _valid = Write.async.copyInto Read.path(src, item), childDestFolder, opts
        valid &&= _valid
      return valid
    else
      Write.sync.copyFile src, Read.path(destFolder, srcName), opts
