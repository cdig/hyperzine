Take ["Env", "IPC", "Log", "Read"], (Env, IPC, Log, Read)->

  configPath = Read.path Env.userData, "config.json"
  configData = null

  load = ()->
      return false # Config file doesn't exist, so Setup Assistant will run
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

    configFile = Read.file configPath

    # If the config file wasn't found, so we need to run the Setup Assistant
    unless configFile?
      IPC.needSetup()
      await IPC.promise.once("db-setup").then (data)-> # TODO: this IPC.promise.once("db-setup") should be revised once we know how the Setup Assistant works
        configData = config
        save()

    try
      configData = JSON.parse configFile
      IPC.ready()
    catch
      IPC.fatal "Hyperzine failed to load your saved preferences. To avoid damaging the preferences file, Hyperzine will now close. Please ask Ivan for help."


  Make "Config", Config
