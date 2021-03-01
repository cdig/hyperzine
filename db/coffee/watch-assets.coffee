fs = require "fs"
path = require "path"

Take ["Asset", "Debounced", "IPC", "Read"], (Asset, Debounced, IPC, Read)->

  validFileName = (v)->
    return false if v.indexOf(".") is 0 # Exclude dotfiles
    return true # Everything else is good

  changed = {}

  update = Debounced ()->
    for assetId, assetPath of changed
      if Read.folder assetPath
        asset = Asset assetPath
        IPC.assetChanged asset
      else
        IPC.assetDeleted assetId
    null


  Make "WatchAssets", WatchAssets = (assetsFolderPath)->
    fs.watch assetsFolderPath, {recursive: true, persistent: false}, (eventType, filename)->
      assetId = filename.replace(assetsFolderPath, "").split(path.sep)[0]
      assetPath = path.join assetsFolderPath, assetId
      changed[assetId] = assetPath
      update()
