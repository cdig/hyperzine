Take ["Config", "IPC", "LoadAssets", "Log", "Memory", "Read", "WatchAssets", "Write"], (Config, IPC, LoadAssets, Log, Memory, Read, WatchAssets, Write)->

  Memory.subscribe "dataFolder", true, (v)->
    return unless await Read.isFolder v
    Memory "assetsFolderPath", assetsFolderPath = Read.path v, "Assets"
    Write.sync.mkdir assetsFolderPath unless await Read.isFolder assetsFolderPath
    LoadAssets()
    WatchAssets()

  config = Config()
  Log "Loading Config: #{config}"

  switch config
    when true
      IPC.send Log "config-ready"
    when false
      IPC.send Log "open-setup-assistant"
    else
      IPC.send "fatal", "Hyperzine failed to load your saved preferences. To avoid damaging the preferences file, Hyperzine will now close. Please ask Ivan for help."
