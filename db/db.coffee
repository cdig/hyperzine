time = performance.now()

Take ["Config", "Env", "IPC", "LoadAssets", "Log", "Memory", "Read", "WatchAssets", "Write"], (Config, Env, IPC, LoadAssets, Log, Memory, Read, WatchAssets, Write)->

  Log "DB Window Open", null, time

  Memory.subscribe "dataFolder", (v)->
    return unless await Read.isFolder v
    Log "v dataFolder: #{v}"
    Log "M dataFolder: #{Memory("dataFolder")}"
    Memory "assetsFolderPath", assetsFolderPath = Read.path v, "Assets"
    Write.sync.mkdir assetsFolderPath unless await Read.isFolder assetsFolderPath
    LoadAssets()
    WatchAssets()

  Log "Loading Config"

  configPath = Read.path Env.userData, "config.json"
  configFile = Read.file configPath

  if configFile?
    try
      configData = JSON.parse configFile
      # Config k, v for k, v of configData
      # Config "configPath", configPath # Don't trust the value that was saved
      IPC.configReady()
    catch
      IPC.fatal "Hyperzine failed to load your saved preferences. To avoid damaging the preferences file, Hyperzine will now close. Please ask Ivan for help."
  else
    IPC.needSetup()
