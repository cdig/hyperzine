Take ["Debounced", "Env", "Log", "Memory", "Read", "Write"], (Debounced, Env, Log, Memory, Read, Write)->

  # This lists all the keys we'll persist in the config file, with their default values
  configData =
    assetThumbnailSize: 0.5
    browserThumbnailSize: 1
    dataFolder: Env.defaultDataFolder
    localName: Env.computerName
    setupDone: false

  applyConfig = (data)->
    for k, v of data
      didSet = Memory.default k, v
      if not didSet then Log.err "Memory(#{k}) was already defined before Config initialized it"
      configData[k] = v

  setupSubscribers = ()->
    for k of configData
      Memory.subscribe k, false, updateAndSave k

  updateAndSave = (k)-> (v)->
    if configData[k] isnt v
      configData[k] = v
      save()

  save = Debounced 2000, ()->
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
