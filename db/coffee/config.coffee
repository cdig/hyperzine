fs = require "fs"
path = require "path"

Take ["Env", "IPC", "Log"], (Env, IPC, Log)->

  configPath = path.join Env.userData, "config.json"
  configData = null

  load = ()->
    try configFile = fs.readFileSync configPath
    catch e
      Log.err e
      return false
    try configData = JSON.parse configFile
    catch
      Log.err "Error when parsing configFile JSON"
    configData?

  save = ()->
    fs.writeFileSync configPath, JSON.stringify configData

  Config = (k, v)->
    if v isnt undefined
      if v?
        configData[k] = v
      else
        delete configData[k]
      save()
    configData[k]

  Config.path = ()-> configPath

  Config.init = ()->
    Log "Loading Config"
    unless load()
      IPC.needSetup()
      # this IPC.promise.once("db-setup") should be revised once we know how the Setup Assistant works
      await IPC.promise.once("db-setup").then (data)->
        configData = config
        save()
    IPC.ready()

  Make "Config", Config
