Take ["Debounced", "Env", "Log", "Memory", "Read", "Write"], (Debounced, Env, Log, Memory, Read, Write)->

  # This lists all the keys we care about for config, plus the default values
  configData =
    dataFolder: Env.defaultDataFolder
    localName: Env.computerName
    setupDone: false

  safeToSave = false

  save = Debounced ()->
    if safeToSave
      Write.sync.json Env.configPath, configData

  update = (v, o, k)->
    configData[k] = v
    save()

  # Initialize the configData to default values, and set up subscribers
  for k, v of configData
    hadNoValue = Memory.default k, v
    unless hadNoValue
      Log "Warning: Memory(#{k}) was already defined before Config initialized it"
    Memory.subscribe k, true, update


  Make "Config", Config = ()->

    configFile = Read.file Env.configPath

    unless configFile?
      safeToSave = true
      return false # No config file — need to run Setup Assistant

    try
      loadedData = JSON.parse configFile
      Memory.change k, v for k, v of loadedData
      safeToSave = true
      # Loaded successfully — return true to launch normally, or false to run Setup Assistant
      return configData.setupDone is true

    catch
      # Not safe to save
      return null # Fatal error
