Take ["IPC", "LoadAssets", "Log", "TopBar", "WatchAssets", "DOMContentLoaded"], (IPC, LoadAssets, Log, TopBar, WatchAssets)->
  Log "Beginning initialization"

  IPC.getConfig (configData)->
    Log "getConfig"

    if configData.pathToAssetsFolder

      assets = LoadAssets configData.pathToAssetsFolder
      Log "LoadAssets"

      IPC.assets assets
      Log "IPC.assets"

      TopBar.init assets
      Log "Topbar.init"

      WatchAssets configData.pathToAssetsFolder
      Log "WatchAssets"

    else
      Log.err "Config data didn't specify path to Assets folder"
