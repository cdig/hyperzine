time = performance.now()

Take ["Config", "LoadAssets", "Log", "WatchAssets", "DOMContentLoaded"], (Config, LoadAssets, Log, WatchAssets)->

  Log "DB Window Open", null, time

  await Config.init()

  console.log "INIT DONE"

  # await LoadAssets()
  # WatchAssets()
