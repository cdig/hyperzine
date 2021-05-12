fs = require "fs"
path = require "path"

Take ["Asset", "Config", "Debounced", "Log", "IPC", "Read"], (Asset, Config, Debounced, Log, IPC, Read)->

  watcher = null

  validFileName = (v)->
    return false if v.indexOf(".") is 0 # Exclude dotfiles
    return true # Everything else is good

  changed = {}

  update = Debounced ()->
    Log "TODO: Implement port-based asset update IPC"
    # for assetId, assetPath of changed
    #   if Read assetPath
    #     asset = Asset assetPath
    #     IPC.assetChanged asset
    #   else
    #     IPC.assetDeleted assetId
    null

  change = (eventType, filename)->
    assetId = filename.replace(assetsFolderPath, "").split(path.sep)[0]
    assetPath = Read.path assetsFolderPath, assetId
    changed[assetId] = assetPath
    update()

  Make "WatchAssets", WatchAssets = ()->
    if assetsFolderPath = Config "pathToAssetsFolder"
      watcher?.close()
      watcher = fs.watch assetsFolderPath, {recursive: true, persistent: false}, change
