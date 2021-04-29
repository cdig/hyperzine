Take ["Env", "IPC", "Log", "Read"], (Env, IPC, Log, Read)->
  observers = {}

  Config = (k, v)->
    if v isnt undefined
      if v?
        configData[k] = v
      else
        delete configData[k]
      fs.writeFileSync configPath, JSON.stringify configData
    configData[k]

  Config.watch = (k, cb)->
    observers[k] ?= cbs: [], v: configData[k]
    observers[k].cbs.push cb

  Make "Config", Config
