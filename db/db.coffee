Take ["LoadAssets", "IPC", "TopBar", "DOMContentLoaded"], (LoadAssets, IPC, TopBar)->
  requestIdleCallback ()->

    IPC.getConfig (configData)->
      if configData.pathToAssetsFolder
        assets = LoadAssets configData.pathToAssetsFolder
        IPC.assets assets
        TopBar.init assets
      else
        TopBar.err "Config data didn't specify path to Assets folder"
