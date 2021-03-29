time = performance.now()

Take ["IPC", "LoadAssets", "Log", "TopBar", "WatchAssets", "DOMContentLoaded"], (IPC, LoadAssets, Log, TopBar, WatchAssets)->
  Log "Parsing JS took #{time|0}ms"

  IPC.getConfig (configData)->
    if configData.pathToAssetsFolder
      assets = LoadAssets configData.pathToAssetsFolder
      IPC.assets assets
      TopBar.init assets
      WatchAssets configData.pathToAssetsFolder

    else
      Log.err "Config data didn't specify path to Assets folder"
