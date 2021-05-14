Take ["Debounced", "Env", "Log", "Memory", "Read", "Write"], (Debounced, Env, Log, Memory, Read, Write)->

  # This lists all the keys we care about for config, plus the default values
  configData =
    dataFolder: Env.defaultDataFolder
    localName: Env.computerName
    setupDone: false

  save = Debounced ()->
    Write.sync.json Env.configPath, configData

  update = (v, o, k)->
    configData[k] = v
    save()

  # Initialize the configData to default values, and set up subscribers
  for k, v of configData
    Log "Warning: Memory(#{k}) was already defined before Config initialized it" if Memory(k)?
    Memory.default k, v
    Memory.subscribe k, true, update


  Make "Config", Config = ()->

    configFile = Read.file Env.configPath

    unless configFile?
      return false # No config file — need to run Setup Assistant

    try
      loadedData = JSON.parse configFile
      Memory.change k, v for k, v of loadedData

      # Loaded successfully — return true to launch normally, or false to run Setup Assistant
      return configData.setupDone

    catch
      return null # Fatal error
