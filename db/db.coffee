Take ["LoadAssets", "IPC", "TopBar", "WatchAssets", "DOMContentLoaded"], (LoadAssets, IPC, TopBar, WatchAssets)->
  requestIdleCallback ()->

    IPC.getConfig (configData)->
      if configData.pathToAssetsFolder
        assets = LoadAssets configData.pathToAssetsFolder
        IPC.assets assets
        TopBar.init assets
        WatchAssets configData.pathToAssetsFolder
      else
        TopBar.err "Config data didn't specify path to Assets folder"
