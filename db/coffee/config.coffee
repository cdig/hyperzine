Take ["Debounced", "Env", "Log", "Memory", "Read", "Write"], (Debounced, Env, Log, Memory, Read, Write)->

  # This lists all the keys we'll persist in the config file, with their default values
  configData =
    dataFolder: Env.defaultDataFolder
    localName: Env.computerName
    setupDone: false

  applyConfig = (data)->
    for k, v of data
      didSet = Memory.default k, v
      if not didSet then Log.err "Memory(#{k}) was already defined before Config initialized it"

  setupSubscribers = ()->
    for k of configData
      Memory.subscribe k, true, updateAndSave k

  updateAndSave = (k)-> (v)->
    configData[k] = v
    save()

  save = Debounced ()->
    Write.sync.json Env.configPath, configData

  Make "Config", Config = ()->

    configFile = Read.file Env.configPath

    if not configFile?
      applyConfig configData # Use the default config data
      setupSubscribers()
      return false # No config file — need to run Setup Assistant

    try
      loadedData = JSON.parse configFile
      applyConfig loadedData
      setupSubscribers()
      # Loaded successfully — return true to launch normally, or false to run Setup Assistant
      return Boolean configData.setupDone

    catch
      return null # Fatal error
