fs = require "fs"
path = require "path"

Take ["Asset", "Config", "Debounced", "Log", "IPC", "Read"], (Asset, Config, Debounced, Log, IPC, Read)->

  validFileName = (v)->
    return false if v.indexOf(".") is 0 # Exclude dotfiles
    return true # Everything else is good

  changed = {}

  update = Debounced ()->
    for assetId, assetPath of changed
      if Read assetPath
        asset = Asset assetPath
        IPC.assetChanged asset
      else
        IPC.assetDeleted assetId
    null


  Make "WatchAssets", WatchAssets = ()->
    Log "Watching Assets"
    assetsFolderPath = Config "pathToAssetsFolder"
    fs.watch assetsFolderPath, {recursive: true, persistent: false}, (eventType, filename)->
      assetId = filename.replace(assetsFolderPath, "").split(path.sep)[0]
      assetPath = Read.path assetsFolderPath, assetId
      changed[assetId] = assetPath
      update()
