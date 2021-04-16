fs = require "fs"
path = require "path"

Take ["Env"], (Env)->

  configPath = path.join Env.userData, "config.json"
  configText = null
  configData = null

  watch = ()->
    fs.watchFile configPath, {persistent: false}, (curr, prev)->
      if curr.mtime isnt prev.mtime
        # file was changed

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

  # Used by Setup Assistant
  Config.read = ()-> try configText = fs.readFileSync configPath
  Config.init = ()-> configText = "{}"
  Config.parse = ()-> try configData = JSON.parse configText

  Make "Config", Config
