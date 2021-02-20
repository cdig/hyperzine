Take ["LoadAssets", "IPC", "Settings", "TopBar", "DOMContentLoaded"], (LoadAssets, IPC, Settings, TopBar)->
  requestIdleCallback ()->
    assets = LoadAssets Settings.pathToAssetsFolder
    IPC.assets assets
    TopBar.init assets
