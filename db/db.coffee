time = performance.now()

Take ["Config", "Env", "IPC", "LoadAssets", "Log", "Read", "WatchAssets"], (Config, Env, IPC, LoadAssets, Log, Read, WatchAssets)->

  Log "DB Window Open", null, time

  # Memory.subscribe "dataFolder", (p)->
  #   Log "New dataFolder: #{p}"
  #   LoadAssets()
  #   WatchAssets()

  Log "Loading Config"

  Config "configPath", configPath = Read.path Env.userData, "config.json"
  configFile = Read.file configPath

  if configFile?
    try
      configData = JSON.parse configFile
      Config k, v for k, v of configData
      Config "configPath", configPath # Don't trust the value that was saved
      IPC.configReady()
    catch
      IPC.fatal "Hyperzine failed to load your saved preferences. To avoid damaging the preferences file, Hyperzine will now close. Please ask Ivan for help."
  else
    IPC.needSetup()
