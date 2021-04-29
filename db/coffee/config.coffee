Take ["Env", "IPC", "Log", "Read"], (Env, IPC, Log, Read)->

  configPath = Read.path Env.userData, "config.json"
  configData = {}

  save = Debounced ()->
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

  Config.setup = ()->
    Log "Loading Config"

    configFile = Read.file configPath

    if configFile?
      try
        configData = JSON.parse configFile
        IPC.dbReady()
      catch
        IPC.fatal "Hyperzine failed to load your saved preferences. To avoid damaging the preferences file, Hyperzine will now close. Please ask Ivan for help."

    else
      IPC.needSetup()

  Make "Config", Config
