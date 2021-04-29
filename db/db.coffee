time = performance.now()

Take ["Config", "LoadAssets", "Log", "WatchAssets"], (Config, LoadAssets, Log, WatchAssets)->

  Log "DB Window Open", null, time

  Config.watch "pathToAssetsFolder", (p)->
    Log "New pathToAssetsFolder: #{p}"
    LoadAssets()
    # Need to unwatch any existing watches
    WatchAssets()

  Config.setup()
